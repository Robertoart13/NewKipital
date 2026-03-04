import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IntegrationModule } from '../integration/integration.module';

import { PayrollHoliday } from './entities/payroll-holiday.entity';
import { PayrollHolidaysController } from './payroll-holidays.controller';
import { PayrollHolidaysService } from './payroll-holidays.service';

@Module({
  imports: [TypeOrmModule.forFeature([PayrollHoliday]), IntegrationModule],
  controllers: [PayrollHolidaysController],
  providers: [PayrollHolidaysService],
})
export class PayrollHolidaysModule {}
