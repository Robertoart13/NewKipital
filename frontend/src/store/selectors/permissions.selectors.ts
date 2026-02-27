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
  selectPermissions(state).includes('class:view');
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

export const canViewProjects = (state: RootState) =>
  selectPermissions(state).includes('project:view');
export const canCreateProject = (state: RootState) =>
  selectPermissions(state).includes('project:create');
export const canEditProject = (state: RootState) =>
  selectPermissions(state).includes('project:edit');
export const canInactivateProject = (state: RootState) =>
  selectPermissions(state).includes('project:inactivate');
export const canReactivateProject = (state: RootState) =>
  selectPermissions(state).includes('project:reactivate');
export const canViewProjectAudit = (state: RootState) =>
  selectPermissions(state).includes('config:proyectos:audit');

export const canViewAccountingAccounts = (state: RootState) =>
  selectPermissions(state).includes('accounting-account:view');
export const canCreateAccountingAccount = (state: RootState) =>
  selectPermissions(state).includes('accounting-account:create');
export const canEditAccountingAccount = (state: RootState) =>
  selectPermissions(state).includes('accounting-account:edit');
export const canInactivateAccountingAccount = (state: RootState) =>
  selectPermissions(state).includes('accounting-account:inactivate');
export const canReactivateAccountingAccount = (state: RootState) =>
  selectPermissions(state).includes('accounting-account:reactivate');
export const canViewAccountingAccountAudit = (state: RootState) =>
  selectPermissions(state).includes('config:cuentas-contables:audit');

export const canViewPayrollArticles = (state: RootState) =>
  selectPermissions(state).includes('payroll-article:view');
export const canCreatePayrollArticle = (state: RootState) =>
  selectPermissions(state).includes('payroll-article:create');
export const canEditPayrollArticle = (state: RootState) =>
  selectPermissions(state).includes('payroll-article:edit');
export const canInactivatePayrollArticle = (state: RootState) =>
  selectPermissions(state).includes('payroll-article:inactivate');
export const canReactivatePayrollArticle = (state: RootState) =>
  selectPermissions(state).includes('payroll-article:reactivate');
export const canViewPayrollArticleAudit = (state: RootState) =>
  selectPermissions(state).includes('config:payroll-articles:audit');

export const canViewDepartments = (state: RootState) =>
  selectPermissions(state).includes('department:view');
export const canCreateDepartment = (state: RootState) =>
  selectPermissions(state).includes('department:create');
export const canEditDepartment = (state: RootState) =>
  selectPermissions(state).includes('department:edit');
export const canInactivateDepartment = (state: RootState) =>
  selectPermissions(state).includes('department:inactivate');
export const canReactivateDepartment = (state: RootState) =>
  selectPermissions(state).includes('department:reactivate');
export const canViewDepartmentAudit = (state: RootState) =>
  selectPermissions(state).includes('config:departamentos:audit');

export const canViewPositions = (state: RootState) =>
  selectPermissions(state).includes('position:view');
export const canCreatePosition = (state: RootState) =>
  selectPermissions(state).includes('position:create');
export const canEditPosition = (state: RootState) =>
  selectPermissions(state).includes('position:edit');
export const canInactivatePosition = (state: RootState) =>
  selectPermissions(state).includes('position:inactivate');
export const canReactivatePosition = (state: RootState) =>
  selectPermissions(state).includes('position:reactivate');
export const canViewPositionAudit = (state: RootState) =>
  selectPermissions(state).includes('config:puestos:audit');

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
