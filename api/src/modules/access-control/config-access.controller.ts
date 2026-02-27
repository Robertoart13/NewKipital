import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsService } from './permissions.service';
import { RolesService } from './roles.service';
import { UserAssignmentService } from './user-assignment.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { ReplaceUserContextRolesDto } from './dto/replace-user-context-roles.dto';
import { ReplaceUserGlobalRolesDto } from './dto/replace-user-global-roles.dto';
import { ReplaceUserRoleExclusionsDto } from './dto/replace-user-role-exclusions.dto';
import { ReplaceUserPermissionOverridesDto } from './dto/replace-user-permission-overrides.dto';
import { ReplaceUserGlobalPermissionDenialsDto } from './dto/replace-user-global-permission-denials.dto';
import { ReplaceUserCompaniesDto } from './dto/replace-user-companies.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Company } from '../companies/entities/company.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

/**
 * Endpoints enterprise de administracion bajo prefijo /config.
 * Mantiene compatibilidad con /roles, /permissions y /user-assignments existentes.
 */
@Controller('config')
export class ConfigAccessController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly rolesService: RolesService,
    private readonly userAssignmentService: UserAssignmentService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  @RequirePermissions('config:permissions')
  @Get('permissions/mode')
  getPermissionsCatalogMode() {
    return { mode: this.permissionsService.getCatalogMode() };
  }

  @RequirePermissions('config:permissions')
  @Get('permissions')
  listPermissions(
    @Query('modulo') modulo?: string,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    return this.permissionsService.findAll(modulo, includeInactive ?? true);
  }

  @RequirePermissions('config:permissions')
  @Post('permissions')
  createPermission(
    @Body() dto: CreatePermissionDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.permissionsService.create(dto, user.userId);
  }

  @RequirePermissions('config:permissions')
  @Put('permissions/:id')
  updatePermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.permissionsService.update(id, dto, user.userId);
  }

  @RequirePermissions('config:permissions')
  @Patch('permissions/:id/inactivate')
  inactivatePermission(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.permissionsService.inactivate(id, user.userId);
  }

  @RequirePermissions('config:permissions')
  @Patch('permissions/:id/reactivate')
  reactivatePermission(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.permissionsService.reactivate(id, user.userId);
  }

  @RequirePermissions('config:roles')
  @Get('roles')
  listRoles(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
    @Query('appCode') appCode?: string,
  ) {
    return this.rolesService.findAll(includeInactive ?? false, appCode);
  }

  @RequirePermissions('config:users')
  @Get('users/roles-catalog')
  listRolesForUserConfig(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
    @Query('appCode') appCode?: string,
  ) {
    return this.rolesService.findAll(includeInactive ?? false, appCode);
  }

  @RequirePermissions('config:users')
  @Get('users/companies-catalog')
  listCompaniesForUserConfig() {
    return this.companyRepo.find({
      where: { estado: 1 },
      order: { nombre: 'ASC' },
    });
  }

  @RequirePermissions('config:roles')
  @Post('roles')
  createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.rolesService.create(dto, user.userId);
  }

  @RequirePermissions('config:roles')
  @Patch('roles/:id')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.rolesService.updateMetadata(id, dto, user.userId);
  }

  @RequirePermissions('config:roles')
  @Put('roles/:id/permissions')
  async replaceRolePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceRolePermissionsDto,
    @CurrentUser() user: { userId: number },
  ) {
    const role = await this.rolesService.findOne(id);
    const previousPermissions = await this.rolesService.getPermissions(id);
    const perms = await this.rolesService.replacePermissionsByCodes(
      id,
      dto.permissions,
      user.userId,
    );

    const { added, removed } = this.diffStringSets(
      previousPermissions.map((permission) => permission.codigo),
      perms.map((permission) => permission.codigo),
    );
    const permissionNameByCode = await this.getPermissionNameByCodeMap([
      ...added,
      ...removed,
    ]);

    const details: string[] = [];
    if (added.length > 0) {
      details.push(
        `Se agregaron ${this.formatEntityList(added, permissionNameByCode)}.`,
      );
    }
    if (removed.length > 0) {
      const nombresRetirados = this.formatEntityList(
        removed,
        permissionNameByCode,
      );
      details.push(
        `Se retiraron ${nombresRetirados}. Ya no podrás realizar esas acciones con este rol.`,
      );
    }
    const hayCambios = added.length > 0 || removed.length > 0;

    if (hayCambios) {
      await this.notificationsService.dispatch(
        {
          tipo: 'PERMISSIONS_CHANGED',
          titulo: `Cambios en el rol ${role.nombre}`,
          mensaje: `Se actualizó la matriz de permisos del rol "${role.nombre}". ${details.join(' ')}`,
          scope: 'ROLE',
          idRol: id,
          idApp: role.idApp ?? undefined,
          idUsuariosAdicionales: [user.userId],
        },
        user.userId,
      );
    }

    return perms;
  }

  @RequirePermissions('config:roles')
  @Get('roles/:id/permissions')
  getRolePermissions(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getPermissions(id);
  }

  @RequirePermissions('config:users:assign-companies')
  @Put('users/:id/companies')
  async replaceUserCompanies(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Body() dto: ReplaceUserCompaniesDto,
    @CurrentUser() user: { userId: number },
  ) {
    if (idUsuario === user.userId) {
      throw new ForbiddenException('No puede modificar sus propias empresas');
    }
    const previousAssignments =
      await this.userAssignmentService.getUserCompanies(idUsuario);
    const previousCompanyIds = previousAssignments.map(
      (assignment) => assignment.idEmpresa,
    );

    const result = await this.userAssignmentService.replaceUserCompanies(
      idUsuario,
      dto.companyIds,
      user.userId,
    );
    const { added, removed } = this.diffNumericSets(
      previousCompanyIds,
      result.companyIds,
    );

    if (added.length > 0 || removed.length > 0) {
      const companyNameById = await this.getCompanyNameByIdMap([
        ...added,
        ...removed,
      ]);
      const details: string[] = [];

      if (removed.length > 0) {
        details.push(
          `Se te quito acceso a ${this.formatIdListWithNames(removed, companyNameById)}.`,
        );
      }
      if (added.length > 0) {
        details.push(
          `Se te asigno acceso a ${this.formatIdListWithNames(added, companyNameById)}.`,
        );
      }

      await this.notificationsService.dispatch(
        {
          tipo: 'PERMISSIONS_CHANGED',
          titulo: 'Cambios en tus empresas',
          mensaje: details.join(' '),
          scope: 'USER',
          idUsuarios: [idUsuario],
        },
        user.userId,
      );
    }

    return result;
  }

  @RequirePermissions('config:users')
  @Get('users/:id/roles-summary')
  getUserRolesSummary(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Query('appCode') appCode: string,
  ) {
    return this.userAssignmentService.getUserRolesSummary(idUsuario, appCode);
  }

  @RequirePermissions('config:users')
  @Get('users/:id/audit-trail')
  async getUserAuditTrail(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const safeLimit = Math.min(Math.max(Number(limit ?? 100), 1), 500);
    const userIdAsText = String(idUsuario);
    const rows = await this.companyRepo.query(
      `
      SELECT
        a.id_auditoria_accion AS id,
        a.modulo_auditoria AS modulo,
        a.accion_auditoria AS accion,
        a.entidad_auditoria AS entidad,
        a.id_entidad_auditoria AS entidadId,
        a.id_usuario_actor_auditoria AS actorUserId,
        a.descripcion_auditoria AS descripcion,
        a.fecha_creacion_auditoria AS fechaCreacion,
        a.metadata_auditoria AS metadata,
        CONCAT_WS(' ', actor.nombre_usuario, actor.apellido_usuario) AS actorNombre,
        actor.email_usuario AS actorEmail
      FROM sys_auditoria_acciones a
      LEFT JOIN sys_usuarios actor
        ON actor.id_usuario = a.id_usuario_actor_auditoria
      WHERE
        (
          a.entidad_auditoria IN (
            'user',
            'user_app',
            'user_company',
            'user_role',
            'user_role_global',
            'user_role_exclusion',
            'user_permission_global_deny',
            'user_permission_override'
          )
          AND a.id_entidad_auditoria = ?
        )
        OR JSON_UNQUOTE(JSON_EXTRACT(a.payload_after_auditoria, '$.idUsuario')) = ?
        OR JSON_UNQUOTE(JSON_EXTRACT(a.payload_before_auditoria, '$.idUsuario')) = ?
      ORDER BY a.fecha_creacion_auditoria DESC
      LIMIT ?
      `,
      [userIdAsText, userIdAsText, userIdAsText, safeLimit],
    );

    return (rows ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ''),
      modulo: String(row.modulo ?? ''),
      accion: String(row.accion ?? ''),
      entidad: String(row.entidad ?? ''),
      entidadId: row.entidadId == null ? null : String(row.entidadId),
      actorUserId: row.actorUserId == null ? null : Number(row.actorUserId),
      actorNombre: row.actorNombre ? String(row.actorNombre) : null,
      actorEmail: row.actorEmail ? String(row.actorEmail) : null,
      descripcion: String(row.descripcion ?? ''),
      fechaCreacion: row.fechaCreacion
        ? new Date(String(row.fechaCreacion)).toISOString()
        : null,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    }));
  }

  @RequirePermissions('config:users:assign-roles')
  @Put('users/:id/roles')
  async replaceUserContextRoles(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Body() dto: ReplaceUserContextRolesDto,
    @CurrentUser() user: { userId: number },
  ) {
    const summaryBefore = await this.userAssignmentService.getUserRolesSummary(
      idUsuario,
      dto.appCode,
    );
    const previousRoleIds =
      summaryBefore.contextRoles.find(
        (context) => context.companyId === dto.companyId,
      )?.roleIds ?? [];

    const result = await this.userAssignmentService.replaceUserRolesByContext(
      idUsuario,
      dto.companyId,
      dto.appCode,
      dto.roleIds,
      user.userId,
    );

    const currentRoleIds = [
      ...new Set(result.map((assignment) => assignment.idRol)),
    ];
    const { added, removed } = this.diffNumericSets(
      previousRoleIds,
      currentRoleIds,
    );
    const roleNameById = await this.getRoleNameByIdMap([...added, ...removed]);
    const companyNameById = await this.getCompanyNameByIdMap([dto.companyId]);

    const details: string[] = [];
    if (added.length > 0) {
      details.push(
        `Se te asigno ${this.formatIdListWithNames(added, roleNameById)}.`,
      );
    }
    if (removed.length > 0) {
      details.push(
        `Se te retiro ${this.formatIdListWithNames(removed, roleNameById)}.`,
      );
    }
    if (details.length === 0) {
      details.push('No hubo cambios en tus roles para este contexto.');
    }

    await this.notificationsService.dispatch(
      {
        tipo: 'PERMISSIONS_CHANGED',
        titulo: `Roles actualizados en ${companyNameById.get(dto.companyId) ?? `Empresa #${dto.companyId}`}`,
        mensaje: `${details.join(' ')} Los permisos se reflejan al cambiar de empresa o volver a iniciar sesion.`,
        scope: 'USER',
        idUsuarios: [idUsuario],
      },
      user.userId,
    );

    return result;
  }

  @RequirePermissions('config:users:assign-roles')
  @Put('users/:id/global-roles')
  async replaceUserGlobalRoles(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Body() dto: ReplaceUserGlobalRolesDto,
    @CurrentUser() user: { userId: number },
  ) {
    if (idUsuario === user.userId) {
      throw new ForbiddenException(
        'No puede modificar sus propios roles globales',
      );
    }
    const previous = await this.userAssignmentService.getUserGlobalRoles(
      idUsuario,
      dto.appCode,
    );
    const result = await this.userAssignmentService.replaceUserGlobalRoles(
      idUsuario,
      dto.appCode,
      dto.roleIds,
      user.userId,
    );

    const { added, removed } = this.diffNumericSets(
      previous.roleIds,
      result.roleIds,
    );
    const roleNameById = await this.getRoleNameByIdMap([...added, ...removed]);
    const appLabel = dto.appCode.trim().toUpperCase();

    const details: string[] = [];
    if (added.length > 0) {
      details.push(
        `Se te asigno ${this.formatIdListWithNames(added, roleNameById)}.`,
      );
    }
    if (removed.length > 0) {
      details.push(
        `Se te retiro ${this.formatIdListWithNames(removed, roleNameById)}.`,
      );
    }
    if (details.length === 0) {
      details.push('No hubo cambios en tus roles globales.');
    }

    await this.notificationsService.dispatch(
      {
        tipo: 'PERMISSIONS_CHANGED',
        titulo: `Cambios en tus roles globales (${appLabel})`,
        mensaje: `${details.join(' ')} Ahora puedes gestionar las funciones permitidas por esos roles.`,
        scope: 'USER',
        idUsuarios: [idUsuario],
      },
      user.userId,
    );

    return result;
  }

  @RequirePermissions('config:users:deny-permissions')
  @Put('users/:id/global-permission-denials')
  async replaceUserGlobalPermissionDenials(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Body() dto: ReplaceUserGlobalPermissionDenialsDto,
    @CurrentUser() user: { userId: number },
  ) {
    if (idUsuario === user.userId) {
      throw new ForbiddenException(
        'No puede modificar sus propias denegaciones globales',
      );
    }
    const previous =
      await this.userAssignmentService.getGlobalPermissionDenials(
        idUsuario,
        dto.appCode,
      );
    const result =
      await this.userAssignmentService.replaceGlobalPermissionDenials(
        idUsuario,
        dto.appCode,
        dto.deny ?? [],
        user.userId,
      );

    const { added, removed } = this.diffStringSets(previous.deny, result.deny);
    const permissionNameByCode = await this.getPermissionNameByCodeMap([
      ...added,
      ...removed,
    ]);
    const appLabel = dto.appCode.trim().toUpperCase();

    const details: string[] = [];
    if (added.length > 0) {
      details.push(
        `Se denego ${this.formatEntityList(added, permissionNameByCode)}.`,
      );
    }
    if (removed.length > 0) {
      details.push(
        `Se volvio a habilitar ${this.formatEntityList(removed, permissionNameByCode)}.`,
      );
    }
    if (details.length === 0) {
      details.push('No hubo cambios en tus denegaciones globales.');
    }

    await this.notificationsService.dispatch(
      {
        tipo: 'PERMISSIONS_CHANGED',
        titulo: `Cambios en excepciones globales (${appLabel})`,
        mensaje: `${details.join(' ')} Estas reglas aplican en todas tus empresas para esta aplicacion.`,
        scope: 'USER',
        idUsuarios: [idUsuario],
      },
      user.userId,
    );

    return result;
  }

  @RequirePermissions('config:users')
  @Get('users/:id/global-permission-denials')
  getUserGlobalPermissionDenials(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Query('appCode') appCode: string,
  ) {
    return this.userAssignmentService.getGlobalPermissionDenials(
      idUsuario,
      appCode,
    );
  }

  @RequirePermissions('config:users')
  @Get('users/:id/global-roles')
  getUserGlobalRoles(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Query('appCode') appCode: string,
  ) {
    return this.userAssignmentService.getUserGlobalRoles(idUsuario, appCode);
  }

  @RequirePermissions('config:users:assign-roles')
  @Put('users/:id/role-exclusions')
  async replaceUserRoleExclusions(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Body() dto: ReplaceUserRoleExclusionsDto,
    @CurrentUser() user: { userId: number },
  ) {
    const previous = await this.userAssignmentService.getUserRoleExclusions(
      idUsuario,
      dto.companyId,
      dto.appCode,
    );

    const result = await this.userAssignmentService.replaceUserRoleExclusions(
      idUsuario,
      dto.companyId,
      dto.appCode,
      dto.roleIds,
      user.userId,
    );

    const { added, removed } = this.diffNumericSets(
      previous.roleIds,
      result.roleIds,
    );
    const roleNameById = await this.getRoleNameByIdMap([...added, ...removed]);
    const companyNameById = await this.getCompanyNameByIdMap([dto.companyId]);

    const details: string[] = [];
    if (added.length > 0) {
      details.push(
        `Se excluyo ${this.formatIdListWithNames(added, roleNameById)} para esta empresa.`,
      );
    }
    if (removed.length > 0) {
      details.push(
        `Se elimino la exclusion de ${this.formatIdListWithNames(removed, roleNameById)}.`,
      );
    }
    if (details.length === 0) {
      details.push('No hubo cambios en excepciones de rol.');
    }

    await this.notificationsService.dispatch(
      {
        tipo: 'PERMISSIONS_CHANGED',
        titulo: `Excepciones de rol en ${companyNameById.get(dto.companyId) ?? `Empresa #${dto.companyId}`}`,
        mensaje: details.join(' '),
        scope: 'USER',
        idUsuarios: [idUsuario],
      },
      user.userId,
    );

    return result;
  }

  @RequirePermissions('config:users')
  @Get('users/:id/role-exclusions')
  getUserRoleExclusions(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Query('companyId', ParseIntPipe) companyId: number,
    @Query('appCode') appCode: string,
  ) {
    return this.userAssignmentService.getUserRoleExclusions(
      idUsuario,
      companyId,
      appCode,
    );
  }

  @RequirePermissions('config:permissions')
  @Put('users/:id/permissions')
  async replaceUserPermissionOverrides(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Body() dto: ReplaceUserPermissionOverridesDto,
    @CurrentUser() user: { userId: number },
  ) {
    const previous =
      await this.userAssignmentService.getUserPermissionOverrides(
        idUsuario,
        dto.companyId,
        dto.appCode,
      );

    const result =
      await this.userAssignmentService.replaceUserPermissionOverridesByContext(
        idUsuario,
        dto.companyId,
        dto.appCode,
        dto.allow ?? [],
        dto.deny ?? [],
        user.userId,
      );

    const allowDiff = this.diffStringSets(previous.allow, result.allow);
    const denyDiff = this.diffStringSets(previous.deny, result.deny);
    const permissionNameByCode = await this.getPermissionNameByCodeMap([
      ...allowDiff.added,
      ...allowDiff.removed,
      ...denyDiff.added,
      ...denyDiff.removed,
    ]);
    const companyNameById = await this.getCompanyNameByIdMap([dto.companyId]);

    const details: string[] = [];
    if (allowDiff.added.length > 0) {
      details.push(
        `Se concedio ${this.formatEntityList(allowDiff.added, permissionNameByCode)}.`,
      );
    }
    if (allowDiff.removed.length > 0) {
      details.push(
        `Se retiro la excepcion ALLOW de ${this.formatEntityList(allowDiff.removed, permissionNameByCode)}.`,
      );
    }
    if (denyDiff.added.length > 0) {
      details.push(
        `Se denego ${this.formatEntityList(denyDiff.added, permissionNameByCode)}.`,
      );
    }
    if (denyDiff.removed.length > 0) {
      details.push(
        `Se elimino la denegacion de ${this.formatEntityList(denyDiff.removed, permissionNameByCode)}.`,
      );
    }
    if (details.length === 0) {
      details.push('No hubo cambios en permisos personalizados.');
    }

    await this.notificationsService.dispatch(
      {
        tipo: 'PERMISSIONS_CHANGED',
        titulo: `Permisos personalizados en ${companyNameById.get(dto.companyId) ?? `Empresa #${dto.companyId}`}`,
        mensaje: details.join(' '),
        scope: 'USER',
        idUsuarios: [idUsuario],
      },
      user.userId,
    );

    return result;
  }

  @RequirePermissions('config:permissions')
  @Get('users/:id/permissions')
  getUserPermissionOverrides(
    @Param('id', ParseIntPipe) idUsuario: number,
    @Query('companyId', ParseIntPipe) companyId: number,
    @Query('appCode') appCode: string,
  ) {
    return this.userAssignmentService.getUserPermissionOverrides(
      idUsuario,
      companyId,
      appCode,
    );
  }

  private diffNumericSets(
    previous: number[],
    next: number[],
  ): { added: number[]; removed: number[] } {
    const previousSet = new Set(previous);
    const nextSet = new Set(next);

    const added = [...nextSet]
      .filter((value) => !previousSet.has(value))
      .sort((a, b) => a - b);
    const removed = [...previousSet]
      .filter((value) => !nextSet.has(value))
      .sort((a, b) => a - b);

    return { added, removed };
  }

  private diffStringSets(
    previous: string[],
    next: string[],
  ): { added: string[]; removed: string[] } {
    const previousSet = new Set(
      previous.map((value) => value.trim().toLowerCase()).filter(Boolean),
    );
    const nextSet = new Set(
      next.map((value) => value.trim().toLowerCase()).filter(Boolean),
    );

    const added = [...nextSet]
      .filter((value) => !previousSet.has(value))
      .sort();
    const removed = [...previousSet]
      .filter((value) => !nextSet.has(value))
      .sort();

    return { added, removed };
  }

  private async getCompanyNameByIdMap(
    companyIds: number[],
  ): Promise<Map<number, string>> {
    const uniqueIds = [...new Set(companyIds)].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    if (uniqueIds.length === 0) return new Map();

    const companies = await this.companyRepo.find({
      where: { id: In(uniqueIds) },
    });
    return new Map(companies.map((company) => [company.id, company.nombre]));
  }

  private async getRoleNameByIdMap(
    roleIds: number[],
  ): Promise<Map<number, string>> {
    const uniqueIds = [...new Set(roleIds)].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    if (uniqueIds.length === 0) return new Map();

    const roles = await this.roleRepo.find({ where: { id: In(uniqueIds) } });
    return new Map(roles.map((role) => [role.id, role.nombre]));
  }

  private async getPermissionNameByCodeMap(
    codes: string[],
  ): Promise<Map<string, string>> {
    const normalizedCodes = [
      ...new Set(
        codes.map((code) => code.trim().toLowerCase()).filter(Boolean),
      ),
    ];
    if (normalizedCodes.length === 0) return new Map();

    const permissions = await this.permissionRepo.find({
      where: { codigo: In(normalizedCodes) },
    });
    return new Map(
      permissions.map((permission) => [
        permission.codigo.toLowerCase(),
        permission.nombre,
      ]),
    );
  }

  private formatIdListWithNames(
    ids: number[],
    namesById: Map<number, string>,
  ): string {
    const labels = ids.map((id) => namesById.get(id) ?? `ID ${id}`);
    return this.formatQuotedList(labels);
  }

  private formatEntityList(
    codes: string[],
    namesByCode: Map<string, string>,
  ): string {
    const labels = codes.map((code) => {
      const name = namesByCode.get(code.toLowerCase());
      return name ? `${name} (${code})` : code;
    });
    return this.formatQuotedList(labels);
  }

  private formatQuotedList(values: string[]): string {
    const unique = [
      ...new Set(values.map((value) => value.trim()).filter(Boolean)),
    ];
    if (unique.length === 0) return 'sin elementos';

    const quoted = unique.map((value) => `"${value}"`);
    if (quoted.length === 1) return quoted[0];
    if (quoted.length === 2) return `${quoted[0]} y ${quoted[1]}`;

    const head = quoted.slice(0, -1).join(', ');
    return `${head} y ${quoted[quoted.length - 1]}`;
  }
}
