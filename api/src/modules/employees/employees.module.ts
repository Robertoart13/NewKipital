import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';
import { CatalogsController } from './catalogs.controller.js';
import { Employee } from './entities/employee.entity.js';
import { Department } from './entities/department.entity.js';
import { Position } from './entities/position.entity.js';
import { PayPeriod } from '../payroll/entities/pay-period.entity.js';
import { UserCompany } from '../access-control/entities/user-company.entity.js';
import { WorkflowsModule } from '../../workflows/workflows.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Department, Position, PayPeriod, UserCompany]),
    WorkflowsModule,
  ],
  controllers: [EmployeesController, CatalogsController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
