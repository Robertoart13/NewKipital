import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../common/events/event-names';
import { PersonalActionAutoInvalidationService } from './personal-action-auto-invalidation.service';
import {
  PERSONAL_ACTION_INVALIDATION_REASON,
  type PersonalActionInvalidationReasonCode,
} from './constants/personal-action-invalidation.constants';

interface EmployeeContextUpdatedEvent {
  payload: {
    employeeId: number;
    changedTermination: boolean;
    changedCompany: boolean;
    changedCurrency: boolean;
  };
}

@Injectable()
export class PersonalActionEmployeeContextListener {
  private readonly logger = new Logger(PersonalActionEmployeeContextListener.name);

  constructor(
    private readonly autoInvalidationService: PersonalActionAutoInvalidationService,
  ) {}

  @OnEvent(DOMAIN_EVENTS.EMPLOYEE.CONTEXT_UPDATED)
  async onEmployeeContextUpdated(event: EmployeeContextUpdatedEvent): Promise<void> {
    const payload = event?.payload;
    if (!payload?.employeeId) return;

    const reasonCodes: PersonalActionInvalidationReasonCode[] = [];
    if (payload.changedTermination) {
      reasonCodes.push(PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE);
    }
    if (payload.changedCompany) {
      reasonCodes.push(PERSONAL_ACTION_INVALIDATION_REASON.COMPANY_MISMATCH);
    }
    if (payload.changedCurrency) {
      reasonCodes.push(PERSONAL_ACTION_INVALIDATION_REASON.CURRENCY_MISMATCH);
    }
    if (reasonCodes.length === 0) return;

    const summary = await this.autoInvalidationService.run({
      source: 'employee_context_hook',
      employeeId: payload.employeeId,
      reasonCodes,
    });

    if (summary.totalInvalidated > 0) {
      this.logger.warn(
        JSON.stringify({
          event: DOMAIN_EVENTS.EMPLOYEE.CONTEXT_UPDATED,
          employeeId: payload.employeeId,
          totalInvalidated: summary.totalInvalidated,
          byReason: summary.byReason,
          sampleActionIds: summary.sampleActionIds,
        }),
      );
    }
  }
}
