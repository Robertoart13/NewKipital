import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserCompany } from '../access-control/entities/user-company.entity';
import { EmployeesModule } from '../employees/employees.module';
import { IntegrationModule } from '../integration/integration.module';
import { PayrollCalendar } from '../payroll/entities/payroll-calendar.entity';
import { PayrollEmployeeVerification } from '../payroll/entities/payroll-employee-verification.entity';

import { AbsenceLine } from './entities/absence-line.entity';
import { ActionQuota } from './entities/action-quota.entity';
import { BonusLine } from './entities/bonus-line.entity';
import { DisabilityLine } from './entities/disability-line.entity';
import { DiscountLine } from './entities/discount-line.entity';
import { IncreaseLine } from './entities/increase-line.entity';
import { LicenseLine } from './entities/license-line.entity';
import { OvertimeLine } from './entities/overtime-line.entity';
import { PersonalAction } from './entities/personal-action.entity';
import { RetentionLine } from './entities/retention-line.entity';
import { VacationDate } from './entities/vacation-date.entity';
import { PersonalActionAutoInvalidationService } from './personal-action-auto-invalidation.service';
import { PersonalActionEmployeeContextListener } from './personal-action-employee-context.listener';
import { PersonalActionsHygieneService } from './personal-actions-hygiene.service';
import { PersonalActionsController } from './personal-actions.controller';
import { PersonalActionsService } from './personal-actions.service';

@Module({
  imports: [
    EmployeesModule,
    IntegrationModule,
    TypeOrmModule.forFeature([
      PersonalAction,
      ActionQuota,
      AbsenceLine,
      DisabilityLine,
      LicenseLine,
      BonusLine,
      OvertimeLine,
      RetentionLine,
      DiscountLine,
      IncreaseLine,
      VacationDate,
      UserCompany,
      PayrollCalendar,
      PayrollEmployeeVerification,
    ]),
  ],
  controllers: [PersonalActionsController],
  providers: [
    PersonalActionsService,
    PersonalActionsHygieneService,
    PersonalActionAutoInvalidationService,
    PersonalActionEmployeeContextListener,
  ],
  exports: [PersonalActionAutoInvalidationService],
})
export class PersonalActionsModule {}
