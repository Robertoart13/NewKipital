import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmployeeSensitiveDataService } from '../common/services/employee-sensitive-data.service';
import { User } from '../modules/auth/entities/user.entity';

import { EmployeeCreationWorkflow } from './employees/employee-creation.workflow';
import { EmployeeMovedWorkflow } from './employees/employee-moved.workflow';
import { IdentitySyncWorkflow } from './identity/identity-sync.workflow';
import { PayrollAppliedWorkflow } from './payroll/payroll-applied.workflow';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    EmployeeCreationWorkflow,
    IdentitySyncWorkflow,
    EmployeeMovedWorkflow,
    PayrollAppliedWorkflow,
    EmployeeSensitiveDataService,
  ],
  exports: [EmployeeCreationWorkflow, IdentitySyncWorkflow],
})
export class WorkflowsModule {}
