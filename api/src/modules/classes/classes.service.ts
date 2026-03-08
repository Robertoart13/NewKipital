import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditOutboxService } from '../integration/audit-outbox.service';

import { OrgClass } from './entities/class.entity';

import type { CreateClassDto } from './dto/create-class.dto';
import type { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(OrgClass)
    private readonly repo: Repository<OrgClass>,
    private readonly auditOutbox: AuditOutboxService,
  ) {}

  private readonly auditFieldLabels: Record<string, string> = {
    nombre: 'Nombre clase',
    descripcion: 'Descripcion',
    codigo: 'Codigo',
    idExterno: 'ID externo',
    esInactivo: 'Estado',
  };
  private readonly activeFlag = 1;
  private readonly inactiveFlag = 0;

  async create(dto: CreateClassDto, actorUserId: number): Promise<OrgClass> {
    await this.assertCodigoUnique(dto.codigo);
    if (dto.idExterno?.trim()) {
      await this.assertIdExternoUnique(dto.idExterno.trim());
    }

    const entity = this.repo.create({
      nombre: dto.nombre.trim(),
      descripcion: dto.descripcion?.trim() || null,
      codigo: dto.codigo.trim(),
      idExterno: dto.idExterno?.trim() || null,
      esInactivo: this.activeFlag,
    });
    const saved = await this.repo.save(entity);
    this.auditOutbox.publish({
      modulo: 'classes',
      accion: 'create',
      entidad: 'class',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Clase creada: ${saved.nombre}`,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async findAll(includeInactive = false, inactiveOnly = false): Promise<OrgClass[]> {
    const qb = this.repo.createQueryBuilder('c').orderBy('c.nombre', 'ASC');

    if (inactiveOnly) {
      qb.where('c.esInactivo = :inactiveFlag', { inactiveFlag: this.inactiveFlag });
    } else if (!includeInactive) {
      qb.where('c.esInactivo = :activeFlag', { activeFlag: this.activeFlag });
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<OrgClass> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Clase con ID ${id} no encontrada`);
    }
    return found;
  }

  async update(id: number, dto: UpdateClassDto, actorUserId: number): Promise<OrgClass> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);

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
      modulo: 'classes',
      accion: 'update',
      entidad: 'class',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Clase actualizada: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async inactivate(id: number, actorUserId: number): Promise<OrgClass> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    found.esInactivo = this.inactiveFlag;
    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'classes',
      accion: 'inactivate',
      entidad: 'class',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Clase inactivada: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async reactivate(id: number, actorUserId: number): Promise<OrgClass> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    found.esInactivo = this.activeFlag;
    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'classes',
      accion: 'reactivate',
      entidad: 'class',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Clase reactivada: ${saved.nombre}`,
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
      WHERE a.entidad_auditoria = 'class'
        AND a.id_entidad_auditoria = ?
      ORDER BY a.fecha_creacion_auditoria DESC
      LIMIT ?
      `,
      [idAsText, safeLimit],
    );

    return (rows ?? []).map((row: Record<string, unknown>) => {
      const payloadBefore = this.parseAuditPayload(row.payloadBefore);
      const payloadAfter = this.parseAuditPayload(row.payloadAfter);
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

  private parseAuditPayload(value: unknown): Record<string, unknown> | null {
    if (!value) return null;
    if (Buffer.isBuffer(value)) {
      try {
        const parsed = JSON.parse(value.toString('utf-8')) as Record<string, unknown>;
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch {
        return null;
      }
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch {
        return null;
      }
    }
    if (typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    return null;
  }

  private buildAuditPayload(entity: OrgClass): Record<string, unknown> {
    return {
      nombre: entity.nombre ?? null,
      descripcion: entity.descripcion ?? null,
      codigo: entity.codigo ?? null,
      idExterno: entity.idExterno ?? null,
      esInactivo: entity.esInactivo === this.inactiveFlag ? 'Inactivo' : 'Activo',
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
    if (!payloadBefore && !payloadAfter) return [];
    const beforePayload = payloadBefore ?? {};
    const afterPayload = payloadAfter ?? {};
    const keys = new Set<string>([...Object.keys(beforePayload), ...Object.keys(afterPayload)]);
    const changes: Array<{ campo: string; antes: string; despues: string }> = [];
    for (const key of keys) {
      if (!(key in this.auditFieldLabels)) continue;
      const beforeValue = this.normalizeAuditValue(beforePayload[key]);
      const afterValue = this.normalizeAuditValue(afterPayload[key]);
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
      throw new ConflictException('Ya existe una clase con ese codigo');
    }
  }

  private async assertIdExternoUnique(idExterno: string, exceptId?: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { idExterno } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Ya existe una clase con ese ID externo');
    }
  }
}
