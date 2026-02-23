/**
 * Catálogo centralizado de nombres de eventos de dominio.
 * Patrón: dominio.accion
 * Fuente: 01-EnfoqueSistema.md — Sección 2.1
 */
export const DOMAIN_EVENTS = {
  EMPLOYEE: {
    CREATED: 'employee.created',
    MOVED: 'employee.moved',
    DEACTIVATED: 'employee.deactivated',
    EMAIL_CHANGED: 'employee.email_changed',
    PAY_PERIOD_CHANGED: 'employee.pay_period_changed',
  },
  PERSONAL_ACTION: {
    CREATED: 'personal-action.created',
    APPROVED: 'personal-action.approved',
    REJECTED: 'personal-action.rejected',
    SCHEDULED: 'personal-action.scheduled',
    CANCELED: 'personal-action.canceled',
  },
  SALARY: {
    INCREASED: 'salary.increased',
  },
  PAYROLL: {
    OPENED: 'payroll.opened',
    VERIFIED: 'payroll.verified',
    APPLIED: 'payroll.applied',
    REOPENED: 'payroll.reopened',
    DEACTIVATED: 'payroll.deactivated',
  },
  COMPANY: {
    CREATED: 'company.created',
    UPDATED: 'company.updated',
  },
  ACCESS_CONTROL: {
    ROLE_ASSIGNED: 'role.assigned',
    PERMISSIONS_CHANGED: 'permissions.changed',
  },
  IDENTITY: {
    LOGIN_UPDATED: 'identity.login_updated',
  },
} as const;
