import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayPeriod } from './entities/pay-period.entity';
import { PayrollCalendar } from './entities/payroll-calendar.entity';
import { PayrollEmployeeSnapshot } from './entities/payroll-employee-snapshot.entity';
import { PayrollInputSnapshot } from './entities/payroll-input-snapshot.entity';
import { PayrollResult } from './entities/payroll-result.entity';
import { IntegrationModule } from '../integration/integration.module';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { EmployeesModule } from '../employees/employees.module';
import { PersonalAction } from '../personal-actions/entities/personal-action.entity';
import { PersonalActionsModule } from '../personal-actions/personal-actions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayPeriod,
      PayrollCalendar,
      UserCompany,
      PayrollEmployeeSnapshot,
      PayrollInputSnapshot,
      PayrollResult,
      PersonalAction,
    ]),
    IntegrationModule,
    EmployeesModule,
    PersonalActionsModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
