/**
 * Estados permitidos para sys_usuarios.
 * Catálogo cerrado — cualquier valor fuera de estos es inválido.
 *
 * ACTIVO:    puede autenticarse y operar normalmente.
 * INACTIVO:  no puede autenticarse, no rompe integridad ni relaciones.
 * BLOQUEADO: demasiados intentos fallidos o bloqueo manual por admin.
 */
export enum UserStatus {
  ACTIVO = 1,
  INACTIVO = 2,
  BLOQUEADO = 3,
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  [UserStatus.ACTIVO]: 'Activo',
  [UserStatus.INACTIVO]: 'Inactivo',
  [UserStatus.BLOQUEADO]: 'Bloqueado',
};
