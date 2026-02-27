import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PayrollHolidaysService } from './payroll-holidays.service';
import { CreatePayrollHolidayDto } from './dto/create-payroll-holiday.dto';
import { UpdatePayrollHolidayDto } from './dto/update-payroll-holiday.dto';

@Controller('payroll-holidays')
export class PayrollHolidaysController {
  constructor(private readonly service: PayrollHolidaysService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'payroll-holidays' };
  }

  @RequirePermissions('payroll-holiday:view')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @RequirePermissions('payroll-holiday:view')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @RequirePermissions('payroll-holiday:create')
  @Post()
  create(
    @Body() dto: CreatePayrollHolidayDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('payroll-holiday:edit')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePayrollHolidayDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @RequirePermissions('payroll-holiday:delete')
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.remove(id, user.userId);
  }
}

