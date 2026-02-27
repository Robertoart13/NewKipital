import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserApp } from './entities/user-app.entity';
import { UserCompany } from './entities/user-company.entity';
import { UserRole } from './entities/user-role.entity';
import { UserRoleGlobal } from './entities/user-role-global.entity';
import { UserRoleExclusion } from './entities/user-role-exclusion.entity';
import { UserPermissionOverride } from './entities/user-permission-override.entity';
import { UserPermissionGlobalDeny } from './entities/user-permission-global-deny.entity';
import { App } from './entities/app.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { AssignUserAppDto } from './dto/assign-user-app.dto';
import { AssignUserCompanyDto } from './dto/assign-user-company.dto';
import { AssignUserRoleDto } from './dto/assign-user-role.dto';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import { AuthzVersionService } from '../authz/authz-version.service';

@Injectable()
export class UserAssignmentService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserApp)
    private readonly userAppRepo: Repository<UserApp>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepo: Repository<UserCompany>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(UserRoleGlobal)
    private readonly userRoleGlobalRepo: Repository<UserRoleGlobal>,
    @InjectRepository(UserRoleExclusion)
    private readonly userRoleExclusionRepo: Repository<UserRoleExclusion>,
    @InjectRepository(UserPermissionOverride)
    private readonly userPermOverrideRepo: Repository<UserPermissionOverride>,
    @InjectRepository(UserPermissionGlobalDeny)
    private readonly userPermGlobalDenyRepo: Repository<UserPermissionGlobalDeny>,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    private readonly auditOutbox: AuditOutboxService,
    private readonly authzVersionService: AuthzVersionService,
  ) {}

  private publishAudit(params: {
    accion: string;
    entidad: string;
    entidadId?: string | number | null;
    actorUserId?: number | null;
    descripcion: string;
    payloadAfter?: Record<string, unknown>;
    payloadBefore?: Record<string, unknown>;
    companyContextId?: number | null;
  }): void {
    this.auditOutbox.publish({
      modulo: 'user_assignments',
      accion: params.accion,
      entidad: params.entidad,
      entidadId: params.entidadId ?? null,
      actorUserId: params.actorUserId ?? null,
      descripcion: params.descripcion,
      payloadBefore: params.payloadBefore ?? null,
      payloadAfter: params.payloadAfter ?? null,
      companyContextId: params.companyContextId ?? null,
    });
  }

  private formatList(values: string[]): string {
    return values.length > 0 ? values.join(', ') : 'sin elementos';
  }

  private async bumpUserAuthz(userId: number): Promise<void> {
    await this.authzVersionService.bumpUsers([userId]);
  }

  private async getUserLabel(userId: number): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return `usuario #${userId}`;
    const fullName = `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim();
    const primary = fullName || user.email || `usuario #${userId}`;
    return `${primary} (ID ${userId})`;
  }

  private async getAppLabel(appId: number): Promise<string> {
    const app = await this.appRepo.findOne({ where: { id: appId } });
    if (!app) return `app #${appId}`;
    return `${app.nombre} (${app.codigo})`;
  }

  private async getCompanyLabel(companyId: number): Promise<string> {
    const rows = await this.userRepo.query(
      `
      SELECT e.nombre_empresa AS nombre
      FROM sys_empresas e
      WHERE e.id_empresa = ?
      LIMIT 1
      `,
      [companyId],
    );
    const name = String(rows?.[0]?.nombre ?? '').trim();
    return name ? `${name} (ID ${companyId})` : `empresa #${companyId}`;
  }

  private async getRoleLabels(roleIds: number[]): Promise<string[]> {
    if (roleIds.length === 0) return [];
    const rows = await this.roleRepo.find({ where: { id: In(roleIds) } });
    const byId = new Map(
      rows.map((role) => [role.id, `${role.nombre} (${role.codigo})`]),
    );
    return roleIds.map((roleId) => byId.get(roleId) ?? `rol #${roleId}`);
  }

  // --- Usuario <-> App ---

  async assignApp(
    dto: AssignUserAppDto,
    actorUserId?: number,
  ): Promise<UserApp> {
    await this.assertUserCanBeMutated(dto.idUsuario, actorUserId, false);
    const existing = await this.userAppRepo.findOne({
      where: { idUsuario: dto.idUsuario, idApp: dto.idApp },
    });
    if (existing) {
      throw new ConflictException('El usuario ya tiene acceso a esa app');
    }
    const ua = this.userAppRepo.create(dto);
    const saved = await this.userAppRepo.save(ua);
    const [userLabel, appLabel] = await Promise.all([
      this.getUserLabel(saved.idUsuario),
      this.getAppLabel(saved.idApp),
    ]);
    this.publishAudit({
      accion: 'assign_app',
      entidad: 'user_app',
      entidadId: `${saved.idUsuario}:${saved.idApp}`,
      actorUserId: actorUserId ?? null,
      descripcion: `Se asignó la aplicación ${appLabel} al usuario ${userLabel}.`,
      payloadAfter: {
        idUsuario: saved.idUsuario,
        idApp: saved.idApp,
        estado: saved.estado,
      },
    });
    await this.bumpUserAuthz(saved.idUsuario);
    return saved;
  }

  async revokeApp(
    idUsuario: number,
    idApp: number,
    actorUserId?: number,
  ): Promise<void> {
    await this.assertUserCanBeMutated(idUsuario, actorUserId, true);
    const ua = await this.userAppRepo.findOne({ where: { idUsuario, idApp } });
    if (!ua) {
      throw new NotFoundException('Asignacion usuario-app no encontrada');
    }
    const activeApps = await this.userAppRepo.count({
      where: { idUsuario, estado: 1 },
    });
    if (ua.estado === 1 && activeApps <= 1) {
      throw new ConflictException(
        'No se puede revocar la ultima aplicacion activa del usuario',
      );
    }
    ua.estado = 0;
    await this.userAppRepo.save(ua);
    const [userLabel, appLabel] = await Promise.all([
      this.getUserLabel(idUsuario),
      this.getAppLabel(idApp),
    ]);
    this.publishAudit({
      accion: 'revoke_app',
      entidad: 'user_app',
      entidadId: `${idUsuario}:${idApp}`,
      actorUserId: actorUserId ?? null,
      descripcion: `Se revocó el acceso a la aplicación ${appLabel} del usuario ${userLabel}.`,
      payloadAfter: { idUsuario, idApp, estado: 0 },
    });
    await this.bumpUserAuthz(idUsuario);
  }

  async getUserApps(idUsuario: number): Promise<UserApp[]> {
    return this.userAppRepo.find({ where: { idUsuario, estado: 1 } });
  }

  // --- Usuario <-> Empresa ---

  async assignCompany(
    dto: AssignUserCompanyDto,
    actorUserId?: number,
  ): Promise<UserCompany> {
    await this.assertUserCanBeMutated(dto.idUsuario, actorUserId, false);
    const existing = await this.userCompanyRepo.findOne({
      where: { idUsuario: dto.idUsuario, idEmpresa: dto.idEmpresa },
    });
    if (existing) {
      throw new ConflictException('El usuario ya esta asignado a esa empresa');
    }
    const uc = this.userCompanyRepo.create(dto);
    const saved = await this.userCompanyRepo.save(uc);
    const [userLabel, companyLabel] = await Promise.all([
      this.getUserLabel(saved.idUsuario),
      this.getCompanyLabel(saved.idEmpresa),
    ]);
    this.publishAudit({
      accion: 'assign_company',
      entidad: 'user_company',
      entidadId: `${saved.idUsuario}:${saved.idEmpresa}`,
      actorUserId: actorUserId ?? null,
      companyContextId: saved.idEmpresa,
      descripcion: `Se asignó la empresa ${companyLabel} al usuario ${userLabel}.`,
      payloadAfter: {
        idUsuario: saved.idUsuario,
        idEmpresa: saved.idEmpresa,
        estado: saved.estado,
      },
    });
    await this.bumpUserAuthz(saved.idUsuario);
    return saved;
  }

  async revokeCompany(
    idUsuario: number,
    idEmpresa: number,
    actorUserId?: number,
  ): Promise<void> {
    await this.assertUserCanBeMutated(idUsuario, actorUserId, true);
    const uc = await this.userCompanyRepo.findOne({
      where: { idUsuario, idEmpresa },
    });
    if (!uc) {
      throw new NotFoundException('Asignacion usuario-empresa no encontrada');
    }
    uc.estado = 0;
    await this.userCompanyRepo.save(uc);
    const [userLabel, companyLabel] = await Promise.all([
      this.getUserLabel(idUsuario),
      this.getCompanyLabel(idEmpresa),
    ]);
    this.publishAudit({
      accion: 'revoke_company',
      entidad: 'user_company',
      entidadId: `${idUsuario}:${idEmpresa}`,
      actorUserId: actorUserId ?? null,
      companyContextId: idEmpresa,
      descripcion: `Se revocó el acceso a la empresa ${companyLabel} del usuario ${userLabel}.`,
      payloadAfter: { idUsuario, idEmpresa, estado: 0 },
    });
    await this.bumpUserAuthz(idUsuario);
  }

  async getUserCompanies(idUsuario: number): Promise<UserCompany[]> {
    return this.userCompanyRepo.find({ where: { idUsuario, estado: 1 } });
  }

  async replaceUserCompanies(
    idUsuario: number,
    companyIds: number[],
    actorUserId?: number,
  ): Promise<{ companyIds: number[] }> {
    await this.assertUserCanBeMutated(idUsuario, actorUserId, true);
    const normalized = [...new Set(companyIds)].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    const existing = await this.userCompanyRepo.find({ where: { idUsuario } });
    const existingById = new Map(existing.map((e) => [e.idEmpresa, e]));
    const targetSet = new Set(normalized);

    const beforeCompanyIds = existing
      .filter((e) => e.estado === 1)
      .map((e) => e.idEmpresa)
      .sort((a, b) => a - b);
    const beforeLabels = await this.getCompanyLabelList(beforeCompanyIds);

    for (const e of existing) {
      if (targetSet.has(e.idEmpresa)) {
        if (e.estado !== 1) {
          e.estado = 1;
          await this.userCompanyRepo.save(e);
        }
      } else {
        e.estado = 0;
        await this.userCompanyRepo.save(e);
      }
    }

    for (const companyId of normalized) {
      if (existingById.has(companyId)) continue;
      await this.userCompanyRepo.save(
        this.userCompanyRepo.create({
          idUsuario,
          idEmpresa: companyId,
          estado: 1,
        }),
      );
    }

    if (normalized.length > 0) {
      await this.ensureUserHasKpitalApp(idUsuario);
    }

    const result = await this.userCompanyRepo.find({
      where: { idUsuario, estado: 1 },
    });
    const companyIdsResult = result
      .map((r) => r.idEmpresa)
      .sort((a, b) => a - b);
    const userLabel = await this.getUserLabel(idUsuario);
    const afterLabels = await this.getCompanyLabelList(companyIdsResult);
    const antes =
      beforeLabels.length > 0 ? this.formatList(beforeLabels) : 'ninguna';
    const despues =
      afterLabels.length > 0 ? this.formatList(afterLabels) : 'ninguna';
    this.publishAudit({
      accion: 'replace_companies',
      entidad: 'user_company',
      entidadId: idUsuario,
      actorUserId: actorUserId ?? null,
      descripcion: `Asignación de empresas modificada para ${userLabel}. Antes: ${antes}. Después: ${despues}.`,
      payloadBefore: { idUsuario, companyIds: beforeCompanyIds },
      payloadAfter: { idUsuario, companyIds: companyIdsResult },
    });
    await this.bumpUserAuthz(idUsuario);
    return { companyIds: companyIdsResult };
  }

  private async getCompanyLabelList(companyIds: number[]): Promise<string[]> {
    if (companyIds.length === 0) return [];
    const labels = await Promise.all(
      companyIds.map((companyId) => this.getCompanyLabel(companyId)),
    );
    return labels;
  }

  private async ensureUserHasKpitalApp(idUsuario: number): Promise<void> {
    const apps = await this.userAppRepo.find({
      where: { idUsuario, estado: 1 },
    });
    if (apps.length > 0) return;

    const kpital = await this.appRepo.findOne({
      where: { codigo: 'kpital', estado: 1 },
    });
    if (!kpital) return;

    const existing = await this.userAppRepo.findOne({
      where: { idUsuario, idApp: kpital.id },
    });
    if (existing) {
      if (existing.estado !== 1) {
        existing.estado = 1;
        await this.userAppRepo.save(existing);
      }
      return;
    }

    await this.userAppRepo.save(
      this.userAppRepo.create({ idUsuario, idApp: kpital.id, estado: 1 }),
    );
  }

  // --- Usuario <-> Rol (scoped por Empresa + App) ---

  async assignRole(
    dto: AssignUserRoleDto,
    creatorId: number,
  ): Promise<UserRole> {
    await this.assertUserCanBeMutated(dto.idUsuario, creatorId, false);
    const existing = await this.userRoleRepo.findOne({
      where: {
        idUsuario: dto.idUsuario,
        idRol: dto.idRol,
        idEmpresa: dto.idEmpresa,
        idApp: dto.idApp,
      },
    });
    if (existing) {
      throw new ConflictException(
        'El usuario ya tiene ese rol en esa empresa y app',
      );
    }

    const ur = this.userRoleRepo.create({
      ...dto,
      estado: 1,
      creadoPor: creatorId,
      modificadoPor: creatorId,
    });
    const saved = await this.userRoleRepo.save(ur);
    await this.bumpUserAuthz(dto.idUsuario);
    return saved;
  }

  async revokeRole(
    idUsuario: number,
    idRol: number,
    idEmpresa: number,
    idApp: number,
    modifierId: number,
  ): Promise<void> {
    await this.assertUserCanBeMutated(idUsuario, modifierId, true);
    const ur = await this.userRoleRepo.findOne({
      where: { idUsuario, idRol, idEmpresa, idApp },
    });
    if (!ur) {
      throw new NotFoundException('Asignacion usuario-rol no encontrada');
    }
    ur.estado = 0;
    ur.modificadoPor = modifierId;
    await this.userRoleRepo.save(ur);
    await this.bumpUserAuthz(idUsuario);
  }

  async getUserRoles(
    idUsuario: number,
    idEmpresa?: number,
    idApp?: number,
  ): Promise<UserRole[]> {
    const qb = this.userRoleRepo
      .createQueryBuilder('ur')
      .where('ur.idUsuario = :idUsuario', { idUsuario })
      .andWhere('ur.estado = 1');

    if (idEmpresa) {
      qb.andWhere('ur.idEmpresa = :idEmpresa', { idEmpresa });
    }
    if (idApp) {
      qb.andWhere('ur.idApp = :idApp', { idApp });
    }

    return qb.getMany();
  }

  async replaceUserRolesByContext(
    idUsuario: number,
    companyId: number,
    appCode: string,
    roleIds: number[],
    modifierId: number,
  ): Promise<UserRole[]> {
    await this.assertUserCanBeMutated(idUsuario, modifierId, true);
    const appId = await this.resolveAppId(appCode);
    await this.ensureUserCompanyAccess(idUsuario, companyId);

    const normalizedRoleIds = [...new Set(roleIds)];
    if (normalizedRoleIds.length > 0) {
      const existingRoles = await this.roleRepo.find({
        where: { id: In(normalizedRoleIds), estado: 1, idApp: appId },
      });
      if (existingRoles.length !== normalizedRoleIds.length) {
        const found = new Set(existingRoles.map((role) => role.id));
        const missing = normalizedRoleIds.filter(
          (roleId) => !found.has(roleId),
        );
        throw new NotFoundException(
          `Roles no encontrados o inactivos: ${missing.join(', ')}`,
        );
      }
    }

    const existingAssignments = await this.userRoleRepo.find({
      where: { idUsuario, idEmpresa: companyId, idApp: appId },
    });
    const byRoleId = new Map(
      existingAssignments.map((assignment) => [assignment.idRol, assignment]),
    );
    const beforeRoleIds = existingAssignments
      .filter((a) => a.estado === 1)
      .map((a) => a.idRol);
    const beforeRoleLabels = await this.getRoleLabels(beforeRoleIds);

    for (const assignment of existingAssignments) {
      if (
        !normalizedRoleIds.includes(assignment.idRol) &&
        assignment.estado === 1
      ) {
        assignment.estado = 0;
        assignment.modificadoPor = modifierId;
        await this.userRoleRepo.save(assignment);
      }
    }

    for (const roleId of normalizedRoleIds) {
      const existing = byRoleId.get(roleId);
      if (existing) {
        if (existing.estado !== 1) {
          existing.estado = 1;
        }
        existing.modificadoPor = modifierId;
        await this.userRoleRepo.save(existing);
        continue;
      }

      await this.userRoleRepo.save(
        this.userRoleRepo.create({
          idUsuario,
          idRol: roleId,
          idEmpresa: companyId,
          idApp: appId,
          estado: 1,
          creadoPor: modifierId,
          modificadoPor: modifierId,
        }),
      );
    }

    const result = await this.getUserRoles(idUsuario, companyId, appId);
    const [userLabel, companyLabel, afterRoleLabels] = await Promise.all([
      this.getUserLabel(idUsuario),
      this.getCompanyLabel(companyId),
      this.getRoleLabels(result.map((r) => r.idRol)),
    ]);
    const appCodeNorm = appCode.trim().toLowerCase();
    const antes =
      beforeRoleLabels.length > 0
        ? this.formatList(beforeRoleLabels)
        : 'ninguno';
    const despues =
      afterRoleLabels.length > 0 ? this.formatList(afterRoleLabels) : 'ninguno';
    this.publishAudit({
      accion: 'replace_context_roles',
      entidad: 'user_role',
      entidadId: idUsuario,
      actorUserId: modifierId,
      companyContextId: companyId,
      descripcion: `Roles modificados para ${userLabel} en ${companyLabel} (${appCodeNorm}). Antes: ${antes}. Después: ${despues}.`,
      payloadBefore: {
        idUsuario,
        companyId,
        appCode: appCodeNorm,
        roleIds: beforeRoleIds,
      },
      payloadAfter: {
        idUsuario,
        companyId,
        appCode: appCodeNorm,
        roleIds: result.map((r) => r.idRol),
      },
    });
    await this.bumpUserAuthz(idUsuario);
    return result;
  }

  async replaceUserGlobalRoles(
    idUsuario: number,
    appCode: string,
    roleIds: number[],
    modifierId: number,
  ): Promise<{ appCode: string; roleIds: number[] }> {
    await this.assertUserCanBeMutated(idUsuario, modifierId, true);
    const appId = await this.resolveAppId(appCode);

    const normalizedRoleIds = [...new Set(roleIds)];
    if (normalizedRoleIds.length > 0) {
      const existingRoles = await this.roleRepo.find({
        where: { id: In(normalizedRoleIds), estado: 1, idApp: appId },
      });
      if (existingRoles.length !== normalizedRoleIds.length) {
        const found = new Set(existingRoles.map((r) => r.id));
        const missing = normalizedRoleIds.filter((rid) => !found.has(rid));
        throw new NotFoundException(
          `Roles no encontrados o inactivos: ${missing.join(', ')}`,
        );
      }
    }

    const existing = await this.userRoleGlobalRepo.find({
      where: { idUsuario, idApp: appId },
    });
    const byRoleId = new Map(existing.map((g) => [g.idRol, g]));
    const beforeRoleIds = existing.filter((g) => g.estado === 1).map((g) => g.idRol);
    const beforeRoleLabels = await this.getRoleLabels(beforeRoleIds);

    for (const g of existing) {
      if (g.estado === 1 && !normalizedRoleIds.includes(g.idRol)) {
        g.estado = 0;
        g.modificadoPor = modifierId;
        await this.userRoleGlobalRepo.save(g);
      }
    }

    for (const roleId of normalizedRoleIds) {
      const ex = byRoleId.get(roleId);
      if (ex) {
        if (ex.estado !== 1) {
          ex.estado = 1;
          ex.modificadoPor = modifierId;
          await this.userRoleGlobalRepo.save(ex);
        }
        continue;
      }
      await this.userRoleGlobalRepo.save(
        this.userRoleGlobalRepo.create({
          idUsuario,
          idApp: appId,
          idRol: roleId,
          estado: 1,
          creadoPor: modifierId,
          modificadoPor: modifierId,
        }),
      );
    }

    const result = {
      appCode: appCode.trim().toLowerCase(),
      roleIds: normalizedRoleIds,
    };
    const [userLabel, afterRoleLabels] = await Promise.all([
      this.getUserLabel(idUsuario),
      this.getRoleLabels(normalizedRoleIds),
    ]);
    const antes =
      beforeRoleLabels.length > 0
        ? this.formatList(beforeRoleLabels)
        : 'ninguno';
    const despues =
      afterRoleLabels.length > 0 ? this.formatList(afterRoleLabels) : 'ninguno';
    this.publishAudit({
      accion: 'replace_global_roles',
      entidad: 'user_role_global',
      entidadId: idUsuario,
      actorUserId: modifierId,
      descripcion: `Roles globales modificados para ${userLabel} (app ${result.appCode}). Antes: ${antes}. Después: ${despues}.`,
      payloadBefore: {
        idUsuario,
        appCode: result.appCode,
        roleIds: beforeRoleIds,
      },
      payloadAfter: { idUsuario, ...result },
    });
    await this.bumpUserAuthz(idUsuario);
    return result;
  }

  async getUserGlobalRoles(
    idUsuario: number,
    appCode: string,
  ): Promise<{ appCode: string; roleIds: number[] }> {
    const appId = await this.resolveAppId(appCode);
    const rows = await this.userRoleGlobalRepo.find({
      where: { idUsuario, idApp: appId, estado: 1 },
    });
    return {
      appCode: appCode.trim().toLowerCase(),
      roleIds: rows.map((r) => r.idRol),
    };
  }

  async replaceUserRoleExclusions(
    idUsuario: number,
    companyId: number,
    appCode: string,
    roleIds: number[],
    modifierId: number,
  ): Promise<{ companyId: number; appCode: string; roleIds: number[] }> {
    await this.assertUserCanBeMutated(idUsuario, modifierId, true);
    const appId = await this.resolveAppId(appCode);
    await this.ensureUserCompanyAccess(idUsuario, companyId);

    const normalizedRoleIds = [...new Set(roleIds)];
    if (normalizedRoleIds.length > 0) {
      const existingRoles = await this.roleRepo.find({
        where: { id: In(normalizedRoleIds), estado: 1, idApp: appId },
      });
      if (existingRoles.length !== normalizedRoleIds.length) {
        const found = new Set(existingRoles.map((r) => r.id));
        const missing = normalizedRoleIds.filter((rid) => !found.has(rid));
        throw new NotFoundException(
          `Roles no encontrados o inactivos: ${missing.join(', ')}`,
        );
      }
    }

    const existing = await this.userRoleExclusionRepo.find({
      where: { idUsuario, idEmpresa: companyId, idApp: appId, estado: 1 },
    });
    const byRoleId = new Map(existing.map((e) => [e.idRol, e]));
    const beforeRoleIds = existing.map((e) => e.idRol);
    const beforeRoleLabels = await this.getRoleLabels(beforeRoleIds);

    for (const e of existing) {
      if (!normalizedRoleIds.includes(e.idRol)) {
        e.estado = 0;
        e.modificadoPor = modifierId;
        await this.userRoleExclusionRepo.save(e);
      }
    }

    for (const roleId of normalizedRoleIds) {
      if (byRoleId.has(roleId)) continue;
      await this.userRoleExclusionRepo.save(
        this.userRoleExclusionRepo.create({
          idUsuario,
          idEmpresa: companyId,
          idApp: appId,
          idRol: roleId,
          estado: 1,
          creadoPor: modifierId,
          modificadoPor: modifierId,
        }),
      );
    }

    const result = {
      companyId,
      appCode: appCode.trim().toLowerCase(),
      roleIds: normalizedRoleIds,
    };
    const [userLabel, companyLabel, afterRoleLabels] = await Promise.all([
      this.getUserLabel(idUsuario),
      this.getCompanyLabel(companyId),
      this.getRoleLabels(normalizedRoleIds),
    ]);
    const antes =
      beforeRoleLabels.length > 0
        ? this.formatList(beforeRoleLabels)
        : 'ninguno';
    const despues =
      afterRoleLabels.length > 0 ? this.formatList(afterRoleLabels) : 'ninguno';
    this.publishAudit({
      accion: 'replace_role_exclusions',
      entidad: 'user_role_exclusion',
      entidadId: idUsuario,
      actorUserId: modifierId,
      companyContextId: companyId,
      descripcion: `Exclusiones de rol modificadas para ${userLabel} en ${companyLabel} (${result.appCode}). Antes: ${antes}. Después: ${despues}.`,
      payloadBefore: {
        idUsuario,
        companyId,
        appCode: result.appCode,
        roleIds: beforeRoleIds,
      },
      payloadAfter: { idUsuario, ...result },
    });
    await this.bumpUserAuthz(idUsuario);
    return result;
  }

  async getUserRoleExclusions(
    idUsuario: number,
    companyId: number,
    appCode: string,
  ): Promise<{ companyId: number; appCode: string; roleIds: number[] }> {
    const appId = await this.resolveAppId(appCode);
    const rows = await this.userRoleExclusionRepo.find({
      where: { idUsuario, idEmpresa: companyId, idApp: appId, estado: 1 },
    });
    return {
      companyId,
      appCode: appCode.trim().toLowerCase(),
      roleIds: rows.map((r) => r.idRol),
    };
  }

  /** Resumen completo para UI: roles por contexto, globales, exclusions, global deny y permission overrides */
  async getUserRolesSummary(
    idUsuario: number,
    appCode: string,
  ): Promise<{
    appCode: string;
    globalRoleIds: number[];
    globalPermissionDeny: string[];
    contextRoles: { companyId: number; roleIds: number[] }[];
    exclusions: { companyId: number; roleIds: number[] }[];
    permissionOverrides: {
      companyId: number;
      allow: string[];
      deny: string[];
    }[];
  }> {
    const appId = await this.resolveAppId(appCode);
    const companies = await this.userCompanyRepo.find({
      where: { idUsuario, estado: 1 },
    });
    const companyIds = companies.map((c) => c.idEmpresa);

    // contextRolesRaw siempre existe (sys_usuario_rol)
    const contextRolesRaw = await this.userRoleRepo.find({
      where: { idUsuario, idApp: appId, estado: 1 },
    });

    // Tablas NetSuite y global-deny pueden no existir en BD
    let globalRoles: Awaited<ReturnType<typeof this.userRoleGlobalRepo.find>> =
      [];
    let exclusionsRaw: Awaited<
      ReturnType<typeof this.userRoleExclusionRepo.find>
    > = [];
    let overridesRaw: Awaited<
      ReturnType<typeof this.userPermOverrideRepo.find>
    > = [];
    let globalDenyRaw: Awaited<
      ReturnType<typeof this.userPermGlobalDenyRepo.find>
    > = [];
    try {
      [globalRoles, exclusionsRaw, overridesRaw, globalDenyRaw] =
        await Promise.all([
          this.userRoleGlobalRepo.find({
            where: { idUsuario, idApp: appId, estado: 1 },
          }),
          this.userRoleExclusionRepo.find({
            where: { idUsuario, idApp: appId, estado: 1 },
          }),
          this.userPermOverrideRepo.find({
            where: { idUsuario, idApp: appId, estado: 1 },
          }),
          this.userPermGlobalDenyRepo.find({
            where: { idUsuario, idApp: appId, estado: 1 },
          }),
        ]);
    } catch {
      // sys_usuario_rol_global, sys_usuario_rol_exclusion, sys_usuario_permiso o sys_usuario_permiso_global no existen
    }

    const byCompanyContext = new Map<number, number[]>();
    for (const cr of contextRolesRaw) {
      if (!companyIds.includes(cr.idEmpresa)) continue;
      const arr = byCompanyContext.get(cr.idEmpresa) ?? [];
      if (!arr.includes(cr.idRol)) arr.push(cr.idRol);
      byCompanyContext.set(cr.idEmpresa, arr);
    }

    const byCompanyExclusion = new Map<number, number[]>();
    for (const ex of exclusionsRaw) {
      if (!companyIds.includes(ex.idEmpresa)) continue;
      const arr = byCompanyExclusion.get(ex.idEmpresa) ?? [];
      if (!arr.includes(ex.idRol)) arr.push(ex.idRol);
      byCompanyExclusion.set(ex.idEmpresa, arr);
    }

    const permByCode = new Map<number, string>();
    if (overridesRaw.length > 0) {
      const permIds = [...new Set(overridesRaw.map((o) => o.idPermiso))];
      const perms = await this.permRepo.find({ where: { id: In(permIds) } });
      perms.forEach((p) => permByCode.set(p.id, p.codigo));
    }

    const byCompanyOverrides = new Map<
      number,
      { allow: string[]; deny: string[] }
    >();
    for (const o of overridesRaw) {
      if (!companyIds.includes(o.idEmpresa)) continue;
      const cur = byCompanyOverrides.get(o.idEmpresa) ?? {
        allow: [],
        deny: [],
      };
      const code = permByCode.get(o.idPermiso);
      if (code) {
        if (o.efecto === 'ALLOW') cur.allow.push(code);
        else cur.deny.push(code);
      }
      byCompanyOverrides.set(o.idEmpresa, cur);
    }

    let globalDenyCodes: string[] = [];
    if (globalDenyRaw.length > 0) {
      const gPermIds = [...new Set(globalDenyRaw.map((g) => g.idPermiso))];
      const gPerms = await this.permRepo.find({ where: { id: In(gPermIds) } });
      globalDenyCodes = gPerms.map((p) => p.codigo).sort();
    }

    return {
      appCode: appCode.trim().toLowerCase(),
      globalRoleIds: globalRoles.map((g) => g.idRol),
      globalPermissionDeny: globalDenyCodes,
      contextRoles: companyIds.map((cid) => ({
        companyId: cid,
        roleIds: byCompanyContext.get(cid) ?? [],
      })),
      exclusions: companyIds.map((cid) => ({
        companyId: cid,
        roleIds: byCompanyExclusion.get(cid) ?? [],
      })),
      permissionOverrides: companyIds.map((cid) => {
        const p = byCompanyOverrides.get(cid) ?? { allow: [], deny: [] };
        return {
          companyId: cid,
          allow: [...new Set(p.allow)].sort(),
          deny: [...new Set(p.deny)].sort(),
        };
      }),
    };
  }

  async getGlobalPermissionDenials(
    idUsuario: number,
    appCode: string,
  ): Promise<{ appCode: string; deny: string[] }> {
    const appId = await this.resolveAppId(appCode);
    try {
      const rows = await this.userPermGlobalDenyRepo.find({
        where: { idUsuario, idApp: appId, estado: 1 },
      });
      if (rows.length === 0)
        return { appCode: appCode.trim().toLowerCase(), deny: [] };
      const permIds = rows.map((r) => r.idPermiso);
      const perms = await this.permRepo.find({ where: { id: In(permIds) } });
      const codes = perms.map((p) => p.codigo).sort();
      return { appCode: appCode.trim().toLowerCase(), deny: codes };
    } catch {
      return { appCode: appCode.trim().toLowerCase(), deny: [] };
    }
  }

  async replaceGlobalPermissionDenials(
    idUsuario: number,
    appCode: string,
    deny: string[],
    modifierId: number,
  ): Promise<{ appCode: string; deny: string[] }> {
    await this.assertUserCanBeMutated(idUsuario, modifierId, true);
    const appId = await this.resolveAppId(appCode);
    const normalized = [
      ...new Set(deny.map((c) => c.trim().toLowerCase()).filter(Boolean)),
    ];
    const permissions =
      normalized.length > 0
        ? await this.permRepo.find({
            where: { codigo: In(normalized), estado: 1 },
          })
        : [];
    const byCode = new Map(permissions.map((p) => [p.codigo, p]));
    if (permissions.length !== normalized.length) {
      const found = new Set(permissions.map((perm) => perm.codigo));
      const missing = normalized.filter((code) => !found.has(code));
      throw new NotFoundException(
        `Permisos no encontrados o inactivos: ${missing.join(', ')}`,
      );
    }

    const existing = await this.userPermGlobalDenyRepo.find({
      where: { idUsuario, idApp: appId },
    });
    const existingByPermId = new Map(existing.map((e) => [e.idPermiso, e]));
    const activeExisting = existing.filter((e) => e.estado === 1);
    const activePermIds = new Set(activeExisting.map((e) => e.idPermiso));
    const allPermIdsForBefore = [...activePermIds];
    const allPermsForBefore =
      allPermIdsForBefore.length > 0
        ? await this.permRepo.find({ where: { id: In(allPermIdsForBefore) } })
        : [];
    const permByIdForBefore = new Map(
      allPermsForBefore.map((p) => [p.id, p.codigo]),
    );
    const beforeDenyCodes = activeExisting
      .map((e) => permByIdForBefore.get(e.idPermiso))
      .filter(Boolean) as string[];

    const targetPermIds = new Set(
      normalized
        .map((c) => byCode.get(c)?.id)
        .filter((id): id is number => id != null),
    );

    for (const e of activeExisting) {
      if (!targetPermIds.has(e.idPermiso)) {
        e.estado = 0;
        e.modificadoPor = modifierId;
        await this.userPermGlobalDenyRepo.save(e);
      }
    }

    for (const permId of targetPermIds) {
      const ex = existingByPermId.get(permId);
      if (ex) {
        if (ex.estado !== 1) {
          ex.estado = 1;
          ex.modificadoPor = modifierId;
          await this.userPermGlobalDenyRepo.save(ex);
        }
        continue;
      }
      await this.userPermGlobalDenyRepo.save(
        this.userPermGlobalDenyRepo.create({
          idUsuario,
          idApp: appId,
          idPermiso: permId,
          estado: 1,
          creadoPor: modifierId,
          modificadoPor: modifierId,
        }),
      );
    }

    const result = (await this.getGlobalPermissionDenials(idUsuario, appCode))
      .deny;
    const response = { appCode: appCode.trim().toLowerCase(), deny: result };
    const userLabel = await this.getUserLabel(idUsuario);
    const antes =
      beforeDenyCodes.length > 0 ? this.formatList(beforeDenyCodes) : 'ninguno';
    const despues = result.length > 0 ? this.formatList(result) : 'ninguno';
    this.publishAudit({
      accion: 'replace_global_permission_denials',
      entidad: 'user_permission_global_deny',
      entidadId: idUsuario,
      actorUserId: modifierId,
      descripcion: `Permisos denegados globalmente modificados para ${userLabel} (app ${response.appCode}). Antes: ${antes}. Después: ${despues}.`,
      payloadBefore: {
        idUsuario,
        appCode: response.appCode,
        deny: beforeDenyCodes,
      },
      payloadAfter: { idUsuario, ...response },
    });
    await this.bumpUserAuthz(idUsuario);
    return response;
  }

  async replaceUserPermissionOverridesByContext(
    idUsuario: number,
    companyId: number,
    appCode: string,
    allow: string[],
    deny: string[],
    modifierId: number,
  ): Promise<{
    idUsuario: number;
    companyId: number;
    appCode: string;
    allow: string[];
    deny: string[];
  }> {
    await this.assertUserCanBeMutated(idUsuario, modifierId, true);
    const appId = await this.resolveAppId(appCode);
    await this.ensureUserCompanyAccess(idUsuario, companyId);

    const normalizedAllow = [
      ...new Set(
        allow.map((code) => code.trim().toLowerCase()).filter(Boolean),
      ),
    ];
    const normalizedDeny = [
      ...new Set(deny.map((code) => code.trim().toLowerCase()).filter(Boolean)),
    ];

    const intersection = normalizedAllow.filter((code) =>
      normalizedDeny.includes(code),
    );
    if (intersection.length > 0) {
      throw new BadRequestException(
        `Permisos duplicados en allow y deny: ${intersection.join(', ')}`,
      );
    }

    const requestedCodes = [
      ...new Set([...normalizedAllow, ...normalizedDeny]),
    ];
    const permissions =
      requestedCodes.length > 0
        ? await this.permRepo.find({ where: { codigo: In(requestedCodes) } })
        : [];

    if (permissions.length !== requestedCodes.length) {
      const found = new Set(permissions.map((perm) => perm.codigo));
      const missing = requestedCodes.filter((code) => !found.has(code));
      throw new NotFoundException(
        `Permisos no encontrados: ${missing.join(', ')}`,
      );
    }

    const permissionByCode = new Map(
      permissions.map((perm) => [perm.codigo, perm]),
    );
    const desiredByPermId = new Map<number, 'ALLOW' | 'DENY'>();
    for (const code of normalizedAllow) {
      desiredByPermId.set(permissionByCode.get(code)!.id, 'ALLOW');
    }
    for (const code of normalizedDeny) {
      desiredByPermId.set(permissionByCode.get(code)!.id, 'DENY');
    }

    const existingOverrides = await this.userPermOverrideRepo.find({
      where: { idUsuario, idEmpresa: companyId, idApp: appId },
    });
    const existingByPermId = new Map(
      existingOverrides.map((override) => [override.idPermiso, override]),
    );

    const beforeAllowIds = existingOverrides
      .filter((o) => o.estado === 1 && o.efecto === 'ALLOW')
      .map((o) => o.idPermiso);
    const beforeDenyIds = existingOverrides
      .filter((o) => o.estado === 1 && o.efecto === 'DENY')
      .map((o) => o.idPermiso);
    const allPermIds = [
      ...new Set([
        ...beforeAllowIds,
        ...beforeDenyIds,
        ...permissionByCode.keys(),
      ]),
    ];
    const allPerms =
      allPermIds.length > 0
        ? await this.permRepo.find({ where: { id: In(allPermIds) } })
        : [];
    const permCodeById = new Map(allPerms.map((p) => [p.id, p.codigo]));
    const beforeAllow = beforeAllowIds
      .map((id) => permCodeById.get(id))
      .filter(Boolean) as string[];
    const beforeDeny = beforeDenyIds
      .map((id) => permCodeById.get(id))
      .filter(Boolean) as string[];

    for (const override of existingOverrides) {
      const desiredEffect = desiredByPermId.get(override.idPermiso);
      if (!desiredEffect) {
        if (override.estado !== 0) {
          override.estado = 0;
          override.modificadoPor = modifierId;
          await this.userPermOverrideRepo.save(override);
        }
        continue;
      }

      const needsUpdate =
        override.estado !== 1 || override.efecto !== desiredEffect;
      if (needsUpdate) {
        override.estado = 1;
        override.efecto = desiredEffect;
        override.modificadoPor = modifierId;
        await this.userPermOverrideRepo.save(override);
      }
    }

    for (const [permId, effect] of desiredByPermId.entries()) {
      if (existingByPermId.has(permId)) continue;
      await this.userPermOverrideRepo.save(
        this.userPermOverrideRepo.create({
          idUsuario,
          idEmpresa: companyId,
          idApp: appId,
          idPermiso: permId,
          efecto: effect,
          estado: 1,
          creadoPor: modifierId,
          modificadoPor: modifierId,
        }),
      );
    }

    const current = await this.getUserPermissionOverrides(
      idUsuario,
      companyId,
      appCode,
    );
    const [userLabel, companyLabel] = await Promise.all([
      this.getUserLabel(idUsuario),
      this.getCompanyLabel(companyId),
    ]);
    const allowAntes =
      beforeAllow.length > 0 ? this.formatList(beforeAllow) : 'ninguno';
    const allowDespues =
      current.allow.length > 0 ? this.formatList(current.allow) : 'ninguno';
    const denyAntes =
      beforeDeny.length > 0 ? this.formatList(beforeDeny) : 'ninguno';
    const denyDespues =
      current.deny.length > 0 ? this.formatList(current.deny) : 'ninguno';
    this.publishAudit({
      accion: 'replace_permission_overrides',
      entidad: 'user_permission_override',
      entidadId: idUsuario,
      actorUserId: modifierId,
      companyContextId: companyId,
      descripcion: `Excepciones de permisos modificadas para ${userLabel} en ${companyLabel} (${current.appCode}). Allow — Antes: ${allowAntes}. Después: ${allowDespues}. Deny — Antes: ${denyAntes}. Después: ${denyDespues}.`,
      payloadBefore: {
        idUsuario,
        companyId,
        appCode: current.appCode,
        allow: beforeAllow,
        deny: beforeDeny,
      },
      payloadAfter: current as unknown as Record<string, unknown>,
    });
    await this.bumpUserAuthz(idUsuario);
    return current;
  }

  async getUserPermissionOverrides(
    idUsuario: number,
    companyId: number,
    appCode: string,
  ): Promise<{
    idUsuario: number;
    companyId: number;
    appCode: string;
    allow: string[];
    deny: string[];
  }> {
    const appId = await this.resolveAppId(appCode);

    const rows = await this.userPermOverrideRepo
      .createQueryBuilder('up')
      .innerJoin(Permission, 'p', 'p.id = up.idPermiso')
      .select(['up.efecto AS efecto', 'p.codigo AS codigo'])
      .where('up.idUsuario = :idUsuario', { idUsuario })
      .andWhere('up.idEmpresa = :companyId', { companyId })
      .andWhere('up.idApp = :appId', { appId })
      .andWhere('up.estado = 1')
      .getRawMany<{ efecto: 'ALLOW' | 'DENY'; codigo: string }>();

    const allow = rows
      .filter((row) => row.efecto === 'ALLOW')
      .map((row) => row.codigo)
      .sort();
    const deny = rows
      .filter((row) => row.efecto === 'DENY')
      .map((row) => row.codigo)
      .sort();

    return {
      idUsuario,
      companyId,
      appCode: appCode.trim().toLowerCase(),
      allow,
      deny,
    };
  }

  private async resolveAppId(appCode: string): Promise<number> {
    const normalized = appCode.trim().toLowerCase();
    const app = await this.appRepo.findOne({
      where: { codigo: normalized, estado: 1 },
    });
    if (!app) {
      throw new NotFoundException(
        `App no encontrada o inactiva: ${normalized}`,
      );
    }
    return app.id;
  }

  private async ensureUserCompanyAccess(
    idUsuario: number,
    companyId: number,
  ): Promise<void> {
    const assignment = await this.userCompanyRepo.findOne({
      where: { idUsuario, idEmpresa: companyId, estado: 1 },
    });
    if (!assignment) {
      throw new ConflictException(
        `El usuario ${idUsuario} no tiene asignacion activa a la empresa ${companyId}`,
      );
    }
  }

  private async assertUserCanBeMutated(
    targetUserId: number,
    actorUserId: number | undefined,
    enforceLastAdminProtection: boolean,
  ): Promise<void> {
    if (actorUserId && targetUserId === actorUserId) {
      throw new ConflictException(
        'No puede modificar su propio usuario en esta operacion critica',
      );
    }

    if (await this.isProtectedMasterUser(targetUserId)) {
      throw new ConflictException(
        'El usuario MASTER esta protegido y no puede ser modificado',
      );
    }

    if (!enforceLastAdminProtection) return;
    const isConfigAdmin = await this.isConfigAdminUser(targetUserId);
    if (!isConfigAdmin) return;

    const remainingAdmins =
      await this.countOtherActiveConfigAdmins(targetUserId);
    if (remainingAdmins === 0) {
      throw new ConflictException(
        'No se puede aplicar este cambio porque el usuario es el ultimo administrador de configuracion',
      );
    }
  }

  private async isProtectedMasterUser(userId: number): Promise<boolean> {
    const rows = await this.userRepo.query(
      `
      SELECT 1
      FROM sys_roles r
      WHERE r.codigo_rol = 'MASTER'
        AND r.estado_rol = 1
        AND (
          EXISTS (
            SELECT 1 FROM sys_usuario_rol ur
            WHERE ur.id_usuario = ?
              AND ur.id_rol = r.id_rol
              AND ur.estado_usuario_rol = 1
          )
          OR EXISTS (
            SELECT 1 FROM sys_usuario_rol_global urg
            WHERE urg.id_usuario = ?
              AND urg.id_rol = r.id_rol
              AND urg.estado_usuario_rol_global = 1
          )
        )
      LIMIT 1
      `,
      [userId, userId],
    );
    return rows.length > 0;
  }

  private async isConfigAdminUser(userId: number): Promise<boolean> {
    const rows = await this.userRepo.query(
      `
      SELECT 1
      FROM sys_usuarios u
      WHERE u.id_usuario = ?
        AND u.estado_usuario = 1
        AND EXISTS (
          SELECT 1 FROM sys_usuario_empresa ue
          WHERE ue.id_usuario = u.id_usuario
            AND ue.estado_usuario_empresa = 1
        )
        AND (
          EXISTS (
            SELECT 1
            FROM sys_usuario_rol ur
            JOIN sys_roles r ON r.id_rol = ur.id_rol AND r.estado_rol = 1
            JOIN sys_rol_permiso rp ON rp.id_rol = r.id_rol
            JOIN sys_permisos p ON p.id_permiso = rp.id_permiso AND p.estado_permiso = 1
            WHERE ur.id_usuario = u.id_usuario
              AND ur.estado_usuario_rol = 1
              AND p.codigo_permiso LIKE 'config:%'
          )
          OR EXISTS (
            SELECT 1
            FROM sys_usuario_rol_global urg
            JOIN sys_roles r ON r.id_rol = urg.id_rol AND r.estado_rol = 1
            JOIN sys_rol_permiso rp ON rp.id_rol = r.id_rol
            JOIN sys_permisos p ON p.id_permiso = rp.id_permiso AND p.estado_permiso = 1
            WHERE urg.id_usuario = u.id_usuario
              AND urg.estado_usuario_rol_global = 1
              AND p.codigo_permiso LIKE 'config:%'
          )
        )
      LIMIT 1
      `,
      [userId],
    );
    return rows.length > 0;
  }

  private async countOtherActiveConfigAdmins(
    excludedUserId: number,
  ): Promise<number> {
    const rows = await this.userRepo.query(
      `
      SELECT COUNT(DISTINCT u.id_usuario) AS total
      FROM sys_usuarios u
      WHERE u.estado_usuario = 1
        AND u.id_usuario <> ?
        AND EXISTS (
          SELECT 1 FROM sys_usuario_empresa ue
          WHERE ue.id_usuario = u.id_usuario
            AND ue.estado_usuario_empresa = 1
        )
        AND (
          EXISTS (
            SELECT 1
            FROM sys_usuario_rol ur
            JOIN sys_roles r ON r.id_rol = ur.id_rol AND r.estado_rol = 1
            JOIN sys_rol_permiso rp ON rp.id_rol = r.id_rol
            JOIN sys_permisos p ON p.id_permiso = rp.id_permiso AND p.estado_permiso = 1
            WHERE ur.id_usuario = u.id_usuario
              AND ur.estado_usuario_rol = 1
              AND p.codigo_permiso LIKE 'config:%'
          )
          OR EXISTS (
            SELECT 1
            FROM sys_usuario_rol_global urg
            JOIN sys_roles r ON r.id_rol = urg.id_rol AND r.estado_rol = 1
            JOIN sys_rol_permiso rp ON rp.id_rol = r.id_rol
            JOIN sys_permisos p ON p.id_permiso = rp.id_permiso AND p.estado_permiso = 1
            WHERE urg.id_usuario = u.id_usuario
              AND urg.estado_usuario_rol_global = 1
              AND p.codigo_permiso LIKE 'config:%'
          )
        )
      `,
      [excludedUserId],
    );
    const rawTotal = Number(rows?.[0]?.total ?? 0);
    return Number.isFinite(rawTotal) ? rawTotal : 0;
  }
}
