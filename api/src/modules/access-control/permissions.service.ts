import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePermissionDto } from './dto/create-permission.dto.js';
import { UpdatePermissionDto } from './dto/update-permission.dto.js';
import { Permission } from './entities/permission.entity.js';

export type PermissionCatalogMode = 'migration' | 'ui';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Permission)
    private readonly repo: Repository<Permission>,
  ) {}

  getCatalogMode(): PermissionCatalogMode {
    const raw = this.configService.get<string>('PERMISSIONS_CATALOG_MODE', 'migration');
    return raw?.trim().toLowerCase() === 'ui' ? 'ui' : 'migration';
  }

  async create(dto: CreatePermissionDto, actorUserId?: number): Promise<Permission> {
    this.ensureCatalogEditable();

    const codigo = dto.codigo.toLowerCase();
    const moduloFromCode = this.extractModule(codigo);
    const modulo = dto.modulo.toLowerCase();

    if (moduloFromCode !== modulo) {
      throw new ConflictException('modulo debe coincidir con el prefijo del codigo');
    }

    const existing = await this.repo.findOne({ where: { codigo } });
    if (existing) {
      throw new ConflictException('Ya existe un permiso con ese codigo');
    }

    const perm = this.repo.create({
      ...dto,
      codigo,
      modulo,
      estado: 1,
      creadoPor: actorUserId ?? null,
      modificadoPor: actorUserId ?? null,
    });

    return this.repo.save(perm);
  }

  async findAll(modulo?: string, includeInactive = true): Promise<Permission[]> {
    const qb = this.repo.createQueryBuilder('p');

    if (!includeInactive) {
      qb.where('p.estado = 1');
    }

    const normalizedModulo = modulo?.trim().toLowerCase();
    if (normalizedModulo) {
      if (!includeInactive) {
        qb.andWhere('p.modulo = :modulo', { modulo: normalizedModulo });
      } else {
        qb.where('p.modulo = :modulo', { modulo: normalizedModulo });
      }
    }

    return qb
      .orderBy('p.modulo', 'ASC')
      .addOrderBy('p.codigo', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<Permission> {
    const perm = await this.repo.findOne({ where: { id } });
    if (!perm) {
      throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
    }
    return perm;
  }

  async update(id: number, dto: UpdatePermissionDto, actorUserId?: number): Promise<Permission> {
    this.ensureCatalogEditable();

    const perm = await this.findOne(id);
    const nextCodigo = dto.codigo?.toLowerCase() ?? perm.codigo;
    const nextModulo = dto.modulo?.toLowerCase() ?? perm.modulo;

    if (this.extractModule(nextCodigo) !== nextModulo) {
      throw new ConflictException('modulo debe coincidir con el prefijo del codigo');
    }

    if (nextCodigo !== perm.codigo) {
      const existing = await this.repo.findOne({ where: { codigo: nextCodigo } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe un permiso con ese codigo');
      }
      perm.codigo = nextCodigo;
    }

    if (dto.nombre !== undefined) {
      perm.nombre = dto.nombre.trim();
    }

    if (dto.descripcion !== undefined) {
      perm.descripcion = dto.descripcion.trim() || null;
    }

    perm.modulo = nextModulo;

    perm.modificadoPor = actorUserId ?? null;
    return this.repo.save(perm);
  }

  async inactivate(id: number, actorUserId?: number): Promise<Permission> {
    this.ensureCatalogEditable();

    const perm = await this.findOne(id);
    perm.estado = 0;
    perm.modificadoPor = actorUserId ?? null;
    return this.repo.save(perm);
  }

  async reactivate(id: number, actorUserId?: number): Promise<Permission> {
    this.ensureCatalogEditable();

    const perm = await this.findOne(id);
    perm.estado = 1;
    perm.modificadoPor = actorUserId ?? null;
    return this.repo.save(perm);
  }

  private ensureCatalogEditable(): void {
    if (this.getCatalogMode() === 'migration') {
      throw new ForbiddenException(
        'Catalogo de permisos en modo controlado por migracion; alta/edicion inhabilitada',
      );
    }
  }

  private extractModule(codigo: string): string {
    return codigo.split(':')[0]?.trim().toLowerCase() ?? '';
  }
}
