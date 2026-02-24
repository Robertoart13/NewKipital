import { DomainEvent } from '../../../common/events/domain-event.interface';

/**
 * Empleado ≠ Usuario.
 * employeeId referencia sys_empleados (registro laboral).
 * userId referencia sys_usuarios (identidad digital, opcional).
 */
export interface EmployeeCreatedEvent extends DomainEvent<{
  employeeId: string;
  companyId: string;
  fullName: string;
  userId?: string;
}> {}

export interface EmployeeMovedEvent extends DomainEvent<{
  employeeId: string;
  fromCompanyId: string;
  toCompanyId: string;
}> {}

export interface EmployeeDeactivatedEvent extends DomainEvent<{
  employeeId: string;
  companyId: string;
  reason: string;
}> {}

/**
 * Se emite cuando cambia el email de un empleado que tiene usuario vinculado.
 * IdentitySyncWorkflow escucha este evento para sincronizar sys_usuarios.
 */
export interface EmployeeEmailChangedEvent extends DomainEvent<{
  employeeId: string;
  userId: string;
  oldEmail: string;
  newEmail: string;
  changedBy: number;
}> {}
