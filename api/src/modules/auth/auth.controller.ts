import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  ParseIntPipe,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { MicrosoftAuthService } from './microsoft-auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SkipCsrf } from '../../common/decorators/skip-csrf.decorator';
import {
  COOKIE_NAME,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getClearCookieOptions,
  getClearCsrfCookieOptions,
  getClearRefreshCookieOptions,
  getCookieOptions,
  getCsrfCookieOptions,
  getRefreshCookieOptions,
} from '../../config/cookie.config';
import { AuthAuditService } from './auth-audit.service';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { DomainEventsService } from '../integration/domain-events.service';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

class ExchangeMicrosoftCodeDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @MinLength(43)
  codeVerifier: string;

  @IsString()
  @MinLength(1)
  redirectUri: string;
}

class ValidateMicrosoftDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  id: string;

  @IsString()
  @MinLength(1)
  tenantId: string;

  @IsString()
  accessToken?: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly microsoftAuthService: MicrosoftAuthService,
    private readonly config: ConfigService,
    private readonly audit: AuthAuditService,
    private readonly rateLimit: AuthRateLimitService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'auth' };
  }

  /**
   * POST /api/auth/microsoft/exchange
   * Intercambia authorization code por tokens en backend (BFF),
   * valida id_token de Microsoft y emite sesion propia de KPITAL.
   */
  @Public()
  @SkipCsrf()
  @Post('microsoft/exchange')
  async exchangeMicrosoftCode(
    @Body() dto: ExchangeMicrosoftCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
    this.rateLimit.consume(`microsoft-exchange:${ip}`, 10, 60_000);

    const identity =
      await this.microsoftAuthService.exchangeCodeAndValidateIdentity(
        dto.code,
        dto.codeVerifier,
        dto.redirectUri,
      );

    let issued: Awaited<ReturnType<AuthService['loginWithMicrosoftIdentity']>>;
    try {
      issued = await this.authService.loginWithMicrosoftIdentity(
        identity.objectId,
        identity.tenantId,
        ip,
        req.headers['user-agent'],
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        this.logger.warn(
          `Microsoft identity not provisioned oid=${identity.objectId} tid=${identity.tenantId} login=${identity.login}`,
        );
      }
      await this.audit.record({
        event: 'microsoft_exchange_failed',
        outcome: 'failed',
        ip,
        email: identity.login,
        reason: (error as Error).message,
      });
      throw error;
    }

    this.setSessionCookies(
      res,
      issued.accessToken,
      issued.refreshToken,
      issued.csrfToken,
    );

    await this.audit.record({
      event: 'login_success',
      outcome: 'success',
      ip,
      email: issued.session.user.email,
      userId: issued.session.user.id,
      metadata: { provider: 'microsoft_exchange' },
    });

    await this.domainEvents.record({
      aggregateType: 'auth',
      aggregateId: String(issued.session.user.id),
      eventName: 'auth.microsoft_exchange_success',
      payload: { provider: 'microsoft' },
      createdBy: issued.session.user.id,
    });

    return {
      user: {
        id: String(issued.session.user.id),
        email: issued.session.user.email,
        name: `${issued.session.user.nombre} ${issued.session.user.apellido}`,
        avatarUrl: issued.session.user.avatarUrl,
        roles: issued.session.roles,
        enabledApps: issued.session.enabledApps,
        companyIds: issued.session.companies.map((c) => String(c.id)),
      },
      companies: issued.session.companies,
    };
  }

  /**
   * POST /api/auth/validate
   * Flujo compatible con popup frontend: backend valida tenant/dominio
   * y crea sesion propia del ERP.
   */
  @Public()
  @SkipCsrf()
  @Post('validate')
  async validateMicrosoft(
    @Body() dto: ValidateMicrosoftDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
    this.rateLimit.consume(`microsoft-validate:${ip}`, 10, 60_000);

    const allowedTenant =
      this.config.get<string>('MICROSOFT_TENANT_ID') ??
      this.config.get<string>('MSAL_TENANT_ID') ??
      this.config
        .get<string>('MSAL_AUTHORITY')
        ?.split('/')
        .filter(Boolean)
        .at(-1);

    if (allowedTenant && dto.tenantId !== allowedTenant) {
      await this.audit.record({
        event: 'microsoft_validate_failed',
        outcome: 'failed',
        ip,
        email: dto.email,
        reason: 'tenant_not_allowed',
      });
      throw new UnauthorizedException(
        `Acceso denegado: tenant Microsoft no autorizado para este ambiente (${dto.tenantId}).`,
      );
    }

    const allowedDomainsRaw =
      this.config.get<string>('MICROSOFT_ALLOWED_DOMAINS') ??
      this.config.get<string>('MSAL_ALLOWED_DOMAINS') ??
      '';
    const allowedDomains = allowedDomainsRaw
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    const emailDomain = dto.email.split('@')[1]?.toLowerCase();

    if (
      !emailDomain ||
      (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain))
    ) {
      await this.audit.record({
        event: 'microsoft_validate_failed',
        outcome: 'failed',
        ip,
        email: dto.email,
        reason: 'domain_not_allowed',
      });
      throw new ForbiddenException(
        `Acceso denegado: dominio de correo no permitido (${emailDomain ?? 'desconocido'}).`,
      );
    }

    const issued = await this.authService.loginWithMicrosoftValidatedUser(
      dto.id,
      dto.tenantId,
      dto.email,
      ip,
      req.headers['user-agent'],
    );

    this.setSessionCookies(
      res,
      issued.accessToken,
      issued.refreshToken,
      issued.csrfToken,
    );

    await this.audit.record({
      event: 'login_success',
      outcome: 'success',
      ip,
      email: issued.session.user.email,
      userId: issued.session.user.id,
      metadata: { provider: 'microsoft_validate' },
    });

    return {
      success: true,
      data: {
        usuario: {
          id: String(issued.session.user.id),
          email: issued.session.user.email,
          name: `${issued.session.user.nombre} ${issued.session.user.apellido}`,
          avatarUrl: issued.session.user.avatarUrl,
          roles: issued.session.roles,
          enabledApps: issued.session.enabledApps,
          companyIds: issued.session.companies.map((c) => String(c.id)),
          companies: issued.session.companies,
        },
      },
      message: 'Autenticacion con Microsoft exitosa',
      error: null,
    };
  }

  /**
   * POST /api/auth/login
   * Valida credenciales reales contra BD.
   * Emite cookie httpOnly con JWT access + refresh.
   */
  @Public()
  @SkipCsrf()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
    this.rateLimit.consume(`login:${ip}`, 5, 60_000);

    try {
      const issued = await this.authService.login(
        dto.email,
        dto.password,
        ip,
        req.headers['user-agent'],
      );

      this.setSessionCookies(
        res,
        issued.accessToken,
        issued.refreshToken,
        issued.csrfToken,
      );

      await this.audit.record({
        event: 'login_success',
        outcome: 'success',
        userId: issued.session.user.id,
        email: issued.session.user.email,
        ip,
      });

      return {
        user: {
          id: String(issued.session.user.id),
          email: issued.session.user.email,
          name: `${issued.session.user.nombre} ${issued.session.user.apellido}`,
          avatarUrl: issued.session.user.avatarUrl,
          roles: issued.session.roles,
          enabledApps: issued.session.enabledApps,
          companyIds: issued.session.companies.map((c) => String(c.id)),
        },
        companies: issued.session.companies,
      };
    } catch (error) {
      await this.audit.record({
        event: 'login_failed',
        outcome: 'failed',
        email: dto.email,
        ip,
        reason: (error as Error).message,
      });
      throw error;
    }
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
    this.rateLimit.consume(`refresh:${ip}`, 10, 60_000);

    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as
      | string
      | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token ausente');
    }

    const issued = await this.authService.refreshSession(
      refreshToken,
      ip,
      req.headers['user-agent'],
    );

    this.setSessionCookies(
      res,
      issued.accessToken,
      issued.refreshToken,
      issued.csrfToken,
    );

    await this.audit.record({
      event: 'refresh_used',
      outcome: 'success',
      userId: issued.session.user.id,
      email: issued.session.user.email,
      ip,
    });

    return {
      success: true,
      message: 'Sesion renovada',
    };
  }

  /**
   * POST /api/auth/logout
   * Limpia cookies y revoca refresh token activo.
   */
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.revokeRefreshToken(
      req.cookies?.[REFRESH_COOKIE_NAME],
    );

    res.clearCookie(COOKIE_NAME, getClearCookieOptions(this.config));
    res.clearCookie(
      REFRESH_COOKIE_NAME,
      getClearRefreshCookieOptions(this.config),
    );
    res.clearCookie(CSRF_COOKIE_NAME, getClearCsrfCookieOptions(this.config));

    await this.audit.record({
      event: 'logout',
      outcome: 'success',
      userId: (req as any).user?.userId ?? null,
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
    });

    return { message: 'Sesion cerrada' };
  }

  /**
   * GET /api/auth/me
   * Retorna sesion completa del usuario autenticado.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(
    @CurrentUser() reqUser: { userId: number; email: string },
    @Query('companyId') companyIdRaw?: string,
    @Query('appCode') appCode?: string,
  ) {
    const user = await this.usersService.findByEmail(reqUser.email);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const companyId = companyIdRaw ? parseInt(companyIdRaw, 10) : undefined;

    const session = await this.authService.buildSession(
      user,
      companyId,
      appCode,
    );

    return {
      authenticated: true,
      user: {
        id: String(session.user.id),
        email: session.user.email,
        name: `${session.user.nombre} ${session.user.apellido}`,
        avatarUrl: session.user.avatarUrl,
        roles: session.roles,
        enabledApps: session.enabledApps,
        companyIds: session.companies.map((c) => String(c.id)),
      },
      companies: session.companies,
      permissions: session.permissions,
      roles: session.roles,
    };
  }

  /**
   * POST /api/auth/switch-company
   * Cambia contexto de empresa. Retorna permisos para la nueva empresa+app.
   */
  @UseGuards(JwtAuthGuard)
  @Post('switch-company')
  async switchCompany(
    @CurrentUser() reqUser: { userId: number; email: string },
    @Body('companyId', ParseIntPipe) companyId: number,
    @Body('appCode') appCode: string,
  ) {
    const resolved = await this.authService.resolvePermissions(
      reqUser.userId,
      companyId,
      appCode || 'kpital',
    );

    await this.audit.record({
      event: 'switch_company',
      outcome: 'success',
      userId: reqUser.userId,
      email: reqUser.email,
      metadata: { companyId, appCode: appCode || 'kpital' },
    });

    return {
      companyId,
      appCode: appCode || 'kpital',
      permissions: resolved.permissions,
      roles: resolved.roles,
    };
  }

  private setSessionCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    csrfToken: string,
  ): void {
    res.cookie(COOKIE_NAME, accessToken, getCookieOptions(this.config));
    res.cookie(
      REFRESH_COOKIE_NAME,
      refreshToken,
      getRefreshCookieOptions(this.config),
    );
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions(this.config));
  }
}
