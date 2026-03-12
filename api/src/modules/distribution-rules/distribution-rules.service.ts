import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';

import { AccountingAccount } from '../accounting-accounts/entities/accounting-account.entity';
import { PersonalActionType } from '../accounting-accounts/entities/personal-action-type.entity';
import { Company } from '../companies/entities/company.entity';
import { Department } from '../employees/entities/department.entity';
import { Position } from '../employees/entities/position.entity';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import { AppCacheService } from '../../common/services/app-cache.service';

import { CreateDistributionRuleDto } from './dto/create-distribution-rule.dto';
import { ListDistributionRulesDto } from './dto/list-distribution-rules.dto';
import { UpdateDistributionRuleDto } from './dto/update-distribution-rule.dto';
import { DistributionRuleDetail } from './entities/distribution-rule-detail.entity';
import { DistributionRule } from './entities/distribution-rule.entity';

export interface DistributionRuleDetailResponse {
  id: number;
  idTipoAccionPersonal: number;
  codigoTipoAccionPersonal: string;
  nombreTipoAccionPersonal: string;
  idCuentaContable: number;
  codigoCuentaContable: string;
  nombreCuentaContable: string;
}

export interface DistributionRuleResponse {
  id: number;
  publicId: string;
  idEmpresa: number;
  nombreEmpresa: string;
  esReglaGlobal: number;
  idDepartamento: number | null;
  nombreDepartamento: string | null;
  idPuesto: number | null;
  nombrePuesto: string | null;
  estadoRegla: number;
  fechaCreacion: Date;
  fechaModificacion: Date;
  creadoPor: number | null;
  modificadoPor: number | null;
  totalAsignaciones: number;
  detalles: DistributionRuleDetailResponse[];
}

