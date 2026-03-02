import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { PersonalActionsService } from './personal-actions.service';
import { CreatePersonalActionDto } from './dto/create-personal-action.dto';
import { UpsertAbsenceDto } from './dto/upsert-absence.dto';
import { UpsertBonusDto } from './dto/upsert-bonus.dto';
import { UpsertDisabilityDto } from './dto/upsert-disability.dto';
import { UpsertLicenseDto } from './dto/upsert-license.dto';
import { UpsertOvertimeDto } from './dto/upsert-overtime.dto';
import { UpsertRetentionDto } from './dto/upsert-retention.dto';
import { UpsertDiscountDto } from './dto/upsert-discount.dto';
import { PersonalActionEstado } from './entities/personal-action.entity';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('personal-actions')
export class PersonalActionsController {
  constructor(private readonly service: PersonalActionsService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'personal-actions' };
  }

  @RequirePermissions('hr_action:view')
  @Get()
  findAll(
    @CurrentUser() user: { userId: number },
    @Query('idEmpresa') idEmpresaRaw?: string,
    @Query('estado') estadoRaw?: string | string[],
  ) {
    const idEmpresa = idEmpresaRaw ? parseInt(idEmpresaRaw, 10) : undefined;
    const estadoList = Array.isArray(estadoRaw)
      ? estadoRaw
      : estadoRaw
        ? [estadoRaw]
        : [];
    const estados = estadoList
      .map((value) => parseInt(String(value), 10))
      .filter((value) => Number.isInteger(value))
      .map((value) => value as PersonalActionEstado);

    return this.service.findAll(
      user.userId,
      Number.isNaN(idEmpresa!) ? undefined : idEmpresa,
      estados.length > 0 ? estados : undefined,
    );
  }

  @RequirePermissions('hr-action-ausencias:view')
  @Get('absence-movements')
  listAbsenceMovements(
    @CurrentUser() user: { userId: number },
    @Query('idEmpresa') idEmpresaRaw?: string,
    @Query('idTipoAccionPersonal') idTipoAccionPersonalRaw?: string,
  ) {
    const idEmpresa = idEmpresaRaw ? parseInt(idEmpresaRaw, 10) : undefined;
    const idTipoAccionPersonal = idTipoAccionPersonalRaw
      ? parseInt(idTipoAccionPersonalRaw, 10)
      : undefined;
    if (
      !idEmpresa ||
      Number.isNaN(idEmpresa) ||
      !idTipoAccionPersonal ||
      Number.isNaN(idTipoAccionPersonal)
    ) {
      return [];
    }
    return this.service.findAbsenceMovementsCatalog(
      user.userId,
      idEmpresa,
      idTipoAccionPersonal,
    );
  }

  @RequirePermissions('hr-action-ausencias:view')
  @Get('absence-employees')
  listAbsenceEmployees(
    @CurrentUser() user: { userId: number },
    @Query('idEmpresa') idEmpresaRaw?: string,
  ) {
    const idEmpresa = idEmpresaRaw ? parseInt(idEmpresaRaw, 10) : undefined;
    if (!idEmpresa || Number.isNaN(idEmpresa)) return [];
    return this.service.findAbsenceEmployeesCatalog(user.userId, idEmpresa);
  }

  @RequirePermissions('hr-action-ausencias:view')
  @Get('ausencias/:id')
  findAbsenceDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findAbsenceDetail(id, user.userId);
  }

  @RequirePermissions('hr-action-licencias:view')
  @Get('licencias/:id')
  findLicenseDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findLicenseDetail(id, user.userId);
  }

  @RequirePermissions('hr-action-incapacidades:view')
  @Get('incapacidades/:id')
  findDisabilityDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findDisabilityDetail(id, user.userId);
  }

  @RequirePermissions('hr-action-bonificaciones:view')
  @Get('bonificaciones/:id')
  findBonusDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findBonusDetail(id, user.userId);
  }

  @RequirePermissions('hr-action-horas-extras:view')
  @Get('horas-extras/:id')
  findOvertimeDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findOvertimeDetail(id, user.userId);
  }

  @RequirePermissions('hr-action-retenciones:view')
  @Get('retenciones/:id')
  findRetentionDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findRetentionDetail(id, user.userId);
  }

  @RequirePermissions('hr-action-descuentos:view')
  @Get('descuentos/:id')
  findDiscountDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findDiscountDetail(id, user.userId);
  }

  @RequirePermissions('hr-action-licencias:view')
  @Get('licencias/:id/audit-trail')
  findLicenseAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? parseInt(limitRaw, 10) : 200;
    return this.service.getLicenseAuditTrail(id, user.userId, limit);
  }

  @RequirePermissions('hr-action-incapacidades:view')
  @Get('incapacidades/:id/audit-trail')
  findDisabilityAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? parseInt(limitRaw, 10) : 200;
    return this.service.getDisabilityAuditTrail(id, user.userId, limit);
  }

  @RequirePermissions('hr-action-bonificaciones:view')
  @Get('bonificaciones/:id/audit-trail')
  findBonusAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? parseInt(limitRaw, 10) : 200;
    return this.service.getBonusAuditTrail(id, user.userId, limit);
  }

  @RequirePermissions('hr-action-horas-extras:view')
  @Get('horas-extras/:id/audit-trail')
  findOvertimeAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? parseInt(limitRaw, 10) : 200;
    return this.service.getOvertimeAuditTrail(id, user.userId, limit);
  }

  @RequirePermissions('hr-action-retenciones:view')
  @Get('retenciones/:id/audit-trail')
  findRetentionAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? parseInt(limitRaw, 10) : 200;
    return this.service.getRetentionAuditTrail(id, user.userId, limit);
  }

  @RequirePermissions('hr-action-descuentos:view')
  @Get('descuentos/:id/audit-trail')
  findDiscountAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? parseInt(limitRaw, 10) : 200;
    return this.service.getDiscountAuditTrail(id, user.userId, limit);
  }

  @RequirePermissions('hr-action-ausencias:view')
  @Get('ausencias/:id/audit-trail')
  findAbsenceAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? parseInt(limitRaw, 10) : 200;
    return this.service.getAbsenceAuditTrail(id, user.userId, limit);
  }

  @RequirePermissions('hr-action-ausencias:view')
  @Get('absence-payrolls')
  listAbsencePayrolls(
    @CurrentUser() user: { userId: number },
    @Query('idEmpresa') idEmpresaRaw?: string,
    @Query('idEmpleado') idEmpleadoRaw?: string,
  ) {
    const idEmpresa = idEmpresaRaw ? parseInt(idEmpresaRaw, 10) : undefined;
    const idEmpleado = idEmpleadoRaw ? parseInt(idEmpleadoRaw, 10) : undefined;
    if (
      !idEmpresa ||
      Number.isNaN(idEmpresa) ||
      !idEmpleado ||
      Number.isNaN(idEmpleado)
    ) {
      return [];
    }
    return this.service.findEligibleAbsencePayrolls(
      user.userId,
      idEmpresa,
      idEmpleado,
    );
  }

  @RequirePermissions('hr_action:view')
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findOne(id, user.userId);
  }

  @RequirePermissions('hr_action:create')
  @Post()
  create(
    @Body() dto: CreatePersonalActionDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('hr-action-ausencias:create')
  @Post('ausencias')
  createAbsence(
    @Body() dto: UpsertAbsenceDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.createAbsence(dto, user.userId);
  }

  @RequirePermissions('hr-action-licencias:create')
  @Post('licencias')
  createLicense(
    @Body() dto: UpsertLicenseDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.createLicense(dto, user.userId);
  }

  @RequirePermissions('hr-action-incapacidades:create')
  @Post('incapacidades')
  createDisability(
    @Body() dto: UpsertDisabilityDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.createDisability(dto, user.userId);
  }

  @RequirePermissions('hr-action-bonificaciones:create')
  @Post('bonificaciones')
  createBonus(
    @Body() dto: UpsertBonusDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.createBonus(dto, user.userId);
  }

  @RequirePermissions('hr-action-horas-extras:create')
  @Post('horas-extras')
  createOvertime(
    @Body() dto: UpsertOvertimeDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.createOvertime(dto, user.userId);
  }

  @RequirePermissions('hr-action-retenciones:create')
  @Post('retenciones')
  createRetention(
    @Body() dto: UpsertRetentionDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.createRetention(dto, user.userId);
  }

  @RequirePermissions('hr-action-descuentos:create')
  @Post('descuentos')
  createDiscount(
    @Body() dto: UpsertDiscountDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.createDiscount(dto, user.userId);
  }

  @RequirePermissions('hr-action-ausencias:edit')
  @Patch('ausencias/:id')
  updateAbsence(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertAbsenceDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.updateAbsence(id, dto, user.userId);
  }

  @RequirePermissions('hr-action-licencias:edit')
  @Patch('licencias/:id')
  updateLicense(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertLicenseDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.updateLicense(id, dto, user.userId);
  }

  @RequirePermissions('hr-action-incapacidades:edit')
  @Patch('incapacidades/:id')
  updateDisability(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertDisabilityDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.updateDisability(id, dto, user.userId);
  }

  @RequirePermissions('hr-action-bonificaciones:edit')
  @Patch('bonificaciones/:id')
  updateBonus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertBonusDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.updateBonus(id, dto, user.userId);
  }

  @RequirePermissions('hr-action-horas-extras:edit')
  @Patch('horas-extras/:id')
  updateOvertime(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertOvertimeDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.updateOvertime(id, dto, user.userId);
  }

  @RequirePermissions('hr-action-retenciones:edit')
  @Patch('retenciones/:id')
  updateRetention(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertRetentionDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.updateRetention(id, dto, user.userId);
  }

  @RequirePermissions('hr-action-descuentos:edit')
  @Patch('descuentos/:id')
  updateDiscount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertDiscountDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.updateDiscount(id, dto, user.userId);
  }

  @RequirePermissions('hr-action-ausencias:view')
  @Patch('ausencias/:id/advance')
  advanceAbsenceState(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { idEmpresa?: number },
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.advanceAbsenceState(
      id,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr-action-licencias:view')
  @Patch('licencias/:id/advance')
  advanceLicenseState(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.advanceLicenseState(
      id,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr-action-incapacidades:view')
  @Patch('incapacidades/:id/advance')
  advanceDisabilityState(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.advanceDisabilityState(
      id,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr-action-bonificaciones:view')
  @Patch('bonificaciones/:id/advance')
  advanceBonusState(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.advanceBonusState(id, user.userId, user.permissions ?? []);
  }

  @RequirePermissions('hr-action-horas-extras:view')
  @Patch('horas-extras/:id/advance')
  advanceOvertimeState(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.advanceOvertimeState(
      id,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr-action-retenciones:view')
  @Patch('retenciones/:id/advance')
  advanceRetentionState(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.advanceRetentionState(
      id,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr-action-descuentos:view')
  @Patch('descuentos/:id/advance')
  advanceDiscountState(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.advanceDiscountState(
      id,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr-action-ausencias:view')
  @Patch('ausencias/:id/invalidate')
  invalidateAbsence(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { idEmpresa?: number; motivo?: string },
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.invalidateAbsence(
      id,
      body?.motivo,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr-action-licencias:view')
  @Patch('licencias/:id/invalidate')
  invalidateLicense(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo?: string },
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.invalidateLicense(
      id,
      body?.motivo,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr-action-incapacidades:view')
  @Patch('incapacidades/:id/invalidate')
  invalidateDisability(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo?: string },
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.invalidateDisability(
      id,
      body?.motivo,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr-action-bonificaciones:view')
  @Patch('bonificaciones/:id/invalidate')
  invalidateBonus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo?: string },
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.invalidateBonus(
      id,
      body?.motivo,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr-action-horas-extras:view')
  @Patch('horas-extras/:id/invalidate')
  invalidateOvertime(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo?: string },
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.invalidateOvertime(
      id,
      body?.motivo,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr-action-retenciones:view')
  @Patch('retenciones/:id/invalidate')
  invalidateRetention(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo?: string },
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.invalidateRetention(
      id,
      body?.motivo,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr-action-descuentos:view')
  @Patch('descuentos/:id/invalidate')
  invalidateDiscount(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo?: string },
    @CurrentUser() user: { userId: number; permissions?: string[] },
  ) {
    return this.service.invalidateDiscount(
      id,
      body?.motivo,
      user.userId,
      user.permissions ?? [],
    );
  }

  @RequirePermissions('hr_action:approve')
  @Patch(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.approve(id, user.userId);
  }

  @RequirePermissions('hr_action:approve')
  @Patch(':id/associate-to-payroll')
  associateToPayroll(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Body('idPlanilla') idPlanilla: number,
    @Body('idCalendarioNomina') idCalendarioNomina?: number,
  ) {
    const calId = idCalendarioNomina ?? idPlanilla; // idPlanilla = idCalendarioNomina (retrocompat)
    return this.service.associateToPayroll(id, calId, user.userId);
  }

  @RequirePermissions('hr_action:approve')
  @Patch(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Body('motivo') motivo?: string,
  ) {
    return this.service.reject(id, motivo ?? '', user.userId);
  }
}
