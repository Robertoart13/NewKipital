import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ANY_PERMISSIONS_KEY = 'requireAnyPermissions';

/**
 * Decorador para marcar un endpoint con permisos requeridos en modo OR.
 * Uso: @RequireAnyPermissions('permiso:a', 'permiso:b')
 * El PermissionsGuard verifica que el usuario tenga AL MENOS UNO de los permisos listados.
 */
export const RequireAnyPermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRE_ANY_PERMISSIONS_KEY, permissions);
