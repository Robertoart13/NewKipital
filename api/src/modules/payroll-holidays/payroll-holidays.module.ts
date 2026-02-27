import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollHoliday } from './entities/payroll-holiday.entity';
import { PayrollHolidaysController } from './payroll-holidays.controller';
import { PayrollHolidaysService } from './payroll-holidays.service';
import { IntegrationModule } from '../integration/integration.module';

@Module({
  imports: [TypeOrmModule.forFeature([PayrollHoliday]), IntegrationModule],
  controllers: [PayrollHolidaysController],
  providers: [PayrollHolidaysService],
})
export class PayrollHolidaysModule {}
