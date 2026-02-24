import { DomainEvent } from '../../../common/events/domain-event.interface';

export interface PayrollOpenedEvent extends DomainEvent<{
  payrollId: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
}> {}

export interface PayrollVerifiedEvent extends DomainEvent<{
  payrollId: string;
  companyId: string;
  verifiedBy: string;
}> {}

export interface PayrollAppliedEvent extends DomainEvent<{
  payrollId: string;
  companyId: string;
  appliedBy: string;
  totalAmount: number;
}> {}

export interface PayrollDeactivatedEvent extends DomainEvent<{
  payrollId: string;
  companyId: string;
  reason: string;
}> {}
