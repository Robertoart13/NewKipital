import type { DomainEvent } from '../../../common/events/domain-event.interface';

export type RoleAssignedEvent = DomainEvent<{
  userId: string;
  roleId: string;
  companyId: string;
}>;

export type PermissionsChangedEvent = DomainEvent<{
  userId: string;
  companyId: string;
  addedPermissions: string[];
  removedPermissions: string[];
}>;
