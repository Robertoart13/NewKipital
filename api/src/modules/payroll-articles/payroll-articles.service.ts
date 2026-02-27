import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PayrollArticle } from './entities/payroll-article.entity';
import { PayrollArticleType } from './entities/payroll-article-type.entity';
import { CreatePayrollArticleDto } from './dto/create-payroll-article.dto';
import { UpdatePayrollArticleDto } from './dto/update-payroll-article.dto';
import { Company } from '../companies/entities/company.entity';
import { PersonalActionType } from '../accounting-accounts/entities/personal-action-type.entity';
import { AccountingAccount } from '../accounting-accounts/entities/accounting-account.entity';
import { AuditOutboxService } from '../integration/audit-outbox.service';

type AllowedAccountMapping = {
  id: number;
  label: string;
  allowedAccountTypes: number[];
  requiresGasto: boolean;
  requiresPasivo: boolean;
  allowsPasivo: boolean;
  primaryLabel: string;
};

const PAYROLL_ARTICLE_TYPE_RULES: AllowedAccountMapping[] = [
  // Reglas por referencia externa (id_externo_erp).
  { id: 1, label: 'Ingreso', allowedAccountTypes: [18, 19, 17], requiresGasto: true, requiresPasivo: false, allowsPasivo: false, primaryLabel: 'Cuenta Gasto' },
  { id: 2, label: 'Deduccion', allowedAccountTypes: [12, 13, 14], requiresGasto: false, requiresPasivo: false, allowsPasivo: false, primaryLabel: 'Cuenta Pasivo' },
  { id: 9, label: 'Gasto Empleado', allowedAccountTypes: [18, 19, 12], requiresGasto: true, requiresPasivo: false, allowsPasivo: false, primaryLabel: 'Cuenta Costo' },
  { id: 10, label: 'Aporte Patronal', allowedAccountTypes: [18, 19, 13], requiresGasto: true, requiresPasivo: false, allowsPasivo: true, primaryLabel: 'Cuenta Gasto' },
];

@Injectable()
export class PayrollArticlesService {
  constructor(
    @InjectRepository(PayrollArticle)
    private readonly repo: Repository<PayrollArticle>,
    @InjectRepository(PayrollArticleType)
    private readonly typeRepo: Repository<PayrollArticleType>,
    @InjectRepository(PersonalActionType)
    private readonly actionTypeRepo: Repository<PersonalActionType>,
    @InjectRepository(AccountingAccount)
    private readonly accountRepo: Repository<AccountingAccount>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly auditOutbox: AuditOutboxService,
  ) {}

  private readonly auditFieldLabels: Record<string, string> = {
    idEmpresa: 'Empresa',
    nombre: 'Nombre articulo',
    descripcion: 'Descripcion',
    idTipoAccionPersonal: 'Tipo accion personal',
    idTipoArticuloNomina: 'Tipo articulo nomina',
    idCuentaGasto: 'Cuenta gasto',
    idCuentaPasivo: 'Cuenta pasivo',
    esInactivo: 'Estado',
  };

