import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingAccount } from './entities/accounting-account.entity';
import { AccountingAccountType } from './entities/accounting-account-type.entity';
import { PersonalActionType } from './entities/personal-action-type.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateAccountingAccountDto } from './dto/create-accounting-account.dto';
import { UpdateAccountingAccountDto } from './dto/update-accounting-account.dto';
import { AuditOutboxService } from '../integration/audit-outbox.service';

@Injectable()
export class AccountingAccountsService {
  constructor(
    @InjectRepository(AccountingAccount)
    private readonly repo: Repository<AccountingAccount>,
    @InjectRepository(AccountingAccountType)
    private readonly typeRepo: Repository<AccountingAccountType>,
    @InjectRepository(PersonalActionType)
    private readonly actionTypeRepo: Repository<PersonalActionType>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly auditOutbox: AuditOutboxService,
  ) {}

  private readonly auditFieldLabels: Record<string, string> = {
    idEmpresa: 'Empresa',
    nombre: 'Nombre cuenta',
    descripcion: 'Descripcion',
    codigo: 'Codigo',
    idExternoNetsuite: 'ID externo Netsuite',
    codigoExterno: 'Codigo externo',
    idTipoErp: 'Tipo de cuenta',
    idTipoAccionPersonal: 'Tipo accion personal',
    esInactivo: 'Estado',
  };

  async create(dto: CreateAccountingAccountDto, actorUserId: number): Promise<AccountingAccount> {
    await this.assertCompanyActive(dto.idEmpresa);
    await this.assertTipoCuentaActivo(dto.idTipoErp);
    await this.assertTipoAccionActivo(dto.idTipoAccionPersonal);
    await this.assertCodigoUnique(dto.idEmpresa, dto.codigo);
    if (dto.idExternoNetsuite?.trim()) {
      await this.assertIdExternoNetsuiteUnique(dto.idEmpresa, dto.idExternoNetsuite.trim());
    }
    if (dto.codigoExterno?.trim()) {
      await this.assertCodigoExternoUnique(dto.idEmpresa, dto.codigoExterno.trim());
    }

    const entity = this.repo.create({
      idEmpresa: dto.idEmpresa,
      nombre: dto.nombre.trim(),
      descripcion: dto.descripcion?.trim() || null,
      codigo: dto.codigo.trim(),
      idExternoNetsuite: dto.idExternoNetsuite?.trim() || null,
      codigoExterno: dto.codigoExterno?.trim() || null,
      idTipoErp: dto.idTipoErp,
      idTipoAccionPersonal: dto.idTipoAccionPersonal,
      esInactivo: 0,
    });
    const saved = await this.repo.save(entity);
    this.auditOutbox.publish({
      modulo: 'accounting-accounts',
      accion: 'create',
      entidad: 'accounting-account',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Cuenta contable creada: ${saved.nombre}`,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async findAll(
    includeInactive = false,
    inactiveOnly = false,
    idEmpresa?: number,
    idEmpresas?: number[],
  ): Promise<AccountingAccount[]> {
    const qb = this.repo.createQueryBuilder('c').orderBy('c.nombre', 'ASC');

    if (idEmpresas && idEmpresas.length > 0) {
      qb.andWhere('c.idEmpresa IN (:...idEmpresas)', { idEmpresas });
    } else if (idEmpresa) {
      qb.andWhere('c.idEmpresa = :idEmpresa', { idEmpresa });
    }

    if (inactiveOnly) {
      qb.andWhere('c.esInactivo = 1');
    } else if (!includeInactive) {
      qb.andWhere('c.esInactivo = 0');
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<AccountingAccount> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Cuenta contable con ID ${id} no encontrada`);
    }
    return found;
  }

