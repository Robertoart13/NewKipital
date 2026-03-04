import type { DomainEvent } from '../../../common/events/domain-event.interface';

export type CompanyCreatedEvent = DomainEvent<{
  companyId: string;
  name: string;
  code: string;
}>;

export type CompanyUpdatedEvent = DomainEvent<{
  companyId: string;
  changes: Record<string, unknown>;
}>;
