import { DomainEvent } from '../../../common/events/domain-event.interface';

export interface RoleAssignedEvent extends DomainEvent<{
  userId: string;
  roleId: string;
  companyId: string;
}> {}

export interface PermissionsChangedEvent extends DomainEvent<{
  userId: string;
  companyId: string;
  addedPermissions: string[];
  removedPermissions: string[];
}> {}
