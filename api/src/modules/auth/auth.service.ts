import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, MoreThan, QueryFailedError } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';
import { App } from '../access-control/entities/app.entity.js';
import { UserApp } from '../access-control/entities/user-app.entity.js';
import { UserCompany } from '../access-control/entities/user-company.entity.js';
import { UserRole } from '../access-control/entities/user-role.entity.js';
import { UserRoleGlobal } from '../access-control/entities/user-role-global.entity.js';
import { UserRoleExclusion } from '../access-control/entities/user-role-exclusion.entity.js';
import { Role } from '../access-control/entities/role.entity.js';
import { RolePermission } from '../access-control/entities/role-permission.entity.js';
import { Permission } from '../access-control/entities/permission.entity.js';
import { UserPermissionOverride } from '../access-control/entities/user-permission-override.entity.js';
import { UserPermissionGlobalDeny } from '../access-control/entities/user-permission-global-deny.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import type { TokenPayload } from '../../common/strategies/jwt.strategy.js';
import { RefreshSession } from './entities/refresh-session.entity.js';

export interface SessionData {
  user: {
    id: number;
    email: string;
    nombre: string;
    apellido: string;
    avatarUrl: string | null;
  };
  enabledApps: string[];
  companies: { id: number; nombre: string; codigo: string | null }[];
  permissions: string[];
  roles: string[];
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  session: SessionData;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(UserApp)
    private readonly userAppRepo: Repository<UserApp>,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepo: Repository<UserCompany>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(UserRoleGlobal)
    private readonly userRoleGlobalRepo: Repository<UserRoleGlobal>,
    @InjectRepository(UserRoleExclusion)
    private readonly userRoleExclusionRepo: Repository<UserRoleExclusion>,
    @InjectRepository(RolePermission)
    private readonly rolePermRepo: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(UserPermissionOverride)
    private readonly userPermOverrideRepo: Repository<UserPermissionOverride>,
    @InjectRepository(UserPermissionGlobalDeny)
    private readonly userPermGlobalDenyRepo: Repository<UserPermissionGlobalDeny>,
    @InjectRepository(RefreshSession)
    private readonly refreshSessionRepo: Repository<RefreshSession>,
  ) {}

  async login(email: string, password: string, ip?: string, userAgent?: string): Promise<IssuedSession> {
    let user: User;

    try {
      user = await this.usersService.validateForLogin(email);
    } catch {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.usersService.registerFailedAttempt(user.id);
      throw new UnauthorizedException('Credenciales invalidas');
    }

    await this.usersService.registerSuccessfulLogin(user.id, ip);
    return this.issueSessionTokens(user, ip, userAgent);
  }

  async loginWithMicrosoftIdentity(
    microsoftOid: string,
    microsoftTid: string,
    ip?: string,
    userAgent?: string,
  ): Promise<IssuedSession> {
    const user = await this.usersService.findByMicrosoftIdentity(microsoftOid, microsoftTid);
    if (!user) {
      throw new ForbiddenException('Su cuenta Microsoft no esta aprovisionada en KPITAL');
    }

    await this.usersService.registerSuccessfulLogin(user.id, ip);
    return this.issueSessionTokens(user, ip, userAgent);
  }

  async loginWithMicrosoftValidatedUser(
    microsoftOid: string,
    microsoftTid: string,
    email: string,
    ip?: string,
    userAgent?: string,
  ): Promise<IssuedSession> {
    let user = await this.usersService.findByMicrosoftIdentity(microsoftOid, microsoftTid);

    if (!user) {
      user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new ForbiddenException(
          `Acceso denegado: la cuenta Microsoft (${email}) no existe en KPITAL. Solicite aprovisionamiento a TI/RRHH.`,
        );
      }

      if (!user.microsoftOid || !user.microsoftTid) {
        await this.usersService.bindMicrosoftIdentity(user.id, microsoftOid, microsoftTid);
        user = await this.usersService.findByEmail(email);
      }
    }

    if (!user) {
      throw new ForbiddenException(
        `Acceso denegado: la cuenta Microsoft (${email}) no esta aprovisionada en KPITAL. Solicite aprovisionamiento a TI/RRHH.`,
      );
    }

    await this.usersService.registerSuccessfulLogin(user.id, ip);
    return this.issueSessionTokens(user, ip, userAgent);
  }

  async refreshSession(refreshToken: string, ip?: string, userAgent?: string): Promise<IssuedSession> {
    try {
      const payload = this.verifyRefreshToken(refreshToken);

      const stored = await this.refreshSessionRepo.findOne({
        where: {
          jti: payload.jti,
          userId: payload.sub,
          revokedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        },
      });

      if (!stored) {
        throw new UnauthorizedException('Refresh token invalido o revocado');
      }

      const hashMatches = await bcrypt.compare(refreshToken, stored.tokenHash);
      if (!hashMatches) {
        stored.revokedAt = new Date();
        await this.refreshSessionRepo.save(stored);
        throw new UnauthorizedException('Refresh token invalido o revocado');
      }

      const user = await this.usersService.findByEmail(payload.email);
      if (!user) {
        throw new UnauthorizedException('Sesion invalida');
      }

      const newJti = randomUUID();
      const newRefreshToken = this.signRefreshToken(user, newJti);

      stored.revokedAt = new Date();
      stored.rotatedAt = new Date();
      stored.replacedByJti = newJti;
      await this.refreshSessionRepo.save(stored);

      await this.persistRefreshSession(user.id, newJti, newRefreshToken, ip, userAgent);

      const accessToken = this.signAccessToken(user);
      const session = await this.buildSession(user);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        csrfToken: randomUUID(),
        session,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      if (this.isTransientDatabaseConnectionError(error)) {
        this.logger.warn(
          `Refresh session failed by transient DB connectivity issue (ip=${ip ?? 'unknown'})`,
        );
        throw new UnauthorizedException('Sesion expirada o no valida');
      }
      throw error;
    }
  }

  async revokeRefreshToken(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;

    try {
      const payload = this.verifyRefreshToken(refreshToken);
      await this.refreshSessionRepo.update(
        {
          jti: payload.jti,
          userId: payload.sub,
          revokedAt: IsNull(),
        },
        {
          revokedAt: new Date(),
        },
      );
    } catch {
      // noop intencional
    }
  }

  async buildSession(user: User, companyId?: number, appCode?: string): Promise<SessionData> {
    const enabledApps = await this.getEnabledApps(user.id);
    const companies = await this.getUserCompanies(user.id);

    let permissions: string[] = [];
    let roles: string[] = [];

    if (companyId && appCode) {
      const resolved = await this.resolvePermissions(user.id, companyId, appCode);
      permissions = resolved.permissions;
      roles = resolved.roles;
    } else if (appCode) {
      const resolved = await this.resolvePermissionsAcrossCompanies(user.id, appCode);
      permissions = resolved.permissions;
      roles = resolved.roles;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        avatarUrl: user.avatarUrl,
      },
      enabledApps,
      companies,
      permissions,
      roles,
    };
  }

  async resolvePermissions(
    userId: number,
    companyId: number,
    appCode: string,
  ): Promise<{ permissions: string[]; roles: string[] }> {
    const normalizedAppCode = appCode.trim().toLowerCase();
    const app = await this.appRepo.findOne({ where: { codigo: normalizedAppCode, estado: 1 } });
    if (!app) return { permissions: [], roles: [] };

    const userCompany = await this.userCompanyRepo.findOne({
      where: { idUsuario: userId, idEmpresa: companyId, estado: 1 },
    });
    if (!userCompany) return { permissions: [], roles: [] };

    // Roles por empresa (contexto específico)
    const userRoles = await this.userRoleRepo.find({
      where: { idUsuario: userId, idEmpresa: companyId, idApp: app.id, estado: 1 },
    });
    const perCompanyRoleIds = new Set(userRoles.map((ur) => ur.idRol));

    // Roles globales (opcional: tablas pueden no existir si migración NetSuite no corrió)
    let globalRoleIds: number[] = [];
    try {
      const globalRoles = await this.userRoleGlobalRepo.find({
        where: { idUsuario: userId, idApp: app.id, estado: 1 },
      });
      const exclusions = await this.userRoleExclusionRepo.find({
        where: { idUsuario: userId, idEmpresa: companyId, idApp: app.id, estado: 1 },
      });
      const excludedRoleIds = new Set(exclusions.map((e) => e.idRol));
      globalRoleIds = globalRoles
        .map((gr) => gr.idRol)
        .filter((rid) => !excludedRoleIds.has(rid));
    } catch {
      // sys_usuario_rol_global o sys_usuario_rol_exclusion no existen → solo roles por contexto
    }

    const roleIds = Array.from(new Set([...perCompanyRoleIds, ...globalRoleIds]));

    let basePermissions: string[] = [];
    if (roleIds.length > 0) {
      const rolePerms = await this.rolePermRepo.find({
        where: { idRol: In(roleIds) },
      });

      const permIds = [...new Set(rolePerms.map((rp) => rp.idPermiso))];
      if (permIds.length > 0) {
        const perms = await this.permRepo.find({
          where: { id: In(permIds), estado: 1 },
        });
        basePermissions = perms.map((p) => p.codigo);
      }
    }

    // Overrides ALLOW/DENY (opcional: sys_usuario_permiso puede no existir)
    let overrideRows: { efecto: 'ALLOW' | 'DENY'; codigo: string }[] = [];
    try {
      overrideRows = await this.userPermOverrideRepo
        .createQueryBuilder('up')
        .innerJoin(Permission, 'p', 'p.id = up.idPermiso')
        .select(['up.efecto AS efecto', 'p.codigo AS codigo'])
        .where('up.idUsuario = :userId', { userId })
        .andWhere('up.idEmpresa = :companyId', { companyId })
        .andWhere('up.idApp = :appId', { appId: app.id })
        .andWhere('up.estado = 1')
        .andWhere('p.estado = 1')
        .getRawMany<{ efecto: 'ALLOW' | 'DENY'; codigo: string }>();
    } catch {
      // sys_usuario_permiso no existe
    }

    const allowOverrides = new Set(
      overrideRows.filter((row) => row.efecto === 'ALLOW').map((row) => row.codigo),
    );
    const denyOverrides = new Set(
      overrideRows.filter((row) => row.efecto === 'DENY').map((row) => row.codigo),
    );

    const effective = new Set(basePermissions);
    for (const denied of denyOverrides) {
      effective.delete(denied);
    }
    for (const allowed of allowOverrides) {
      if (!denyOverrides.has(allowed)) {
        effective.add(allowed);
      }
    }

    // Denegación global: si existe, el permiso NUNCA aplica (en ninguna empresa)
    try {
      const globalDenyRows = await this.userPermGlobalDenyRepo
        .createQueryBuilder('g')
        .innerJoin(Permission, 'p', 'p.id = g.idPermiso')
        .select('p.codigo', 'codigo')
        .where('g.idUsuario = :userId', { userId })
        .andWhere('g.idApp = :appId', { appId: app.id })
        .andWhere('g.estado = 1')
        .andWhere('p.estado = 1')
        .getRawMany<{ codigo: string }>();
      for (const row of globalDenyRows) {
        effective.delete(row.codigo);
      }
    } catch {
      // sys_usuario_permiso_global no existe aún
    }

    // Códigos de roles efectivos (ya tenemos roleIds)
    const roleEntities =
      roleIds.length > 0 ? await this.permRepo.manager.find(Role, { where: { id: In(roleIds) } }) : [];
    const uniqueRoleCodes = roleEntities.map((r) => r.codigo);

    return {
      permissions: Array.from(effective).sort(),
      roles: uniqueRoleCodes.sort(),
    };
  }

  async resolvePermissionsAcrossCompanies(
    userId: number,
    appCode: string,
  ): Promise<{ permissions: string[]; roles: string[] }> {
    const userCompanies = await this.userCompanyRepo.find({
      where: { idUsuario: userId, estado: 1 },
    });
    if (userCompanies.length === 0) {
      return { permissions: [], roles: [] };
    }

    const permissionSet = new Set<string>();
    const roleSet = new Set<string>();

    for (const uc of userCompanies) {
      const resolved = await this.resolvePermissions(userId, uc.idEmpresa, appCode);
      for (const permission of resolved.permissions) {
        permissionSet.add(permission);
      }
      for (const role of resolved.roles) {
        roleSet.add(role);
      }
    }

    return {
      permissions: Array.from(permissionSet).sort(),
      roles: Array.from(roleSet).sort(),
    };
  }

  private async getEnabledApps(userId: number): Promise<string[]> {
    const userApps = await this.userAppRepo.find({
      where: { idUsuario: userId, estado: 1 },
    });
    if (userApps.length === 0) return [];

    const appIds = userApps.map((ua) => ua.idApp);
    const apps = await this.appRepo.find({
      where: { id: In(appIds), estado: 1 },
    });
    return apps.map((a) => a.codigo);
  }

  private async getUserCompanies(userId: number): Promise<{ id: number; nombre: string; codigo: string | null }[]> {
    const userCompanies = await this.userCompanyRepo.find({
      where: { idUsuario: userId, estado: 1 },
    });
    if (userCompanies.length === 0) return [];

    const companyIds = userCompanies.map((uc) => uc.idEmpresa);
    const companies = await this.companyRepo.find({
      where: { id: In(companyIds), estado: 1 },
    });
    return companies.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      codigo: c.prefijo ?? null,
    }));
  }

  private async issueSessionTokens(user: User, ip?: string, userAgent?: string): Promise<IssuedSession> {
    const jti = randomUUID();
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user, jti);

    await this.persistRefreshSession(user.id, jti, refreshToken, ip, userAgent);

    const session = await this.buildSession(user);

    return {
      accessToken,
      refreshToken,
      csrfToken: randomUUID(),
      session,
    };
  }

  private signAccessToken(user: User): string {
    const payload: Pick<TokenPayload, 'sub' | 'email' | 'type'> = {
      sub: user.id,
      email: user.email,
      type: 'access',
    };

    return this.jwtService.sign(payload);
  }

  private signRefreshToken(user: User, jti: string): string {
    const payload: Pick<TokenPayload, 'sub' | 'email' | 'type' | 'jti'> = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
      jti,
    };

    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRATION', '30d') as `${number}${
      | 's'
      | 'm'
      | 'h'
      | 'd'}`;

    return this.jwtService.sign(payload, { expiresIn });
  }

  private verifyRefreshToken(token: string): TokenPayload {
    const payload = this.jwtService.verify<TokenPayload>(token, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
    });

    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Refresh token invalido o revocado');
    }

    return payload;
  }

  private async persistRefreshSession(
    userId: number,
    jti: string,
    refreshToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + this.parseDurationToMs(this.config.get<string>('JWT_REFRESH_EXPIRATION', '30d')));

    const session = this.refreshSessionRepo.create({
      jti,
      userId,
      tokenHash,
      expiresAt,
      createdIp: ip ?? null,
      createdUa: userAgent?.slice(0, 255) ?? null,
    });

    await this.refreshSessionRepo.save(session);
  }

  private parseDurationToMs(raw: string): number {
    const match = raw.trim().match(/^(\d+)([smhd])$/i);
    if (!match) return 30 * 24 * 60 * 60 * 1000;

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
      default:
        return value * 24 * 60 * 60 * 1000;
    }
  }

  private isTransientDatabaseConnectionError(error: unknown): boolean {
    const transientCodes = new Set([
      'ECONNRESET',
      'PROTOCOL_CONNECTION_LOST',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EPIPE',
    ]);

    if (error instanceof QueryFailedError) {
      const driverError = (error as QueryFailedError & { driverError?: { code?: string; fatal?: boolean } }).driverError;
      if (driverError?.code && transientCodes.has(driverError.code)) {
        return true;
      }
      if (driverError?.fatal === true) {
        return true;
      }
    }

    if (error instanceof Error) {
      return /ECONNRESET|PROTOCOL_CONNECTION_LOST|ETIMEDOUT|ECONNREFUSED|EPIPE/.test(error.message);
    }

    return false;
  }
}
