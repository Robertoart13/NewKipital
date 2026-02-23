import type { RootState } from '../store';
import type { Permission } from '../slices/permissionsSlice';

const selectPermissions = (state: RootState) => state.permissions.permissions;

/**
 * Selectors derivados de permisos.
 * Nunca computar en el componente — siempre usar estos selectors.
 */
export const canCreatePayroll = (state: RootState) =>
  selectPermissions(state).includes('payroll:create');

export const canEditPayroll = (state: RootState) =>
  selectPermissions(state).includes('payroll:edit');

export const canVerifyPayroll = (state: RootState) =>
  selectPermissions(state).includes('payroll:verify');

export const canApplyPayroll = (state: RootState) =>
  selectPermissions(state).includes('payroll:apply');

export const canCancelPayroll = (state: RootState) =>
  selectPermissions(state).includes('payroll:cancel');

export const canViewPayroll = (state: RootState) =>
  selectPermissions(state).includes('payroll:view');

export const canCreateEmployee = (state: RootState) =>
  selectPermissions(state).includes('employee:create');

export const canEditEmployee = (state: RootState) =>
  selectPermissions(state).includes('employee:edit');

export const canViewEmployee = (state: RootState) =>
  selectPermissions(state).includes('employee:view');

export const canCreatePersonalAction = (state: RootState) =>
  selectPermissions(state).includes('personal-action:create');

export const canApprovePersonalAction = (state: RootState) =>
  selectPermissions(state).includes('personal-action:approve');

export const canViewPersonalAction = (state: RootState) =>
  selectPermissions(state).includes('personal-action:view');

export const canViewReports = (state: RootState) =>
  selectPermissions(state).includes('report:view');

export const canManageCompany = (state: RootState) =>
  selectPermissions(state).includes('company:manage');

/**
 * Verifica si el usuario tiene un permiso específico.
 */
export const hasPermission = (state: RootState, permission: Permission) =>
  selectPermissions(state).includes(permission);

/**
 * Verifica permiso por módulo y acción.
 * Ej: hasModuleAction(state, 'payroll', 'create') → payroll:create
 */
export const hasModuleAction = (state: RootState, module: string, action: string) =>
  selectPermissions(state).includes(`${module}:${action}` as Permission);
