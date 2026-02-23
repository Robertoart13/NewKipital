import {
  Controller, Get, Post, Patch, Put, Delete, Param, Body, Query,
  ParseIntPipe, ParseBoolPipe,
} from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { AssignRolePermissionDto } from './dto/assign-role-permission.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'access-control/roles' };
  }

  @RequirePermissions('config:roles')
  @Post()
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: { userId: number }) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('config:roles')
  @Get()
  findAll(@Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean) {
    return this.service.findAll(includeInactive ?? false);
  }

  @RequirePermissions('config:roles')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @RequirePermissions('config:roles')
  @Patch(':id/inactivate')
  inactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.inactivate(id, user.userId);
  }

  @RequirePermissions('config:roles')
  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.reactivate(id, user.userId);
  }

  @RequirePermissions('config:roles')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.updateMetadata(id, dto, user.userId);
  }

  @RequirePermissions('config:permissions')
  @Post(':id/permissions')
  assignPermission(@Param('id', ParseIntPipe) idRol: number, @Body() dto: AssignRolePermissionDto) {
    return this.service.assignPermission({ ...dto, idRol });
  }

  @RequirePermissions('config:permissions')
  @Delete(':idRol/permissions/:idPermiso')
  removePermission(
    @Param('idRol', ParseIntPipe) idRol: number,
    @Param('idPermiso', ParseIntPipe) idPermiso: number,
  ) {
    return this.service.removePermission(idRol, idPermiso);
  }

  @RequirePermissions('config:permissions')
  @Get(':id/permissions')
  getPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPermissions(id);
  }

  @RequirePermissions('config:roles')
  @Put(':id/permissions')
  replacePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceRolePermissionsDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.replacePermissionsByCodes(id, dto.permissions, user.userId);
  }
}
