import type { DomainEvent } from '../../../common/events/domain-event.interface';

export type PersonalActionCreatedEvent = DomainEvent<{
  actionId: string;
  employeeId: string;
  companyId: string;
  actionType: string;
}>;

export type PersonalActionApprovedEvent = DomainEvent<{
  actionId: string;
  employeeId: string;
  approvedBy: string;
}>;

export type SalaryIncreasedEvent = DomainEvent<{
  employeeId: string;
  companyId: string;
  previousAmount: number;
  newAmount: number;
  effectiveDate: string;
}>;
