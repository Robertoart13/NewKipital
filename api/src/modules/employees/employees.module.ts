import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';
import { CatalogsController } from './catalogs.controller.js';
import { Employee } from './entities/employee.entity.js';
import { EmployeeAguinaldoProvision } from './entities/employee-aguinaldo-provision.entity.js';
import { EmployeeIdentityQueue } from './entities/employee-identity-queue.entity.js';
import { EmployeeEncryptQueue } from './entities/employee-encrypt-queue.entity.js';
import { Department } from './entities/department.entity.js';
import { Position } from './entities/position.entity.js';
import { PayPeriod } from '../payroll/entities/pay-period.entity.js';
import { UserCompany } from '../access-control/entities/user-company.entity.js';
import { UserApp } from '../access-control/entities/user-app.entity.js';
import { UserRole } from '../access-control/entities/user-role.entity.js';
import { Role } from '../access-control/entities/role.entity.js';
import { App } from '../access-control/entities/app.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { WorkflowsModule } from '../../workflows/workflows.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { EmployeeSensitiveDataService } from '../../common/services/employee-sensitive-data.service.js';
import { EmployeeDataAutomationWorkerService } from './services/employee-data-automation-worker.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, EmployeeAguinaldoProvision, Department, Position, PayPeriod, UserCompany]),
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
  ],
  controllers: [EmployeesController, CatalogsController],
  providers: [EmployeesService, EmployeeSensitiveDataService, EmployeeDataAutomationWorkerService],
  exports: [EmployeesService, EmployeeDataAutomationWorkerService],
})
export class EmployeesModule {}
