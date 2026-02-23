import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserStatus } from './constants/user-status.enum.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
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

  async findAll(includeInactive = false): Promise<User[]> {
    const qb = this.repo.createQueryBuilder('u');
    if (!includeInactive) {
      qb.where('u.estado = :estado', { estado: UserStatus.ACTIVO });
    }
    qb.orderBy('u.apellido', 'ASC').addOrderBy('u.nombre', 'ASC');
    const users = await qb.getMany();
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
}
