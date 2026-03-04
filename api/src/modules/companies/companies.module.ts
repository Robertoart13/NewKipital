import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IntegrationModule } from '../integration/integration.module';
import { PayrollCalendar } from '../payroll/entities/payroll-calendar.entity';

import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, PayrollCalendar]), IntegrationModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
