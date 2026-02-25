import type { RootState } from '../store';
import type { Permission } from '../slices/permissionsSlice';

const selectPermissions = (state: RootState) => state.permissions.permissions;

const hasPermissionWithAliases = (permissions: string[], required: string): boolean => {
  if (permissions.includes(required)) return true;
  if (required.startsWith('company:') && permissions.includes('company:manage')) return true;
  return false;
};

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

export const canInactivateEmployee = (state: RootState) =>
  selectPermissions(state).includes('employee:inactivate');

export const canReactivateEmployee = (state: RootState) =>
  selectPermissions(state).includes('employee:reactivate');

export const canViewEmployeeAudit = (state: RootState) =>
  selectPermissions(state).includes('config:employees:audit');

export const canAssignKpitalRoleOnEmployeeCreate = (state: RootState) =>
  selectPermissions(state).includes('employee:assign-kpital-role');

export const canAssignTimewiseRoleOnEmployeeCreate = (state: RootState) =>
  selectPermissions(state).includes('employee:assign-timewise-role');

export const canCreatePersonalAction = (state: RootState) =>
  selectPermissions(state).includes('personal-action:create');

export const canApprovePersonalAction = (state: RootState) =>
  selectPermissions(state).includes('personal-action:approve');

export const canViewPersonalAction = (state: RootState) =>
  selectPermissions(state).includes('personal-action:view');

export const canViewReports = (state: RootState) =>
  selectPermissions(state).includes('report:view');

export const canManageCompany = (state: RootState) =>
  hasPermissionWithAliases(selectPermissions(state), 'company:manage');
export const canViewCompanies = (state: RootState) =>
  hasPermissionWithAliases(selectPermissions(state), 'company:view');
export const canCreateCompany = (state: RootState) =>
  hasPermissionWithAliases(selectPermissions(state), 'company:create');
export const canEditCompany = (state: RootState) =>
  hasPermissionWithAliases(selectPermissions(state), 'company:edit');
export const canInactivateCompany = (state: RootState) =>
  hasPermissionWithAliases(selectPermissions(state), 'company:inactivate');
export const canReactivateCompany = (state: RootState) =>
  hasPermissionWithAliases(selectPermissions(state), 'company:reactivate');
export const canViewCompanyAudit = (state: RootState) =>
  selectPermissions(state).includes('config:companies:audit');

export const canViewClasses = (state: RootState) =>
  selectPermissions(state).includes('config:clases');
export const canCreateClass = (state: RootState) =>
  selectPermissions(state).includes('class:create');
export const canEditClass = (state: RootState) =>
  selectPermissions(state).includes('class:edit');
export const canInactivateClass = (state: RootState) =>
  selectPermissions(state).includes('class:inactivate');
export const canReactivateClass = (state: RootState) =>
  selectPermissions(state).includes('class:reactivate');
export const canViewClassAudit = (state: RootState) =>
  selectPermissions(state).includes('config:clases:audit');

/** Permisos para ver secciones de configuración (tabs Roles, Usuarios, Permisos) */
export const canViewConfigRoles = (state: RootState) =>
  selectPermissions(state).includes('config:roles');
export const canViewConfigUsers = (state: RootState) =>
  selectPermissions(state).includes('config:users');
export const canViewConfigPermissions = (state: RootState) =>
  selectPermissions(state).includes('config:permissions');

/** Permisos granulares para la configuración de usuarios (drawer) */
export const canAssignCompanies = (state: RootState) =>
  selectPermissions(state).includes('config:users:assign-companies');
export const canAssignApps = (state: RootState) =>
  selectPermissions(state).includes('config:users:assign-apps');
export const canAssignRoles = (state: RootState) =>
  selectPermissions(state).includes('config:users:assign-roles');
export const canDenyPermissions = (state: RootState) =>
  selectPermissions(state).includes('config:users:deny-permissions');

/**
 * Verifica si el usuario tiene un permiso específico.
 */
export const hasPermission = (state: RootState, permission: Permission) =>
  hasPermissionWithAliases(selectPermissions(state), permission);

/**
 * Verifica permiso por módulo y acción.
 * Ej: hasModuleAction(state, 'payroll', 'create') → payroll:create
 */
export const hasModuleAction = (state: RootState, module: string, action: string) =>
  hasPermissionWithAliases(selectPermissions(state), `${module}:${action}` as Permission);
