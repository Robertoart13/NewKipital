import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayPeriod } from './entities/pay-period.entity';
import { PayrollCalendar } from './entities/payroll-calendar.entity';
import { IntegrationModule } from '../integration/integration.module';
import { UserCompany } from '../access-control/entities/user-company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PayPeriod, PayrollCalendar, UserCompany]), IntegrationModule],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
