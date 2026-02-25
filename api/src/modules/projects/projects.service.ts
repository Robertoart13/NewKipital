import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrgProject } from './entities/project.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuditOutboxService } from '../integration/audit-outbox.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(OrgProject)
    private readonly repo: Repository<OrgProject>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly auditOutbox: AuditOutboxService,
  ) {}

  private readonly auditFieldLabels: Record<string, string> = {
    idEmpresa: 'Empresa',
    nombre: 'Nombre proyecto',
    descripcion: 'Descripcion',
    codigo: 'Codigo',
    idExterno: 'ID externo',
    esInactivo: 'Estado',
  };

  async create(dto: CreateProjectDto, actorUserId: number): Promise<OrgProject> {
    await this.assertCompanyActive(dto.idEmpresa);
    await this.assertCodigoUnique(dto.codigo);
    if (dto.idExterno?.trim()) {
      await this.assertIdExternoUnique(dto.idExterno.trim());
    }

    const entity = this.repo.create({
      idEmpresa: dto.idEmpresa,
      nombre: dto.nombre.trim(),
      descripcion: dto.descripcion?.trim() || null,
      codigo: dto.codigo.trim(),
      idExterno: dto.idExterno?.trim() || null,
      esInactivo: 0,
    });
    const saved = await this.repo.save(entity);
    this.auditOutbox.publish({
      modulo: 'projects',
      accion: 'create',
      entidad: 'project',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Proyecto creado: ${saved.nombre}`,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async findAll(includeInactive = false, inactiveOnly = false, idEmpresa?: number): Promise<OrgProject[]> {
    const qb = this.repo.createQueryBuilder('p').orderBy('p.nombre', 'ASC');

    if (idEmpresa) {
      qb.andWhere('p.idEmpresa = :idEmpresa', { idEmpresa });
    }

    if (inactiveOnly) {
      qb.andWhere('p.esInactivo = 1');
    } else if (!includeInactive) {
      qb.andWhere('p.esInactivo = 0');
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<OrgProject> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);
    }
    return found;
  }

  async update(id: number, dto: UpdateProjectDto, actorUserId: number): Promise<OrgProject> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);

    if (dto.idEmpresa !== undefined && dto.idEmpresa !== found.idEmpresa) {
      await this.assertCompanyActive(dto.idEmpresa);
      found.idEmpresa = dto.idEmpresa;
    }

    if (dto.codigo && dto.codigo.trim() !== found.codigo) {
      await this.assertCodigoUnique(dto.codigo.trim(), id);
    }

    if (dto.idExterno !== undefined) {
      const nextIdExterno = dto.idExterno.trim();
      if (nextIdExterno) {
        await this.assertIdExternoUnique(nextIdExterno, id);
      }
      found.idExterno = nextIdExterno || null;
    }

    if (dto.nombre !== undefined) {
      found.nombre = dto.nombre.trim();
    }
    if (dto.descripcion !== undefined) {
      found.descripcion = dto.descripcion.trim() || null;
    }
    if (dto.codigo !== undefined) {
      found.codigo = dto.codigo.trim();
    }

    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'projects',
      accion: 'update',
      entidad: 'project',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Proyecto actualizado: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async inactivate(id: number, actorUserId: number): Promise<OrgProject> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    found.esInactivo = 1;
    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'projects',
      accion: 'inactivate',
      entidad: 'project',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Proyecto inactivado: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async reactivate(id: number, actorUserId: number): Promise<OrgProject> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    found.esInactivo = 0;
    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'projects',
      accion: 'reactivate',
      entidad: 'project',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Proyecto reactivado: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async getAuditTrail(id: number, limit = 100) {
    const found = await this.findOne(id);
    const safeLimit = Math.min(Math.max(Number(limit || 100), 1), 500);
    const idAsText = String(found.id);
    const rows = await this.repo.query(
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
        a.payload_before_auditoria AS payloadBefore,
        a.payload_after_auditoria AS payloadAfter,
        CONCAT_WS(' ', actor.nombre_usuario, actor.apellido_usuario) AS actorNombre,
        actor.email_usuario AS actorEmail
      FROM sys_auditoria_acciones a
      LEFT JOIN sys_usuarios actor
        ON actor.id_usuario = a.id_usuario_actor_auditoria
      WHERE a.entidad_auditoria = 'project'
        AND a.id_entidad_auditoria = ?
      ORDER BY a.fecha_creacion_auditoria DESC
      LIMIT ?
      `,
      [idAsText, safeLimit],
    );

    return (rows ?? []).map((row: Record<string, unknown>) => {
      const payloadBefore = (row.payloadBefore as Record<string, unknown> | null) ?? null;
      const payloadAfter = (row.payloadAfter as Record<string, unknown> | null) ?? null;
      return {
        id: String(row.id ?? ''),
        modulo: String(row.modulo ?? ''),
        accion: String(row.accion ?? ''),
        entidad: String(row.entidad ?? ''),
        entidadId: row.entidadId == null ? null : String(row.entidadId),
        actorUserId: row.actorUserId == null ? null : Number(row.actorUserId),
        actorNombre: row.actorNombre ? String(row.actorNombre) : null,
        actorEmail: row.actorEmail ? String(row.actorEmail) : null,
        descripcion: String(row.descripcion ?? ''),
        fechaCreacion: row.fechaCreacion ? new Date(String(row.fechaCreacion)).toISOString() : null,
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
        cambios: this.buildAuditChanges(payloadBefore, payloadAfter),
      };
    });
  }

  private buildAuditPayload(entity: OrgProject): Record<string, unknown> {
    return {
      idEmpresa: entity.idEmpresa ?? null,
      nombre: entity.nombre ?? null,
      descripcion: entity.descripcion ?? null,
      codigo: entity.codigo ?? null,
      idExterno: entity.idExterno ?? null,
      esInactivo: entity.esInactivo === 1 ? 'Inactivo' : 'Activo',
    };
  }

  private normalizeAuditValue(value: unknown): string {
    if (value === null || value === undefined) return '(vacio)';
    if (typeof value === 'boolean') return value ? 'Si' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    const text = String(value).trim();
    return text.length > 0 ? text : '(vacio)';
  }

  private buildAuditChanges(
    payloadBefore: Record<string, unknown> | null,
    payloadAfter: Record<string, unknown> | null,
  ): Array<{ campo: string; antes: string; despues: string }> {
    if (!payloadBefore || !payloadAfter) return [];
    const keys = new Set<string>([
      ...Object.keys(payloadBefore),
      ...Object.keys(payloadAfter),
    ]);
    const changes: Array<{ campo: string; antes: string; despues: string }> = [];
    for (const key of keys) {
      if (!(key in this.auditFieldLabels)) continue;
      const beforeValue = this.normalizeAuditValue(payloadBefore[key]);
      const afterValue = this.normalizeAuditValue(payloadAfter[key]);
      if (beforeValue === afterValue) continue;
      changes.push({
        campo: this.auditFieldLabels[key] ?? key,
        antes: beforeValue,
        despues: afterValue,
      });
    }
    return changes;
  }

  private async assertCodigoUnique(codigo: string, exceptId?: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { codigo } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Ya existe un proyecto con ese codigo');
    }
  }

  private async assertIdExternoUnique(idExterno: string, exceptId?: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { idExterno } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Ya existe un proyecto con ese ID externo');
    }
  }

  private async assertCompanyActive(idEmpresa: number): Promise<void> {
    const company = await this.companyRepo.findOne({ where: { id: idEmpresa, estado: 1 } });
    if (!company) {
      throw new BadRequestException('Debe seleccionar una empresa activa para gestionar proyectos.');
    }
  }
}
