import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { App } from './entities/app.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { UserRoleGlobal } from './entities/user-role-global.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRolePermissionDto } from './dto/assign-role-permission.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import { AuthzVersionService } from '../authz/authz-version.service';
import { AuthzRealtimeService } from '../authz/authz-realtime.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rpRepo: Repository<RolePermission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(UserRoleGlobal)
    private readonly userRoleGlobalRepo: Repository<UserRoleGlobal>,
    private readonly auditOutbox: AuditOutboxService,
    private readonly authzVersionService: AuthzVersionService,
    private readonly authzRealtime: AuthzRealtimeService,
  ) {}

  async create(dto: CreateRoleDto, userId: number): Promise<Role> {
    const existing = await this.roleRepo.findOne({
      where: { codigo: dto.codigo },
    });
    if (existing) {
      throw new ConflictException('Ya existe un rol con ese codigo');
    }

    const app = await this.appRepo.findOne({
      where: { codigo: dto.appCode.trim().toLowerCase(), estado: 1 },
    });
    if (!app) {
      throw new BadRequestException(
        `Aplicacion '${dto.appCode}' no encontrada`,
      );
    }

    const role = this.roleRepo.create({
      codigo: dto.codigo,
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      idApp: app.id,
      estado: 1,
      creadoPor: userId,
      modificadoPor: userId,
    });
    const saved = await this.roleRepo.save(role);
    this.auditOutbox.publish({
      modulo: 'roles',
      accion: 'create',
      entidad: 'role',
      entidadId: saved.id,
      actorUserId: userId,
      descripcion: `Rol creado: ${saved.codigo}`,
      payloadAfter: {
        id: saved.id,
        codigo: saved.codigo,
        nombre: saved.nombre,
        descripcion: saved.descripcion,
        idApp: saved.idApp,
        estado: saved.estado,
      },
    });
    return saved;
  }

  async findAll(includeInactive = false, appCode?: string): Promise<Role[]> {
    const qb = this.roleRepo.createQueryBuilder('r');
    if (!includeInactive) {
      qb.andWhere('r.estado = 1');
    }
    if (appCode) {
      const app = await this.appRepo.findOne({
        where: { codigo: appCode.trim().toLowerCase(), estado: 1 },
      });
      if (app) {
        qb.andWhere('(r.id_app = :appId OR r.id_app IS NULL)', {
          appId: app.id,
        });
      }
    }
    return qb.orderBy('r.nombre', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }
    return role;
  }

  async updateMetadata(
    id: number,
    dto: UpdateRoleDto,
    userId: number,
  ): Promise<Role> {
    const role = await this.findOne(id);
    const nextNombre = dto.nombre?.trim();
    const nextDescripcion = dto.descripcion?.trim();

    if (!nextNombre && nextDescripcion === undefined) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar',
      );
    }

    if (nextNombre) role.nombre = nextNombre;
    if (dto.descripcion !== undefined)
      role.descripcion = nextDescripcion || null;
    role.modificadoPor = userId;

    const saved = await this.roleRepo.save(role);
    this.auditOutbox.publish({
      modulo: 'roles',
      accion: 'update',
      entidad: 'role',
      entidadId: saved.id,
      actorUserId: userId,
      descripcion: `Rol actualizado: ${saved.codigo}`,
      payloadAfter: {
        id: saved.id,
        codigo: saved.codigo,
        nombre: saved.nombre,
        descripcion: saved.descripcion,
        idApp: saved.idApp,
        estado: saved.estado,
      },
    });
    return saved;
  }

  async inactivate(id: number, userId: number): Promise<Role> {
    const role = await this.findOne(id);
    role.estado = 0;
    role.modificadoPor = userId;
    const saved = await this.roleRepo.save(role);
    await this.notifyRolePermissionsChanged(saved.id, 'role.inactivate');
    this.auditOutbox.publish({
      modulo: 'roles',
      accion: 'inactivate',
      entidad: 'role',
      entidadId: saved.id,
      actorUserId: userId,
      descripcion: `Rol inactivado: ${saved.codigo}`,
      payloadAfter: {
        id: saved.id,
        codigo: saved.codigo,
        estado: saved.estado,
      },
    });
    return saved;
  }

  async reactivate(id: number, userId: number): Promise<Role> {
    const role = await this.findOne(id);
    role.estado = 1;
    role.modificadoPor = userId;
    const saved = await this.roleRepo.save(role);
    await this.notifyRolePermissionsChanged(saved.id, 'role.reactivate');
    this.auditOutbox.publish({
      modulo: 'roles',
      accion: 'reactivate',
      entidad: 'role',
      entidadId: saved.id,
      actorUserId: userId,
      descripcion: `Rol reactivado: ${saved.codigo}`,
      payloadAfter: {
        id: saved.id,
        codigo: saved.codigo,
        estado: saved.estado,
      },
    });
    return saved;
  }

  async assignPermission(
    dto: AssignRolePermissionDto,
  ): Promise<RolePermission> {
    await this.findOne(dto.idRol);
    const perm = await this.permissionRepo.findOne({
      where: { id: dto.idPermiso },
    });
    if (!perm) {
      throw new NotFoundException(
        `Permiso con ID ${dto.idPermiso} no encontrado`,
      );
    }

    const existing = await this.rpRepo.findOne({
      where: { idRol: dto.idRol, idPermiso: dto.idPermiso },
    });
    if (existing) {
      throw new ConflictException('El rol ya tiene asignado ese permiso');
    }

    const rp = this.rpRepo.create(dto);
    const saved = await this.rpRepo.save(rp);
    await this.notifyRolePermissionsChanged(
      dto.idRol,
      'role.permission.assign',
    );
    return saved;
  }

  async removePermission(idRol: number, idPermiso: number): Promise<void> {
    const rp = await this.rpRepo.findOne({ where: { idRol, idPermiso } });
    if (!rp) {
      throw new NotFoundException('Asignacion rol-permiso no encontrada');
    }
    await this.rpRepo.remove(rp);
    await this.notifyRolePermissionsChanged(idRol, 'role.permission.remove');
  }

  async getPermissions(idRol: number): Promise<Permission[]> {
    await this.findOne(idRol);
    const assignments = await this.rpRepo.find({ where: { idRol } });
    if (assignments.length === 0) return [];

    const permIds = assignments.map((a) => a.idPermiso);
    return this.permissionRepo
      .createQueryBuilder('p')
      .where('p.id IN (:...ids)', { ids: permIds })
      .andWhere('p.estado = 1')
      .orderBy('p.modulo', 'ASC')
      .addOrderBy('p.codigo', 'ASC')
      .getMany();
  }

  async replacePermissionsByCodes(
    idRol: number,
    codes: string[],
    actorUserId?: number,
  ): Promise<Permission[]> {
    const role = await this.findOne(idRol);

    const normalized = [
      ...new Set(codes.map((c) => c.trim().toLowerCase()).filter(Boolean)),
    ];
    const permissions = normalized.length
      ? await this.permissionRepo.find({
          where: { codigo: In(normalized), estado: 1 },
        })
      : [];

    if (permissions.length !== normalized.length) {
      const found = new Set(permissions.map((p) => p.codigo));
      const missing = normalized.filter((code) => !found.has(code));
      throw new NotFoundException(
        `Permisos no encontrados o inactivos: ${missing.join(', ')}`,
      );
    }

    const desiredIds = new Set(permissions.map((p) => p.id));
    const existing = await this.rpRepo.find({ where: { idRol } });

    const toDelete = existing.filter((row) => !desiredIds.has(row.idPermiso));
    if (toDelete.length > 0) {
      await this.rpRepo.remove(toDelete);
    }

    const existingIds = new Set(existing.map((row) => row.idPermiso));
    const toInsert = permissions
      .filter((perm) => !existingIds.has(perm.id))
      .map((perm) => this.rpRepo.create({ idRol, idPermiso: perm.id }));
    if (toInsert.length > 0) {
      await this.rpRepo.save(toInsert);
    }

    const result = await this.getPermissions(idRol);
    this.auditOutbox.publish({
      modulo: 'roles',
      accion: 'replace_permissions',
      entidad: 'role',
      entidadId: idRol,
      actorUserId: actorUserId ?? null,
      descripcion: `Permisos reemplazados para rol "${role.nombre}" (${role.codigo})`,
      payloadAfter: {
        idRol,
        codigos: result.map((p) => p.codigo),
      },
    });
    await this.notifyRolePermissionsChanged(idRol, 'role.permission.replace');
    return result;
  }

  private async notifyRolePermissionsChanged(
    roleId: number,
    reason: string,
  ): Promise<void> {
    const affectedUserIds = await this.getAffectedUserIdsByRole(roleId);
    if (affectedUserIds.length === 0) return;

    await this.authzVersionService.bumpUsers(affectedUserIds);
    this.authzRealtime.notifyUsers(affectedUserIds, {
      type: 'permissions.changed',
      reason,
      roleId,
      at: new Date().toISOString(),
    });
  }

  private async getAffectedUserIdsByRole(roleId: number): Promise<number[]> {
    const affected = new Set<number>();

    const directAssignments = await this.userRoleRepo.find({
      where: { idRol: roleId, estado: 1 },
      select: ['idUsuario'],
    });
    directAssignments.forEach((row) => {
      if (Number.isInteger(row.idUsuario) && row.idUsuario > 0) {
        affected.add(row.idUsuario);
      }
    });

    try {
      const globalAssignments = await this.userRoleGlobalRepo.find({
        where: { idRol: roleId, estado: 1 },
        select: ['idUsuario'],
      });
      globalAssignments.forEach((row) => {
        if (Number.isInteger(row.idUsuario) && row.idUsuario > 0) {
          affected.add(row.idUsuario);
        }
      });
    } catch {
      // Compatibilidad con instalaciones sin tablas globales.
    }

    return [...affected];
  }
}
