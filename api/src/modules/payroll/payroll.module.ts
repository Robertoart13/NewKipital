import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollController } from './payroll.controller.js';
import { PayrollService } from './payroll.service.js';
import { PayPeriod } from './entities/pay-period.entity.js';
import { PayrollCalendar } from './entities/payroll-calendar.entity.js';
import { IntegrationModule } from '../integration/integration.module.js';
import { UserCompany } from '../access-control/entities/user-company.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([PayPeriod, PayrollCalendar, UserCompany]), IntegrationModule],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
