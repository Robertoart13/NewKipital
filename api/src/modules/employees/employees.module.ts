import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmployeeSensitiveDataService } from '../../common/services/employee-sensitive-data.service';
import { WorkflowsModule } from '../../workflows/workflows.module';
import { App } from '../access-control/entities/app.entity';
import { Role } from '../access-control/entities/role.entity';
import { UserApp } from '../access-control/entities/user-app.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { UserRole } from '../access-control/entities/user-role.entity';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { IntegrationModule } from '../integration/integration.module';
import { PayPeriod } from '../payroll/entities/pay-period.entity';
import { PayrollCalendar } from '../payroll/entities/payroll-calendar.entity';
import { PersonalAction } from '../personal-actions/entities/personal-action.entity';

import { CatalogsController } from './catalogs.controller';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { Department } from './entities/department.entity';
import { EmployeeAguinaldoProvision } from './entities/employee-aguinaldo-provision.entity';
import { EmployeeEncryptQueue } from './entities/employee-encrypt-queue.entity';
import { EmployeeIdentityQueue } from './entities/employee-identity-queue.entity';
import { EmployeeVacationAccount } from './entities/employee-vacation-account.entity';
import { EmployeeVacationLedger } from './entities/employee-vacation-ledger.entity';
import { EmployeeVacationMonetaryProvision } from './entities/employee-vacation-monetary-provision.entity';
import { Employee } from './entities/employee.entity';
import { Position } from './entities/position.entity';
import { EmployeeDataAutomationWorkerService } from './services/employee-data-automation-worker.service';
import { EmployeeVacationService } from './services/employee-vacation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      EmployeeAguinaldoProvision,
      EmployeeVacationAccount,
      EmployeeVacationLedger,
      EmployeeVacationMonetaryProvision,
      Department,
      Position,
      PayPeriod,
      PayrollCalendar,
      PersonalAction,
      UserCompany,
    ]),
    TypeOrmModule.forFeature([
      EmployeeIdentityQueue,
      EmployeeEncryptQueue,
      User,
      UserApp,
      UserRole,
      Role,
      App,
    ]),
    WorkflowsModule,
    AuthModule,
    IntegrationModule,
  ],
  controllers: [EmployeesController, CatalogsController],
  providers: [
    EmployeesService,
    EmployeeSensitiveDataService,
    EmployeeDataAutomationWorkerService,
    EmployeeVacationService,
  ],
  exports: [
    EmployeesService,
    EmployeeSensitiveDataService,
    EmployeeDataAutomationWorkerService,
    EmployeeVacationService,
  ],
})
export class EmployeesModule {}