  async update(id: number, dto: UpdateAccountingAccountDto, actorUserId: number): Promise<AccountingAccount> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);

    if (dto.idEmpresa !== undefined && dto.idEmpresa !== found.idEmpresa) {
      await this.assertCompanyActive(dto.idEmpresa);
      await this.assertCodigoUnique(dto.idEmpresa, dto.codigo ?? found.codigo, id);
      if (dto.idExternoNetsuite?.trim() || found.idExternoNetsuite) {
        await this.assertIdExternoNetsuiteUnique(dto.idEmpresa, dto.idExternoNetsuite?.trim() || found.idExternoNetsuite!, id);
      }
      if (dto.codigoExterno?.trim() || found.codigoExterno) {
        await this.assertCodigoExternoUnique(dto.idEmpresa, dto.codigoExterno?.trim() || found.codigoExterno!, id);
      }
      found.idEmpresa = dto.idEmpresa;
    }

    if (dto.codigo && dto.codigo.trim() !== found.codigo) {
      await this.assertCodigoUnique(found.idEmpresa, dto.codigo.trim(), id);
    }

    if (dto.idExternoNetsuite !== undefined) {
      const nextIdExterno = dto.idExternoNetsuite.trim();
      if (nextIdExterno) {
        await this.assertIdExternoNetsuiteUnique(found.idEmpresa, nextIdExterno, id);
      }
      found.idExternoNetsuite = nextIdExterno || null;
    }

    if (dto.codigoExterno !== undefined) {
      const nextCodigoExterno = dto.codigoExterno.trim();
      if (nextCodigoExterno) {
        await this.assertCodigoExternoUnique(found.idEmpresa, nextCodigoExterno, id);
      }
      found.codigoExterno = nextCodigoExterno || null;
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
    if (dto.idTipoErp !== undefined) {
      await this.assertTipoCuentaActivo(dto.idTipoErp);
      found.idTipoErp = dto.idTipoErp;
    }
    if (dto.idTipoAccionPersonal !== undefined) {
      await this.assertTipoAccionActivo(dto.idTipoAccionPersonal);
      found.idTipoAccionPersonal = dto.idTipoAccionPersonal;
    }

    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'accounting-accounts',
      accion: 'update',
      entidad: 'accounting-account',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Cuenta contable actualizada: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async inactivate(id: number, actorUserId: number): Promise<AccountingAccount> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    found.esInactivo = 1;
    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'accounting-accounts',
      accion: 'inactivate',
      entidad: 'accounting-account',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Cuenta contable inactivada: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async reactivate(id: number, actorUserId: number): Promise<AccountingAccount> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    found.esInactivo = 0;
    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'accounting-accounts',
      accion: 'reactivate',
      entidad: 'accounting-account',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Cuenta contable reactivada: ${saved.nombre}`,
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
      WHERE a.entidad_auditoria = 'accounting-account'
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

  async listAccountTypes(): Promise<AccountingAccountType[]> {
    return this.typeRepo.find({
      order: { nombre: 'ASC' },
    });
  }

  async listPersonalActionTypes(): Promise<PersonalActionType[]> {
    return this.actionTypeRepo.find({
      order: { nombre: 'ASC' },
    });
  }

  private buildAuditPayload(entity: AccountingAccount): Record<string, unknown> {
    return {
      idEmpresa: entity.idEmpresa ?? null,
      nombre: entity.nombre ?? null,
      descripcion: entity.descripcion ?? null,
      codigo: entity.codigo ?? null,
      idExternoNetsuite: entity.idExternoNetsuite ?? null,
      codigoExterno: entity.codigoExterno ?? null,
      idTipoErp: entity.idTipoErp ?? null,
      idTipoAccionPersonal: entity.idTipoAccionPersonal ?? null,
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

  private async assertCompanyActive(idEmpresa: number): Promise<void> {
    const company = await this.companyRepo.findOne({ where: { id: idEmpresa } });
    if (!company || company.estado !== 1) {
      throw new BadRequestException('Debe seleccionar una empresa activa para gestionar cuentas contables.');
    }
  }

  private async assertCodigoUnique(idEmpresa: number, codigo: string, excludeId?: number): Promise<void> {
    const qb = this.repo.createQueryBuilder('c')
      .where('c.idEmpresa = :idEmpresa', { idEmpresa })
      .andWhere('c.codigo = :codigo', { codigo });
    if (excludeId) {
      qb.andWhere('c.id != :excludeId', { excludeId });
    }
    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException('Ya existe una cuenta contable con el mismo codigo en esta empresa.');
    }
  }

  private async assertIdExternoNetsuiteUnique(idEmpresa: number, idExternoNetsuite: string, excludeId?: number): Promise<void> {
    const qb = this.repo.createQueryBuilder('c')
      .where('c.idEmpresa = :idEmpresa', { idEmpresa })
      .andWhere('c.idExternoNetsuite = :idExternoNetsuite', { idExternoNetsuite });
    if (excludeId) {
      qb.andWhere('c.id != :excludeId', { excludeId });
    }
    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException('Ya existe una cuenta contable con el mismo ID externo Netsuite en esta empresa.');
    }
  }

  private async assertCodigoExternoUnique(idEmpresa: number, codigoExterno: string, excludeId?: number): Promise<void> {
    const qb = this.repo.createQueryBuilder('c')
      .where('c.idEmpresa = :idEmpresa', { idEmpresa })
      .andWhere('c.codigoExterno = :codigoExterno', { codigoExterno });
    if (excludeId) {
      qb.andWhere('c.id != :excludeId', { excludeId });
    }
    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException('Ya existe una cuenta contable con el mismo codigo externo en esta empresa.');
    }
  }

  private async assertTipoCuentaActivo(idTipoErp: number): Promise<void> {
    const found = await this.typeRepo.findOne({ where: { id: idTipoErp } });
    if (!found || found.status !== 1) {
      throw new BadRequestException('Debe seleccionar un tipo de cuenta activo.');
    }
  }

  private async assertTipoAccionActivo(idTipoAccionPersonal: number): Promise<void> {
    const found = await this.actionTypeRepo.findOne({ where: { id: idTipoAccionPersonal } });
    if (!found || found.estado !== 1) {
      throw new BadRequestException('Debe seleccionar un tipo de accion personal activo.');
    }
  }
}
