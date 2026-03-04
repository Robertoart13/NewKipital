import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';

import { CacheScope } from '../../common/decorators/cache-scope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CacheResponseInterceptor } from '../../common/interceptors/cache-response.interceptor';

import { PayrollHolidaysService } from './payroll-holidays.service';

import type { CreatePayrollHolidayDto } from './dto/create-payroll-holiday.dto';
import type { UpdatePayrollHolidayDto } from './dto/update-payroll-holiday.dto';

@CacheScope('payroll-holidays')
@UseInterceptors(CacheResponseInterceptor)
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
  create(@Body() dto: CreatePayrollHolidayDto, @CurrentUser() user: { userId: number }) {
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
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.remove(id, user.userId);
  }
}