  async create(dto: CreatePayrollArticleDto, actorUserId: number): Promise<PayrollArticle> {
    await this.assertCompanyActive(dto.idEmpresa);
    await this.assertTipoAccionActivo(dto.idTipoAccionPersonal);
    await this.assertTipoArticuloActivo(dto.idTipoArticuloNomina);
    await this.assertCuentaRules(dto.idEmpresa, dto.idTipoArticuloNomina, dto.idCuentaGasto, dto.idCuentaPasivo ?? null);

    const entity = this.repo.create({
      idEmpresa: dto.idEmpresa,
      nombre: dto.nombre.trim(),
      descripcion: (dto.descripcion ?? '--').trim() || '--',
      idTipoAccionPersonal: dto.idTipoAccionPersonal,
      idTipoArticuloNomina: dto.idTipoArticuloNomina,
      idCuentaGasto: dto.idCuentaGasto,
      idCuentaPasivo: dto.idCuentaPasivo ?? null,
      esInactivo: 0,
    });

    const saved = await this.repo.save(entity);
    this.auditOutbox.publish({
      modulo: 'payroll-articles',
      accion: 'create',
      entidad: 'payroll-article',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Articulo de nomina creado: ${saved.nombre}`,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async findAll(
    includeInactive = false,
    inactiveOnly = false,
    idEmpresa?: number,
    idEmpresas?: number[],
  ): Promise<PayrollArticle[]> {
    const qb = this.repo.createQueryBuilder('a').orderBy('a.nombre', 'ASC');

    if (idEmpresas && idEmpresas.length > 0) {
      qb.andWhere('a.idEmpresa IN (:...idEmpresas)', { idEmpresas });
    } else if (idEmpresa) {
      qb.andWhere('a.idEmpresa = :idEmpresa', { idEmpresa });
    }

    if (inactiveOnly) {
      qb.andWhere('a.esInactivo = 1');
    } else if (!includeInactive) {
      qb.andWhere('a.esInactivo = 0');
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<PayrollArticle> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Articulo de nomina con ID ${id} no encontrado`);
    }
    return found;
  }

