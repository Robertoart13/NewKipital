import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmployeesModule } from '../employees/employees.module';
import { EmployeeEncryptQueue } from '../employees/entities/employee-encrypt-queue.entity';
import { EmployeeIdentityQueue } from '../employees/entities/employee-identity-queue.entity';
import { Employee } from '../employees/entities/employee.entity';

import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, EmployeeIdentityQueue, EmployeeEncryptQueue]),
    EmployeesModule,
  ],
  controllers: [OpsController],
  providers: [OpsService],
})
export class OpsModule {}
