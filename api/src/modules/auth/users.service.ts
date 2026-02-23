import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { UserApp } from '../access-control/entities/user-app.entity.js';
import { UserRole } from '../access-control/entities/user-role.entity.js';
import { UserRoleGlobal } from '../access-control/entities/user-role-global.entity.js';
import { App } from '../access-control/entities/app.entity.js';
import { Role } from '../access-control/entities/role.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserStatus } from './constants/user-status.enum.js';

const TIMEWISE_SUPERVISOR_ROLES = ['SUPERVISOR_TIMEWISE', 'SUPERVISOR_GLOBAL_TIMEWISE'];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(UserApp)
    private readonly userAppRepo: Repository<UserApp>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(UserRoleGlobal)
    private readonly userRoleGlobalRepo: Repository<UserRoleGlobal>,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async create(dto: CreateUserDto, creatorId?: number): Promise<User> {
    const normalizedEmail = this.normalizeEmail(dto.email);

    const existing = await this.repo.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    if (dto.username) {
      const existingUsername = await this.repo.findOne({
        where: { username: dto.username.toLowerCase() },
      });
      if (existingUsername) {
        throw new ConflictException('Ya existe un usuario con ese username');
      }
    }

    let passwordHash: string | null = null;
    if (dto.password) {
      const salt = await bcrypt.genSalt(12);
      passwordHash = await bcrypt.hash(dto.password, salt);
    }

    const user = this.repo.create({
      email: normalizedEmail,
      username: dto.username?.toLowerCase() ?? null,
      passwordHash,
      passwordUpdatedAt: passwordHash ? new Date() : null,
      requiresPasswordReset: 0,
      nombre: dto.nombre,
      apellido: dto.apellido,
      telefono: dto.telefono ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      estado: UserStatus.ACTIVO,
      failedAttempts: 0,
      creadoPor: creatorId ?? null,
      modificadoPor: creatorId ?? null,
    });

    const saved = await this.repo.save(user);
    return this.sanitize(saved);
  }

  async findAll(includeInactive = false, configView = false): Promise<User[]> {
    const qb = this.repo.createQueryBuilder('u');
    if (!includeInactive) {
      qb.where('u.estado = :estado', { estado: UserStatus.ACTIVO });
    }
    qb.orderBy('u.apellido', 'ASC').addOrderBy('u.nombre', 'ASC');
    let users = await qb.getMany();

    if (configView && users.length > 0) {
      const ids = users.map((u) => u.id);
      const kpitalApp = await this.appRepo.findOne({ where: { codigo: 'kpital', estado: 1 } });
      const timewiseApp = await this.appRepo.findOne({ where: { codigo: 'timewise', estado: 1 } });
      if (!kpitalApp || !timewiseApp) {
        return users.map((u) => this.sanitize(u));
      }
      const supervisorRoles = await this.roleRepo.find({
        where: { codigo: In(TIMEWISE_SUPERVISOR_ROLES), estado: 1 },
      });
      const supervisorRoleIds = supervisorRoles.map((r) => r.id);
      const hasKpital = await this.userAppRepo.find({
        where: { idUsuario: In(ids), idApp: kpitalApp.id, estado: 1 },
      });
      const kpitalUserIds = new Set(hasKpital.map((ua) => ua.idUsuario));
      const twSupervisorContext = supervisorRoleIds.length > 0
        ? await this.userRoleRepo.find({
            where: {
              idUsuario: In(ids),
              idRol: In(supervisorRoleIds),
              estado: 1,
            },
          })
        : [];
      const twSupervisorGlobal = supervisorRoleIds.length > 0 && timewiseApp
        ? await this.userRoleGlobalRepo.find({
            where: {
              idUsuario: In(ids),
              idApp: timewiseApp.id,
              idRol: In(supervisorRoleIds),
              estado: 1,
            },
          })
        : [];
      const twSupervisorUserIds = new Set([
        ...twSupervisorContext.map((ur) => ur.idUsuario),
        ...twSupervisorGlobal.map((g) => g.idUsuario),
      ]);
      const hasTimewise = await this.userAppRepo.find({
        where: { idUsuario: In(ids), idApp: timewiseApp.id, estado: 1 },
      });
      const timewiseOnlyUserIds = new Set(
        hasTimewise.filter((ua) => !kpitalUserIds.has(ua.idUsuario)).map((ua) => ua.idUsuario),
      );
      const configUserIds = new Set<number>();
      for (const uid of ids) {
        if (kpitalUserIds.has(uid)) {
          configUserIds.add(uid);
        } else if (timewiseOnlyUserIds.has(uid) && twSupervisorUserIds.has(uid)) {
          configUserIds.add(uid);
        }
      }
      users = users.filter((u) => configUserIds.has(u.id));
    }

    return users.map((u) => this.sanitize(u));
  }

  async findOne(id: number): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return this.sanitize(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: this.normalizeEmail(email) } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repo.findOne({ where: { username: username.toLowerCase() } });
  }

  async findByMicrosoftIdentity(microsoftOid: string, microsoftTid: string): Promise<User | null> {
    return this.repo.findOne({
      where: {
        microsoftOid,
        microsoftTid,
      },
    });
  }

  async bindMicrosoftIdentity(userId: number, microsoftOid: string, microsoftTid: string): Promise<void> {
    await this.repo.update(userId, {
      microsoftOid,
      microsoftTid,
    } as Partial<User>);
  }

  async update(id: number, dto: UpdateUserDto, modifierId?: number): Promise<User> {
    if (await this.isProtectedMasterUser(id)) {
      throw new ConflictException('El usuario MASTER estÃ¡ protegido y no puede ser modificado');
    }
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    if (dto.email) {
      dto.email = this.normalizeEmail(dto.email);
      if (dto.email !== user.email) {
        const existing = await this.repo.findOne({ where: { email: dto.email } });
        if (existing) {
          throw new ConflictException('Ya existe un usuario con ese email');
        }
      }
    }

    if (dto.username) {
      const normalizedUsername = dto.username.toLowerCase();
      if (normalizedUsername !== user.username) {
        const existing = await this.repo.findOne({ where: { username: normalizedUsername } });
        if (existing) {
          throw new ConflictException('Ya existe un usuario con ese username');
        }
        dto.username = normalizedUsername;
      }
    }

    Object.assign(user, dto, { modificadoPor: modifierId ?? null });
    const saved = await this.repo.save(user);
    return this.sanitize(saved);
  }

  async inactivate(id: number, modifierId: number, motivo?: string): Promise<User> {
    await this.assertCanRestrictUser(id, modifierId);
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    user.estado = UserStatus.INACTIVO;
    user.fechaInactivacion = new Date();
    user.motivoInactivacion = motivo ?? null;
    user.modificadoPor = modifierId;
    const saved = await this.repo.save(user);
    return this.sanitize(saved);
  }

  async reactivate(id: number, modifierId: number): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    user.estado = UserStatus.ACTIVO;
    user.fechaInactivacion = null;
    user.motivoInactivacion = null;
    user.failedAttempts = 0;
    user.lockedUntil = null;
    user.modificadoPor = modifierId;
    const saved = await this.repo.save(user);
    return this.sanitize(saved);
  }

  async block(id: number, modifierId: number, motivo?: string): Promise<User> {
    await this.assertCanRestrictUser(id, modifierId);
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    user.estado = UserStatus.BLOQUEADO;
    user.motivoInactivacion = motivo ?? 'Bloqueado manualmente por administrador';
    user.modificadoPor = modifierId;
    const saved = await this.repo.save(user);
    return this.sanitize(saved);
  }

  /**
   * Valida si un usuario puede autenticarse.
   * Retorna el usuario CON passwordHash (para verificación interna).
   * Lanza ForbiddenException si no cumple condiciones.
   */
  async validateForLogin(email: string): Promise<User> {
    const user = await this.repo.findOne({
      where: { email: this.normalizeEmail(email) },
    });
    if (!user) {
      throw new NotFoundException('Credenciales inválidas');
    }

    if (user.estado === UserStatus.INACTIVO) {
      throw new ForbiddenException('Usuario inactivo. Contacte al administrador.');
    }

    if (user.estado === UserStatus.BLOQUEADO) {
      throw new ForbiddenException('Usuario bloqueado. Contacte al administrador.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Usuario bloqueado temporalmente hasta ${user.lockedUntil.toISOString()}`,
      );
    }

    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      user.lockedUntil = null;
      user.failedAttempts = 0;
      await this.repo.save(user);
    }

    return user;
  }

  async registerFailedAttempt(id: number, maxAttempts = 5, lockMinutes = 15): Promise<void> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) return;

    user.failedAttempts += 1;

    if (user.failedAttempts >= maxAttempts) {
      user.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
      user.estado = UserStatus.BLOQUEADO;
      user.motivoInactivacion = `Bloqueado automáticamente por ${maxAttempts} intentos fallidos`;
    }

    await this.repo.save(user);
  }

  async registerSuccessfulLogin(id: number, ip?: string): Promise<void> {
    await this.repo.update(id, {
      failedAttempts: 0,
      lockedUntil: null,
      ultimoLogin: new Date(),
      lastLoginIp: ip ?? null,
    } as any);
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private sanitize(user: User): User {
    const { passwordHash: _, ...rest } = user as any;
    return rest as User;
  }

  private async assertCanRestrictUser(targetUserId: number, actorUserId: number): Promise<void> {
    if (targetUserId === actorUserId) {
      throw new ForbiddenException('No puede bloquear o inactivar su propio usuario');
    }

    if (await this.isProtectedMasterUser(targetUserId)) {
      throw new ConflictException('El usuario MASTER estÃ¡ protegido y no puede ser bloqueado ni inactivado');
    }

    const isConfigAdmin = await this.isConfigAdminUser(targetUserId);
    if (!isConfigAdmin) return;

    const otherAdmins = await this.countOtherActiveConfigAdmins(targetUserId);
    if (otherAdmins === 0) {
      throw new ConflictException(
        'No se puede aplicar el cambio porque el usuario es el Ãºltimo administrador de configuraciÃ³n',
      );
    }
  }

  private async isProtectedMasterUser(userId: number): Promise<boolean> {
    const rows = await this.repo.query(
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
    const rows = await this.repo.query(
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

  private async countOtherActiveConfigAdmins(excludedUserId: number): Promise<number> {
    const rows = await this.repo.query(
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