  async update(id: number, dto: UpdatePayrollArticleDto, actorUserId: number): Promise<PayrollArticle> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);

    if (dto.idEmpresa !== undefined && dto.idEmpresa !== found.idEmpresa) {
      await this.assertCompanyActive(dto.idEmpresa);
      found.idEmpresa = dto.idEmpresa;
    }

    if (dto.idTipoAccionPersonal !== undefined) {
      await this.assertTipoAccionActivo(dto.idTipoAccionPersonal);
      found.idTipoAccionPersonal = dto.idTipoAccionPersonal;
    }

    if (dto.idTipoArticuloNomina !== undefined) {
      await this.assertTipoArticuloActivo(dto.idTipoArticuloNomina);
      found.idTipoArticuloNomina = dto.idTipoArticuloNomina;
    }

    if (dto.nombre !== undefined) {
      found.nombre = dto.nombre.trim();
    }

    if (dto.descripcion !== undefined) {
      found.descripcion = dto.descripcion.trim() || '--';
    }

    if (dto.idCuentaGasto !== undefined) {
      found.idCuentaGasto = dto.idCuentaGasto;
    }

    if (dto.idCuentaPasivo !== undefined) {
      found.idCuentaPasivo = dto.idCuentaPasivo ?? null;
    }

    await this.assertCuentaRules(
      found.idEmpresa,
      found.idTipoArticuloNomina,
      found.idCuentaGasto,
      found.idCuentaPasivo ?? null,
    );

    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'payroll-articles',
      accion: 'update',
      entidad: 'payroll-article',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Articulo de nomina actualizado: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async inactivate(id: number, actorUserId: number): Promise<PayrollArticle> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    found.esInactivo = 1;
    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'payroll-articles',
      accion: 'inactivate',
      entidad: 'payroll-article',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Articulo de nomina inactivado: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async reactivate(id: number, actorUserId: number): Promise<PayrollArticle> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    found.esInactivo = 0;
    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'payroll-articles',
      accion: 'reactivate',
      entidad: 'payroll-article',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Articulo de nomina reactivado: ${saved.nombre}`,
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
      WHERE a.entidad_auditoria = 'payroll-article'
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

  async listTypes(): Promise<PayrollArticleType[]> {
    return this.typeRepo.find({ order: { nombre: 'ASC' } });
  }

  async listPersonalActionTypes(): Promise<PersonalActionType[]> {
    return this.actionTypeRepo.find({ order: { nombre: 'ASC' } });
  }

  async listAccountsByCompany(
    idEmpresa: number,
    includeInactive = false,
    idsReferencia: number[],
  ): Promise<AccountingAccount[]> {
    const qb = this.accountRepo.createQueryBuilder('c')
      .where('c.idEmpresa = :idEmpresa', { idEmpresa })
      .orderBy('c.nombre', 'ASC');

    if (!includeInactive) {
      qb.andWhere('c.esInactivo = 0');
    }

    qb.andWhere('c.idTipoErp IN (:...ids)', { ids: idsReferencia });

    return qb.getMany();
  }

  private buildAuditPayload(entity: PayrollArticle): Record<string, unknown> {
    return {
      idEmpresa: entity.idEmpresa ?? null,
      nombre: entity.nombre ?? null,
      descripcion: entity.descripcion ?? null,
      idTipoAccionPersonal: entity.idTipoAccionPersonal ?? null,
      idTipoArticuloNomina: entity.idTipoArticuloNomina ?? null,
      idCuentaGasto: entity.idCuentaGasto ?? null,
      idCuentaPasivo: entity.idCuentaPasivo ?? null,
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

  private getRulesForTipo(idTipoArticuloNomina: number): AllowedAccountMapping {
    const rules = PAYROLL_ARTICLE_TYPE_RULES.find((item) => item.id === idTipoArticuloNomina);
    if (!rules) {
      throw new BadRequestException('Tipo de articulo de nomina no soportado.');
    }
    return rules;
  }

  private async assertCompanyActive(idEmpresa: number): Promise<void> {
    const company = await this.companyRepo.findOne({ where: { id: idEmpresa } });
    if (!company || company.estado !== 1) {
      throw new BadRequestException('Debe seleccionar una empresa activa.');
    }
  }

  private async assertTipoAccionActivo(idTipoAccionPersonal: number): Promise<void> {
    const found = await this.actionTypeRepo.findOne({ where: { id: idTipoAccionPersonal } });
    if (!found || found.estado !== 1) {
      throw new BadRequestException('Debe seleccionar un tipo de accion personal activo.');
    }
  }

  private async assertTipoArticuloActivo(idTipoArticuloNomina: number): Promise<void> {
    const found = await this.typeRepo.findOne({ where: { id: idTipoArticuloNomina } });
    if (!found || found.esInactivo === 1) {
      throw new BadRequestException('Debe seleccionar un tipo de articulo de nomina activo.');
    }
  }

  private async assertCuentaRules(
    idEmpresa: number,
    idTipoArticuloNomina: number,
    idCuentaGasto: number,
    idCuentaPasivo: number | null,
  ): Promise<void> {
    const rules = this.getRulesForTipo(idTipoArticuloNomina);

    if (rules.requiresGasto && !idCuentaGasto) {
      throw new BadRequestException('Debe seleccionar la cuenta principal del articulo.');
    }
    if (rules.requiresPasivo && !idCuentaPasivo) {
      throw new BadRequestException('Debe seleccionar la cuenta pasivo.');
    }
    if (!rules.allowsPasivo && idCuentaPasivo) {
      throw new BadRequestException('La cuenta pasivo no aplica para este tipo de articulo.');
    }

    const targetAccounts = Array.from(
      new Set([idCuentaGasto, idCuentaPasivo].filter((value) => !!value) as number[]),
    );
    const accounts = await this.accountRepo.find({ where: { id: In(targetAccounts) } });
    if (accounts.length !== targetAccounts.length) {
      throw new ConflictException('Cuenta contable no encontrada.');
    }
    for (const account of accounts) {
      if (account.idEmpresa !== idEmpresa) {
        throw new BadRequestException('La cuenta contable no pertenece a la empresa seleccionada.');
      }
      if (!rules.allowedAccountTypes.includes(account.idTipoErp)) {
        throw new BadRequestException('La cuenta contable no es valida para el tipo de articulo seleccionado.');
      }
      if (account.esInactivo === 1) {
        throw new BadRequestException('La cuenta contable seleccionada esta inactiva.');
      }
    }
  }
}
