import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalActionsController } from './personal-actions.controller';
import { PersonalActionsService } from './personal-actions.service';
import { PersonalAction } from './entities/personal-action.entity';
import { ActionQuota } from './entities/action-quota.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { PayrollCalendar } from '../payroll/entities/payroll-calendar.entity';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [
    EmployeesModule,
    TypeOrmModule.forFeature([
      PersonalAction,
      ActionQuota,
      UserCompany,
      PayrollCalendar,
    ]),
  ],
  controllers: [PersonalActionsController],
  providers: [PersonalActionsService],
})
export class PersonalActionsModule {}
