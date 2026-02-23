import {
  Controller, Get, Post, Put, Patch, Param, Body, Query,
  ParseIntPipe, ParseBoolPipe,
} from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

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
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: { userId: number }) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('employee:view')
  @Get()
  findAll(
    @CurrentUser() user: { userId: number },
    @Query('idEmpresa') idEmpresaRaw?: string,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('idDepartamento') idDepartamento?: string,
    @Query('idPuesto') idPuesto?: string,
    @Query('estado') estado?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'ASC' | 'DESC',
  ) {
    const idEmpresa = idEmpresaRaw ? parseInt(idEmpresaRaw, 10) : undefined;
    return this.service.findAll(user.userId, Number.isNaN(idEmpresa!) ? undefined : idEmpresa, {
      includeInactive: includeInactive ?? false,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      search: search || undefined,
      idDepartamento: idDepartamento ? parseInt(idDepartamento, 10) : undefined,
      idPuesto: idPuesto ? parseInt(idPuesto, 10) : undefined,
      estado: estado !== undefined ? parseInt(estado, 10) : undefined,
      sort: sort || undefined,
      order: order ?? undefined,
    });
  }

  @RequirePermissions('employee:view')
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findOne(id, user.userId);
  }

  @RequirePermissions('employee:edit')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @RequirePermissions('employee:edit')
  @Patch(':id/inactivate')
  inactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.inactivate(id, user.userId);
  }

  @RequirePermissions('employee:edit')
  @Patch(':id/liquidar')
  liquidar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Body('fechaSalida') fechaSalida?: string,
    @Body('motivo') motivo?: string,
  ) {
    return this.service.liquidar(id, user.userId, fechaSalida, motivo);
  }
}
