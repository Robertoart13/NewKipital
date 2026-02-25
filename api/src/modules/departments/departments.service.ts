import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../employees/entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AuditOutboxService } from '../integration/audit-outbox.service';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly repo: Repository<Department>,
    private readonly auditOutbox: AuditOutboxService,
  ) {}

  private readonly auditFieldLabels: Record<string, string> = {
    nombre: 'Nombre departamento',
    idExterno: 'ID externo',
    estado: 'Estado',
  };

  async create(dto: CreateDepartmentDto, actorUserId: number): Promise<Department> {
    const entity = this.repo.create({
      nombre: dto.nombre.trim(),
      idExterno: dto.idExterno?.trim() || null,
      estado: 1,
      creadoPor: actorUserId,
      modificadoPor: actorUserId,
    });
    const saved = await this.repo.save(entity);
    this.auditOutbox.publish({
      modulo: 'departments',
      accion: 'create',
      entidad: 'department',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Departamento creado: ${saved.nombre}`,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async findAll(includeInactive = false, inactiveOnly = false): Promise<Department[]> {
    const qb = this.repo.createQueryBuilder('d').orderBy('d.nombre', 'ASC');

    if (inactiveOnly) {
      qb.where('d.estado = 0');
    } else if (!includeInactive) {
      qb.where('d.estado = 1');
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<Department> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Departamento con ID ${id} no encontrado`);
    }
    return found;
  }

  async update(id: number, dto: UpdateDepartmentDto, actorUserId: number): Promise<Department> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);

    if (dto.nombre !== undefined) {
      found.nombre = dto.nombre.trim();
    }
    if (dto.idExterno !== undefined) {
      found.idExterno = dto.idExterno.trim() || null;
    }
    found.modificadoPor = actorUserId;

    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'departments',
      accion: 'update',
      entidad: 'department',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Departamento actualizado: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async inactivate(id: number, actorUserId: number): Promise<Department> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    found.estado = 0;
    found.modificadoPor = actorUserId;
    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'departments',
      accion: 'inactivate',
      entidad: 'department',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Departamento inactivado: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async reactivate(id: number, actorUserId: number): Promise<Department> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    found.estado = 1;
    found.modificadoPor = actorUserId;
    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'departments',
      accion: 'reactivate',
      entidad: 'department',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Departamento reactivado: ${saved.nombre}`,
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
      WHERE a.entidad_auditoria = 'department'
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

  private buildAuditPayload(entity: Department): Record<string, unknown> {
    return {
      nombre: entity.nombre ?? null,
      idExterno: entity.idExterno ?? null,
      estado: entity.estado === 1 ? 'Activo' : 'Inactivo',
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
}
