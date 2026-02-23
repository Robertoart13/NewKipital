import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/auth/entities/user.entity.js';
import { EmployeeCreationWorkflow } from './employees/employee-creation.workflow.js';
import { IdentitySyncWorkflow } from './identity/identity-sync.workflow.js';
import { EmployeeMovedWorkflow } from './employees/employee-moved.workflow.js';
import { PayrollAppliedWorkflow } from './payroll/payroll-applied.workflow.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    EmployeeCreationWorkflow,
    IdentitySyncWorkflow,
    EmployeeMovedWorkflow,
    PayrollAppliedWorkflow,
  ],
  exports: [
    EmployeeCreationWorkflow,
    IdentitySyncWorkflow,
  ],
})
export class WorkflowsModule {}
