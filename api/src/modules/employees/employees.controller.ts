import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'employees' };
  }

  @RequirePermissions('employee:create')
  @Post()
  create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('employee:view')
  @Get('supervisors')
  findSupervisors(@CurrentUser() user: { userId: number }) {
    return this.service.findSupervisors(user.userId);
  }

  @RequirePermissions('employee:view')
  @Get()
  findAll(
    @CurrentUser() user: { userId: number },
    @Query('idEmpresa') idEmpresaRaw?: string,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('idDepartamento') idDepartamento?: string,
    @Query('idPuesto') idPuesto?: string,
    @Query('estado') estado?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('idEmpresas') idEmpresasRaw?: string,
  ) {
    const idEmpresa = idEmpresaRaw ? parseInt(idEmpresaRaw, 10) : undefined;
    const companyIds = idEmpresasRaw
      ? idEmpresasRaw
          .split(',')
          .map((value) => parseInt(value.trim(), 10))
          .filter((n) => !Number.isNaN(n) && n > 0)
      : undefined;
    return this.service.findAll(
      user.userId,
      Number.isNaN(idEmpresa!) ? undefined : idEmpresa,
      {
        includeInactive: includeInactive ?? false,
        page: page ? parseInt(page, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        search: search || undefined,
        idDepartamento: idDepartamento
          ? parseInt(idDepartamento, 10)
          : undefined,
        idPuesto: idPuesto ? parseInt(idPuesto, 10) : undefined,
        estado: estado !== undefined ? parseInt(estado, 10) : undefined,
        sort: sort || undefined,
        order: order ?? undefined,
        companyIds,
      },
    );
  }

  @RequirePermissions('employee:view')
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findOne(id, user.userId);
  }

  @RequirePermissions('employee:edit', 'employee:view-sensitive')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @RequirePermissions('employee:inactivate')
  @Patch(':id/inactivate')
  inactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.inactivate(id, user.userId);
  }

  @RequirePermissions('employee:reactivate')
  @Patch(':id/reactivate')
  reactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.reactivate(id, user.userId);
  }

  @RequirePermissions('employee:edit', 'employee:view-sensitive')
  @Patch(':id/liquidar')
  liquidar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Body('fechaSalida') fechaSalida?: string,
    @Body('motivo') motivo?: string,
  ) {
    return this.service.liquidar(id, user.userId, fechaSalida, motivo);
  }

  @RequirePermissions('config:employees:audit')
  @Get(':id/audit-trail')
  getAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.getAuditTrail(id, user.userId, limit);
  }
}
