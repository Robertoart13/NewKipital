import {
  Controller, Get, Post, Patch, Param, Body, Query,
  ParseIntPipe, ParseBoolPipe,
} from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { CreatePayrollDto } from './dto/create-payroll.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'payroll' };
  }

  @RequirePermissions('payroll:view')
  @Get()
  findAll(
    @CurrentUser() user: { userId: number },
    @Query('idEmpresa') idEmpresaRaw?: string,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
  ) {
    const idEmpresa = idEmpresaRaw ? parseInt(idEmpresaRaw, 10) : undefined;
    return this.service.findAll(user.userId, Number.isNaN(idEmpresa!) ? undefined : idEmpresa, includeInactive ?? false);
  }

  @RequirePermissions('payroll:view')
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findOne(id, user.userId);
  }

  @RequirePermissions('payroll:create')
  @Post()
  create(@Body() dto: CreatePayrollDto, @CurrentUser() user: { userId: number }) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('payroll:verify')
  @Patch(':id/verify')
  verify(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.verify(id, user.userId);
  }

  @RequirePermissions('payroll:apply')
  @Patch(':id/apply')
  apply(
    @Param('id', ParseIntPipe) id: number,
    @Body('version', new ParseIntPipe({ optional: true })) expectedVersion: number | undefined,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.apply(id, user.userId, expectedVersion);
  }

  @RequirePermissions('payroll:edit')
  @Patch(':id/reopen')
  reopen(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo: string,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.reopen(id, motivo ?? 'Reapertura sin motivo', user.userId);
  }

  @RequirePermissions('payroll:cancel')
  @Patch(':id/inactivate')
  inactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.inactivate(id, user.userId);
  }
}
