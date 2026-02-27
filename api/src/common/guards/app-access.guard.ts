import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_APP_KEY } from '../decorators/require-app.decorator';
import type { PlatformApp } from '../constants/apps';

/**
 * Guard que valida que el usuario tenga acceso a la app requerida.
 * Lee el metadata @RequireApp() del controller/handler.
 * Compara contra req.user.enabledApps (inyectado por JWT strategy).
 *
 * Si no hay @RequireApp(), permite el acceso (endpoint compartido).
 * Si el usuario no tiene la app habilitada → 403 Forbidden.
 */
@Injectable()
export class AppAccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredApp = this.reflector.getAllAndOverride<
      PlatformApp | undefined
    >(REQUIRE_APP_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredApp) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.enabledApps) {
      throw new ForbiddenException('No tiene acceso a esta aplicación');
    }

    if (!user.enabledApps.includes(requiredApp)) {
      throw new ForbiddenException(
        `No tiene acceso a la aplicación ${requiredApp}`,
      );
    }

    return true;
  }
}
