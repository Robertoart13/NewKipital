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
    @Query('estado') estado?: string,
  ) {
    const idEmpresa = idEmpresaRaw ? parseInt(idEmpresaRaw, 10) : undefined;
    const est = estado
      ? (parseInt(estado, 10) as PersonalActionEstado)
      : undefined;
    return this.service.findAll(
      user.userId,
      Number.isNaN(idEmpresa!) ? undefined : idEmpresa,
      est,
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

  @RequirePermissions('hr-action-ausencias:edit')
  @Patch('ausencias/:id')
  updateAbsence(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertAbsenceDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.updateAbsence(id, dto, user.userId);
  }

  @RequirePermissions('hr-action-ausencias:edit')
  @Patch('ausencias/:id/advance')
  advanceAbsenceState(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.advanceAbsenceState(id, user.userId);
  }

  @RequirePermissions('hr-action-ausencias:edit')
  @Patch('ausencias/:id/invalidate')
  invalidateAbsence(
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo: string | undefined,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.invalidateAbsence(id, motivo, user.userId);
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
