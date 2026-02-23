import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator.js';
import { ALLOW_WITHOUT_COMPANY_KEY } from '../decorators/allow-without-company.decorator.js';
import { AuthService } from '../../modules/auth/auth.service.js';

type RequestWithUser = {
  user?: {
    userId?: number;
    permissions?: string[];
    roles?: string[];
  };
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  headers?: Record<string, unknown>;
};

/**
 * Guard que verifica permisos granulares (module:action) por contexto.
 * Requiere companyId + appCode para resolver permisos reales del usuario.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;
    const allowWithoutCompany = this.reflector.getAllAndOverride<boolean | undefined>(
      ALLOW_WITHOUT_COMPANY_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Sesion no valida');
    }

    const companyId = this.resolveCompanyId(request);
    if (!companyId) {
      if (allowWithoutCompany) return true;

      const appCode = this.resolveAppCode(request);
      const resolved = await this.authService.resolvePermissionsAcrossCompanies(userId, appCode);
      const userPermissions = resolved.permissions;

      request.user = {
        ...request.user,
        permissions: resolved.permissions,
        roles: resolved.roles,
      };

      const hasAll = required.every((p) => userPermissions.includes(p));
      if (!hasAll) {
        throw new ForbiddenException(`Permisos insuficientes. Requiere: ${required.join(', ')}`);
      }

      return true;
    }

    const appCode = this.resolveAppCode(request);
    const resolved = await this.authService.resolvePermissions(userId, companyId, appCode);
    const userPermissions = resolved.permissions;

    request.user = {
      ...request.user,
      permissions: resolved.permissions,
      roles: resolved.roles,
    };

    const hasAll = required.every((p) => userPermissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException(`Permisos insuficientes. Requiere: ${required.join(', ')}`);
    }

    return true;
  }

  private resolveCompanyId(request: RequestWithUser): number | null {
    const queryCompany = request.query?.companyId ?? request.query?.idEmpresa;
    const bodyCompany = request.body?.companyId ?? request.body?.idEmpresa;

    const value = queryCompany ?? bodyCompany;
    if (value === undefined || value === null) return null;

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private resolveAppCode(request: RequestWithUser): string {
    const queryApp = request.query?.appCode;
    const bodyApp = request.body?.appCode;
    const headerApp = request.headers?.['x-app-code'];

    const value = (queryApp ?? bodyApp ?? headerApp ?? 'kpital') as string;
    return String(value).trim().toLowerCase() || 'kpital';
  }
}