@Injectable()
export class DistributionRulesService {
  private readonly activeFlag = 1;
  private readonly inactiveFlag = 0;
  private readonly publicIdSecret =
    process.env.DISTRIBUTION_RULE_PUBLIC_ID_SECRET?.trim() ||
    'kpital-distribution-rule-public-id-secret-v1';

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DistributionRule)
    private readonly ruleRepo: Repository<DistributionRule>,
    @InjectRepository(DistributionRuleDetail)
    private readonly detailRepo: Repository<DistributionRuleDetail>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
    @InjectRepository(PersonalActionType)
    private readonly actionTypeRepo: Repository<PersonalActionType>,
    @InjectRepository(AccountingAccount)
    private readonly accountRepo: Repository<AccountingAccount>,
    private readonly auditOutbox: AuditOutboxService,
    private readonly appCache: AppCacheService,
  ) {}

  async findAll(query: ListDistributionRulesDto): Promise<DistributionRuleResponse[]> {
    const qb = this.ruleRepo
      .createQueryBuilder('r')
      .leftJoin(Company, 'e', 'e.id = r.idEmpresa')
      .leftJoin(Department, 'd', 'd.id = r.idDepartamento')
      .leftJoin(Position, 'p', 'p.id = r.idPuesto')
      .select([
        'r.id AS id',
        'r.publicId AS publicId',
        'r.idEmpresa AS idEmpresa',
        'e.nombre AS nombreEmpresa',
        'r.esReglaGlobal AS esReglaGlobal',
        'r.idDepartamento AS idDepartamento',
        'd.nombre AS nombreDepartamento',
        'r.idPuesto AS idPuesto',
        'p.nombre AS nombrePuesto',
        'r.estadoRegla AS estadoRegla',
        'r.fechaCreacion AS fechaCreacion',
        'r.fechaModificacion AS fechaModificacion',
        'r.creadoPor AS creadoPor',
        'r.modificadoPor AS modificadoPor',
      ])
      .orderBy('r.fechaModificacion', 'DESC');

    if (query.idEmpresa) {
      qb.andWhere('r.idEmpresa = :idEmpresa', { idEmpresa: query.idEmpresa });
    }
    if (query.esReglaGlobal != null) {
      qb.andWhere('r.esReglaGlobal = :esReglaGlobal', { esReglaGlobal: query.esReglaGlobal });
    }
    if (query.idDepartamento) {
      qb.andWhere('r.idDepartamento = :idDepartamento', { idDepartamento: query.idDepartamento });
    }
    if (query.idPuesto) {
      qb.andWhere('r.idPuesto = :idPuesto', { idPuesto: query.idPuesto });
    }
    if (query.esActivo != null) {
      qb.andWhere('r.estadoRegla = :estadoRegla', { estadoRegla: query.esActivo });
    }

    const rows = (await qb.getRawMany()) as Array<Record<string, unknown>>;
    const ids = rows
      .map((row) => Number(row.id))
      .filter((value) => Number.isInteger(value) && value > 0);

    const detailsByRuleId = await this.loadDetailsForRuleIds(ids);

    return rows.map((row) => {
      const id = Number(row.id);
      const detalles = detailsByRuleId.get(id) ?? [];
      return {
        id,
        publicId: String(row.publicId ?? ''),
        idEmpresa: Number(row.idEmpresa),
        nombreEmpresa: String(row.nombreEmpresa ?? `Empresa #${row.idEmpresa}`),
        esReglaGlobal: Number(row.esReglaGlobal),
        idDepartamento: row.idDepartamento == null ? null : Number(row.idDepartamento),
        nombreDepartamento: row.nombreDepartamento ? String(row.nombreDepartamento) : null,
        idPuesto: row.idPuesto == null ? null : Number(row.idPuesto),
        nombrePuesto: row.nombrePuesto ? String(row.nombrePuesto) : null,
        estadoRegla: Number(row.estadoRegla),
        fechaCreacion: new Date(String(row.fechaCreacion)),
        fechaModificacion: new Date(String(row.fechaModificacion)),
        creadoPor: row.creadoPor == null ? null : Number(row.creadoPor),
        modificadoPor: row.modificadoPor == null ? null : Number(row.modificadoPor),
        totalAsignaciones: detalles.length,
        detalles,
      } satisfies DistributionRuleResponse;
    });
  }

  async findOneByPublicId(publicId: string): Promise<DistributionRuleResponse> {
    const id = this.decodePublicId(publicId);
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Regla de distribucion no encontrada');
    }

    const [company, department, position] = await Promise.all([
      this.companyRepo.findOne({ where: { id: rule.idEmpresa } }),
      rule.idDepartamento
        ? this.departmentRepo.findOne({ where: { id: rule.idDepartamento } })
        : Promise.resolve(null),
      rule.idPuesto ? this.positionRepo.findOne({ where: { id: rule.idPuesto } }) : Promise.resolve(null),
    ]);

    const detailsByRuleId = await this.loadDetailsForRuleIds([rule.id]);
    const detalles = detailsByRuleId.get(rule.id) ?? [];

    return {
      id: rule.id,
      publicId: rule.publicId,
      idEmpresa: rule.idEmpresa,
      nombreEmpresa: company?.nombre ?? `Empresa #${rule.idEmpresa}`,
      esReglaGlobal: rule.esReglaGlobal,
      idDepartamento: rule.idDepartamento,
      nombreDepartamento: department?.nombre ?? null,
      idPuesto: rule.idPuesto,
      nombrePuesto: position?.nombre ?? null,
      estadoRegla: rule.estadoRegla,
      fechaCreacion: rule.fechaCreacion,
      fechaModificacion: rule.fechaModificacion,
      creadoPor: rule.creadoPor,
      modificadoPor: rule.modificadoPor,
      totalAsignaciones: detalles.length,
      detalles,
    };
  }

  async create(dto: CreateDistributionRuleDto, actorUserId: number): Promise<DistributionRuleResponse> {
    const normalized = this.normalizeScope(dto.esReglaGlobal, dto.idDepartamento, dto.idPuesto);
    this.assertNoDuplicateActionTypes(dto.detalles);

    await this.assertCompanyActive(dto.idEmpresa);
    await this.assertScopeDependencies(normalized.esReglaGlobal, normalized.idDepartamento, normalized.idPuesto);
    await this.assertScopeUnique(
      dto.idEmpresa,
      normalized.esReglaGlobal,
      normalized.idDepartamento,
      normalized.idPuesto,
    );
    await this.assertDetailsIntegrity(dto.idEmpresa, dto.detalles);

    const rule = await this.dataSource.transaction(async (manager) => {
      const ruleRepository = manager.getRepository(DistributionRule);
      const detailRepository = manager.getRepository(DistributionRuleDetail);

      const created = await ruleRepository.save(
        ruleRepository.create({
          idEmpresa: dto.idEmpresa,
          publicId: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          esReglaGlobal: normalized.esReglaGlobal,
          idDepartamento: normalized.idDepartamento,
          idPuesto: normalized.idPuesto,
          estadoRegla: this.activeFlag,
          creadoPor: actorUserId,
          modificadoPor: actorUserId,
        }),
      );

      created.publicId = this.encodePublicId(created.id);
      await ruleRepository.save(created);

      const details = dto.detalles.map((detail) =>
        detailRepository.create({
          idReglaDistribucion: created.id,
          idTipoAccionPersonal: detail.idTipoAccionPersonal,
          idCuentaContable: detail.idCuentaContable,
        }),
      );
      await detailRepository.save(details);

      return created;
    });

    const response = await this.findOneByPublicId(rule.publicId);

    this.auditOutbox.publish({
      modulo: 'distribution-rules',
      accion: 'create',
      entidad: 'distribution-rule',
      entidadId: rule.id,
      actorUserId,
      companyContextId: dto.idEmpresa,
      descripcion: this.buildCreateDescription(response),
      payloadAfter: this.buildAuditPayload(response),
    });
    await this.invalidateDistributionRulesCache(dto.idEmpresa);

    return response;
  }

  async update(
    publicId: string,
    dto: UpdateDistributionRuleDto,
    actorUserId: number,
  ): Promise<DistributionRuleResponse> {
    const id = this.decodePublicId(publicId);
    const existing = await this.ruleRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Regla de distribucion no encontrada');
    }

    const nextScope = this.normalizeScope(
      dto.esReglaGlobal ?? existing.esReglaGlobal === 1,
      dto.idDepartamento ?? existing.idDepartamento,
      dto.idPuesto ?? existing.idPuesto,
    );

    this.assertNoDuplicateActionTypes(dto.detalles);
    await this.assertScopeDependencies(nextScope.esReglaGlobal, nextScope.idDepartamento, nextScope.idPuesto);

    if (existing.estadoRegla === this.activeFlag) {
      await this.assertScopeUnique(
        existing.idEmpresa,
        nextScope.esReglaGlobal,
        nextScope.idDepartamento,
        nextScope.idPuesto,
        existing.id,
      );
    }

    await this.assertDetailsIntegrity(existing.idEmpresa, dto.detalles);

    const payloadBefore = await this.findOneByPublicId(publicId);

    await this.dataSource.transaction(async (manager) => {
      const ruleRepository = manager.getRepository(DistributionRule);
      const detailRepository = manager.getRepository(DistributionRuleDetail);

      existing.esReglaGlobal = nextScope.esReglaGlobal;
      existing.idDepartamento = nextScope.idDepartamento;
      existing.idPuesto = nextScope.idPuesto;
      existing.modificadoPor = actorUserId;
      await ruleRepository.save(existing);

      await detailRepository.delete({ idReglaDistribucion: existing.id });
      const details = dto.detalles.map((detail) =>
        detailRepository.create({
          idReglaDistribucion: existing.id,
          idTipoAccionPersonal: detail.idTipoAccionPersonal,
          idCuentaContable: detail.idCuentaContable,
        }),
      );
      await detailRepository.save(details);
    });

    const payloadAfter = await this.findOneByPublicId(publicId);

    this.auditOutbox.publish({
      modulo: 'distribution-rules',
      accion: 'update',
      entidad: 'distribution-rule',
      entidadId: existing.id,
      actorUserId,
      companyContextId: existing.idEmpresa,
      descripcion: this.buildUpdateDescription(payloadBefore, payloadAfter),
      payloadBefore: this.buildAuditPayload(payloadBefore),
      payloadAfter: this.buildAuditPayload(payloadAfter),
    });
    await this.invalidateDistributionRulesCache(existing.idEmpresa);

    return payloadAfter;
  }

  async inactivate(publicId: string, actorUserId: number): Promise<DistributionRuleResponse> {
    const id = this.decodePublicId(publicId);
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Regla de distribucion no encontrada');
    }
    if (rule.estadoRegla === this.inactiveFlag) {
      return this.findOneByPublicId(publicId);
    }

    const payloadBefore = await this.findOneByPublicId(publicId);
    rule.estadoRegla = this.inactiveFlag;
    rule.modificadoPor = actorUserId;
    await this.ruleRepo.save(rule);
    const payloadAfter = await this.findOneByPublicId(publicId);

    this.auditOutbox.publish({
      modulo: 'distribution-rules',
      accion: 'inactivate',
      entidad: 'distribution-rule',
      entidadId: rule.id,
      actorUserId,
      companyContextId: rule.idEmpresa,
      descripcion: this.buildStatusDescription('inactivate', payloadAfter),
      payloadBefore: this.buildAuditPayload(payloadBefore),
      payloadAfter: this.buildAuditPayload(payloadAfter),
    });
    await this.invalidateDistributionRulesCache(rule.idEmpresa);

    return payloadAfter;
  }

  async reactivate(publicId: string, actorUserId: number): Promise<DistributionRuleResponse> {
    const id = this.decodePublicId(publicId);
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Regla de distribucion no encontrada');
    }

    await this.assertScopeUnique(
      rule.idEmpresa,
      rule.esReglaGlobal,
      rule.idDepartamento,
      rule.idPuesto,
      rule.id,
    );

    const payloadBefore = await this.findOneByPublicId(publicId);
    rule.estadoRegla = this.activeFlag;
    rule.modificadoPor = actorUserId;
    await this.ruleRepo.save(rule);
    const payloadAfter = await this.findOneByPublicId(publicId);

    this.auditOutbox.publish({
      modulo: 'distribution-rules',
      accion: 'reactivate',
      entidad: 'distribution-rule',
      entidadId: rule.id,
      actorUserId,
      companyContextId: rule.idEmpresa,
      descripcion: this.buildStatusDescription('reactivate', payloadAfter),
      payloadBefore: this.buildAuditPayload(payloadBefore),
      payloadAfter: this.buildAuditPayload(payloadAfter),
    });
    await this.invalidateDistributionRulesCache(rule.idEmpresa);

    return payloadAfter;
  }

  async getAuditTrail(publicId: string, limit = 100) {
    const rule = await this.findOneByPublicId(publicId);
    const safeLimit = Math.min(Math.max(Number(limit || 100), 1), 500);

    const rows = await this.ruleRepo.query(
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
      WHERE a.entidad_auditoria = 'distribution-rule'
        AND a.id_entidad_auditoria = ?
      ORDER BY a.fecha_creacion_auditoria DESC
      LIMIT ?
      `,
      [String(rule.id), safeLimit],
    );

    return (rows ?? []).map((row: Record<string, unknown>) => ({
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
      cambios: this.buildAuditChanges(
        this.parseAuditPayload(row.payloadBefore),
        this.parseAuditPayload(row.payloadAfter),
      ),
    }));
  }

  private async assertCompanyActive(idEmpresa: number): Promise<void> {
    const company = await this.companyRepo.findOne({ where: { id: idEmpresa } });
    if (!company || company.estado !== this.activeFlag) {
      throw new BadRequestException('Debe seleccionar una empresa activa.');
    }
  }

  private async assertScopeDependencies(
    esReglaGlobal: number,
    idDepartamento: number | null,
    idPuesto: number | null,
  ): Promise<void> {
    if (esReglaGlobal === this.activeFlag) {
      if (idDepartamento != null || idPuesto != null) {
        throw new BadRequestException(
          'La regla global no debe incluir departamento ni puesto.',
        );
      }
      return;
    }

    if (!idDepartamento) {
      throw new BadRequestException(
        'Debe seleccionar un departamento cuando la regla no es global.',
      );
    }

    const department = await this.departmentRepo.findOne({ where: { id: idDepartamento } });
    if (!department || department.estado !== this.activeFlag) {
      throw new BadRequestException('Debe seleccionar un departamento activo.');
    }

    if (idPuesto) {
      const position = await this.positionRepo.findOne({ where: { id: idPuesto } });
      if (!position || position.estado !== this.activeFlag) {
        throw new BadRequestException('Debe seleccionar un puesto activo.');
      }
    }
  }

  private async assertScopeUnique(
    idEmpresa: number,
    esReglaGlobal: number,
    idDepartamento: number | null,
    idPuesto: number | null,
    excludeId?: number,
  ): Promise<void> {
    const qb = this.ruleRepo
      .createQueryBuilder('r')
      .where('r.idEmpresa = :idEmpresa', { idEmpresa })
      .andWhere('r.esReglaGlobal = :esReglaGlobal', { esReglaGlobal })
      .andWhere('r.estadoRegla = :estadoRegla', { estadoRegla: this.activeFlag });

    if (esReglaGlobal === this.activeFlag) {
      qb.andWhere('r.idDepartamento IS NULL').andWhere('r.idPuesto IS NULL');
    } else {
      qb.andWhere('r.idDepartamento = :idDepartamento', { idDepartamento });
      if (idPuesto == null) {
        qb.andWhere('r.idPuesto IS NULL');
      } else {
        qb.andWhere('r.idPuesto = :idPuesto', { idPuesto });
      }
    }

    if (excludeId) {
      qb.andWhere('r.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException(
        'Ya existe una regla activa con el mismo ambito (empresa/departamento/puesto).',
      );
    }
  }

  private async assertDetailsIntegrity(
    idEmpresa: number,
    details: Array<{ idTipoAccionPersonal: number; idCuentaContable: number }>,
  ): Promise<void> {
    const actionTypeIds = Array.from(new Set(details.map((detail) => detail.idTipoAccionPersonal)));
    const accountIds = Array.from(new Set(details.map((detail) => detail.idCuentaContable)));

    const actionTypes = await this.actionTypeRepo.find({ where: { id: In(actionTypeIds) } });
    if (actionTypes.length !== actionTypeIds.length) {
      throw new BadRequestException('Hay tipos de accion personal invalidos en la regla.');
    }

    if (actionTypes.some((actionType) => actionType.estado !== this.activeFlag)) {
      throw new BadRequestException('Todos los tipos de accion personal deben estar activos.');
    }

    const accounts = await this.accountRepo.find({ where: { id: In(accountIds) } });
    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('Hay cuentas contables invalidas en la regla.');
    }

    const accountById = new Map(accounts.map((account) => [account.id, account]));
    for (const detail of details) {
      const account = accountById.get(detail.idCuentaContable);
      if (!account) {
        throw new BadRequestException('Cuenta contable no encontrada para una de las lineas.');
      }
      if (account.esInactivo !== this.activeFlag) {
        throw new BadRequestException('Todas las cuentas contables de la regla deben estar activas.');
      }
      if (account.idEmpresa !== idEmpresa) {
        throw new BadRequestException(
          'Cada cuenta contable debe pertenecer a la empresa seleccionada.',
        );
      }
      if (account.idTipoAccionPersonal !== detail.idTipoAccionPersonal) {
        throw new BadRequestException(
          'La cuenta contable seleccionada no corresponde al tipo de accion personal de la linea.',
        );
      }
    }
  }

  private assertNoDuplicateActionTypes(
    details: Array<{ idTipoAccionPersonal: number; idCuentaContable: number }>,
  ): void {
    const actionTypeIds = details.map((detail) => detail.idTipoAccionPersonal);
    const hasDuplicates = new Set(actionTypeIds).size !== actionTypeIds.length;
    if (hasDuplicates) {
      throw new BadRequestException(
        'No se permite repetir el mismo tipo de accion personal dentro de la regla.',
      );
    }
  }

  private normalizeScope(
    esReglaGlobal: boolean,
    idDepartamento?: number | null,
    idPuesto?: number | null,
  ): { esReglaGlobal: number; idDepartamento: number | null; idPuesto: number | null } {
    if (esReglaGlobal) {
      return { esReglaGlobal: this.activeFlag, idDepartamento: null, idPuesto: null };
    }

    return {
      esReglaGlobal: this.inactiveFlag,
      idDepartamento: idDepartamento ?? null,
      idPuesto: idPuesto ?? null,
    };
  }

  private async loadDetailsForRuleIds(
    ruleIds: number[],
  ): Promise<Map<number, DistributionRuleDetailResponse[]>> {
    const result = new Map<number, DistributionRuleDetailResponse[]>();
    if (ruleIds.length === 0) {
      return result;
    }

    const placeholders = ruleIds.map(() => '?').join(', ');
    const details = (await this.dataSource.query(
      `
      SELECT
        rd.id_regla_distribucion_detalle AS id,
        rd.id_regla_distribucion AS idReglaDistribucion,
        rd.id_tipo_accion_personal AS idTipoAccionPersonal,
        tap.codigo_accion AS codigoTipoAccionPersonal,
        tap.nombre_accion AS nombreTipoAccionPersonal,
        rd.id_cuenta_contable AS idCuentaContable,
        acc.codigo_cuenta_contable AS codigoCuentaContable,
        acc.nombre_cuenta_contable AS nombreCuentaContable
      FROM config_reglas_distribucion_detalle rd
      INNER JOIN nom_tipos_accion_personal tap
        ON tap.id_tipo_accion_personal = rd.id_tipo_accion_personal
      INNER JOIN erp_cuentas_contables acc
        ON acc.id_cuenta_contable = rd.id_cuenta_contable
      WHERE rd.id_regla_distribucion IN (${placeholders})
      ORDER BY tap.nombre_accion ASC, rd.id_regla_distribucion_detalle ASC
      `,
      ruleIds,
    )) as Array<Record<string, unknown>>;

    for (const row of details) {
      const ruleId = Number(row.idReglaDistribucion);
      const current = result.get(ruleId) ?? [];
      current.push({
        id: Number(row.id),
        idTipoAccionPersonal: Number(row.idTipoAccionPersonal),
        codigoTipoAccionPersonal: String(row.codigoTipoAccionPersonal ?? ''),
        nombreTipoAccionPersonal: String(row.nombreTipoAccionPersonal ?? ''),
        idCuentaContable: Number(row.idCuentaContable),
        codigoCuentaContable: String(row.codigoCuentaContable ?? ''),
        nombreCuentaContable: String(row.nombreCuentaContable ?? ''),
      });
      result.set(ruleId, current);
    }
    return result;
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

  private buildAuditPayload(rule: DistributionRuleResponse): Record<string, unknown> {
    return {
      publicId: rule.publicId,
      idEmpresa: rule.idEmpresa,
      nombreEmpresa: rule.nombreEmpresa,
      esReglaGlobal: rule.esReglaGlobal === this.activeFlag ? 'Global' : 'Especifica',
      idDepartamento: rule.idDepartamento,
      nombreDepartamento: rule.nombreDepartamento,
      idPuesto: rule.idPuesto,
      nombrePuesto: rule.nombrePuesto,
      estadoRegla: rule.estadoRegla === this.activeFlag ? 'Activa' : 'Inactiva',
      detalles: rule.detalles.map((detail) => ({
        tipoAccion: detail.nombreTipoAccionPersonal,
        cuentaContable: detail.nombreCuentaContable,
      })),
    };
  }

  private buildCreateDescription(rule: DistributionRuleResponse): string {
    const scope = this.formatScope(rule);
    const assignmentSummary = this.summarizeAssignments(rule.detalles);
    const raw =
      `Regla creada (${scope}) en empresa ${rule.idEmpresa} con ${rule.detalles.length} ` +
      `asignacion(es). ${assignmentSummary}`;
    return this.fitAuditDescription(raw);
  }

  private buildStatusDescription(
    action: 'inactivate' | 'reactivate',
    rule: DistributionRuleResponse,
  ): string {
    const actionText = action === 'inactivate' ? 'inactivada' : 'reactivada';
    const raw =
      `Regla ${actionText} (${this.formatScope(rule)}) en empresa ${rule.idEmpresa}. ` +
      `${rule.detalles.length} asignacion(es) vigentes.`;
    return this.fitAuditDescription(raw);
  }

  private buildUpdateDescription(
    beforeRule: DistributionRuleResponse,
    afterRule: DistributionRuleResponse,
  ): string {
    const parts: string[] = [];
    const beforeScope = this.formatScope(beforeRule);
    const afterScope = this.formatScope(afterRule);
    if (beforeScope !== afterScope) {
      parts.push(`Ambito: ${beforeScope} -> ${afterScope}.`);
    }

    const beforeByAction = new Map(
      beforeRule.detalles.map((detail) => [detail.idTipoAccionPersonal, detail]),
    );
    const afterByAction = new Map(
      afterRule.detalles.map((detail) => [detail.idTipoAccionPersonal, detail]),
    );

    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];

    for (const [actionId, afterDetail] of afterByAction.entries()) {
      const beforeDetail = beforeByAction.get(actionId);
      if (!beforeDetail) {
        added.push(this.formatAssignment(afterDetail));
        continue;
      }
      if (beforeDetail.idCuentaContable !== afterDetail.idCuentaContable) {
        changed.push(
          `${afterDetail.nombreTipoAccionPersonal}: ${beforeDetail.codigoCuentaContable} -> ${afterDetail.codigoCuentaContable}`,
        );
      }
    }

    for (const [actionId, beforeDetail] of beforeByAction.entries()) {
      if (!afterByAction.has(actionId)) {
        removed.push(this.formatAssignment(beforeDetail));
      }
    }

    if (added.length > 0) {
      parts.push(`Agrego: ${added.join('; ')}.`);
    }
    if (removed.length > 0) {
      parts.push(`Elimino: ${removed.join('; ')}.`);
    }
    if (changed.length > 0) {
      parts.push(`Cambio cuenta: ${changed.join('; ')}.`);
    }

    if (parts.length === 0) {
      parts.push('Se guardo la regla sin cambios detectables en ambito o asignaciones.');
    }

    const raw = `Regla actualizada (empresa ${afterRule.idEmpresa}). ${parts.join(' ')}`;
    return this.fitAuditDescription(raw);
  }

  private summarizeAssignments(details: DistributionRuleDetailResponse[]): string {
    if (details.length === 0) return 'Sin asignaciones.';
    const labels = details.map((detail) => this.formatAssignment(detail));
    return `Asignaciones: ${labels.join('; ')}.`;
  }

  private formatAssignment(detail: DistributionRuleDetailResponse): string {
    return `${detail.nombreTipoAccionPersonal} (${detail.codigoTipoAccionPersonal}) -> ${detail.codigoCuentaContable}`;
  }

  private formatScope(rule: DistributionRuleResponse): string {
    if (rule.esReglaGlobal === this.activeFlag) return 'Global';
    const department = rule.nombreDepartamento ?? `Departamento#${rule.idDepartamento ?? '-'}`;
    const position = rule.nombrePuesto ?? 'Sin puesto';
    return `Especifica ${department}/${position}`;
  }

  private fitAuditDescription(text: string): string {
    const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= 500) return normalized;
    return `${normalized.slice(0, 497)}...`;
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

    const labelMap: Record<string, string> = {
      idEmpresa: 'Empresa',
      nombreEmpresa: 'Nombre empresa',
      esReglaGlobal: 'Tipo de regla',
      idDepartamento: 'Departamento',
      nombreDepartamento: 'Nombre departamento',
      idPuesto: 'Puesto',
      nombrePuesto: 'Nombre puesto',
      estadoRegla: 'Estado',
      detalles: 'Asignaciones',
    };

    const beforePayload = payloadBefore ?? {};
    const afterPayload = payloadAfter ?? {};
    const keys = new Set<string>([...Object.keys(beforePayload), ...Object.keys(afterPayload)]);
    const changes: Array<{ campo: string; antes: string; despues: string }> = [];

    for (const key of keys) {
      if (!(key in labelMap)) continue;
      const beforeValue = this.normalizeAuditValue(beforePayload[key]);
      const afterValue = this.normalizeAuditValue(afterPayload[key]);
      if (beforeValue === afterValue) continue;
      changes.push({ campo: labelMap[key], antes: beforeValue, despues: afterValue });
    }

    return changes;
  }

  private encodePublicId(id: number): string {
    const payload = Buffer.from(String(id), 'utf8').toString('base64url');
    const signature = createHmac('sha256', this.publicIdSecret)
      .update(payload)
      .digest('base64url')
      .slice(0, 16);
    return `dr1_${payload}.${signature}`;
  }

  private decodePublicId(publicId: string): number {
    const raw = String(publicId ?? '').trim();
    const match = /^dr1_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(raw);
    if (!match) {
      throw new NotFoundException('Regla de distribucion no encontrada');
    }

    const [, payload, signature] = match;
    const expectedSignature = createHmac('sha256', this.publicIdSecret)
      .update(payload)
      .digest('base64url')
      .slice(0, 16);

    const receivedBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      throw new NotFoundException('Regla de distribucion no encontrada');
    }

    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const id = Number(decoded);
    if (!Number.isInteger(id) || id <= 0) {
      throw new NotFoundException('Regla de distribucion no encontrada');
    }

    return id;
  }

  private async invalidateDistributionRulesCache(companyId: number): Promise<void> {
    const companyKey = `empresa:${companyId}`;
    await Promise.allSettled([
      this.appCache.invalidateScope('distribution-rules', companyKey),
      this.appCache.invalidateScope('distribution-rules', 'global'),
    ]);
  }
}
