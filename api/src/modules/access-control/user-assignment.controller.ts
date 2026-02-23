import {
  Controller, Get, Post, Put, Patch, Param, Body, Query,
  ParseIntPipe,
} from '@nestjs/common';
import { UserAssignmentService } from './user-assignment.service.js';
import { AssignUserAppDto } from './dto/assign-user-app.dto.js';
import { AssignUserCompanyDto } from './dto/assign-user-company.dto.js';
import { AssignUserRoleDto } from './dto/assign-user-role.dto.js';
import { ReplaceUserContextRolesDto } from './dto/replace-user-context-roles.dto.js';
import { ReplaceUserPermissionOverridesDto } from './dto/replace-user-permission-overrides.dto.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('user-assignments')
export class UserAssignmentController {
  constructor(private readonly service: UserAssignmentService) {}

  // --- Usuario ↔ App ---

  @RequirePermissions('config:users')
  @Post('apps')
  assignApp(@Body() dto: AssignUserAppDto) {
    return this.service.assignApp(dto);
  }

  @RequirePermissions('config:users')
  @Patch('apps/:idUsuario/:idApp/revoke')
  revokeApp(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idApp', ParseIntPipe) idApp: number,
  ) {
    return this.service.revokeApp(idUsuario, idApp);
  }

  @RequirePermissions('config:users')
  @Get('apps/:idUsuario')
  getUserApps(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.service.getUserApps(idUsuario);
  }

  // --- Usuario ↔ Empresa ---

  @RequirePermissions('config:users')
  @Post('companies')
  assignCompany(@Body() dto: AssignUserCompanyDto) {
    return this.service.assignCompany(dto);
  }

  @RequirePermissions('config:users')
  @Patch('companies/:idUsuario/:idEmpresa/revoke')
  revokeCompany(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idEmpresa', ParseIntPipe) idEmpresa: number,
  ) {
    return this.service.revokeCompany(idUsuario, idEmpresa);
  }

  @RequirePermissions('config:users')
  @Get('companies/:idUsuario')
  getUserCompanies(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.service.getUserCompanies(idUsuario);
  }

  // --- Usuario ↔ Rol (scoped Empresa + App) ---

  @RequirePermissions('config:roles')
  @Post('roles')
  assignRole(@Body() dto: AssignUserRoleDto, @CurrentUser() user: { userId: number }) {
    return this.service.assignRole(dto, user.userId);
  }

  @RequirePermissions('config:roles')
  @Patch('roles/:idUsuario/:idRol/:idEmpresa/:idApp/revoke')
  revokeRole(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idRol', ParseIntPipe) idRol: number,
    @Param('idEmpresa', ParseIntPipe) idEmpresa: number,
    @Param('idApp', ParseIntPipe) idApp: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.revokeRole(idUsuario, idRol, idEmpresa, idApp, user.userId);
  }

  @RequirePermissions('config:users')
  @Get('roles/:idUsuario')
  getUserRoles(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Query('idEmpresa', new ParseIntPipe({ optional: true })) idEmpresa?: number,
    @Query('idApp', new ParseIntPipe({ optional: true })) idApp?: number,
  ) {
    return this.service.getUserRoles(idUsuario, idEmpresa, idApp);
  }

  @RequirePermissions('config:roles')
  @Put('roles/:idUsuario/context')
  replaceUserRoles(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Body() dto: ReplaceUserContextRolesDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.replaceUserRolesByContext(
      idUsuario,
      dto.companyId,
      dto.appCode,
      dto.roleIds,
      user.userId,
    );
  }

  @RequirePermissions('config:permissions')
  @Put('permissions/:idUsuario/context')
  replaceUserPermissionOverrides(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Body() dto: ReplaceUserPermissionOverridesDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.replaceUserPermissionOverridesByContext(
      idUsuario,
      dto.companyId,
      dto.appCode,
      dto.allow ?? [],
      dto.deny ?? [],
      user.userId,
    );
  }

  @RequirePermissions('config:permissions')
  @Get('permissions/:idUsuario/context')
  getUserPermissionOverrides(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Query('companyId', ParseIntPipe) companyId: number,
    @Query('appCode') appCode: string,
  ) {
    return this.service.getUserPermissionOverrides(idUsuario, companyId, appCode);
  }
}
