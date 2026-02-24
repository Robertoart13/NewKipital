import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { CatalogsController } from './catalogs.controller';
import { Employee } from './entities/employee.entity';
import { EmployeeAguinaldoProvision } from './entities/employee-aguinaldo-provision.entity';
import { EmployeeIdentityQueue } from './entities/employee-identity-queue.entity';
import { EmployeeEncryptQueue } from './entities/employee-encrypt-queue.entity';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { PayPeriod } from '../payroll/entities/pay-period.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { UserApp } from '../access-control/entities/user-app.entity';
import { UserRole } from '../access-control/entities/user-role.entity';
import { Role } from '../access-control/entities/role.entity';
import { App } from '../access-control/entities/app.entity';
import { User } from '../auth/entities/user.entity';
import { WorkflowsModule } from '../../workflows/workflows.module';
import { AuthModule } from '../auth/auth.module';
import { EmployeeSensitiveDataService } from '../../common/services/employee-sensitive-data.service';
import { EmployeeDataAutomationWorkerService } from './services/employee-data-automation-worker.service';

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
