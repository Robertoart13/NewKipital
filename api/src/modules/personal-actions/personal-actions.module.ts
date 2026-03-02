import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalActionsController } from './personal-actions.controller';
import { PersonalActionsService } from './personal-actions.service';
import { PersonalAction } from './entities/personal-action.entity';
import { ActionQuota } from './entities/action-quota.entity';
import { AbsenceLine } from './entities/absence-line.entity';
import { DisabilityLine } from './entities/disability-line.entity';
import { LicenseLine } from './entities/license-line.entity';
import { BonusLine } from './entities/bonus-line.entity';
import { OvertimeLine } from './entities/overtime-line.entity';
import { RetentionLine } from './entities/retention-line.entity';
import { DiscountLine } from './entities/discount-line.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { PayrollCalendar } from '../payroll/entities/payroll-calendar.entity';
import { EmployeesModule } from '../employees/employees.module';
import { IntegrationModule } from '../integration/integration.module';
import { PersonalActionsHygieneService } from './personal-actions-hygiene.service';
import { PersonalActionAutoInvalidationService } from './personal-action-auto-invalidation.service';
import { PersonalActionEmployeeContextListener } from './personal-action-employee-context.listener';

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
      UserCompany,
      PayrollCalendar,
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
