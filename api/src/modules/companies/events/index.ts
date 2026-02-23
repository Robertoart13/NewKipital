import { DomainEvent } from '../../../common/events/domain-event.interface.js';

export interface CompanyCreatedEvent extends DomainEvent<{
  companyId: string;
  name: string;
  code: string;
}> {}

export interface CompanyUpdatedEvent extends DomainEvent<{
  companyId: string;
  changes: Record<string, unknown>;
}> {}
