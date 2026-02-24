import { DomainEvent } from '../../../common/events/domain-event.interface';

export interface PersonalActionCreatedEvent extends DomainEvent<{
  actionId: string;
  employeeId: string;
  companyId: string;
  actionType: string;
}> {}

export interface PersonalActionApprovedEvent extends DomainEvent<{
  actionId: string;
  employeeId: string;
  approvedBy: string;
}> {}

export interface SalaryIncreasedEvent extends DomainEvent<{
  employeeId: string;
  companyId: string;
  previousAmount: number;
  newAmount: number;
  effectiveDate: string;
}> {}
