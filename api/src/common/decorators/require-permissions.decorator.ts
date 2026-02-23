import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';

/**
 * Decorador para marcar un endpoint con permisos requeridos.
 * Uso: @RequirePermissions('payroll:view', 'payroll:create')
 * El PermissionsGuard verifica que el usuario tenga TODOS los permisos listados.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
