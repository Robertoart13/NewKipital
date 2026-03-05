import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  ParseBoolPipe,
  UseInterceptors,
} from '@nestjs/common';

import { CacheScope } from '../../common/decorators/cache-scope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CacheResponseInterceptor } from '../../common/interceptors/cache-response.interceptor';

import { PayrollService } from './payroll.service';

import { CreatePayrollDto } from './dto/create-payroll.dto';
import type { PayrollCalendarResponse } from './dto/payroll-response.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';

@CacheScope('payroll')
@UseInterceptors(CacheResponseInterceptor)
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
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
    @Query('inactiveOnly', new ParseBoolPipe({ optional: true }))
    inactiveOnly?: boolean,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ): Promise<PayrollCalendarResponse[]> {
    const idEmpresa = idEmpresaRaw ? parseInt(idEmpresaRaw, 10) : undefined;
    return this.service
      .findAll(
        user.userId,
        Number.isNaN(idEmpresa!) ? undefined : idEmpresa,
        includeInactive ?? false,
        inactiveOnly ?? false,
        fechaDesde,
        fechaHasta,
      )
      .then((rows) => rows.map((row) => this.service.toResponse(row)));
  }

  @RequirePermissions('payroll:view')
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ): Promise<PayrollCalendarResponse> {
    return this.service.findOne(id, user.userId).then((row) => this.service.toResponse(row));
  }

  @RequirePermissions('payroll:create')
  @Post()
  create(
    @Body() dto: CreatePayrollDto,
    @CurrentUser() user: { userId: number },
  ): Promise<PayrollCalendarResponse> {
    return this.service.create(dto, user.userId).then((row) => this.service.toResponse(row));
  }

  @RequirePermissions('payroll:edit')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePayrollDto,
    @CurrentUser() user: { userId: number },
  ): Promise<PayrollCalendarResponse> {
    return this.service.update(id, dto, user.userId).then((row) => this.service.toResponse(row));
  }

  @RequirePermissions('payroll:verify')
  @Patch(':id/verify')
  verify(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ): Promise<PayrollCalendarResponse> {
    return this.service.verify(id, user.userId).then((row) => this.service.toResponse(row));
  }

  @RequirePermissions('payroll:process')
  @Patch(':id/process')
  process(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ): Promise<PayrollCalendarResponse> {
    return this.service.process(id, user.userId).then((row) => this.service.toResponse(row));
  }

  @RequirePermissions('payroll:apply')
  @Patch(':id/apply')
  apply(
    @Param('id', ParseIntPipe) id: number,
    @Body('version', new ParseIntPipe({ optional: true }))
    expectedVersion: number | undefined,
    @CurrentUser() user: { userId: number },
  ): Promise<PayrollCalendarResponse> {
    return this.service
      .apply(id, user.userId, expectedVersion)
      .then((row) => this.service.toResponse(row));
  }

  @RequirePermissions('payroll:edit')
  @Patch(':id/reopen')
  reopen(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo: string,
    @CurrentUser() user: { userId: number },
  ): Promise<PayrollCalendarResponse> {
    return this.service
      .reopen(id, motivo ?? 'Reapertura sin motivo', user.userId)
      .then((row) => this.service.toResponse(row));
  }

  @RequirePermissions('payroll:cancel')
  @Patch(':id/inactivate')
  inactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ): Promise<PayrollCalendarResponse> {
    return this.service.inactivate(id, user.userId).then((row) => this.service.toResponse(row));
  }

  @RequirePermissions('payroll:view')
  @Get(':id/snapshot-summary')
  snapshotSummary(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.getSnapshotSummary(id, user.userId);
  }

  @RequirePermissions('payroll:view')
  @Get(':id/audit-trail')
  getAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit: number | undefined,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.getAuditTrail(id, user.userId, limit);
  }
}
