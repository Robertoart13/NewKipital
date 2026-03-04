import type { DomainEvent } from '../../../common/events/domain-event.interface';

export type PayrollOpenedEvent = DomainEvent<{
  payrollId: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
}>;

export type PayrollVerifiedEvent = DomainEvent<{
  payrollId: string;
  companyId: string;
  verifiedBy: string;
}>;

export type PayrollAppliedEvent = DomainEvent<{
  payrollId: string;
  companyId: string;
  appliedBy: string;
  totalAmount: number;
}>;

export type PayrollDeactivatedEvent = DomainEvent<{
  payrollId: string;
  companyId: string;
  reason: string;
}>;
