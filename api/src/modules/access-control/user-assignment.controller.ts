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
  UseInterceptors,
} from '@nestjs/common';

import { CacheScope } from '../../common/decorators/cache-scope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CacheResponseInterceptor } from '../../common/interceptors/cache-response.interceptor';

import type { AssignUserAppDto } from './dto/assign-user-app.dto';
import type { AssignUserCompanyDto } from './dto/assign-user-company.dto';
import type { AssignUserRoleDto } from './dto/assign-user-role.dto';
import type { ReplaceUserContextRolesDto } from './dto/replace-user-context-roles.dto';
import type { ReplaceUserPermissionOverridesDto } from './dto/replace-user-permission-overrides.dto';
import type { UserAssignmentService } from './user-assignment.service';

@CacheScope('user-assignments')
@UseInterceptors(CacheResponseInterceptor)
@Controller('user-assignments')
export class UserAssignmentController {
  constructor(private readonly service: UserAssignmentService) {}

  // --- Usuario ↔ App ---

  @RequirePermissions('config:users:assign-apps')
  @Post('apps')
  assignApp(@Body() dto: AssignUserAppDto, @CurrentUser() user: { userId: number }) {
    return this.service.assignApp(dto, user.userId);
  }

  @RequirePermissions('config:users:assign-apps')
  @Patch('apps/:idUsuario/:idApp/revoke')
  revokeApp(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idApp', ParseIntPipe) idApp: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.revokeApp(idUsuario, idApp, user.userId);
  }

  @RequirePermissions('config:users')
  @Get('apps/:idUsuario')
  getUserApps(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.service.getUserApps(idUsuario);
  }

  // --- Usuario ↔ Empresa ---

  @RequirePermissions('config:users:assign-companies')
  @Post('companies')
  assignCompany(@Body() dto: AssignUserCompanyDto, @CurrentUser() user: { userId: number }) {
    return this.service.assignCompany(dto, user.userId);
  }

  @RequirePermissions('config:users:assign-companies')
  @Patch('companies/:idUsuario/:idEmpresa/revoke')
  revokeCompany(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idEmpresa', ParseIntPipe) idEmpresa: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.revokeCompany(idUsuario, idEmpresa, user.userId);
  }

  @RequirePermissions('config:users')
  @Get('companies/:idUsuario')
  getUserCompanies(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.service.getUserCompanies(idUsuario);
  }

  // --- Usuario ↔ Rol (scoped Empresa + App) ---

  @RequirePermissions('config:users:assign-roles')
  @Post('roles')
  assignRole(@Body() dto: AssignUserRoleDto, @CurrentUser() user: { userId: number }) {
    return this.service.assignRole(dto, user.userId);
  }

  @RequirePermissions('config:users:assign-roles')
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
    @Query('idEmpresa', new ParseIntPipe({ optional: true }))
    idEmpresa?: number,
    @Query('idApp', new ParseIntPipe({ optional: true })) idApp?: number,
  ) {
    return this.service.getUserRoles(idUsuario, idEmpresa, idApp);
  }

  @RequirePermissions('config:users:assign-roles')
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

  @RequirePermissions('config:users:deny-permissions')
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

  @RequirePermissions('config:users:deny-permissions')
  @Get('permissions/:idUsuario/context')
  getUserPermissionOverrides(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Query('companyId', ParseIntPipe) companyId: number,
    @Query('appCode') appCode: string,
  ) {
    return this.service.getUserPermissionOverrides(idUsuario, companyId, appCode);
  }
}
