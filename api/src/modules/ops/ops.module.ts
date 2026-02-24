import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { EmployeeIdentityQueue } from '../employees/entities/employee-identity-queue.entity.js';
import { EmployeeEncryptQueue } from '../employees/entities/employee-encrypt-queue.entity.js';
import { EmployeesModule } from '../employees/employees.module.js';
import { OpsController } from './ops.controller.js';
import { OpsService } from './ops.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, EmployeeIdentityQueue, EmployeeEncryptQueue]),
    EmployeesModule,
  ],
  controllers: [OpsController],
  providers: [OpsService],
})
export class OpsModule {}
