import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, DataSource, Repository } from 'typeorm';

import { DOMAIN_EVENTS } from '../../common/events/event-names';
import { EmployeeSensitiveDataService } from '../../common/services/employee-sensitive-data.service';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { EmployeesService } from '../employees/employees.service';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import {
  EstadoCalendarioNomina,
  PayrollCalendar,
} from '../payroll/entities/payroll-calendar.entity';
import { PayrollEmployeeVerification } from '../payroll/entities/payroll-employee-verification.entity';

import {
  PERSONAL_ACTION_INVALIDATED_BY,
  PERSONAL_ACTION_INVALIDATION_REASON,
} from './constants/personal-action-invalidation.constants';
import { AbsenceLine } from './entities/absence-line.entity';
import { ActionQuota, EstadoCuota } from './entities/action-quota.entity';
import { BonusLine } from './entities/bonus-line.entity';
import {
  DisabilityLine,
  TipoIncapacidadLinea,
  TipoInstitucionIncapacidadLinea,
} from './entities/disability-line.entity';
import { DiscountLine } from './entities/discount-line.entity';
import { IncreaseLine, MetodoCalculoAumentoLinea } from './entities/increase-line.entity';
import { LicenseLine } from './entities/license-line.entity';
import { OvertimeLine, TipoJornadaHoraExtraLinea } from './entities/overtime-line.entity';
import {
  PersonalAction,
  PERSONAL_ACTION_APPROVED_STATES,
  PERSONAL_ACTION_PENDING_STATES,
  PersonalActionEstado,
} from './entities/personal-action.entity';
import { RetentionLine } from './entities/retention-line.entity';
import { VacationDate } from './entities/vacation-date.entity';

import type { CreatePersonalActionDto } from './dto/create-personal-action.dto';
import type { UpsertAbsenceDto, UpsertAbsenceLineDto } from './dto/upsert-absence.dto';
import type { UpsertBonusDto, UpsertBonusLineDto } from './dto/upsert-bonus.dto';
import type { UpsertDisabilityDto, UpsertDisabilityLineDto } from './dto/upsert-disability.dto';
import type { UpsertDiscountDto, UpsertDiscountLineDto } from './dto/upsert-discount.dto';
import type { UpsertIncreaseDto } from './dto/upsert-increase.dto';
import type { UpsertLicenseDto, UpsertLicenseLineDto } from './dto/upsert-license.dto';
import type { UpsertOvertimeDto, UpsertOvertimeLineDto } from './dto/upsert-overtime.dto';
import type { UpsertRetentionDto, UpsertRetentionLineDto } from './dto/upsert-retention.dto';
import type { UpsertVacationDto } from './dto/upsert-vacation.dto';

type AbsenceAuditLinePayload = {
  linea: number;
  payrollId: number | null;
  movimientoId: number | null;
  tipoAusencia: string | null;
  tipoLicencia: string | null;
  tipoBonificacion: string | null;
  tipoIncapacidad: string | null;
  tipoInstitucion: string | null;
  fechaInicioHoraExtra?: string | null;
  fechaFinHoraExtra?: string | null;
  tipoJornadaHorasExtras?: string | null;
  cantidad: number | null;
  monto: number | null;
  montoIns: number | null;
  montoPatrono: number | null;
  subsidioCcss: number | null;
  totalIncapacidad: number | null;
  remuneracion: boolean | null;
  fechaEfecto: string | null;
  formula: string | null;
};

@Injectable()
export class PersonalActionsService {
  constructor(
    @InjectRepository(PersonalAction)
    private readonly repo: Repository<PersonalAction>,
    @InjectRepository(ActionQuota)
    private readonly actionQuotaRepo: Repository<ActionQuota>,
    @InjectRepository(AbsenceLine)
    private readonly absenceLineRepo: Repository<AbsenceLine>,
    @InjectRepository(DisabilityLine)
    private readonly disabilityLineRepo: Repository<DisabilityLine>,
    @InjectRepository(LicenseLine)
    private readonly licenseLineRepo: Repository<LicenseLine>,
    @InjectRepository(BonusLine)
    private readonly bonusLineRepo: Repository<BonusLine>,
    @InjectRepository(OvertimeLine)
    private readonly overtimeLineRepo: Repository<OvertimeLine>,
    @InjectRepository(RetentionLine)
    private readonly retentionLineRepo: Repository<RetentionLine>,
    @InjectRepository(DiscountLine)
    private readonly discountLineRepo: Repository<DiscountLine>,
    @InjectRepository(IncreaseLine)
    private readonly increaseLineRepo: Repository<IncreaseLine>,
    @InjectRepository(VacationDate)
    private readonly vacationDateRepo: Repository<VacationDate>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepo: Repository<UserCompany>,
    @InjectRepository(PayrollCalendar)
    private readonly payrollRepo: Repository<PayrollCalendar>,
    @InjectRepository(PayrollEmployeeVerification)
    private readonly payrollVerificationRepo: Repository<PayrollEmployeeVerification>,
    private readonly employeesService: EmployeesService,
    private readonly sensitiveDataService: EmployeeSensitiveDataService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditOutbox: AuditOutboxService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    userId: number,
    idEmpresa?: number,
    estados?: PersonalActionEstado[],
  ): Promise<
    Array<
      PersonalAction & {
        periodoPagoResumen?: string | null;
        movimientoResumen?: string | null;
        remuneracionResumen?: 'SI' | 'NO' | 'MIXTA' | null;
      }
    >
  > {
    const qb = this.repo.createQueryBuilder('a').where('1=1');

    if (idEmpresa != null) {
      await this.assertUserCompanyAccess(userId, idEmpresa);
      qb.andWhere('a.idEmpresa = :idEmpresa', { idEmpresa });
    } else {
      const companyIds = await this.getUserCompanyIds(userId);
      if (companyIds.length === 0) return [];
      qb.andWhere('a.idEmpresa IN (:...companyIds)', { companyIds });
    }

    if (estados && estados.length > 0) {
      qb.andWhere('a.estado IN (:...estados)', { estados });
    }

    const actions = await qb.orderBy('a.fechaCreacion', 'DESC').getMany();
    const absenceIds = actions
      .filter((item) => item.tipoAccion?.trim().toLowerCase() === 'ausencia')
      .map((item) => item.id);
    const licenseIds = actions
      .filter((item) => item.tipoAccion?.trim().toLowerCase() === 'licencia')
      .map((item) => item.id);
    const disabilityIds = actions
      .filter((item) => item.tipoAccion?.trim().toLowerCase() === 'incapacidad')
      .map((item) => item.id);
    const bonusIds = actions
      .filter((item) => item.tipoAccion?.trim().toLowerCase() === 'bonificacion')
      .map((item) => item.id);
    const overtimeIds = actions
      .filter((item) => item.tipoAccion?.trim().toLowerCase() === 'hora_extra')
      .map((item) => item.id);
    const retentionIds = actions
      .filter((item) =>
        ['retencion', 'deduccion_retencion'].includes(item.tipoAccion?.trim().toLowerCase()),
      )
      .map((item) => item.id);
    const discountIds = actions
      .filter((item) =>
        ['descuento', 'deduccion_descuento'].includes(item.tipoAccion?.trim().toLowerCase()),
      )
      .map((item) => item.id);
    const increaseIds = actions
      .filter((item) => item.tipoAccion?.trim().toLowerCase() === 'aumento')
      .map((item) => item.id);
    const vacationIds = actions
      .filter((item) =>
        ['vacaciones', 'vacacion', 'vacation'].includes(item.tipoAccion?.trim().toLowerCase()),
      )
      .map((item) => item.id);

    if (
      absenceIds.length === 0 &&
      licenseIds.length === 0 &&
      disabilityIds.length === 0 &&
      bonusIds.length === 0 &&
      overtimeIds.length === 0 &&
      retentionIds.length === 0 &&
      discountIds.length === 0 &&
      increaseIds.length === 0 &&
      vacationIds.length === 0
    ) {
      return actions;
    }

    const summaryMap = new Map<
      number,
      { periodos: string | null; movimientos: string | null; rem: 'SI' | 'NO' | 'MIXTA' | null }
    >();

    const absenceSummary = await this.buildActionSummaryFromLines(
      'acc_ausencias_lineas',
      absenceIds,
    );
    const licenseSummary = await this.buildActionSummaryFromLines(
      'acc_licencias_lineas',
      licenseIds,
    );
    const disabilitySummary = await this.buildActionSummaryFromLines(
      'acc_incapacidades_lineas',
      disabilityIds,
    );
    const bonusSummary = await this.buildActionSummaryFromLines(
      'acc_bonificaciones_lineas',
      bonusIds,
    );
    const overtimeSummary = await this.buildActionSummaryFromLines(
      'acc_horas_extras_lineas',
      overtimeIds,
    );
    const retentionSummary = await this.buildActionSummaryFromLines(
      'acc_retenciones_lineas',
      retentionIds,
    );
    const discountSummary = await this.buildActionSummaryFromLines(
      'acc_descuentos_lineas',
      discountIds,
    );
    const increaseSummary = await this.buildActionSummaryFromLines(
      'acc_aumentos_lineas',
      increaseIds,
    );
    const vacationSummary = await this.buildActionSummaryFromVacations(vacationIds);
    absenceSummary.forEach((entry, key) => summaryMap.set(key, entry));
    licenseSummary.forEach((entry, key) => summaryMap.set(key, entry));
    disabilitySummary.forEach((entry, key) => summaryMap.set(key, entry));
    bonusSummary.forEach((entry, key) => summaryMap.set(key, entry));
    overtimeSummary.forEach((entry, key) => summaryMap.set(key, entry));
    retentionSummary.forEach((entry, key) => summaryMap.set(key, entry));
    discountSummary.forEach((entry, key) => summaryMap.set(key, entry));
    increaseSummary.forEach((entry, key) => summaryMap.set(key, entry));
    vacationSummary.forEach((entry, key) => summaryMap.set(key, entry));

    return actions.map((action) => {
      const summary = summaryMap.get(action.id);
      if (!summary) return action;
      return {
        ...action,
        periodoPagoResumen: summary.periodos,
        movimientoResumen: summary.movimientos,
        remuneracionResumen: summary.rem,
      };
    });
  }

  async findOne(id: number, userId?: number): Promise<PersonalAction> {
    const action = await this.repo.findOne({ where: { id } });
    if (!action) throw new NotFoundException(`Accion #${id} no encontrada`);

    if (userId != null) {
      await this.assertUserCompanyAccess(userId, action.idEmpresa);
    }

    return action;
  }

  async findAbsenceDetail(id: number, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'ausencia') {
      throw new BadRequestException('La accion no corresponde al modulo de ausencias');
    }

    const lines = await this.repo.query(
      `
      SELECT
        l.id_linea_ausencia AS idLinea,
        l.id_accion AS idAccion,
        l.id_calendario_nomina AS payrollId,
        COALESCE(c.nombre_planilla_calendario_nomina, CONCAT('Planilla #', l.id_calendario_nomina)) AS payrollLabel,
        c.estado_calendario_nomina AS payrollEstado,
        l.id_movimiento_nomina AS movimientoId,
        COALESCE(m.nombre_movimiento_nomina, CONCAT('Movimiento #', l.id_movimiento_nomina)) AS movimientoLabel,
        m.es_inactivo_movimiento_nomina AS movimientoInactivo,
        l.tipo_ausencia_linea AS tipoAusencia,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.remuneracion_linea AS remuneracion,
        l.formula_linea AS formula,
        l.orden_linea AS orden,
        l.fecha_efecto_linea AS fechaEfecto
      FROM acc_ausencias_lineas l
      LEFT JOIN nom_calendarios_nomina c
        ON c.id_calendario_nomina = l.id_calendario_nomina
      LEFT JOIN nom_movimientos_nomina m
        ON m.id_movimiento_nomina = l.id_movimiento_nomina
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_ausencia ASC
      `,
      [id],
    );

    return {
      ...action,
      lines: (lines ?? []).map((line: Record<string, unknown>) => ({
        idLinea: Number(line.idLinea),
        idAccion: Number(line.idAccion),
        payrollId: Number(line.payrollId),
        payrollLabel: line.payrollLabel ? String(line.payrollLabel) : null,
        payrollEstado: line.payrollEstado == null ? null : Number(line.payrollEstado),
        movimientoId: Number(line.movimientoId),
        movimientoLabel: line.movimientoLabel ? String(line.movimientoLabel) : null,
        movimientoInactivo:
          line.movimientoInactivo == null ? null : Number(line.movimientoInactivo) === 0,
        tipoAusencia: String(line.tipoAusencia ?? 'JUSTIFICADA'),
        cantidad: Number(line.cantidad ?? 0),
        monto: Number(line.monto ?? 0),
        remuneracion: Number(line.remuneracion ?? 0) === 1,
        formula: line.formula ? String(line.formula) : '',
        orden: Number(line.orden ?? 0),
        fechaEfecto: this.toYmdFlexible(line.fechaEfecto),
      })),
    };
  }

  async getAbsenceAuditTrail(id: number, userId: number, limit = 200) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'ausencia') {
      throw new BadRequestException('La accion no corresponde al modulo de ausencias');
    }
    return this.getActionAuditTrailCore(action.id, limit);
  }

  private async getActionAuditTrailCore(idAccion: number, limit = 200) {
    const safeLimit = Math.min(Math.max(Number(limit || 200), 1), 500);
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
      WHERE a.entidad_auditoria = 'personal-action'
        AND a.id_entidad_auditoria = ?
      ORDER BY a.fecha_creacion_auditoria DESC
      LIMIT ?
      `,
      [String(idAccion), safeLimit],
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

  async findLicenseDetail(id: number, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'licencia') {
      throw new BadRequestException('La accion no corresponde al modulo de licencias');
    }

    const lines = await this.repo.query(
      `
      SELECT
        l.id_linea_licencia AS idLinea,
        l.id_accion AS idAccion,
        l.id_calendario_nomina AS payrollId,
        COALESCE(c.nombre_planilla_calendario_nomina, CONCAT('Planilla #', l.id_calendario_nomina)) AS payrollLabel,
        c.estado_calendario_nomina AS payrollEstado,
        l.id_movimiento_nomina AS movimientoId,
        COALESCE(m.nombre_movimiento_nomina, CONCAT('Movimiento #', l.id_movimiento_nomina)) AS movimientoLabel,
        m.es_inactivo_movimiento_nomina AS movimientoInactivo,
        l.tipo_licencia_linea AS tipoLicencia,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.remuneracion_linea AS remuneracion,
        l.formula_linea AS formula,
        l.orden_linea AS orden,
        l.fecha_efecto_linea AS fechaEfecto
      FROM acc_licencias_lineas l
      LEFT JOIN nom_calendarios_nomina c
        ON c.id_calendario_nomina = l.id_calendario_nomina
      LEFT JOIN nom_movimientos_nomina m
        ON m.id_movimiento_nomina = l.id_movimiento_nomina
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_licencia ASC
      `,
      [id],
    );

    return {
      ...action,
      lines: (lines ?? []).map((line: Record<string, unknown>) => ({
        idLinea: Number(line.idLinea),
        idAccion: Number(line.idAccion),
        payrollId: Number(line.payrollId),
        payrollLabel: line.payrollLabel ? String(line.payrollLabel) : null,
        payrollEstado: line.payrollEstado == null ? null : Number(line.payrollEstado),
        movimientoId: Number(line.movimientoId),
        movimientoLabel: line.movimientoLabel ? String(line.movimientoLabel) : null,
        movimientoInactivo:
          line.movimientoInactivo == null ? null : Number(line.movimientoInactivo) === 0,
        tipoLicencia: String(line.tipoLicencia ?? 'permiso_con_goce'),
        cantidad: Number(line.cantidad ?? 0),
        monto: Number(line.monto ?? 0),
        remuneracion: Number(line.remuneracion ?? 0) === 1,
        formula: line.formula ? String(line.formula) : '',
        orden: Number(line.orden ?? 0),
        fechaEfecto: this.toYmdFlexible(line.fechaEfecto),
      })),
    };
  }

  async getLicenseAuditTrail(id: number, userId: number, limit = 200) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'licencia') {
      throw new BadRequestException('La accion no corresponde al modulo de licencias');
    }
    return this.getActionAuditTrailCore(action.id, limit);
  }

  async findDisabilityDetail(id: number, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'incapacidad') {
      throw new BadRequestException('La accion no corresponde al modulo de incapacidades');
    }

    const lines = await this.repo.query(
      `
      SELECT
        l.id_linea_incapacidad AS idLinea,
        l.id_accion AS idAccion,
        l.id_calendario_nomina AS payrollId,
        COALESCE(c.nombre_planilla_calendario_nomina, CONCAT('Planilla #', l.id_calendario_nomina)) AS payrollLabel,
        c.estado_calendario_nomina AS payrollEstado,
        l.id_movimiento_nomina AS movimientoId,
        COALESCE(m.nombre_movimiento_nomina, CONCAT('Movimiento #', l.id_movimiento_nomina)) AS movimientoLabel,
        m.es_inactivo_movimiento_nomina AS movimientoInactivo,
        l.tipo_incapacidad_linea AS tipoIncapacidad,
        l.tipo_institucion_linea AS tipoInstitucion,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.monto_ins_linea AS montoIns,
        l.monto_patrono_linea AS montoPatrono,
        l.subsidio_ccss_linea AS subsidioCcss,
        l.total_incapacidad_linea AS totalIncapacidad,
        l.remuneracion_linea AS remuneracion,
        l.formula_linea AS formula,
        l.orden_linea AS orden,
        l.fecha_efecto_linea AS fechaEfecto
      FROM acc_incapacidades_lineas l
      LEFT JOIN nom_calendarios_nomina c
        ON c.id_calendario_nomina = l.id_calendario_nomina
      LEFT JOIN nom_movimientos_nomina m
        ON m.id_movimiento_nomina = l.id_movimiento_nomina
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_incapacidad ASC
      `,
      [id],
    );

    return {
      ...action,
      lines: (lines ?? []).map((line: Record<string, unknown>) => ({
        idLinea: Number(line.idLinea),
        idAccion: Number(line.idAccion),
        payrollId: Number(line.payrollId),
        payrollLabel: line.payrollLabel ? String(line.payrollLabel) : null,
        payrollEstado: line.payrollEstado == null ? null : Number(line.payrollEstado),
        movimientoId: Number(line.movimientoId),
        movimientoLabel: line.movimientoLabel ? String(line.movimientoLabel) : null,
        movimientoInactivo:
          line.movimientoInactivo == null ? null : Number(line.movimientoInactivo) === 0,
        tipoIncapacidad: String(line.tipoIncapacidad ?? TipoIncapacidadLinea.ENFERMEDAD_COMUN_CCSS),
        tipoInstitucion: String(line.tipoInstitucion ?? TipoInstitucionIncapacidadLinea.CCSS),
        cantidad: Number(line.cantidad ?? 0),
        monto: Number(line.monto ?? 0),
        montoIns: Number(line.montoIns ?? 0),
        montoPatrono: Number(line.montoPatrono ?? 0),
        subsidioCcss: Number(line.subsidioCcss ?? 0),
        totalIncapacidad: Number(line.totalIncapacidad ?? 0),
        remuneracion: Number(line.remuneracion ?? 0) === 1,
        formula: line.formula ? String(line.formula) : '',
        orden: Number(line.orden ?? 0),
        fechaEfecto: this.toYmdFlexible(line.fechaEfecto),
      })),
    };
  }

  async getDisabilityAuditTrail(id: number, userId: number, limit = 200) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'incapacidad') {
      throw new BadRequestException('La accion no corresponde al modulo de incapacidades');
    }
    return this.getActionAuditTrailCore(action.id, limit);
  }

  async findBonusDetail(id: number, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'bonificacion') {
      throw new BadRequestException('La accion no corresponde al modulo de bonificaciones');
    }

    const lines = await this.repo.query(
      `
      SELECT
        l.id_linea_bonificacion AS idLinea,
        l.id_accion AS idAccion,
        l.id_calendario_nomina AS payrollId,
        COALESCE(c.nombre_planilla_calendario_nomina, CONCAT('Planilla #', l.id_calendario_nomina)) AS payrollLabel,
        c.estado_calendario_nomina AS payrollEstado,
        l.id_movimiento_nomina AS movimientoId,
        COALESCE(m.nombre_movimiento_nomina, CONCAT('Movimiento #', l.id_movimiento_nomina)) AS movimientoLabel,
        m.es_inactivo_movimiento_nomina AS movimientoInactivo,
        l.tipo_bonificacion_linea AS tipoBonificacion,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.remuneracion_linea AS remuneracion,
        l.formula_linea AS formula,
        l.orden_linea AS orden,
        l.fecha_efecto_linea AS fechaEfecto
      FROM acc_bonificaciones_lineas l
      LEFT JOIN nom_calendarios_nomina c
        ON c.id_calendario_nomina = l.id_calendario_nomina
      LEFT JOIN nom_movimientos_nomina m
        ON m.id_movimiento_nomina = l.id_movimiento_nomina
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_bonificacion ASC
      `,
      [id],
    );

    return {
      ...action,
      lines: (lines ?? []).map((line: Record<string, unknown>) => ({
        idLinea: Number(line.idLinea),
        idAccion: Number(line.idAccion),
        payrollId: Number(line.payrollId),
        payrollLabel: line.payrollLabel ? String(line.payrollLabel) : null,
        payrollEstado: line.payrollEstado == null ? null : Number(line.payrollEstado),
        movimientoId: Number(line.movimientoId),
        movimientoLabel: line.movimientoLabel ? String(line.movimientoLabel) : null,
        movimientoInactivo:
          line.movimientoInactivo == null ? null : Number(line.movimientoInactivo) === 0,
        tipoBonificacion: String(line.tipoBonificacion ?? 'ordinaria_salarial'),
        cantidad: Number(line.cantidad ?? 0),
        monto: Number(line.monto ?? 0),
        remuneracion: Number(line.remuneracion ?? 0) === 1,
        formula: line.formula ? String(line.formula) : '',
        orden: Number(line.orden ?? 0),
        fechaEfecto: this.toYmdFlexible(line.fechaEfecto),
      })),
    };
  }

  async getBonusAuditTrail(id: number, userId: number, limit = 200) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'bonificacion') {
      throw new BadRequestException('La accion no corresponde al modulo de bonificaciones');
    }
    return this.getActionAuditTrailCore(action.id, limit);
  }

  async findOvertimeDetail(id: number, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'hora_extra') {
      throw new BadRequestException('La accion no corresponde al modulo de horas extras');
    }

    const lines = await this.repo.query(
      `
      SELECT
        l.id_linea_hora_extra AS idLinea,
        l.id_accion AS idAccion,
        l.id_calendario_nomina AS payrollId,
        COALESCE(c.nombre_planilla_calendario_nomina, CONCAT('Planilla #', l.id_calendario_nomina)) AS payrollLabel,
        c.estado_calendario_nomina AS payrollEstado,
        l.id_movimiento_nomina AS movimientoId,
        COALESCE(m.nombre_movimiento_nomina, CONCAT('Movimiento #', l.id_movimiento_nomina)) AS movimientoLabel,
        m.es_inactivo_movimiento_nomina AS movimientoInactivo,
        l.fecha_inicio_hora_extra_linea AS fechaInicioHoraExtra,
        l.fecha_fin_hora_extra_linea AS fechaFinHoraExtra,
        l.tipo_jornada_horas_extras_linea AS tipoJornadaHorasExtras,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.remuneracion_linea AS remuneracion,
        l.formula_linea AS formula,
        l.orden_linea AS orden,
        l.fecha_efecto_linea AS fechaEfecto
      FROM acc_horas_extras_lineas l
      LEFT JOIN nom_calendarios_nomina c
        ON c.id_calendario_nomina = l.id_calendario_nomina
      LEFT JOIN nom_movimientos_nomina m
        ON m.id_movimiento_nomina = l.id_movimiento_nomina
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_hora_extra ASC
      `,
      [id],
    );

    return {
      ...action,
      lines: (lines ?? []).map((line: Record<string, unknown>) => ({
        idLinea: Number(line.idLinea),
        idAccion: Number(line.idAccion),
        payrollId: Number(line.payrollId),
        payrollLabel: line.payrollLabel ? String(line.payrollLabel) : null,
        payrollEstado: line.payrollEstado == null ? null : Number(line.payrollEstado),
        movimientoId: Number(line.movimientoId),
        movimientoLabel: line.movimientoLabel ? String(line.movimientoLabel) : null,
        movimientoInactivo:
          line.movimientoInactivo == null ? null : Number(line.movimientoInactivo) === 0,
        fechaInicioHoraExtra: this.toYmdFlexible(line.fechaInicioHoraExtra),
        fechaFinHoraExtra: this.toYmdFlexible(line.fechaFinHoraExtra),
        tipoJornadaHorasExtras: String(
          line.tipoJornadaHorasExtras ?? TipoJornadaHoraExtraLinea.DIURNA_8,
        ),
        cantidad: Number(line.cantidad ?? 0),
        monto: Number(line.monto ?? 0),
        remuneracion: Number(line.remuneracion ?? 0) === 1,
        formula: line.formula ? String(line.formula) : '',
        orden: Number(line.orden ?? 0),
        fechaEfecto: this.toYmdFlexible(line.fechaEfecto),
      })),
    };
  }

  async getOvertimeAuditTrail(id: number, userId: number, limit = 200) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'hora_extra') {
      throw new BadRequestException('La accion no corresponde al modulo de horas extras');
    }
    return this.getActionAuditTrailCore(action.id, limit);
  }

  async findRetentionDetail(id: number, userId: number) {
    const action = await this.findOne(id, userId);
    if (!['retencion', 'deduccion_retencion'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de retenciones');
    }

    const lines = await this.repo.query(
      `
      SELECT
        l.id_linea_retencion AS idLinea,
        l.id_accion AS idAccion,
        l.id_calendario_nomina AS payrollId,
        COALESCE(c.nombre_planilla_calendario_nomina, CONCAT('Planilla #', l.id_calendario_nomina)) AS payrollLabel,
        c.estado_calendario_nomina AS payrollEstado,
        l.id_movimiento_nomina AS movimientoId,
        COALESCE(m.nombre_movimiento_nomina, CONCAT('Movimiento #', l.id_movimiento_nomina)) AS movimientoLabel,
        m.es_inactivo_movimiento_nomina AS movimientoInactivo,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.remuneracion_linea AS remuneracion,
        l.formula_linea AS formula,
        l.orden_linea AS orden,
        l.fecha_efecto_linea AS fechaEfecto
      FROM acc_retenciones_lineas l
      LEFT JOIN nom_calendarios_nomina c
        ON c.id_calendario_nomina = l.id_calendario_nomina
      LEFT JOIN nom_movimientos_nomina m
        ON m.id_movimiento_nomina = l.id_movimiento_nomina
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_retencion ASC
      `,
      [id],
    );

    return {
      ...action,
      lines: (lines ?? []).map((line: Record<string, unknown>) => ({
        idLinea: Number(line.idLinea),
        idAccion: Number(line.idAccion),
        payrollId: Number(line.payrollId),
        payrollLabel: line.payrollLabel ? String(line.payrollLabel) : null,
        payrollEstado: line.payrollEstado == null ? null : Number(line.payrollEstado),
        movimientoId: Number(line.movimientoId),
        movimientoLabel: line.movimientoLabel ? String(line.movimientoLabel) : null,
        movimientoInactivo:
          line.movimientoInactivo == null ? null : Number(line.movimientoInactivo) === 0,
        cantidad: Number(line.cantidad ?? 0),
        monto: Number(line.monto ?? 0),
        remuneracion: Number(line.remuneracion ?? 0) === 1,
        formula: line.formula ? String(line.formula) : '',
        orden: Number(line.orden ?? 0),
        fechaEfecto: this.toYmdFlexible(line.fechaEfecto),
      })),
    };
  }

  async getRetentionAuditTrail(id: number, userId: number, limit = 200) {
    const action = await this.findOne(id, userId);
    if (!['retencion', 'deduccion_retencion'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de retenciones');
    }
    return this.getActionAuditTrailCore(action.id, limit);
  }

  async findDiscountDetail(id: number, userId: number) {
    const action = await this.findOne(id, userId);
    if (!['descuento', 'deduccion_descuento'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de descuentos');
    }

    const lines = await this.repo.query(
      `
      SELECT
        l.id_linea_descuento AS idLinea,
        l.id_accion AS idAccion,
        l.id_calendario_nomina AS payrollId,
        COALESCE(c.nombre_planilla_calendario_nomina, CONCAT('Planilla #', l.id_calendario_nomina)) AS payrollLabel,
        c.estado_calendario_nomina AS payrollEstado,
        l.id_movimiento_nomina AS movimientoId,
        COALESCE(m.nombre_movimiento_nomina, CONCAT('Movimiento #', l.id_movimiento_nomina)) AS movimientoLabel,
        m.es_inactivo_movimiento_nomina AS movimientoInactivo,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.remuneracion_linea AS remuneracion,
        l.formula_linea AS formula,
        l.orden_linea AS orden,
        l.fecha_efecto_linea AS fechaEfecto
      FROM acc_descuentos_lineas l
      LEFT JOIN nom_calendarios_nomina c
        ON c.id_calendario_nomina = l.id_calendario_nomina
      LEFT JOIN nom_movimientos_nomina m
        ON m.id_movimiento_nomina = l.id_movimiento_nomina
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_descuento ASC
      `,
      [id],
    );

    return {
      ...action,
      lines: (lines ?? []).map((line: Record<string, unknown>) => ({
        idLinea: Number(line.idLinea),
        idAccion: Number(line.idAccion),
        payrollId: Number(line.payrollId),
        payrollLabel: line.payrollLabel ? String(line.payrollLabel) : null,
        payrollEstado: line.payrollEstado == null ? null : Number(line.payrollEstado),
        movimientoId: Number(line.movimientoId),
        movimientoLabel: line.movimientoLabel ? String(line.movimientoLabel) : null,
        movimientoInactivo:
          line.movimientoInactivo == null ? null : Number(line.movimientoInactivo) === 0,
        cantidad: Number(line.cantidad ?? 0),
        monto: Number(line.monto ?? 0),
        remuneracion: Number(line.remuneracion ?? 0) === 1,
        formula: line.formula ? String(line.formula) : '',
        orden: Number(line.orden ?? 0),
        fechaEfecto: this.toYmdFlexible(line.fechaEfecto),
      })),
    };
  }

  async findIncreaseDetail(id: number, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'aumento') {
      throw new BadRequestException('La accion no corresponde al modulo de aumentos');
    }

    const rows = await this.repo.query(
      `
      SELECT
        l.id_linea_aumento AS idLinea,
        l.id_accion AS idAccion,
        l.id_calendario_nomina AS payrollId,
        COALESCE(c.nombre_planilla_calendario_nomina, CONCAT('Planilla #', l.id_calendario_nomina)) AS payrollLabel,
        c.estado_calendario_nomina AS payrollEstado,
        l.id_movimiento_nomina AS movimientoId,
        COALESCE(m.nombre_movimiento_nomina, CONCAT('Movimiento #', l.id_movimiento_nomina)) AS movimientoLabel,
        m.es_inactivo_movimiento_nomina AS movimientoInactivo,
        l.metodo_calculo_linea AS metodoCalculo,
        l.monto_linea AS monto,
        l.porcentaje_linea AS porcentaje,
        l.salario_actual_linea AS salarioActual,
        l.nuevo_salario_linea AS nuevoSalario,
        l.formula_linea AS formula,
        l.orden_linea AS orden,
        l.fecha_efecto_linea AS fechaEfecto
      FROM acc_aumentos_lineas l
      LEFT JOIN nom_calendarios_nomina c
        ON c.id_calendario_nomina = l.id_calendario_nomina
      LEFT JOIN nom_movimientos_nomina m
        ON m.id_movimiento_nomina = l.id_movimiento_nomina
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_aumento ASC
      `,
      [id],
    );

    const row = rows?.[0];
    const line = row
      ? {
          idLinea: Number(row.idLinea),
          idAccion: Number(row.idAccion),
          payrollId: Number(row.payrollId),
          payrollLabel: row.payrollLabel ? String(row.payrollLabel) : null,
          payrollEstado: row.payrollEstado == null ? null : Number(row.payrollEstado),
          movimientoId: Number(row.movimientoId),
          movimientoLabel: row.movimientoLabel ? String(row.movimientoLabel) : null,
          movimientoInactivo:
            row.movimientoInactivo == null ? null : Number(row.movimientoInactivo) === 0,
          metodoCalculo: row.metodoCalculo,
          monto: Number(row.monto ?? 0),
          porcentaje: Number(row.porcentaje ?? 0),
          salarioActual: Number(row.salarioActual ?? 0),
          nuevoSalario: Number(row.nuevoSalario ?? 0),
          formula: row.formula ? String(row.formula) : '',
          orden: Number(row.orden ?? 1),
          fechaEfecto: this.toYmdFlexible(row.fechaEfecto),
        }
      : null;

    return {
      ...action,
      line,
    };
  }

  async findVacationDetail(id: number, userId: number) {
    const action = await this.findOne(id, userId);
    if (!['vacaciones', 'vacacion', 'vacation'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de vacaciones');
    }

    const rows = await this.repo.query(
      `
      SELECT
        v.id_vacacion_fecha AS idFecha,
        v.id_accion AS idAccion,
        v.id_calendario_nomina AS payrollId,
        COALESCE(c.nombre_planilla_calendario_nomina, CONCAT('Planilla #', v.id_calendario_nomina)) AS payrollLabel,
        c.estado_calendario_nomina AS payrollEstado,
        v.id_movimiento_nomina AS movimientoId,
        COALESCE(m.nombre_movimiento_nomina, CONCAT('Movimiento #', v.id_movimiento_nomina)) AS movimientoLabel,
        m.es_inactivo_movimiento_nomina AS movimientoInactivo,
        v.fecha_vacacion AS fechaVacacion,
        v.orden_vacacion AS orden
      FROM acc_vacaciones_fechas v
      LEFT JOIN nom_calendarios_nomina c
        ON c.id_calendario_nomina = v.id_calendario_nomina
      LEFT JOIN nom_movimientos_nomina m
        ON m.id_movimiento_nomina = v.id_movimiento_nomina
      WHERE v.id_accion = ?
      ORDER BY v.fecha_vacacion ASC, v.orden_vacacion ASC, v.id_vacacion_fecha ASC
      `,
      [id],
    );

    return {
      ...action,
      fechas: (rows ?? []).map((row: Record<string, unknown>) => ({
        idFecha: Number(row.idFecha),
        idAccion: Number(row.idAccion),
        payrollId: Number(row.payrollId),
        payrollLabel: row.payrollLabel ? String(row.payrollLabel) : null,
        payrollEstado: row.payrollEstado == null ? null : Number(row.payrollEstado),
        movimientoId: Number(row.movimientoId),
        movimientoLabel: row.movimientoLabel ? String(row.movimientoLabel) : null,
        movimientoInactivo:
          row.movimientoInactivo == null ? null : Number(row.movimientoInactivo) === 0,
        fechaVacacion: this.toYmdFlexible(row.fechaVacacion),
        orden: Number(row.orden ?? 0),
      })),
    };
  }

  async getDiscountAuditTrail(id: number, userId: number, limit = 200) {
    const action = await this.findOne(id, userId);
    if (!['descuento', 'deduccion_descuento'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de descuentos');
    }
    return this.getActionAuditTrailCore(action.id, limit);
  }

  async getIncreaseAuditTrail(id: number, userId: number, limit = 200) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'aumento') {
      throw new BadRequestException('La accion no corresponde al modulo de aumentos');
    }
    return this.getActionAuditTrailCore(action.id, limit);
  }

  async getVacationAuditTrail(id: number, userId: number, limit = 200) {
    const action = await this.findOne(id, userId);
    if (!['vacaciones', 'vacacion', 'vacation'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de vacaciones');
    }
    return this.getActionAuditTrailCore(action.id, limit);
  }

  async create(dto: CreatePersonalActionDto, userId?: number): Promise<PersonalAction> {
    if (userId != null) {
      await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    }

    const action = this.repo.create({
      idEmpresa: dto.idEmpresa,
      idEmpleado: dto.idEmpleado,
      idCalendarioNomina: null,
      tipoAccion: dto.tipoAccion,
      groupId: null,
      origen: 'RRHH',
      descripcion: dto.descripcion ?? null,
      estado: PersonalActionEstado.DRAFT,
      fechaEfecto: dto.fechaEfecto ? new Date(dto.fechaEfecto) : null,
      fechaInicioEfecto: dto.fechaEfecto ? new Date(dto.fechaEfecto) : null,
      fechaFinEfecto: dto.fechaEfecto ? new Date(dto.fechaEfecto) : null,
      monto: dto.monto ?? null,
      moneda: 'CRC',
      creadoPor: userId ?? null,
      modificadoPor: userId ?? null,
    });

    const saved = await this.repo.save(action);
    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
      occurredAt: new Date(),
      payload: {
        actionId: String(saved.id),
        employeeId: String(saved.idEmpleado),
      },
    });

    return saved;
  }

  async approve(id: number, userId?: number): Promise<PersonalAction> {
    const action = await this.findOne(id, userId);
    if (!PERSONAL_ACTION_PENDING_STATES.includes(action.estado)) {
      throw new BadRequestException('Solo se puede aprobar una accion en estado pendiente');
    }

    action.estado = PersonalActionEstado.APPROVED;
    action.aprobadoPor = userId ?? null;
    action.fechaAprobacion = new Date();
    action.modificadoPor = userId ?? null;
    action.versionLock += 1;

    const saved = await this.repo.save(action);
    await this.flagRecalculationForOpenPayrolls(saved);
    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED,
      occurredAt: new Date(),
      payload: {
        actionId: String(saved.id),
        employeeId: String(saved.idEmpleado),
        companyId: String(saved.idEmpresa),
      },
    });

    return saved;
  }

  async associateToCalendar(
    id: number,
    idCalendarioNomina: number,
    userId?: number,
  ): Promise<PersonalAction> {
    const action = await this.findOne(id, userId);
    if (!PERSONAL_ACTION_APPROVED_STATES.includes(action.estado)) {
      throw new BadRequestException('Solo se puede asociar una accion aprobada a una planilla');
    }
    await this.assertEmployeeNotVerifiedForPayrolls(
      action.idEmpleado,
      [idCalendarioNomina],
      'acciones',
    );

    action.idCalendarioNomina = idCalendarioNomina;
    action.modificadoPor = userId ?? null;
    action.versionLock += 1;
    return this.repo.save(action);
  }

  async associateToPayroll(
    id: number,
    idCalendarioNomina: number,
    userId?: number,
  ): Promise<PersonalAction> {
    return this.associateToCalendar(id, idCalendarioNomina, userId);
  }

  async reject(id: number, motivo: string, userId?: number): Promise<PersonalAction> {
    const action = await this.findOne(id, userId);
    if (!PERSONAL_ACTION_PENDING_STATES.includes(action.estado)) {
      throw new BadRequestException('Solo se puede rechazar una accion pendiente');
    }

    action.estado = PersonalActionEstado.REJECTED;
    action.motivoRechazo = motivo ?? null;
    action.aprobadoPor = userId ?? null;
    action.fechaAprobacion = new Date();
    action.modificadoPor = userId ?? null;
    action.versionLock += 1;

    const saved = await this.repo.save(action);
    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.REJECTED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.REJECTED,
      occurredAt: new Date(),
      payload: { actionId: String(saved.id) },
    });

    return saved;
  }

  async findAbsenceMovementsCatalog(
    userId: number,
    idEmpresa: number,
    idTipoAccionPersonal: number,
  ) {
    await this.assertUserCompanyAccess(userId, idEmpresa);

    const rows = await this.repo.query(
      `
      SELECT
        m.id_movimiento_nomina AS id,
        m.id_empresa_movimiento_nomina AS idEmpresa,
        m.nombre_movimiento_nomina AS nombre,
        m.id_tipo_accion_personal_movimiento_nomina AS idTipoAccionPersonal,
        m.descripcion_movimiento_nomina AS descripcion,
        m.es_monto_fijo_movimiento_nomina AS esMontoFijo,
        m.monto_fijo_movimiento_nomina AS montoFijo,
        m.porcentaje_movimiento_nomina AS porcentaje,
        m.formula_ayuda_movimiento_nomina AS formulaAyuda,
        m.es_inactivo_movimiento_nomina AS esInactivo
      FROM nom_movimientos_nomina m
      WHERE m.id_empresa_movimiento_nomina = ?
        AND m.id_tipo_accion_personal_movimiento_nomina = ?
      ORDER BY m.es_inactivo_movimiento_nomina ASC, m.nombre_movimiento_nomina ASC
      `,
      [idEmpresa, idTipoAccionPersonal],
    );

    return (rows ?? []).map((row: Record<string, unknown>) => ({
      id: Number(row.id),
      idEmpresa: Number(row.idEmpresa),
      nombre: String(row.nombre ?? ''),
      idTipoAccionPersonal: Number(row.idTipoAccionPersonal),
      descripcion: row.descripcion ? String(row.descripcion) : null,
      esMontoFijo: Number(row.esMontoFijo ?? 1),
      montoFijo: String(row.montoFijo ?? '0'),
      porcentaje: String(row.porcentaje ?? '0'),
      formulaAyuda: row.formulaAyuda ? String(row.formulaAyuda) : null,
      esInactivo: Number(row.esInactivo ?? 0),
    }));
  }

  async findAbsenceEmployeesCatalog(userId: number, idEmpresa: number) {
    await this.assertUserCompanyAccess(userId, idEmpresa);
    const pageSize = 100;
    let page = 1;
    let total = 0;
    const allEmployees: Awaited<ReturnType<EmployeesService['findAll']>>['data'] = [];

    do {
      const result = await this.employeesService.findAll(userId, idEmpresa, {
        includeInactive: false,
        page,
        pageSize,
        sort: 'apellido1',
        order: 'ASC',
      });
      total = result.total;
      allEmployees.push(...result.data);
      page += 1;
    } while (allEmployees.length < total);

    // Regla funcional: el permiso sensible solo oculta visualizacion en UI;
    // para calculos operativos de acciones personales necesitamos salario base.
    const encryptedSalaryRows: Array<{ id: number; salarioBaseEncrypted: string | null }> =
      await this.repo.query(
        `
        SELECT
          id_empleado AS id,
          salario_base_empleado AS salarioBaseEncrypted
        FROM sys_empleados
        WHERE id_empresa = ?
          AND estado_empleado = 1
        `,
        [idEmpresa],
      );

    const salaryByEmployeeId = new Map<number, number | null>();
    (encryptedSalaryRows ?? []).forEach((row) => {
      const raw = row?.salarioBaseEncrypted;
      if (raw == null) {
        salaryByEmployeeId.set(Number(row.id), null);
        return;
      }
      const decrypted = this.sensitiveDataService.decrypt(raw);
      const parsed = decrypted == null ? NaN : Number(decrypted);
      salaryByEmployeeId.set(Number(row.id), Number.isFinite(parsed) ? parsed : null);
    });

    return allEmployees.map((employee) => ({
      id: employee.id,
      idEmpresa: employee.idEmpresa,
      codigo: employee.codigo,
      nombre: employee.nombre ?? '',
      apellido1: employee.apellido1 ?? '',
      apellido2: employee.apellido2 ?? null,
      cedula: employee.cedula ?? null,
      email: employee.email ?? null,
      jornada: employee.jornada ?? null,
      idPeriodoPago: employee.idPeriodoPago ?? null,
      salarioBase:
        employee.salarioBase != null
          ? Number(employee.salarioBase)
          : (salaryByEmployeeId.get(employee.id) ?? null),
      monedaSalario: employee.monedaSalario ?? 'CRC',
    }));
  }

  async findEligibleAbsencePayrolls(userId: number, idEmpresa: number, idEmpleado: number) {
    await this.assertUserCompanyAccess(userId, idEmpresa);

    const employees = await this.findAbsenceEmployeesCatalog(userId, idEmpresa);
    const employee = employees.find((item) => item.id === idEmpleado);
    if (!employee) return [];

    if (!employee.idPeriodoPago || !employee.monedaSalario) return [];

    const rows = await this.payrollRepo.query(
      `
      SELECT
        c.id_calendario_nomina AS id,
        c.id_empresa AS idEmpresa,
        c.id_periodos_pago AS idPeriodoPago,
        c.id_tipo_planilla AS idTipoPlanilla,
        c.nombre_planilla_calendario_nomina AS nombrePlanilla,
        c.tipo_planilla AS tipoPlanilla,
        c.fecha_inicio_periodo AS fechaInicioPeriodo,
        c.fecha_fin_periodo AS fechaFinPeriodo,
        c.fecha_corte_calendario_nomina AS fechaCorte,
        c.fecha_inicio_pago AS fechaInicioPago,
        c.fecha_fin_pago AS fechaFinPago,
        c.fecha_pago_programada_calendario_nomina AS fechaPagoProgramada,
        c.moneda_calendario_nomina AS moneda,
        c.estado_calendario_nomina AS estado
      FROM nom_calendarios_nomina c
      WHERE c.id_empresa = ?
        AND c.id_periodos_pago = ?
        AND c.moneda_calendario_nomina = ?
        AND c.es_inactivo = 1
        AND c.estado_calendario_nomina IN (?, ?)
        AND c.fecha_fin_pago >= CURDATE()
      ORDER BY c.fecha_inicio_periodo ASC, c.id_calendario_nomina ASC
      `,
      [
        idEmpresa,
        employee.idPeriodoPago,
        String(employee.monedaSalario).toUpperCase(),
        EstadoCalendarioNomina.ABIERTA,
        EstadoCalendarioNomina.EN_PROCESO,
      ],
    );

    return (rows ?? []).map((row: Record<string, unknown>) => ({
      id: Number(row.id),
      idEmpresa: Number(row.idEmpresa),
      idPeriodoPago: Number(row.idPeriodoPago),
      idTipoPlanilla: row.idTipoPlanilla == null ? null : Number(row.idTipoPlanilla),
      nombrePlanilla: row.nombrePlanilla ? String(row.nombrePlanilla) : null,
      tipoPlanilla: row.tipoPlanilla ? String(row.tipoPlanilla) : 'Regular',
      fechaInicioPeriodo: this.toYmdFlexible(row.fechaInicioPeriodo) ?? '',
      fechaFinPeriodo: this.toYmdFlexible(row.fechaFinPeriodo) ?? '',
      fechaCorte: this.toYmdFlexible(row.fechaCorte),
      fechaInicioPago: this.toYmdFlexible(row.fechaInicioPago) ?? '',
      fechaFinPago: this.toYmdFlexible(row.fechaFinPago) ?? '',
      fechaPagoProgramada: this.toYmdFlexible(row.fechaPagoProgramada),
      moneda: row.moneda ? String(row.moneda) : 'CRC',
      estado: Number(row.estado ?? EstadoCalendarioNomina.ABIERTA),
    }));
  }

  async getVacationAvailability(userId: number, idEmpresa: number, idEmpleado: number) {
    await this.assertUserCompanyAccess(userId, idEmpresa);

    const saldoReal = await this.getVacationBalanceForEmployee(idEmpresa, idEmpleado);
    const reservado = await this.getVacationReservedDays(idEmpresa, idEmpleado);
    const disponible = saldoReal - reservado;

    return {
      saldoReal,
      reservado,
      disponible,
    };
  }

  async listVacationHolidays() {
    const rows = await this.repo.query(
      `
      SELECT
        id_feriado_planilla AS id,
        nombre_feriado_planilla AS nombre,
        tipo_feriado_planilla AS tipo,
        fecha_inicio_feriado_planilla AS fechaInicio,
        fecha_fin_feriado_planilla AS fechaFin
      FROM nom_feriados_planilla
      ORDER BY fecha_inicio_feriado_planilla ASC
      `,
    );

    return (rows ?? []).map((row: Record<string, unknown>) => ({
      id: Number(row.id),
      nombre: String(row.nombre ?? ''),
      tipo: String(row.tipo ?? ''),
      fechaInicio: this.toYmdFlexible(row.fechaInicio) ?? '',
      fechaFin: this.toYmdFlexible(row.fechaFin) ?? '',
    }));
  }

  async createAbsence(dto: UpsertAbsenceDto, userId: number) {
    await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    await this.validateAbsencePayload(dto, userId);

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    const moneda = String(employee.monedaSalario ?? 'CRC').toUpperCase();
    const groupId = `AUS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const groupedLines = this.groupLinesByPayroll(dto.lines);
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'ausencias',
    );

    const created = await this.dataSource.transaction(async (trx) => {
      const createdActions: Array<{
        action: PersonalAction;
        linesCount: number;
        auditLines: AbsenceAuditLinePayload[];
      }> = [];

      for (const group of groupedLines) {
        const totalMonto = group.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
        const firstDate = this.parseDateOnlyLocal(group.lines[0]?.fechaEfecto);
        const lastDate = this.parseDateOnlyLocal(group.lines[group.lines.length - 1]?.fechaEfecto) ?? firstDate;

        const action = trx.create(PersonalAction, {
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: null,
          tipoAccion: 'ausencia',
          groupId,
          origen: 'RRHH',
          descripcion: dto.observacion ?? null,
          estado: PersonalActionEstado.PENDING_SUPERVISOR,
          fechaEfecto: firstDate,
          fechaInicioEfecto: firstDate,
          fechaFinEfecto: lastDate,
          monto: totalMonto,
          moneda,
          creadoPor: userId,
          modificadoPor: userId,
        });
        const savedAction = await trx.save(action);

        const quotas: ActionQuota[] = [];
        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const quota = trx.create(ActionQuota, {
            idAccion: savedAction.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            numeroCuota: i + 1,
            montoCuota: Number(line.monto),
            estado: EstadoCuota.PENDIENTE_APROBACION,
            fechaEfecto: this.parseDateOnlyLocal(line.fechaEfecto),
            motivoEstado: null,
          });
          quotas.push(await trx.save(quota));
        }

        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const quota = quotas[i];
          const absenceLine = trx.create(AbsenceLine, {
            idAccion: savedAction.id,
            idCuota: quota.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            idMovimientoNomina: line.movimientoId,
            tipoAusencia: line.tipoAusencia,
            cantidad: Number(line.cantidad),
            monto: Number(line.monto),
            remuneracion: line.remuneracion ? 1 : 0,
            formula: line.formula?.trim() || null,
            orden: i + 1,
            fechaEfecto: new Date(line.fechaEfecto),
          });
          await trx.save(absenceLine);
        }

        createdActions.push({
          action: savedAction,
          linesCount: group.lines.length,
          auditLines: this.mapAbsenceLinesForAuditFromDto(group.lines),
        });
      }

      return createdActions;
    });

    for (const item of created) {
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
        occurredAt: new Date(),
        payload: {
          actionId: String(item.action.id),
          employeeId: String(item.action.idEmpleado),
          companyId: String(item.action.idEmpresa),
          type: 'ausencia',
          lines: item.linesCount,
          groupId,
        },
      });

      this.auditOutbox.publish({
        modulo: 'personal-actions',
        accion: 'create',
        entidad: 'personal-action',
        entidadId: item.action.id,
        actorUserId: userId,
        companyContextId: item.action.idEmpresa,
        descripcion: `Ausencia creada para empleado #${item.action.idEmpleado}`,
        payloadAfter: this.buildAbsenceAuditPayload(item.action, item.linesCount, item.auditLines),
      });
    }

    const firstCreated = created[0]?.action;
    if (!firstCreated) {
      throw new BadRequestException('No se pudo crear la ausencia');
    }
    const first = await this.findOne(firstCreated.id, userId);
    return {
      ...first,
      totalCreated: created.length,
      createdActionIds: created.map((item) => item.action.id),
      groupId,
    };
  }

  async updateAbsence(id: number, dto: UpsertAbsenceDto, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'ausencia') {
      throw new BadRequestException('La accion no corresponde al modulo de ausencias');
    }
    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException(
        'Solo se pueden editar ausencias en estado borrador o pendientes',
      );
    }
    if (action.idEmpresa !== dto.idEmpresa || action.idEmpleado !== dto.idEmpleado) {
      throw new BadRequestException('No se permite cambiar empresa o empleado de la ausencia');
    }

    await this.validateAbsencePayload(dto, userId);
    this.assertSinglePayrollOnUpdate(dto.lines, 'ausencias');
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'ausencias',
    );

    const payloadBefore = this.buildAbsenceAuditPayload(
      action,
      await this.countAbsenceLines(action.id),
      await this.getAbsenceLinesForAudit(action.id),
    );

    const totalMonto = dto.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
    const firstDate = dto.lines[0]?.fechaEfecto ? new Date(dto.lines[0].fechaEfecto) : null;
    const lastDate = dto.lines[dto.lines.length - 1]?.fechaEfecto
      ? new Date(dto.lines[dto.lines.length - 1].fechaEfecto)
      : firstDate;

    await this.dataSource.transaction(async (trx) => {
      await trx.delete(AbsenceLine, { idAccion: id });
      await trx.delete(ActionQuota, { idAccion: id });

      action.descripcion = dto.observacion ?? null;
      action.fechaEfecto = firstDate;
      action.fechaInicioEfecto = firstDate;
      action.fechaFinEfecto = lastDate;
      action.monto = totalMonto;
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      const quotas: ActionQuota[] = [];
      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const quota = trx.create(ActionQuota, {
          idAccion: action.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          numeroCuota: i + 1,
          montoCuota: Number(line.monto),
          estado: EstadoCuota.PENDIENTE_APROBACION,
          fechaEfecto: new Date(line.fechaEfecto),
          motivoEstado: null,
        });
        quotas.push(await trx.save(quota));
      }

      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const quota = quotas[i];
        const absenceLine = trx.create(AbsenceLine, {
          idAccion: action.id,
          idCuota: quota.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          idMovimientoNomina: line.movimientoId,
          tipoAusencia: line.tipoAusencia,
          cantidad: Number(line.cantidad),
          monto: Number(line.monto),
          remuneracion: line.remuneracion ? 1 : 0,
          formula: line.formula?.trim() || null,
          orden: i + 1,
          fechaEfecto: new Date(line.fechaEfecto),
        });
        await trx.save(absenceLine);
      }
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'update',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Ausencia actualizada para empleado #${action.idEmpleado}`,
      payloadBefore,
      payloadAfter: this.buildAbsenceAuditPayload(
        action,
        dto.lines.length,
        this.mapAbsenceLinesForAuditFromDto(dto.lines),
      ),
    });

    return this.findOne(id, userId);
  }

  async advanceAbsenceState(id: number, userId: number, userPermissions: string[] = []) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'ausencia') {
      throw new BadRequestException('La accion no corresponde al modulo de ausencias');
    }

    const nextByState: Partial<Record<PersonalActionEstado, PersonalActionEstado>> = {
      [PersonalActionEstado.DRAFT]: PersonalActionEstado.PENDING_SUPERVISOR,
      [PersonalActionEstado.PENDING_SUPERVISOR]: PersonalActionEstado.PENDING_RRHH,
      [PersonalActionEstado.PENDING_RRHH]: PersonalActionEstado.APPROVED,
    };
    const next = nextByState[action.estado];
    if (!next) {
      throw new BadRequestException('La accion no tiene un estado siguiente operativo');
    }

    const requiredPermissionByState: Partial<Record<PersonalActionEstado, string>> = {
      [PersonalActionEstado.DRAFT]: 'hr-action-ausencias:edit',
      [PersonalActionEstado.PENDING_SUPERVISOR]: 'hr-action-ausencias:approve',
      [PersonalActionEstado.PENDING_RRHH]: 'hr-action-ausencias:approve',
    };
    const requiredPermission = requiredPermissionByState[action.estado];
    this.assertActionPermission(
      userPermissions,
      requiredPermission,
      'avanzar el estado de la ausencia',
    );

    action.estado = next;
    action.modificadoPor = userId;
    action.versionLock += 1;

    if (next === PersonalActionEstado.APPROVED) {
      action.aprobadoPor = userId;
      action.fechaAprobacion = new Date();
    }

    const saved = await this.repo.save(action);
    if (next === PersonalActionEstado.APPROVED) {
      await this.flagRecalculationForOpenPayrolls(saved);
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED,
        occurredAt: new Date(),
        payload: {
          actionId: String(saved.id),
          employeeId: String(saved.idEmpleado),
          companyId: String(saved.idEmpresa),
        },
      });
    }

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'advance',
      entidad: 'personal-action',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.idEmpresa,
      descripcion: `Ausencia movida al estado ${this.getEstadoNombre(saved.estado)}`,
      payloadAfter: this.buildAbsenceAuditPayload(saved, await this.countAbsenceLines(saved.id)),
    });

    return saved;
  }

  async invalidateAbsence(
    id: number,
    motivo: string | undefined,
    userId: number,
    userPermissions: string[] = [],
  ) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'ausencia') {
      throw new BadRequestException('La accion no corresponde al modulo de ausencias');
    }

    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException('La ausencia no se puede invalidar en su estado actual');
    }

    this.assertActionPermission(
      userPermissions,
      'hr-action-ausencias:cancel',
      'invalidar la ausencia',
    );

    await this.dataSource.transaction(async (trx) => {
      action.estado = PersonalActionEstado.INVALIDATED;
      action.invalidatedAt = new Date();
      action.invalidatedReason = motivo?.trim() || 'Invalidada manualmente por RRHH';
      action.invalidatedReasonCode = PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION;
      action.invalidatedByType = PERSONAL_ACTION_INVALIDATED_BY.USER;
      action.invalidatedByUserId = userId;
      action.invalidatedMeta = {
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: userId,
        source: 'manual_absence_invalidation',
      };
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      await trx
        .createQueryBuilder()
        .update(ActionQuota)
        .set({
          estado: EstadoCuota.CANCELADA,
          motivoEstado: action.invalidatedReason,
        })
        .where('idAccion = :idAccion', { idAccion: action.id })
        .andWhere('estado != :estadoPagada', { estadoPagada: EstadoCuota.PAGADA })
        .execute();
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED,
      occurredAt: new Date(),
      payload: {
        actionId: String(action.id),
        companyId: String(action.idEmpresa),
        reason: action.invalidatedReason,
        type: 'invalidated',
      },
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'invalidate',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Ausencia invalidada para empleado #${action.idEmpleado}`,
      payloadAfter: this.buildAbsenceAuditPayload(action, await this.countAbsenceLines(action.id)),
    });

    return this.findOne(action.id, userId);
  }

  async createLicense(dto: UpsertLicenseDto, userId: number) {
    await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    await this.validateLicensePayload(dto, userId);

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    const moneda = String(employee?.monedaSalario ?? 'CRC').toUpperCase();
    const groupId = `LIC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const groupedLines = this.groupLinesByPayroll(dto.lines);
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'licencias',
    );

    const created = await this.dataSource.transaction(async (trx) => {
      const createdActions: Array<{
        action: PersonalAction;
        linesCount: number;
        auditLines: AbsenceAuditLinePayload[];
      }> = [];

      for (const group of groupedLines) {
        const totalMonto = group.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
        const firstDate = group.lines[0]?.fechaEfecto ? new Date(group.lines[0].fechaEfecto) : null;
        const lastDate = group.lines[group.lines.length - 1]?.fechaEfecto
          ? new Date(group.lines[group.lines.length - 1].fechaEfecto)
          : firstDate;

        const action = trx.create(PersonalAction, {
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: null,
          tipoAccion: 'licencia',
          groupId,
          origen: 'RRHH',
          descripcion: dto.observacion ?? null,
          estado: PersonalActionEstado.PENDING_SUPERVISOR,
          fechaEfecto: firstDate,
          fechaInicioEfecto: firstDate,
          fechaFinEfecto: lastDate,
          monto: totalMonto,
          moneda,
          creadoPor: userId,
          modificadoPor: userId,
        });
        const savedAction = await trx.save(action);

        const quotas: ActionQuota[] = [];
        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const quota = trx.create(ActionQuota, {
            idAccion: savedAction.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            numeroCuota: i + 1,
            montoCuota: Number(line.monto),
            estado: EstadoCuota.PENDIENTE_APROBACION,
            fechaEfecto: new Date(line.fechaEfecto),
            motivoEstado: null,
          });
          quotas.push(await trx.save(quota));
        }

        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const quota = quotas[i];
          const licenseLine = trx.create(LicenseLine, {
            idAccion: savedAction.id,
            idCuota: quota.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            idMovimientoNomina: line.movimientoId,
            tipoLicencia: line.tipoLicencia,
            cantidad: Number(line.cantidad),
            monto: Number(line.monto),
            remuneracion: line.remuneracion ? 1 : 0,
            formula: line.formula?.trim() || null,
            orden: i + 1,
            fechaEfecto: new Date(line.fechaEfecto),
          });
          await trx.save(licenseLine);
        }

        createdActions.push({
          action: savedAction,
          linesCount: group.lines.length,
          auditLines: this.mapLicenseLinesForAuditFromDto(group.lines),
        });
      }

      return createdActions;
    });

    for (const item of created) {
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
        occurredAt: new Date(),
        payload: {
          actionId: String(item.action.id),
          employeeId: String(item.action.idEmpleado),
          companyId: String(item.action.idEmpresa),
          type: 'licencia',
          lines: item.linesCount,
          groupId,
        },
      });

      this.auditOutbox.publish({
        modulo: 'personal-actions',
        accion: 'create',
        entidad: 'personal-action',
        entidadId: item.action.id,
        actorUserId: userId,
        companyContextId: item.action.idEmpresa,
        descripcion: `Licencia creada para empleado #${item.action.idEmpleado}`,
        payloadAfter: this.buildAbsenceAuditPayload(item.action, item.linesCount, item.auditLines),
      });
    }

    const firstCreated = created[0]?.action;
    if (!firstCreated) {
      throw new BadRequestException('No se pudo crear la licencia');
    }
    const first = await this.findOne(firstCreated.id, userId);
    return {
      ...first,
      totalCreated: created.length,
      createdActionIds: created.map((item) => item.action.id),
      groupId,
    };
  }

  async updateLicense(id: number, dto: UpsertLicenseDto, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'licencia') {
      throw new BadRequestException('La accion no corresponde al modulo de licencias');
    }
    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException(
        'Solo se pueden editar licencias en estado borrador o pendientes',
      );
    }
    if (action.idEmpresa !== dto.idEmpresa || action.idEmpleado !== dto.idEmpleado) {
      throw new BadRequestException('No se permite cambiar empresa o empleado de la licencia');
    }

    await this.validateLicensePayload(dto, userId);
    this.assertSinglePayrollOnUpdate(dto.lines, 'licencias');
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'licencias',
    );

    const payloadBefore = this.buildAbsenceAuditPayload(
      action,
      await this.countLicenseLines(action.id),
      await this.getLicenseLinesForAudit(action.id),
    );

    const totalMonto = dto.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
    const firstDate = dto.lines[0]?.fechaEfecto ? new Date(dto.lines[0].fechaEfecto) : null;
    const lastDate = dto.lines[dto.lines.length - 1]?.fechaEfecto
      ? new Date(dto.lines[dto.lines.length - 1].fechaEfecto)
      : firstDate;

    await this.dataSource.transaction(async (trx) => {
      await trx.delete(LicenseLine, { idAccion: id });
      await trx.delete(ActionQuota, { idAccion: id });

      action.descripcion = dto.observacion ?? null;
      action.fechaEfecto = firstDate;
      action.fechaInicioEfecto = firstDate;
      action.fechaFinEfecto = lastDate;
      action.monto = totalMonto;
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      const quotas: ActionQuota[] = [];
      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const quota = trx.create(ActionQuota, {
          idAccion: action.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          numeroCuota: i + 1,
          montoCuota: Number(line.monto),
          estado: EstadoCuota.PENDIENTE_APROBACION,
          fechaEfecto: new Date(line.fechaEfecto),
          motivoEstado: null,
        });
        quotas.push(await trx.save(quota));
      }

      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const quota = quotas[i];
        const licenseLine = trx.create(LicenseLine, {
          idAccion: action.id,
          idCuota: quota.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          idMovimientoNomina: line.movimientoId,
          tipoLicencia: line.tipoLicencia,
          cantidad: Number(line.cantidad),
          monto: Number(line.monto),
          remuneracion: line.remuneracion ? 1 : 0,
          formula: line.formula?.trim() || null,
          orden: i + 1,
          fechaEfecto: new Date(line.fechaEfecto),
        });
        await trx.save(licenseLine);
      }
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'update',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Licencia actualizada para empleado #${action.idEmpleado}`,
      payloadBefore,
      payloadAfter: this.buildAbsenceAuditPayload(
        action,
        dto.lines.length,
        this.mapLicenseLinesForAuditFromDto(dto.lines),
      ),
    });

    return this.findOne(id, userId);
  }

  async advanceLicenseState(id: number, userId: number, userPermissions: string[] = []) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'licencia') {
      throw new BadRequestException('La accion no corresponde al modulo de licencias');
    }

    const nextByState: Partial<Record<PersonalActionEstado, PersonalActionEstado>> = {
      [PersonalActionEstado.DRAFT]: PersonalActionEstado.PENDING_SUPERVISOR,
      [PersonalActionEstado.PENDING_SUPERVISOR]: PersonalActionEstado.PENDING_RRHH,
      [PersonalActionEstado.PENDING_RRHH]: PersonalActionEstado.APPROVED,
    };
    const next = nextByState[action.estado];
    if (!next) {
      throw new BadRequestException('La accion no tiene un estado siguiente operativo');
    }

    const requiredPermissionByState: Partial<Record<PersonalActionEstado, string>> = {
      [PersonalActionEstado.DRAFT]: 'hr-action-licencias:edit',
      [PersonalActionEstado.PENDING_SUPERVISOR]: 'hr-action-licencias:approve',
      [PersonalActionEstado.PENDING_RRHH]: 'hr-action-licencias:approve',
    };
    const requiredPermission = requiredPermissionByState[action.estado];
    this.assertActionPermission(
      userPermissions,
      requiredPermission,
      'avanzar el estado de la licencia',
    );

    action.estado = next;
    action.modificadoPor = userId;
    action.versionLock += 1;

    if (next === PersonalActionEstado.APPROVED) {
      action.aprobadoPor = userId;
      action.fechaAprobacion = new Date();
    }

    const saved = await this.repo.save(action);
    if (next === PersonalActionEstado.APPROVED) {
      await this.flagRecalculationForOpenPayrolls(saved);
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED,
        occurredAt: new Date(),
        payload: {
          actionId: String(saved.id),
          employeeId: String(saved.idEmpleado),
          companyId: String(saved.idEmpresa),
        },
      });
    }

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'advance',
      entidad: 'personal-action',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.idEmpresa,
      descripcion: `Licencia movida al estado ${this.getEstadoNombre(saved.estado)}`,
      payloadAfter: this.buildAbsenceAuditPayload(saved, await this.countLicenseLines(saved.id)),
    });

    return saved;
  }

  async invalidateLicense(
    id: number,
    motivo: string | undefined,
    userId: number,
    userPermissions: string[] = [],
  ) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'licencia') {
      throw new BadRequestException('La accion no corresponde al modulo de licencias');
    }

    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException('La licencia no se puede invalidar en su estado actual');
    }

    this.assertActionPermission(
      userPermissions,
      'hr-action-licencias:cancel',
      'invalidar la licencia',
    );

    await this.dataSource.transaction(async (trx) => {
      action.estado = PersonalActionEstado.INVALIDATED;
      action.invalidatedAt = new Date();
      action.invalidatedReason = motivo?.trim() || 'Invalidada manualmente por RRHH';
      action.invalidatedReasonCode = PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION;
      action.invalidatedByType = PERSONAL_ACTION_INVALIDATED_BY.USER;
      action.invalidatedByUserId = userId;
      action.invalidatedMeta = {
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: userId,
        source: 'manual_license_invalidation',
      };
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      await trx
        .createQueryBuilder()
        .update(ActionQuota)
        .set({
          estado: EstadoCuota.CANCELADA,
          motivoEstado: action.invalidatedReason,
        })
        .where('idAccion = :idAccion', { idAccion: action.id })
        .andWhere('estado != :estadoPagada', { estadoPagada: EstadoCuota.PAGADA })
        .execute();
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED,
      occurredAt: new Date(),
      payload: {
        actionId: String(action.id),
        companyId: String(action.idEmpresa),
        reason: action.invalidatedReason,
        type: 'invalidated',
      },
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'invalidate',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Licencia invalidada para empleado #${action.idEmpleado}`,
      payloadAfter: this.buildAbsenceAuditPayload(action, await this.countLicenseLines(action.id)),
    });

    return this.findOne(action.id, userId);
  }

  async createBonus(dto: UpsertBonusDto, userId: number) {
    await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    await this.validateBonusPayload(dto, userId);

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    const moneda = String(employee?.monedaSalario ?? 'CRC').toUpperCase();
    const groupId = `BON-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const groupedLines = this.groupLinesByPayroll(dto.lines);
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'bonificaciones',
    );

    const created = await this.dataSource.transaction(async (trx) => {
      const createdActions: Array<{
        action: PersonalAction;
        linesCount: number;
        auditLines: AbsenceAuditLinePayload[];
      }> = [];

      for (const group of groupedLines) {
        const totalMonto = group.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
        const firstDate = group.lines[0]?.fechaEfecto ? new Date(group.lines[0].fechaEfecto) : null;
        const lastDate = group.lines[group.lines.length - 1]?.fechaEfecto
          ? new Date(group.lines[group.lines.length - 1].fechaEfecto)
          : firstDate;

        const action = trx.create(PersonalAction, {
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: null,
          tipoAccion: 'bonificacion',
          groupId,
          origen: 'RRHH',
          descripcion: dto.observacion ?? null,
          estado: PersonalActionEstado.PENDING_SUPERVISOR,
          fechaEfecto: firstDate,
          fechaInicioEfecto: firstDate,
          fechaFinEfecto: lastDate,
          monto: totalMonto,
          moneda,
          creadoPor: userId,
          modificadoPor: userId,
        });
        const savedAction = await trx.save(action);

        const quotas: ActionQuota[] = [];
        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const quota = trx.create(ActionQuota, {
            idAccion: savedAction.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            numeroCuota: i + 1,
            montoCuota: Number(line.monto),
            estado: EstadoCuota.PENDIENTE_APROBACION,
            fechaEfecto: new Date(line.fechaEfecto),
            motivoEstado: null,
          });
          quotas.push(await trx.save(quota));
        }

        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const quota = quotas[i];
          const bonusLine = trx.create(BonusLine, {
            idAccion: savedAction.id,
            idCuota: quota.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            idMovimientoNomina: line.movimientoId,
            tipoBonificacion: line.tipoBonificacion,
            cantidad: Number(line.cantidad),
            monto: Number(line.monto),
            remuneracion: line.remuneracion ? 1 : 0,
            formula: line.formula?.trim() || null,
            orden: i + 1,
            fechaEfecto: new Date(line.fechaEfecto),
          });
          await trx.save(bonusLine);
        }

        createdActions.push({
          action: savedAction,
          linesCount: group.lines.length,
          auditLines: this.mapBonusLinesForAuditFromDto(group.lines),
        });
      }

      return createdActions;
    });

    for (const item of created) {
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
        occurredAt: new Date(),
        payload: {
          actionId: String(item.action.id),
          employeeId: String(item.action.idEmpleado),
          companyId: String(item.action.idEmpresa),
          type: 'bonificacion',
          lines: item.linesCount,
          groupId,
        },
      });

      this.auditOutbox.publish({
        modulo: 'personal-actions',
        accion: 'create',
        entidad: 'personal-action',
        entidadId: item.action.id,
        actorUserId: userId,
        companyContextId: item.action.idEmpresa,
        descripcion: `Bonificacion creada para empleado #${item.action.idEmpleado}`,
        payloadAfter: this.buildAbsenceAuditPayload(item.action, item.linesCount, item.auditLines),
      });
    }

    const firstCreated = created[0]?.action;
    if (!firstCreated) {
      throw new BadRequestException('No se pudo crear la bonificacion');
    }
    const first = await this.findOne(firstCreated.id, userId);
    return {
      ...first,
      totalCreated: created.length,
      createdActionIds: created.map((item) => item.action.id),
      groupId,
    };
  }

  async updateBonus(id: number, dto: UpsertBonusDto, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'bonificacion') {
      throw new BadRequestException('La accion no corresponde al modulo de bonificaciones');
    }
    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException(
        'Solo se pueden editar bonificaciones en estado borrador o pendientes',
      );
    }
    if (action.idEmpresa !== dto.idEmpresa || action.idEmpleado !== dto.idEmpleado) {
      throw new BadRequestException('No se permite cambiar empresa o empleado de la bonificacion');
    }

    await this.validateBonusPayload(dto, userId);
    this.assertSinglePayrollOnUpdate(dto.lines, 'bonificaciones');
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'bonificaciones',
    );

    const payloadBefore = this.buildAbsenceAuditPayload(
      action,
      await this.countBonusLines(action.id),
      await this.getBonusLinesForAudit(action.id),
    );
    const totalMonto = dto.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
    const firstDate = dto.lines[0]?.fechaEfecto ? new Date(dto.lines[0].fechaEfecto) : null;
    const lastDate = dto.lines[dto.lines.length - 1]?.fechaEfecto
      ? new Date(dto.lines[dto.lines.length - 1].fechaEfecto)
      : firstDate;

    await this.dataSource.transaction(async (trx) => {
      await trx.delete(BonusLine, { idAccion: id });
      await trx.delete(ActionQuota, { idAccion: id });

      action.descripcion = dto.observacion ?? null;
      action.fechaEfecto = firstDate;
      action.fechaInicioEfecto = firstDate;
      action.fechaFinEfecto = lastDate;
      action.monto = totalMonto;
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      const quotas: ActionQuota[] = [];
      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const quota = trx.create(ActionQuota, {
          idAccion: action.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          numeroCuota: i + 1,
          montoCuota: Number(line.monto),
          estado: EstadoCuota.PENDIENTE_APROBACION,
          fechaEfecto: new Date(line.fechaEfecto),
          motivoEstado: null,
        });
        quotas.push(await trx.save(quota));
      }

      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const quota = quotas[i];
        const bonusLine = trx.create(BonusLine, {
          idAccion: action.id,
          idCuota: quota.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          idMovimientoNomina: line.movimientoId,
          tipoBonificacion: line.tipoBonificacion,
          cantidad: Number(line.cantidad),
          monto: Number(line.monto),
          remuneracion: line.remuneracion ? 1 : 0,
          formula: line.formula?.trim() || null,
          orden: i + 1,
          fechaEfecto: new Date(line.fechaEfecto),
        });
        await trx.save(bonusLine);
      }
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'update',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Bonificacion actualizada para empleado #${action.idEmpleado}`,
      payloadBefore,
      payloadAfter: this.buildAbsenceAuditPayload(
        action,
        dto.lines.length,
        this.mapBonusLinesForAuditFromDto(dto.lines),
      ),
    });

    return this.findOne(id, userId);
  }

  async advanceBonusState(id: number, userId: number, userPermissions: string[] = []) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'bonificacion') {
      throw new BadRequestException('La accion no corresponde al modulo de bonificaciones');
    }

    const nextByState: Partial<Record<PersonalActionEstado, PersonalActionEstado>> = {
      [PersonalActionEstado.DRAFT]: PersonalActionEstado.PENDING_SUPERVISOR,
      [PersonalActionEstado.PENDING_SUPERVISOR]: PersonalActionEstado.PENDING_RRHH,
      [PersonalActionEstado.PENDING_RRHH]: PersonalActionEstado.APPROVED,
    };
    const next = nextByState[action.estado];
    if (!next) {
      throw new BadRequestException('La accion no tiene un estado siguiente operativo');
    }

    const requiredPermissionByState: Partial<Record<PersonalActionEstado, string>> = {
      [PersonalActionEstado.DRAFT]: 'hr-action-bonificaciones:edit',
      [PersonalActionEstado.PENDING_SUPERVISOR]: 'hr-action-bonificaciones:approve',
      [PersonalActionEstado.PENDING_RRHH]: 'hr-action-bonificaciones:approve',
    };
    const requiredPermission = requiredPermissionByState[action.estado];
    this.assertActionPermission(
      userPermissions,
      requiredPermission,
      'avanzar el estado de la bonificacion',
    );

    action.estado = next;
    action.modificadoPor = userId;
    action.versionLock += 1;

    if (next === PersonalActionEstado.APPROVED) {
      action.aprobadoPor = userId;
      action.fechaAprobacion = new Date();
    }

    const saved = await this.repo.save(action);
    if (next === PersonalActionEstado.APPROVED) {
      await this.flagRecalculationForOpenPayrolls(saved);
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED,
        occurredAt: new Date(),
        payload: {
          actionId: String(saved.id),
          employeeId: String(saved.idEmpleado),
          companyId: String(saved.idEmpresa),
        },
      });
    }

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'advance',
      entidad: 'personal-action',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.idEmpresa,
      descripcion: `Bonificacion movida al estado ${this.getEstadoNombre(saved.estado)}`,
      payloadAfter: this.buildAbsenceAuditPayload(saved, await this.countBonusLines(saved.id)),
    });

    return saved;
  }

  async invalidateBonus(
    id: number,
    motivo: string | undefined,
    userId: number,
    userPermissions: string[] = [],
  ) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'bonificacion') {
      throw new BadRequestException('La accion no corresponde al modulo de bonificaciones');
    }

    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException('La bonificacion no se puede invalidar en su estado actual');
    }

    this.assertActionPermission(
      userPermissions,
      'hr-action-bonificaciones:cancel',
      'invalidar la bonificacion',
    );

    await this.dataSource.transaction(async (trx) => {
      action.estado = PersonalActionEstado.INVALIDATED;
      action.invalidatedAt = new Date();
      action.invalidatedReason = motivo?.trim() || 'Invalidada manualmente por RRHH';
      action.invalidatedReasonCode = PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION;
      action.invalidatedByType = PERSONAL_ACTION_INVALIDATED_BY.USER;
      action.invalidatedByUserId = userId;
      action.invalidatedMeta = {
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: userId,
        source: 'manual_bonus_invalidation',
      };
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      await trx
        .createQueryBuilder()
        .update(ActionQuota)
        .set({
          estado: EstadoCuota.CANCELADA,
          motivoEstado: action.invalidatedReason,
        })
        .where('idAccion = :idAccion', { idAccion: action.id })
        .andWhere('estado != :estadoPagada', { estadoPagada: EstadoCuota.PAGADA })
        .execute();
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED,
      occurredAt: new Date(),
      payload: {
        actionId: String(action.id),
        companyId: String(action.idEmpresa),
        reason: action.invalidatedReason,
        type: 'invalidated',
      },
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'invalidate',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Bonificacion invalidada para empleado #${action.idEmpleado}`,
      payloadAfter: this.buildAbsenceAuditPayload(action, await this.countBonusLines(action.id)),
    });

    return this.findOne(action.id, userId);
  }

  async createOvertime(dto: UpsertOvertimeDto, userId: number) {
    await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    await this.validateOvertimePayload(dto, userId);

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    const moneda = String(employee?.monedaSalario ?? 'CRC').toUpperCase();
    const groupId = `HEX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const groupedLines = this.groupLinesByPayroll(dto.lines);
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'horas extras',
    );

    const created = await this.dataSource.transaction(async (trx) => {
      const createdActions: Array<{
        action: PersonalAction;
        linesCount: number;
        auditLines: AbsenceAuditLinePayload[];
      }> = [];

      for (const group of groupedLines) {
        const totalMonto = group.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
        const firstDate = group.lines[0]?.fechaEfecto ? new Date(group.lines[0].fechaEfecto) : null;
        const lastDate = group.lines[group.lines.length - 1]?.fechaEfecto
          ? new Date(group.lines[group.lines.length - 1].fechaEfecto)
          : firstDate;

        const action = trx.create(PersonalAction, {
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: null,
          tipoAccion: 'hora_extra',
          groupId,
          origen: 'RRHH',
          descripcion: dto.observacion ?? null,
          estado: PersonalActionEstado.PENDING_SUPERVISOR,
          fechaEfecto: firstDate,
          fechaInicioEfecto: firstDate,
          fechaFinEfecto: lastDate,
          monto: totalMonto,
          moneda,
          creadoPor: userId,
          modificadoPor: userId,
        });
        const savedAction = await trx.save(action);

        const quotas: ActionQuota[] = [];
        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const cuotaFechaEfecto = this.parseDateOnlyLocal(line.fechaEfecto);
          if (!cuotaFechaEfecto) {
            throw new BadRequestException(`Linea ${i + 1}: fecha efecto invalida`);
          }
          const quota = trx.create(ActionQuota, {
            idAccion: savedAction.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            numeroCuota: i + 1,
            montoCuota: Number(line.monto),
            estado: EstadoCuota.PENDIENTE_APROBACION,
            fechaEfecto: cuotaFechaEfecto,
            motivoEstado: null,
          });
          quotas.push(await trx.save(quota));
        }

        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const quota = quotas[i];
          const fechaInicioHoraExtra = this.parseDateOnlyLocal(line.fechaInicioHoraExtra);
          const fechaFinHoraExtra = this.parseDateOnlyLocal(line.fechaFinHoraExtra);
          const fechaEfecto = this.parseDateOnlyLocal(line.fechaEfecto);
          if (!fechaInicioHoraExtra || !fechaFinHoraExtra || !fechaEfecto) {
            throw new BadRequestException(`Linea ${i + 1}: fechas de hora extra invalidas`);
          }
          const overtimeLine = trx.create(OvertimeLine, {
            idAccion: savedAction.id,
            idCuota: quota.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            idMovimientoNomina: line.movimientoId,
            fechaInicioHoraExtra,
            fechaFinHoraExtra,
            tipoJornadaHorasExtras: line.tipoJornadaHorasExtras,
            cantidad: Number(line.cantidad),
            monto: Number(line.monto),
            remuneracion: line.remuneracion ? 1 : 0,
            formula: line.formula?.trim() || null,
            orden: i + 1,
            fechaEfecto,
          });
          await trx.save(overtimeLine);
        }

        createdActions.push({
          action: savedAction,
          linesCount: group.lines.length,
          auditLines: this.mapOvertimeLinesForAuditFromDto(group.lines),
        });
      }

      return createdActions;
    });

    for (const item of created) {
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
        occurredAt: new Date(),
        payload: {
          actionId: String(item.action.id),
          employeeId: String(item.action.idEmpleado),
          companyId: String(item.action.idEmpresa),
          type: 'hora_extra',
          lines: item.linesCount,
          groupId,
        },
      });

      this.auditOutbox.publish({
        modulo: 'personal-actions',
        accion: 'create',
        entidad: 'personal-action',
        entidadId: item.action.id,
        actorUserId: userId,
        companyContextId: item.action.idEmpresa,
        descripcion: `Hora extra creada para empleado #${item.action.idEmpleado}`,
        payloadAfter: this.buildAbsenceAuditPayload(item.action, item.linesCount, item.auditLines),
      });
    }

    const firstCreated = created[0]?.action;
    if (!firstCreated) {
      throw new BadRequestException('No se pudo crear la hora extra');
    }
    const first = await this.findOne(firstCreated.id, userId);
    return {
      ...first,
      totalCreated: created.length,
      createdActionIds: created.map((item) => item.action.id),
      groupId,
    };
  }

  async updateOvertime(id: number, dto: UpsertOvertimeDto, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'hora_extra') {
      throw new BadRequestException('La accion no corresponde al modulo de horas extras');
    }
    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException(
        'Solo se pueden editar horas extras en estado borrador o pendientes',
      );
    }
    if (action.idEmpresa !== dto.idEmpresa || action.idEmpleado !== dto.idEmpleado) {
      throw new BadRequestException('No se permite cambiar empresa o empleado de la hora extra');
    }

    await this.validateOvertimePayload(dto, userId);
    this.assertSinglePayrollOnUpdate(dto.lines, 'horas extras');
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'horas extras',
    );

    const payloadBefore = this.buildAbsenceAuditPayload(
      action,
      await this.countOvertimeLines(action.id),
      await this.getOvertimeLinesForAudit(action.id),
    );
    const totalMonto = dto.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
    const firstDate = this.parseDateOnlyLocal(dto.lines[0]?.fechaEfecto);
    const lastDate = this.parseDateOnlyLocal(dto.lines[dto.lines.length - 1]?.fechaEfecto) ?? firstDate;

    await this.dataSource.transaction(async (trx) => {
      await trx.delete(OvertimeLine, { idAccion: id });
      await trx.delete(ActionQuota, { idAccion: id });

      action.descripcion = dto.observacion ?? null;
      action.fechaEfecto = firstDate;
      action.fechaInicioEfecto = firstDate;
      action.fechaFinEfecto = lastDate;
      action.monto = totalMonto;
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      const quotas: ActionQuota[] = [];
      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const cuotaFechaEfecto = this.parseDateOnlyLocal(line.fechaEfecto);
        if (!cuotaFechaEfecto) {
          throw new BadRequestException(`Linea ${i + 1}: fecha efecto invalida`);
        }
        const quota = trx.create(ActionQuota, {
          idAccion: action.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          numeroCuota: i + 1,
          montoCuota: Number(line.monto),
          estado: EstadoCuota.PENDIENTE_APROBACION,
          fechaEfecto: cuotaFechaEfecto,
          motivoEstado: null,
        });
        quotas.push(await trx.save(quota));
      }

      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const quota = quotas[i];
        const fechaInicioHoraExtra = this.parseDateOnlyLocal(line.fechaInicioHoraExtra);
        const fechaFinHoraExtra = this.parseDateOnlyLocal(line.fechaFinHoraExtra);
        const fechaEfecto = this.parseDateOnlyLocal(line.fechaEfecto);
        if (!fechaInicioHoraExtra || !fechaFinHoraExtra || !fechaEfecto) {
          throw new BadRequestException(`Linea ${i + 1}: fechas de hora extra invalidas`);
        }
        const overtimeLine = trx.create(OvertimeLine, {
          idAccion: action.id,
          idCuota: quota.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          idMovimientoNomina: line.movimientoId,
          fechaInicioHoraExtra,
          fechaFinHoraExtra,
          tipoJornadaHorasExtras: line.tipoJornadaHorasExtras,
          cantidad: Number(line.cantidad),
          monto: Number(line.monto),
          remuneracion: line.remuneracion ? 1 : 0,
          formula: line.formula?.trim() || null,
          orden: i + 1,
          fechaEfecto,
        });
        await trx.save(overtimeLine);
      }
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'update',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Hora extra actualizada para empleado #${action.idEmpleado}`,
      payloadBefore,
      payloadAfter: this.buildAbsenceAuditPayload(
        action,
        dto.lines.length,
        this.mapOvertimeLinesForAuditFromDto(dto.lines),
      ),
    });

    return this.findOne(id, userId);
  }

  async advanceOvertimeState(id: number, userId: number, userPermissions: string[] = []) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'hora_extra') {
      throw new BadRequestException('La accion no corresponde al modulo de horas extras');
    }

    const nextByState: Partial<Record<PersonalActionEstado, PersonalActionEstado>> = {
      [PersonalActionEstado.DRAFT]: PersonalActionEstado.PENDING_SUPERVISOR,
      [PersonalActionEstado.PENDING_SUPERVISOR]: PersonalActionEstado.PENDING_RRHH,
      [PersonalActionEstado.PENDING_RRHH]: PersonalActionEstado.APPROVED,
    };
    const next = nextByState[action.estado];
    if (!next) {
      throw new BadRequestException('La accion no tiene un estado siguiente operativo');
    }

    const requiredPermissionByState: Partial<Record<PersonalActionEstado, string>> = {
      [PersonalActionEstado.DRAFT]: 'hr-action-horas-extras:edit',
      [PersonalActionEstado.PENDING_SUPERVISOR]: 'hr-action-horas-extras:approve',
      [PersonalActionEstado.PENDING_RRHH]: 'hr-action-horas-extras:approve',
    };
    const requiredPermission = requiredPermissionByState[action.estado];
    this.assertActionPermission(
      userPermissions,
      requiredPermission,
      'avanzar el estado de la hora extra',
    );

    action.estado = next;
    action.modificadoPor = userId;
    action.versionLock += 1;

    if (next === PersonalActionEstado.APPROVED) {
      action.aprobadoPor = userId;
      action.fechaAprobacion = new Date();
    }

    const saved = await this.repo.save(action);
    if (next === PersonalActionEstado.APPROVED) {
      await this.flagRecalculationForOpenPayrolls(saved);
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED,
        occurredAt: new Date(),
        payload: {
          actionId: String(saved.id),
          employeeId: String(saved.idEmpleado),
          companyId: String(saved.idEmpresa),
        },
      });
    }

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'advance',
      entidad: 'personal-action',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.idEmpresa,
      descripcion: `Hora extra movida al estado ${this.getEstadoNombre(saved.estado)}`,
      payloadAfter: this.buildAbsenceAuditPayload(saved, await this.countOvertimeLines(saved.id)),
    });

    return saved;
  }

  async invalidateOvertime(
    id: number,
    motivo: string | undefined,
    userId: number,
    userPermissions: string[] = [],
  ) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'hora_extra') {
      throw new BadRequestException('La accion no corresponde al modulo de horas extras');
    }

    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException('La hora extra no se puede invalidar en su estado actual');
    }

    this.assertActionPermission(
      userPermissions,
      'hr-action-horas-extras:cancel',
      'invalidar la hora extra',
    );

    await this.dataSource.transaction(async (trx) => {
      action.estado = PersonalActionEstado.INVALIDATED;
      action.invalidatedAt = new Date();
      action.invalidatedReason = motivo?.trim() || 'Invalidada manualmente por RRHH';
      action.invalidatedReasonCode = PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION;
      action.invalidatedByType = PERSONAL_ACTION_INVALIDATED_BY.USER;
      action.invalidatedByUserId = userId;
      action.invalidatedMeta = {
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: userId,
        source: 'manual_overtime_invalidation',
      };
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      await trx
        .createQueryBuilder()
        .update(ActionQuota)
        .set({
          estado: EstadoCuota.CANCELADA,
          motivoEstado: action.invalidatedReason,
        })
        .where('idAccion = :idAccion', { idAccion: action.id })
        .andWhere('estado != :estadoPagada', { estadoPagada: EstadoCuota.PAGADA })
        .execute();
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED,
      occurredAt: new Date(),
      payload: {
        actionId: String(action.id),
        companyId: String(action.idEmpresa),
        reason: action.invalidatedReason,
        type: 'invalidated',
      },
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'invalidate',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Hora extra invalidada para empleado #${action.idEmpleado}`,
      payloadAfter: this.buildAbsenceAuditPayload(action, await this.countOvertimeLines(action.id)),
    });

    return this.findOne(action.id, userId);
  }

  async createRetention(dto: UpsertRetentionDto, userId: number) {
    await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    await this.validateRetentionPayload(dto, userId);

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    const moneda = String(employee?.monedaSalario ?? 'CRC').toUpperCase();
    const groupId = `RET-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const groupedLines = this.groupLinesByPayroll(dto.lines);
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'retenciones',
    );

    const created = await this.dataSource.transaction(async (trx) => {
      const createdActions: Array<{
        action: PersonalAction;
        linesCount: number;
        auditLines: AbsenceAuditLinePayload[];
      }> = [];

      for (const group of groupedLines) {
        const totalMonto = group.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
        const firstDate = this.parseDateOnlyLocal(group.lines[0]?.fechaEfecto);
        const lastDate = this.parseDateOnlyLocal(group.lines[group.lines.length - 1]?.fechaEfecto) ?? firstDate;

        const action = trx.create(PersonalAction, {
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: null,
          tipoAccion: 'deduccion_retencion',
          groupId,
          origen: 'RRHH',
          descripcion: dto.observacion ?? null,
          estado: PersonalActionEstado.PENDING_SUPERVISOR,
          fechaEfecto: firstDate,
          fechaInicioEfecto: firstDate,
          fechaFinEfecto: lastDate,
          monto: totalMonto,
          moneda,
          creadoPor: userId,
          modificadoPor: userId,
        });
        const savedAction = await trx.save(action);

        const quotas: ActionQuota[] = [];
        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const cuotaFechaEfecto = this.parseDateOnlyLocal(line.fechaEfecto);
          if (!cuotaFechaEfecto) {
            throw new BadRequestException(`Linea ${i + 1}: fecha efecto invalida`);
          }
          const quota = trx.create(ActionQuota, {
            idAccion: savedAction.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            numeroCuota: i + 1,
            montoCuota: Number(line.monto),
            estado: EstadoCuota.PENDIENTE_APROBACION,
            fechaEfecto: cuotaFechaEfecto,
            motivoEstado: null,
          });
          quotas.push(await trx.save(quota));
        }

        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const quota = quotas[i];
          const fechaEfecto = this.parseDateOnlyLocal(line.fechaEfecto);
          if (!fechaEfecto) {
            throw new BadRequestException(`Linea ${i + 1}: fecha efecto invalida`);
          }
          const retentionLine = trx.create(RetentionLine, {
            idAccion: savedAction.id,
            idCuota: quota.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            idMovimientoNomina: line.movimientoId,
            cantidad: Number(line.cantidad),
            monto: Number(line.monto),
            remuneracion: 0,
            formula: line.formula?.trim() || null,
            orden: i + 1,
            fechaEfecto,
          });
          await trx.save(retentionLine);
        }

        createdActions.push({
          action: savedAction,
          linesCount: group.lines.length,
          auditLines: this.mapRetentionLinesForAuditFromDto(group.lines),
        });
      }

      return createdActions;
    });

    for (const item of created) {
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
        occurredAt: new Date(),
        payload: {
          actionId: String(item.action.id),
          employeeId: String(item.action.idEmpleado),
          companyId: String(item.action.idEmpresa),
          type: 'retencion',
          lines: item.linesCount,
          groupId,
        },
      });

      this.auditOutbox.publish({
        modulo: 'personal-actions',
        accion: 'create',
        entidad: 'personal-action',
        entidadId: item.action.id,
        actorUserId: userId,
        companyContextId: item.action.idEmpresa,
        descripcion: `Retencion creada para empleado #${item.action.idEmpleado}`,
        payloadAfter: this.buildAbsenceAuditPayload(item.action, item.linesCount, item.auditLines),
      });
    }

    const firstCreated = created[0]?.action;
    if (!firstCreated) {
      throw new BadRequestException('No se pudo crear la retencion');
    }
    const first = await this.findOne(firstCreated.id, userId);
    return {
      ...first,
      totalCreated: created.length,
      createdActionIds: created.map((item) => item.action.id),
      groupId,
    };
  }

  async updateRetention(id: number, dto: UpsertRetentionDto, userId: number) {
    const action = await this.findOne(id, userId);
    if (!['retencion', 'deduccion_retencion'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de retenciones');
    }
    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException(
        'Solo se pueden editar retenciones en estado borrador o pendientes',
      );
    }
    if (action.idEmpresa !== dto.idEmpresa || action.idEmpleado !== dto.idEmpleado) {
      throw new BadRequestException('No se permite cambiar empresa o empleado de la retencion');
    }

    await this.validateRetentionPayload(dto, userId);
    this.assertSinglePayrollOnUpdate(dto.lines, 'retenciones');
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'retenciones',
    );

    const payloadBefore = this.buildAbsenceAuditPayload(
      action,
      await this.countRetentionLines(action.id),
      await this.getRetentionLinesForAudit(action.id),
    );
    const totalMonto = dto.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
    const firstDate = this.parseDateOnlyLocal(dto.lines[0]?.fechaEfecto);
    const lastDate = this.parseDateOnlyLocal(dto.lines[dto.lines.length - 1]?.fechaEfecto) ?? firstDate;

    await this.dataSource.transaction(async (trx) => {
      await trx.delete(RetentionLine, { idAccion: id });
      await trx.delete(ActionQuota, { idAccion: id });

      action.descripcion = dto.observacion ?? null;
      action.fechaEfecto = firstDate;
      action.fechaInicioEfecto = firstDate;
      action.fechaFinEfecto = lastDate;
      action.monto = totalMonto;
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      const quotas: ActionQuota[] = [];
      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const cuotaFechaEfecto = this.parseDateOnlyLocal(line.fechaEfecto);
        if (!cuotaFechaEfecto) {
          throw new BadRequestException(`Linea ${i + 1}: fecha efecto invalida`);
        }
        const quota = trx.create(ActionQuota, {
          idAccion: action.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          numeroCuota: i + 1,
          montoCuota: Number(line.monto),
          estado: EstadoCuota.PENDIENTE_APROBACION,
          fechaEfecto: cuotaFechaEfecto,
          motivoEstado: null,
        });
        quotas.push(await trx.save(quota));
      }

      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const quota = quotas[i];
        const fechaEfecto = this.parseDateOnlyLocal(line.fechaEfecto);
        if (!fechaEfecto) {
          throw new BadRequestException(`Linea ${i + 1}: fecha efecto invalida`);
        }
        const retentionLine = trx.create(RetentionLine, {
          idAccion: action.id,
          idCuota: quota.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          idMovimientoNomina: line.movimientoId,
          cantidad: Number(line.cantidad),
          monto: Number(line.monto),
          remuneracion: 0,
          formula: line.formula?.trim() || null,
          orden: i + 1,
          fechaEfecto,
        });
        await trx.save(retentionLine);
      }
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'update',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Retencion actualizada para empleado #${action.idEmpleado}`,
      payloadBefore,
      payloadAfter: this.buildAbsenceAuditPayload(
        action,
        dto.lines.length,
        this.mapRetentionLinesForAuditFromDto(dto.lines),
      ),
    });

    return this.findOne(id, userId);
  }

  async advanceRetentionState(id: number, userId: number, userPermissions: string[] = []) {
    const action = await this.findOne(id, userId);
    if (!['retencion', 'deduccion_retencion'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de retenciones');
    }

    const nextByState: Partial<Record<PersonalActionEstado, PersonalActionEstado>> = {
      [PersonalActionEstado.DRAFT]: PersonalActionEstado.PENDING_SUPERVISOR,
      [PersonalActionEstado.PENDING_SUPERVISOR]: PersonalActionEstado.PENDING_RRHH,
      [PersonalActionEstado.PENDING_RRHH]: PersonalActionEstado.APPROVED,
    };
    const next = nextByState[action.estado];
    if (!next) {
      throw new BadRequestException('La accion no tiene un estado siguiente operativo');
    }

    const requiredPermissionByState: Partial<Record<PersonalActionEstado, string>> = {
      [PersonalActionEstado.DRAFT]: 'hr-action-retenciones:edit',
      [PersonalActionEstado.PENDING_SUPERVISOR]: 'hr-action-retenciones:approve',
      [PersonalActionEstado.PENDING_RRHH]: 'hr-action-retenciones:approve',
    };
    const requiredPermission = requiredPermissionByState[action.estado];
    this.assertActionPermission(
      userPermissions,
      requiredPermission,
      'avanzar el estado de la retencion',
    );

    action.estado = next;
    action.modificadoPor = userId;
    action.versionLock += 1;

    if (next === PersonalActionEstado.APPROVED) {
      action.aprobadoPor = userId;
      action.fechaAprobacion = new Date();
    }

    const saved = await this.repo.save(action);
    if (next === PersonalActionEstado.APPROVED) {
      await this.flagRecalculationForOpenPayrolls(saved);
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED,
        occurredAt: new Date(),
        payload: {
          actionId: String(saved.id),
          employeeId: String(saved.idEmpleado),
          companyId: String(saved.idEmpresa),
        },
      });
    }

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'advance',
      entidad: 'personal-action',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.idEmpresa,
      descripcion: `Retencion movida al estado ${this.getEstadoNombre(saved.estado)}`,
      payloadAfter: this.buildAbsenceAuditPayload(saved, await this.countRetentionLines(saved.id)),
    });

    return saved;
  }

  async invalidateRetention(
    id: number,
    motivo: string | undefined,
    userId: number,
    userPermissions: string[] = [],
  ) {
    const action = await this.findOne(id, userId);
    if (!['retencion', 'deduccion_retencion'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de retenciones');
    }

    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException('La retencion no se puede invalidar en su estado actual');
    }

    this.assertActionPermission(
      userPermissions,
      'hr-action-retenciones:cancel',
      'invalidar la retencion',
    );

    await this.dataSource.transaction(async (trx) => {
      action.estado = PersonalActionEstado.INVALIDATED;
      action.invalidatedAt = new Date();
      action.invalidatedReason = motivo?.trim() || 'Invalidada manualmente por RRHH';
      action.invalidatedReasonCode = PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION;
      action.invalidatedByType = PERSONAL_ACTION_INVALIDATED_BY.USER;
      action.invalidatedByUserId = userId;
      action.invalidatedMeta = {
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: userId,
        source: 'manual_retention_invalidation',
      };
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      await trx
        .createQueryBuilder()
        .update(ActionQuota)
        .set({
          estado: EstadoCuota.CANCELADA,
          motivoEstado: action.invalidatedReason,
        })
        .where('idAccion = :idAccion', { idAccion: action.id })
        .andWhere('estado != :estadoPagada', { estadoPagada: EstadoCuota.PAGADA })
        .execute();
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED,
      occurredAt: new Date(),
      payload: {
        actionId: String(action.id),
        companyId: String(action.idEmpresa),
        reason: action.invalidatedReason,
        type: 'invalidated',
      },
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'invalidate',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Retencion invalidada para empleado #${action.idEmpleado}`,
      payloadAfter: this.buildAbsenceAuditPayload(
        action,
        await this.countRetentionLines(action.id),
      ),
    });

    return this.findOne(action.id, userId);
  }

  async createDiscount(dto: UpsertDiscountDto, userId: number) {
    await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    await this.validateDiscountPayload(dto, userId);

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    const moneda = String(employee?.monedaSalario ?? 'CRC').toUpperCase();
    const groupId = `DSC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const groupedLines = this.groupLinesByPayroll(dto.lines);
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'descuentos',
    );

    const created = await this.dataSource.transaction(async (trx) => {
      const createdActions: Array<{
        action: PersonalAction;
        linesCount: number;
        auditLines: AbsenceAuditLinePayload[];
      }> = [];

      for (const group of groupedLines) {
        const totalMonto = group.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
        const firstDate = group.lines[0]?.fechaEfecto
          ? this.parseDateOnlyLocal(group.lines[0].fechaEfecto)
          : null;
        const lastDate = group.lines[group.lines.length - 1]?.fechaEfecto
          ? this.parseDateOnlyLocal(group.lines[group.lines.length - 1].fechaEfecto)
          : firstDate;

        const action = trx.create(PersonalAction, {
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: null,
          tipoAccion: 'deduccion_descuento',
          groupId,
          origen: 'RRHH',
          descripcion: dto.observacion ?? null,
          estado: PersonalActionEstado.PENDING_SUPERVISOR,
          fechaEfecto: firstDate,
          fechaInicioEfecto: firstDate,
          fechaFinEfecto: lastDate,
          monto: totalMonto,
          moneda,
          creadoPor: userId,
          modificadoPor: userId,
        });
        const savedAction = await trx.save(action);

        const quotas: ActionQuota[] = [];
        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const cuotaFechaEfecto = this.parseDateOnlyLocal(line.fechaEfecto);
          if (!cuotaFechaEfecto) {
            throw new BadRequestException(`Linea ${i + 1}: fecha efecto invalida`);
          }
          const quota = trx.create(ActionQuota, {
            idAccion: savedAction.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            numeroCuota: i + 1,
            montoCuota: Number(line.monto),
            estado: EstadoCuota.PENDIENTE_APROBACION,
            fechaEfecto: cuotaFechaEfecto,
            motivoEstado: null,
          });
          quotas.push(await trx.save(quota));
        }

        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const quota = quotas[i];
          const fechaEfecto = this.parseDateOnlyLocal(line.fechaEfecto);
          if (!fechaEfecto) {
            throw new BadRequestException(`Linea ${i + 1}: fecha efecto invalida`);
          }
          const discountLine = trx.create(DiscountLine, {
            idAccion: savedAction.id,
            idCuota: quota.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            idMovimientoNomina: line.movimientoId,
            cantidad: Number(line.cantidad),
            monto: Number(line.monto),
            remuneracion: 0,
            formula: line.formula?.trim() || null,
            orden: i + 1,
            fechaEfecto,
          });
          await trx.save(discountLine);
        }

        createdActions.push({
          action: savedAction,
          linesCount: group.lines.length,
          auditLines: this.mapDiscountLinesForAuditFromDto(group.lines),
        });
      }

      return createdActions;
    });

    for (const item of created) {
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
        occurredAt: new Date(),
        payload: {
          actionId: String(item.action.id),
          employeeId: String(item.action.idEmpleado),
          companyId: String(item.action.idEmpresa),
          type: 'descuento',
          lines: item.linesCount,
          groupId,
        },
      });

      this.auditOutbox.publish({
        modulo: 'personal-actions',
        accion: 'create',
        entidad: 'personal-action',
        entidadId: item.action.id,
        actorUserId: userId,
        companyContextId: item.action.idEmpresa,
        descripcion: `Descuento creado para empleado #${item.action.idEmpleado}`,
        payloadAfter: this.buildAbsenceAuditPayload(item.action, item.linesCount, item.auditLines),
      });
    }

    const firstCreated = created[0]?.action;
    if (!firstCreated) {
      throw new BadRequestException('No se pudo crear el descuento');
    }
    const first = await this.findOne(firstCreated.id, userId);
    return {
      ...first,
      totalCreated: created.length,
      createdActionIds: created.map((item) => item.action.id),
      groupId,
    };
  }

  async updateDiscount(id: number, dto: UpsertDiscountDto, userId: number) {
    const action = await this.findOne(id, userId);
    if (!['descuento', 'deduccion_descuento'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de descuentos');
    }
    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException(
        'Solo se pueden editar descuentos en estado borrador o pendientes',
      );
    }
    if (action.idEmpresa !== dto.idEmpresa || action.idEmpleado !== dto.idEmpleado) {
      throw new BadRequestException('No se permite cambiar empresa o empleado del descuento');
    }

    await this.validateDiscountPayload(dto, userId);
    this.assertSinglePayrollOnUpdate(dto.lines, 'descuentos');
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'descuentos',
    );

    const payloadBefore = this.buildAbsenceAuditPayload(
      action,
      await this.countDiscountLines(action.id),
      await this.getDiscountLinesForAudit(action.id),
    );
    const totalMonto = dto.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
    const firstDate = dto.lines[0]?.fechaEfecto ? this.parseDateOnlyLocal(dto.lines[0].fechaEfecto) : null;
    const lastDate = dto.lines[dto.lines.length - 1]?.fechaEfecto
      ? this.parseDateOnlyLocal(dto.lines[dto.lines.length - 1].fechaEfecto)
      : firstDate;

    await this.dataSource.transaction(async (trx) => {
      await trx.delete(DiscountLine, { idAccion: id });
      await trx.delete(ActionQuota, { idAccion: id });

      action.descripcion = dto.observacion ?? null;
      action.fechaEfecto = firstDate;
      action.fechaInicioEfecto = firstDate;
      action.fechaFinEfecto = lastDate;
      action.monto = totalMonto;
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      const quotas: ActionQuota[] = [];
      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const cuotaFechaEfecto = this.parseDateOnlyLocal(line.fechaEfecto);
        if (!cuotaFechaEfecto) {
          throw new BadRequestException(`Linea ${i + 1}: fecha efecto invalida`);
        }
        const quota = trx.create(ActionQuota, {
          idAccion: action.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          numeroCuota: i + 1,
          montoCuota: Number(line.monto),
          estado: EstadoCuota.PENDIENTE_APROBACION,
          fechaEfecto: cuotaFechaEfecto,
          motivoEstado: null,
        });
        quotas.push(await trx.save(quota));
      }

      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const quota = quotas[i];
        const fechaEfecto = this.parseDateOnlyLocal(line.fechaEfecto);
        if (!fechaEfecto) {
          throw new BadRequestException(`Linea ${i + 1}: fecha efecto invalida`);
        }
        const discountLine = trx.create(DiscountLine, {
          idAccion: action.id,
          idCuota: quota.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          idMovimientoNomina: line.movimientoId,
          cantidad: Number(line.cantidad),
          monto: Number(line.monto),
          remuneracion: 0,
          formula: line.formula?.trim() || null,
          orden: i + 1,
          fechaEfecto,
        });
        await trx.save(discountLine);
      }
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'update',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Descuento actualizado para empleado #${action.idEmpleado}`,
      payloadBefore,
      payloadAfter: this.buildAbsenceAuditPayload(
        action,
        dto.lines.length,
        this.mapDiscountLinesForAuditFromDto(dto.lines),
      ),
    });

    return this.findOne(id, userId);
  }

  async advanceDiscountState(id: number, userId: number, userPermissions: string[] = []) {
    const action = await this.findOne(id, userId);
    if (!['descuento', 'deduccion_descuento'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de descuentos');
    }

    const nextByState: Partial<Record<PersonalActionEstado, PersonalActionEstado>> = {
      [PersonalActionEstado.DRAFT]: PersonalActionEstado.PENDING_SUPERVISOR,
      [PersonalActionEstado.PENDING_SUPERVISOR]: PersonalActionEstado.PENDING_RRHH,
      [PersonalActionEstado.PENDING_RRHH]: PersonalActionEstado.APPROVED,
    };
    const next = nextByState[action.estado];
    if (!next) {
      throw new BadRequestException('La accion no tiene un estado siguiente operativo');
    }

    const requiredPermissionByState: Partial<Record<PersonalActionEstado, string>> = {
      [PersonalActionEstado.DRAFT]: 'hr-action-descuentos:edit',
      [PersonalActionEstado.PENDING_SUPERVISOR]: 'hr-action-descuentos:approve',
      [PersonalActionEstado.PENDING_RRHH]: 'hr-action-descuentos:approve',
    };
    const requiredPermission = requiredPermissionByState[action.estado];
    this.assertActionPermission(
      userPermissions,
      requiredPermission,
      'avanzar el estado del descuento',
    );

    action.estado = next;
    action.modificadoPor = userId;
    action.versionLock += 1;

    if (next === PersonalActionEstado.APPROVED) {
      action.aprobadoPor = userId;
      action.fechaAprobacion = new Date();
    }

    const saved = await this.repo.save(action);
    if (next === PersonalActionEstado.APPROVED) {
      await this.flagRecalculationForOpenPayrolls(saved);
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED,
        occurredAt: new Date(),
        payload: {
          actionId: String(saved.id),
          employeeId: String(saved.idEmpleado),
          companyId: String(saved.idEmpresa),
        },
      });
    }

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'advance',
      entidad: 'personal-action',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.idEmpresa,
      descripcion: `Descuento movido al estado ${this.getEstadoNombre(saved.estado)}`,
      payloadAfter: this.buildAbsenceAuditPayload(saved, await this.countDiscountLines(saved.id)),
    });

    return saved;
  }

  async invalidateDiscount(
    id: number,
    motivo: string | undefined,
    userId: number,
    userPermissions: string[] = [],
  ) {
    const action = await this.findOne(id, userId);
    if (!['descuento', 'deduccion_descuento'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de descuentos');
    }

    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException('El descuento no se puede invalidar en su estado actual');
    }

    this.assertActionPermission(
      userPermissions,
      'hr-action-descuentos:cancel',
      'invalidar el descuento',
    );

    await this.dataSource.transaction(async (trx) => {
      action.estado = PersonalActionEstado.INVALIDATED;
      action.invalidatedAt = new Date();
      action.invalidatedReason = motivo?.trim() || 'Invalidado manualmente por RRHH';
      action.invalidatedReasonCode = PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION;
      action.invalidatedByType = PERSONAL_ACTION_INVALIDATED_BY.USER;
      action.invalidatedByUserId = userId;
      action.invalidatedMeta = {
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: userId,
        source: 'manual_discount_invalidation',
      };
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      await trx
        .createQueryBuilder()
        .update(ActionQuota)
        .set({
          estado: EstadoCuota.CANCELADA,
          motivoEstado: action.invalidatedReason,
        })
        .where('idAccion = :idAccion', { idAccion: action.id })
        .andWhere('estado != :estadoPagada', { estadoPagada: EstadoCuota.PAGADA })
        .execute();
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED,
      occurredAt: new Date(),
      payload: {
        actionId: String(action.id),
        companyId: String(action.idEmpresa),
        reason: action.invalidatedReason,
        type: 'invalidated',
      },
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'invalidate',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Descuento invalidado para empleado #${action.idEmpleado}`,
      payloadAfter: this.buildAbsenceAuditPayload(action, await this.countDiscountLines(action.id)),
    });

    return this.findOne(action.id, userId);
  }

  async invalidateIncrease(
    id: number,
    motivo: string | undefined,
    userId: number,
    userPermissions: string[] = [],
  ) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'aumento') {
      throw new BadRequestException('La accion no corresponde al modulo de aumentos');
    }

    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException('El aumento no se puede invalidar en su estado actual');
    }

    this.assertActionPermission(
      userPermissions,
      'hr-action-aumentos:cancel',
      'invalidar el aumento',
    );

    await this.dataSource.transaction(async (trx) => {
      action.estado = PersonalActionEstado.INVALIDATED;
      action.invalidatedAt = new Date();
      action.invalidatedReason = motivo?.trim() || 'Invalidado manualmente por RRHH';
      action.invalidatedReasonCode = PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION;
      action.invalidatedByType = PERSONAL_ACTION_INVALIDATED_BY.USER;
      action.invalidatedByUserId = userId;
      action.invalidatedMeta = {
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: userId,
        source: 'manual_increase_invalidation',
      };
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED,
      occurredAt: new Date(),
      payload: {
        actionId: String(action.id),
        companyId: String(action.idEmpresa),
        reason: action.invalidatedReason,
        type: 'invalidated',
      },
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'invalidate',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Aumento invalidado para empleado #${action.idEmpleado}`,
      payloadAfter: this.buildAbsenceAuditPayload(action, await this.countIncreaseLines(action.id)),
    });

    return this.findOne(action.id, userId);
  }

  async createVacation(dto: UpsertVacationDto, userId: number) {
    await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    const { payrollMap } = await this.validateVacationPayload(dto, userId, undefined, true);

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    const moneda = String(employee?.monedaSalario ?? 'CRC').toUpperCase();
    const groupId = `VAC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const groupedDates =
      payrollMap && payrollMap.size > 0
        ? Array.from(payrollMap.entries())
            .map(([payrollId, fechas]) => ({
              payrollId,
              fechas: [...fechas].sort(),
            }))
            .sort((a, b) => (a.fechas[0] ?? '').localeCompare(b.fechas[0] ?? ''))
        : [];

    if (groupedDates.length === 0) {
      throw new BadRequestException('No se pudieron determinar las planillas de vacaciones.');
    }
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      groupedDates.map((group) => group.payrollId),
      'vacaciones',
    );

    const created = await this.dataSource.transaction(async (trx) => {
      const createdActions: Array<{ action: PersonalAction; linesCount: number }> = [];

      for (const group of groupedDates) {
        const totalDays = group.fechas.length;
        const firstDate = group.fechas[0] ?? null;
        const lastDate = group.fechas[group.fechas.length - 1] ?? firstDate;

        const action = trx.create(PersonalAction, {
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: null,
          tipoAccion: 'vacaciones',
          groupId,
          origen: 'RRHH',
          descripcion: dto.observacion ?? null,
          estado: PersonalActionEstado.PENDING_SUPERVISOR,
          fechaEfecto: (firstDate as unknown as Date) ?? null,
          fechaInicioEfecto: (firstDate as unknown as Date) ?? null,
          fechaFinEfecto: (lastDate as unknown as Date) ?? null,
          monto: totalDays,
          moneda,
          creadoPor: userId,
          modificadoPor: userId,
        });
        const savedAction = await trx.save(action);

        const quotas: ActionQuota[] = [];
        for (let i = 0; i < group.fechas.length; i += 1) {
          const fecha = group.fechas[i];
          const quota = trx.create(ActionQuota, {
            idAccion: savedAction.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: group.payrollId,
            numeroCuota: i + 1,
            montoCuota: 1,
            estado: EstadoCuota.PENDIENTE_APROBACION,
            fechaEfecto: fecha as unknown as Date,
            motivoEstado: null,
          });
          quotas.push(await trx.save(quota));
        }

        for (let i = 0; i < group.fechas.length; i += 1) {
          const fecha = group.fechas[i];
          const quota = quotas[i];
          const vacationDate = trx.create(VacationDate, {
            idAccion: savedAction.id,
            idCuota: quota.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: group.payrollId,
            idMovimientoNomina: dto.movimientoId,
            fechaVacacion: fecha as unknown as Date,
            orden: i + 1,
          });
          await trx.save(vacationDate);
        }

        createdActions.push({ action: savedAction, linesCount: group.fechas.length });
      }

      return createdActions;
    });

    for (const item of created) {
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
        occurredAt: new Date(),
        payload: {
          actionId: String(item.action.id),
          employeeId: String(item.action.idEmpleado),
          companyId: String(item.action.idEmpresa),
          type: 'vacaciones',
          lines: item.linesCount,
          groupId,
        },
      });

      this.auditOutbox.publish({
        modulo: 'personal-actions',
        accion: 'create',
        entidad: 'personal-action',
        entidadId: item.action.id,
        actorUserId: userId,
        companyContextId: item.action.idEmpresa,
        descripcion: `Vacaciones creadas para empleado #${item.action.idEmpleado}`,
        payloadAfter: this.buildAbsenceAuditPayload(item.action, item.linesCount),
      });
    }

    const firstCreated = created[0]?.action;
    if (!firstCreated) {
      throw new BadRequestException('No se pudieron crear vacaciones');
    }
    const first = await this.findOne(firstCreated.id, userId);

    return {
      ...first,
      totalCreated: created.length,
      createdActionIds: created.map((item) => item.action.id),
      groupId,
    };
  }

  async createIncrease(dto: UpsertIncreaseDto, userId: number) {
    await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    const validation = await this.validateIncreasePayload(dto, userId);
    const { employee, line } = validation;
    const moneda = String(employee.monedaSalario ?? 'CRC').toUpperCase();
    const groupId = `AUM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

    const fechaEfecto = this.toYmdFlexible(dto.line.fechaEfecto);
    const fecha = fechaEfecto ? new Date(fechaEfecto) : null;
    const formula = this.buildIncreaseFormula(
      line.salarioActual,
      line.monto,
      line.porcentaje,
      line.metodoCalculo,
    );
    await this.assertEmployeeNotVerifiedForPayrolls(dto.idEmpleado, [line.payrollId], 'aumentos');
    await this.assertEmployeeNotVerifiedForPayrolls(dto.idEmpleado, [line.payrollId], 'aumentos');

    const savedAction = await this.dataSource.transaction(async (trx) => {
      const action = trx.create(PersonalAction, {
        idEmpresa: dto.idEmpresa,
        idEmpleado: dto.idEmpleado,
        idCalendarioNomina: null,
        tipoAccion: 'aumento',
        groupId,
        origen: 'RRHH',
        descripcion: dto.observacion ?? null,
        estado: PersonalActionEstado.PENDING_SUPERVISOR,
        fechaEfecto: fecha,
        fechaInicioEfecto: fecha,
        fechaFinEfecto: fecha,
        monto: line.monto,
        moneda,
        creadoPor: userId,
        modificadoPor: userId,
      });
      const saved = await trx.save(action);

      const increaseLine = trx.create(IncreaseLine, {
        idAccion: saved.id,
        idEmpresa: dto.idEmpresa,
        idEmpleado: dto.idEmpleado,
        idCalendarioNomina: line.payrollId,
        idMovimientoNomina: line.movimientoId,
        metodoCalculo: line.metodoCalculo,
        porcentaje: line.porcentaje,
        monto: line.monto,
        salarioActual: line.salarioActual,
        nuevoSalario: line.nuevoSalario,
        remuneracion: 1,
        formula,
        orden: 1,
        fechaEfecto: fecha,
      });
      await trx.save(increaseLine);

      return saved;
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
      occurredAt: new Date(),
      payload: {
        actionId: String(savedAction.id),
        employeeId: String(savedAction.idEmpleado),
        companyId: String(savedAction.idEmpresa),
        type: 'aumento',
        lines: 1,
        groupId,
      },
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'create',
      entidad: 'personal-action',
      entidadId: savedAction.id,
      actorUserId: userId,
      companyContextId: savedAction.idEmpresa,
      descripcion: `Aumento creado para empleado #${savedAction.idEmpleado}`,
      payloadAfter: this.buildAbsenceAuditPayload(savedAction, 1),
    });

    return this.findOne(savedAction.id, userId);
  }

  async updateVacation(id: number, dto: UpsertVacationDto, userId: number) {
    const action = await this.findOne(id, userId);
    if (!['vacaciones', 'vacacion', 'vacation'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de vacaciones');
    }
    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException(
        'Solo se pueden editar vacaciones en estado borrador o pendientes',
      );
    }
    if (action.idEmpresa !== dto.idEmpresa || action.idEmpleado !== dto.idEmpleado) {
      throw new BadRequestException('No se permite cambiar empresa o empleado de las vacaciones');
    }

    const { dates, payrollMap } = await this.validateVacationPayload(dto, userId, action.id, false);
    const payrollEntries = Array.from((payrollMap ?? new Map()).entries());
    const targetPayrollId = payrollEntries[0]?.[0];
    if (!targetPayrollId) {
      throw new BadRequestException('No se pudo determinar la planilla de las vacaciones.');
    }
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      [targetPayrollId],
      'vacaciones',
    );

    const payloadBefore = this.buildAbsenceAuditPayload(
      action,
      await this.countVacationDates(action.id),
    );

    const totalDays = dates.length;
    const firstDate = dates[0] ?? null;
    const lastDate = dates[dates.length - 1] ?? firstDate;

    await this.dataSource.transaction(async (trx) => {
      await trx.delete(VacationDate, { idAccion: id });
      await trx.delete(ActionQuota, { idAccion: id });

      action.descripcion = dto.observacion ?? null;
      action.fechaEfecto = (firstDate as unknown as Date) ?? null;
      action.fechaInicioEfecto = (firstDate as unknown as Date) ?? null;
      action.fechaFinEfecto = (lastDate as unknown as Date) ?? null;
      action.monto = totalDays;
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      const quotas: ActionQuota[] = [];
      for (let i = 0; i < dates.length; i += 1) {
        const fecha = dates[i];
        const quota = trx.create(ActionQuota, {
          idAccion: action.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: targetPayrollId,
          numeroCuota: i + 1,
          montoCuota: 1,
          estado: EstadoCuota.PENDIENTE_APROBACION,
          fechaEfecto: fecha as unknown as Date,
          motivoEstado: null,
        });
        quotas.push(await trx.save(quota));
      }

      for (let i = 0; i < dates.length; i += 1) {
        const fecha = dates[i];
        const quota = quotas[i];
        const vacationDate = trx.create(VacationDate, {
          idAccion: action.id,
          idCuota: quota.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: targetPayrollId,
          idMovimientoNomina: dto.movimientoId,
          fechaVacacion: fecha as unknown as Date,
          orden: i + 1,
        });
        await trx.save(vacationDate);
      }
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'update',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Vacaciones actualizadas para empleado #${action.idEmpleado}`,
      payloadBefore,
      payloadAfter: this.buildAbsenceAuditPayload(action, dates.length),
    });

    return this.findOne(id, userId);
  }

  async updateIncrease(id: number, dto: UpsertIncreaseDto, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'aumento') {
      throw new BadRequestException('La accion no corresponde al modulo de aumentos');
    }
    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException(
        'Solo se pueden editar aumentos en estado borrador o pendientes',
      );
    }
    if (action.idEmpresa !== dto.idEmpresa || action.idEmpleado !== dto.idEmpleado) {
      throw new BadRequestException('No se permite cambiar empresa o empleado del aumento');
    }

    const validation = await this.validateIncreasePayload(dto, userId);
    const { line } = validation;

    const payloadBefore = this.buildAbsenceAuditPayload(
      action,
      await this.countIncreaseLines(action.id),
    );

    const fechaEfecto = this.toYmdFlexible(dto.line.fechaEfecto);
    const fecha = fechaEfecto ? new Date(fechaEfecto) : null;
    const formula = this.buildIncreaseFormula(
      line.salarioActual,
      line.monto,
      line.porcentaje,
      line.metodoCalculo,
    );

    await this.dataSource.transaction(async (trx) => {
      await trx.delete(IncreaseLine, { idAccion: id });

      action.descripcion = dto.observacion ?? null;
      action.fechaEfecto = fecha;
      action.fechaInicioEfecto = fecha;
      action.fechaFinEfecto = fecha;
      action.monto = line.monto;
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      const increaseLine = trx.create(IncreaseLine, {
        idAccion: action.id,
        idEmpresa: dto.idEmpresa,
        idEmpleado: dto.idEmpleado,
        idCalendarioNomina: line.payrollId,
        idMovimientoNomina: line.movimientoId,
        metodoCalculo: line.metodoCalculo,
        porcentaje: line.porcentaje,
        monto: line.monto,
        salarioActual: line.salarioActual,
        nuevoSalario: line.nuevoSalario,
        remuneracion: 1,
        formula,
        orden: 1,
        fechaEfecto: fecha,
      });
      await trx.save(increaseLine);
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'update',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Aumento actualizado para empleado #${action.idEmpleado}`,
      payloadBefore,
      payloadAfter: this.buildAbsenceAuditPayload(action, 1),
    });

    return this.findOne(id, userId);
  }

  async advanceVacationState(id: number, userId: number, userPermissions: string[] = []) {
    const action = await this.findOne(id, userId);
    if (!['vacaciones', 'vacacion', 'vacation'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de vacaciones');
    }

    const nextByState: Partial<Record<PersonalActionEstado, PersonalActionEstado>> = {
      [PersonalActionEstado.DRAFT]: PersonalActionEstado.PENDING_SUPERVISOR,
      [PersonalActionEstado.PENDING_SUPERVISOR]: PersonalActionEstado.PENDING_RRHH,
      [PersonalActionEstado.PENDING_RRHH]: PersonalActionEstado.APPROVED,
    };
    const next = nextByState[action.estado];
    if (!next) {
      throw new BadRequestException('La accion no tiene un estado siguiente operativo');
    }

    const requiredPermissionByState: Partial<Record<PersonalActionEstado, string>> = {
      [PersonalActionEstado.DRAFT]: 'hr-action-vacaciones:edit',
      [PersonalActionEstado.PENDING_SUPERVISOR]: 'hr-action-vacaciones:approve',
      [PersonalActionEstado.PENDING_RRHH]: 'hr-action-vacaciones:approve',
    };
    const requiredPermission = requiredPermissionByState[action.estado];
    this.assertActionPermission(
      userPermissions,
      requiredPermission,
      'avanzar el estado de vacaciones',
    );

    action.estado = next;
    action.modificadoPor = userId;
    action.versionLock += 1;

    if (next === PersonalActionEstado.APPROVED) {
      action.aprobadoPor = userId;
      action.fechaAprobacion = new Date();
    }

    const saved = await this.repo.save(action);
    if (next === PersonalActionEstado.APPROVED) {
      await this.flagRecalculationForOpenPayrolls(saved);
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED,
        occurredAt: new Date(),
        payload: {
          actionId: String(saved.id),
          employeeId: String(saved.idEmpleado),
          companyId: String(saved.idEmpresa),
        },
      });
    }

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'advance',
      entidad: 'personal-action',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.idEmpresa,
      descripcion: `Vacaciones movidas al estado ${this.getEstadoNombre(saved.estado)}`,
      payloadAfter: this.buildAbsenceAuditPayload(saved, await this.countVacationDates(saved.id)),
    });

    return saved;
  }

  async advanceIncreaseState(id: number, userId: number, userPermissions: string[] = []) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'aumento') {
      throw new BadRequestException('La accion no corresponde al modulo de aumentos');
    }

    const nextByState: Partial<Record<PersonalActionEstado, PersonalActionEstado>> = {
      [PersonalActionEstado.DRAFT]: PersonalActionEstado.PENDING_SUPERVISOR,
      [PersonalActionEstado.PENDING_SUPERVISOR]: PersonalActionEstado.PENDING_RRHH,
      [PersonalActionEstado.PENDING_RRHH]: PersonalActionEstado.APPROVED,
    };
    const next = nextByState[action.estado];
    if (!next) {
      throw new BadRequestException('La accion no tiene un estado siguiente operativo');
    }

    const requiredPermissionByState: Partial<Record<PersonalActionEstado, string>> = {
      [PersonalActionEstado.DRAFT]: 'hr-action-aumentos:edit',
      [PersonalActionEstado.PENDING_SUPERVISOR]: 'hr-action-aumentos:approve',
      [PersonalActionEstado.PENDING_RRHH]: 'hr-action-aumentos:approve',
    };
    const requiredPermission = requiredPermissionByState[action.estado];
    this.assertActionPermission(
      userPermissions,
      requiredPermission,
      'avanzar el estado del aumento',
    );

    action.estado = next;
    action.modificadoPor = userId;
    action.versionLock += 1;

    if (next === PersonalActionEstado.APPROVED) {
      action.aprobadoPor = userId;
      action.fechaAprobacion = new Date();
    }

    const saved = await this.repo.save(action);
    if (next === PersonalActionEstado.APPROVED) {
      await this.flagRecalculationForOpenPayrolls(saved);
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED,
        occurredAt: new Date(),
        payload: {
          actionId: String(saved.id),
          employeeId: String(saved.idEmpleado),
          companyId: String(saved.idEmpresa),
        },
      });
    }

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'advance',
      entidad: 'personal-action',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.idEmpresa,
      descripcion: `Aumento movido al estado ${this.getEstadoNombre(saved.estado)}`,
      payloadAfter: this.buildAbsenceAuditPayload(saved, await this.countIncreaseLines(saved.id)),
    });

    return saved;
  }

  async invalidateVacation(
    id: number,
    motivo: string | undefined,
    userId: number,
    userPermissions: string[] = [],
  ) {
    const action = await this.findOne(id, userId);
    if (!['vacaciones', 'vacacion', 'vacation'].includes(action.tipoAccion.trim().toLowerCase())) {
      throw new BadRequestException('La accion no corresponde al modulo de vacaciones');
    }

    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException('Las vacaciones no se pueden invalidar en su estado actual');
    }

    this.assertActionPermission(
      userPermissions,
      'hr-action-vacaciones:cancel',
      'invalidar las vacaciones',
    );

    await this.dataSource.transaction(async (trx) => {
      action.estado = PersonalActionEstado.INVALIDATED;
      action.invalidatedAt = new Date();
      action.invalidatedReason = motivo?.trim() || 'Invalidadas manualmente por RRHH';
      action.invalidatedReasonCode = PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION;
      action.invalidatedByType = PERSONAL_ACTION_INVALIDATED_BY.USER;
      action.invalidatedByUserId = userId;
      action.invalidatedMeta = {
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: userId,
        source: 'manual_vacation_invalidation',
      };
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      await trx
        .createQueryBuilder()
        .update(ActionQuota)
        .set({
          estado: EstadoCuota.CANCELADA,
          motivoEstado: action.invalidatedReason,
        })
        .where('idAccion = :idAccion', { idAccion: action.id })
        .andWhere('estado != :estadoPagada', { estadoPagada: EstadoCuota.PAGADA })
        .execute();
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED,
      occurredAt: new Date(),
      payload: {
        actionId: String(action.id),
        companyId: String(action.idEmpresa),
        reason: action.invalidatedReason,
        type: 'invalidated',
      },
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'invalidate',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Vacaciones invalidadas para empleado #${action.idEmpleado}`,
      payloadAfter: this.buildAbsenceAuditPayload(action, await this.countVacationDates(action.id)),
    });

    return this.findOne(action.id, userId);
  }

  async createDisability(dto: UpsertDisabilityDto, userId: number) {
    await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    await this.validateDisabilityPayload(dto, userId);

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    const moneda = String(employee?.monedaSalario ?? 'CRC').toUpperCase();
    const groupId = `INC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const groupedLines = this.groupLinesByPayroll(dto.lines);
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'incapacidades',
    );

    const created = await this.dataSource.transaction(async (trx) => {
      const createdActions: Array<{
        action: PersonalAction;
        linesCount: number;
        auditLines: AbsenceAuditLinePayload[];
      }> = [];

      for (const group of groupedLines) {
        const totalMonto = group.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
        const firstDate = group.lines[0]?.fechaEfecto ? new Date(group.lines[0].fechaEfecto) : null;
        const lastDate = group.lines[group.lines.length - 1]?.fechaEfecto
          ? new Date(group.lines[group.lines.length - 1].fechaEfecto)
          : firstDate;

        const action = trx.create(PersonalAction, {
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: null,
          tipoAccion: 'incapacidad',
          groupId,
          origen: 'RRHH',
          descripcion: dto.observacion ?? null,
          estado: PersonalActionEstado.PENDING_SUPERVISOR,
          fechaEfecto: firstDate,
          fechaInicioEfecto: firstDate,
          fechaFinEfecto: lastDate,
          monto: totalMonto,
          moneda,
          creadoPor: userId,
          modificadoPor: userId,
        });
        const savedAction = await trx.save(action);

        const quotas: ActionQuota[] = [];
        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const quota = trx.create(ActionQuota, {
            idAccion: savedAction.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            numeroCuota: i + 1,
            montoCuota: Number(line.monto),
            estado: EstadoCuota.PENDIENTE_APROBACION,
            fechaEfecto: new Date(line.fechaEfecto),
            motivoEstado: null,
          });
          quotas.push(await trx.save(quota));
        }

        for (let i = 0; i < group.lines.length; i += 1) {
          const line = group.lines[i];
          const quota = quotas[i];
          const disabilityLine = trx.create(DisabilityLine, {
            idAccion: savedAction.id,
            idCuota: quota.id,
            idEmpresa: dto.idEmpresa,
            idEmpleado: dto.idEmpleado,
            idCalendarioNomina: line.payrollId,
            idMovimientoNomina: line.movimientoId,
            tipoIncapacidad: line.tipoIncapacidad,
            tipoInstitucion: line.tipoInstitucion,
            cantidad: Number(line.cantidad),
            monto: Number(line.monto),
            montoIns: Number(line.montoIns ?? 0),
            montoPatrono: Number(line.montoPatrono ?? 0),
            subsidioCcss: Number(line.subsidioCcss ?? 0),
            totalIncapacidad: Number(line.totalIncapacidad ?? line.monto ?? 0),
            remuneracion: line.remuneracion ? 1 : 0,
            formula: line.formula?.trim() || null,
            orden: i + 1,
            fechaEfecto: new Date(line.fechaEfecto),
          });
          await trx.save(disabilityLine);
        }

        createdActions.push({
          action: savedAction,
          linesCount: group.lines.length,
          auditLines: this.mapDisabilityLinesForAuditFromDto(group.lines),
        });
      }

      return createdActions;
    });

    for (const item of created) {
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
        occurredAt: new Date(),
        payload: {
          actionId: String(item.action.id),
          employeeId: String(item.action.idEmpleado),
          companyId: String(item.action.idEmpresa),
          type: 'incapacidad',
          lines: item.linesCount,
          groupId,
        },
      });

      this.auditOutbox.publish({
        modulo: 'personal-actions',
        accion: 'create',
        entidad: 'personal-action',
        entidadId: item.action.id,
        actorUserId: userId,
        companyContextId: item.action.idEmpresa,
        descripcion: `Incapacidad creada para empleado #${item.action.idEmpleado}`,
        payloadAfter: this.buildAbsenceAuditPayload(item.action, item.linesCount, item.auditLines),
      });
    }

    const firstCreated = created[0]?.action;
    if (!firstCreated) {
      throw new BadRequestException('No se pudo crear la incapacidad');
    }
    const first = await this.findOne(firstCreated.id, userId);
    return {
      ...first,
      totalCreated: created.length,
      createdActionIds: created.map((item) => item.action.id),
      groupId,
    };
  }

  async updateDisability(id: number, dto: UpsertDisabilityDto, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'incapacidad') {
      throw new BadRequestException('La accion no corresponde al modulo de incapacidades');
    }
    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException(
        'Solo se pueden editar incapacidades en estado borrador o pendientes',
      );
    }
    if (action.idEmpresa !== dto.idEmpresa || action.idEmpleado !== dto.idEmpleado) {
      throw new BadRequestException('No se permite cambiar empresa o empleado de la incapacidad');
    }

    await this.validateDisabilityPayload(dto, userId);
    this.assertSinglePayrollOnUpdate(dto.lines, 'incapacidades');
    await this.assertEmployeeNotVerifiedForPayrolls(
      dto.idEmpleado,
      dto.lines.map((line) => line.payrollId),
      'incapacidades',
    );

    const payloadBefore = this.buildAbsenceAuditPayload(
      action,
      await this.countDisabilityLines(action.id),
      await this.getDisabilityLinesForAudit(action.id),
    );

    const totalMonto = dto.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
    const firstDate = dto.lines[0]?.fechaEfecto ? new Date(dto.lines[0].fechaEfecto) : null;
    const lastDate = dto.lines[dto.lines.length - 1]?.fechaEfecto
      ? new Date(dto.lines[dto.lines.length - 1].fechaEfecto)
      : firstDate;

    await this.dataSource.transaction(async (trx) => {
      await trx.delete(DisabilityLine, { idAccion: id });
      await trx.delete(ActionQuota, { idAccion: id });

      action.descripcion = dto.observacion ?? null;
      action.fechaEfecto = firstDate;
      action.fechaInicioEfecto = firstDate;
      action.fechaFinEfecto = lastDate;
      action.monto = totalMonto;
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      const quotas: ActionQuota[] = [];
      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const quota = trx.create(ActionQuota, {
          idAccion: action.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          numeroCuota: i + 1,
          montoCuota: Number(line.monto),
          estado: EstadoCuota.PENDIENTE_APROBACION,
          fechaEfecto: new Date(line.fechaEfecto),
          motivoEstado: null,
        });
        quotas.push(await trx.save(quota));
      }

      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
        const quota = quotas[i];
        const disabilityLine = trx.create(DisabilityLine, {
          idAccion: action.id,
          idCuota: quota.id,
          idEmpresa: dto.idEmpresa,
          idEmpleado: dto.idEmpleado,
          idCalendarioNomina: line.payrollId,
          idMovimientoNomina: line.movimientoId,
          tipoIncapacidad: line.tipoIncapacidad,
          tipoInstitucion: line.tipoInstitucion,
          cantidad: Number(line.cantidad),
          monto: Number(line.monto),
          montoIns: Number(line.montoIns ?? 0),
          montoPatrono: Number(line.montoPatrono ?? 0),
          subsidioCcss: Number(line.subsidioCcss ?? 0),
          totalIncapacidad: Number(line.totalIncapacidad ?? line.monto ?? 0),
          remuneracion: line.remuneracion ? 1 : 0,
          formula: line.formula?.trim() || null,
          orden: i + 1,
          fechaEfecto: new Date(line.fechaEfecto),
        });
        await trx.save(disabilityLine);
      }
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'update',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Incapacidad actualizada para empleado #${action.idEmpleado}`,
      payloadBefore,
      payloadAfter: this.buildAbsenceAuditPayload(
        action,
        dto.lines.length,
        this.mapDisabilityLinesForAuditFromDto(dto.lines),
      ),
    });

    return this.findOne(id, userId);
  }

  async advanceDisabilityState(id: number, userId: number, userPermissions: string[] = []) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'incapacidad') {
      throw new BadRequestException('La accion no corresponde al modulo de incapacidades');
    }

    const nextByState: Partial<Record<PersonalActionEstado, PersonalActionEstado>> = {
      [PersonalActionEstado.DRAFT]: PersonalActionEstado.PENDING_SUPERVISOR,
      [PersonalActionEstado.PENDING_SUPERVISOR]: PersonalActionEstado.PENDING_RRHH,
      [PersonalActionEstado.PENDING_RRHH]: PersonalActionEstado.APPROVED,
    };
    const next = nextByState[action.estado];
    if (!next) {
      throw new BadRequestException('La accion no tiene un estado siguiente operativo');
    }

    const requiredPermissionByState: Partial<Record<PersonalActionEstado, string>> = {
      [PersonalActionEstado.DRAFT]: 'hr-action-incapacidades:edit',
      [PersonalActionEstado.PENDING_SUPERVISOR]: 'hr-action-incapacidades:approve',
      [PersonalActionEstado.PENDING_RRHH]: 'hr-action-incapacidades:approve',
    };
    const requiredPermission = requiredPermissionByState[action.estado];
    this.assertActionPermission(
      userPermissions,
      requiredPermission,
      'avanzar el estado de la incapacidad',
    );

    action.estado = next;
    action.modificadoPor = userId;
    action.versionLock += 1;

    if (next === PersonalActionEstado.APPROVED) {
      action.aprobadoPor = userId;
      action.fechaAprobacion = new Date();
    }

    const saved = await this.repo.save(action);
    if (next === PersonalActionEstado.APPROVED) {
      await this.flagRecalculationForOpenPayrolls(saved);
      this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED, {
        eventName: DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED,
        occurredAt: new Date(),
        payload: {
          actionId: String(saved.id),
          employeeId: String(saved.idEmpleado),
          companyId: String(saved.idEmpresa),
        },
      });
    }

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'advance',
      entidad: 'personal-action',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.idEmpresa,
      descripcion: `Incapacidad movida al estado ${this.getEstadoNombre(saved.estado)}`,
      payloadAfter: this.buildAbsenceAuditPayload(saved, await this.countDisabilityLines(saved.id)),
    });

    return saved;
  }

  async invalidateDisability(
    id: number,
    motivo: string | undefined,
    userId: number,
    userPermissions: string[] = [],
  ) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'incapacidad') {
      throw new BadRequestException('La accion no corresponde al modulo de incapacidades');
    }

    if (
      ![
        PersonalActionEstado.DRAFT,
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
      ].includes(action.estado)
    ) {
      throw new BadRequestException('La incapacidad no se puede invalidar en su estado actual');
    }

    this.assertActionPermission(
      userPermissions,
      'hr-action-incapacidades:cancel',
      'invalidar la incapacidad',
    );

    await this.dataSource.transaction(async (trx) => {
      action.estado = PersonalActionEstado.INVALIDATED;
      action.invalidatedAt = new Date();
      action.invalidatedReason = motivo?.trim() || 'Invalidada manualmente por RRHH';
      action.invalidatedReasonCode = PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION;
      action.invalidatedByType = PERSONAL_ACTION_INVALIDATED_BY.USER;
      action.invalidatedByUserId = userId;
      action.invalidatedMeta = {
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: userId,
        source: 'manual_disability_invalidation',
      };
      action.modificadoPor = userId;
      action.versionLock += 1;
      await trx.save(action);

      await trx
        .createQueryBuilder()
        .update(ActionQuota)
        .set({
          estado: EstadoCuota.CANCELADA,
          motivoEstado: action.invalidatedReason,
        })
        .where('idAccion = :idAccion', { idAccion: action.id })
        .andWhere('estado != :estadoPagada', { estadoPagada: EstadoCuota.PAGADA })
        .execute();
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CANCELED,
      occurredAt: new Date(),
      payload: {
        actionId: String(action.id),
        companyId: String(action.idEmpresa),
        reason: action.invalidatedReason,
        type: 'invalidated',
      },
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'invalidate',
      entidad: 'personal-action',
      entidadId: action.id,
      actorUserId: userId,
      companyContextId: action.idEmpresa,
      descripcion: `Incapacidad invalidada para empleado #${action.idEmpleado}`,
      payloadAfter: this.buildAbsenceAuditPayload(
        action,
        await this.countDisabilityLines(action.id),
      ),
    });

    return this.findOne(action.id, userId);
  }

  private assertActionPermission(
    userPermissions: string[],
    requiredPermission: string | undefined,
    actionDescription: string,
  ): void {
    if (!requiredPermission) return;
    if (userPermissions.includes(requiredPermission)) return;
    throw new ForbiddenException(
      `Permisos insuficientes para ${actionDescription}. Requiere: ${requiredPermission}`,
    );
  }

  private async getUserCompanyIds(userId: number): Promise<number[]> {
    const rows = await this.userCompanyRepo.find({
      where: { idUsuario: userId, estado: 1 },
    });
    return rows.map((row) => row.idEmpresa);
  }

  private async assertUserCompanyAccess(userId: number, companyId: number): Promise<void> {
    const exists = await this.userCompanyRepo.findOne({
      where: { idUsuario: userId, idEmpresa: companyId, estado: 1 },
    });

    if (!exists) {
      throw new ForbiddenException(`No tiene acceso a la empresa ${companyId}.`);
    }
  }

  private async flagRecalculationForOpenPayrolls(action: PersonalAction): Promise<void> {
    const start = this.toYmd(action.fechaInicioEfecto ?? action.fechaEfecto);
    if (!start) return;
    const end = this.toYmd(action.fechaFinEfecto ?? action.fechaInicioEfecto ?? action.fechaEfecto);
    if (!end) return;
    const approvedAt = action.fechaAprobacion ? this.toYmdDateTime(action.fechaAprobacion) : null;
    const moneda = (action.moneda || 'CRC').toUpperCase();

    await this.payrollRepo.query(
      `
      UPDATE nom_calendarios_nomina
      SET requires_recalculation_calendario_nomina = 1
      WHERE id_empresa = ?
        AND estado_calendario_nomina = ?
        AND es_inactivo = 1
        AND last_snapshot_at_calendario_nomina IS NOT NULL
        AND moneda_calendario_nomina = ?
        AND fecha_fin_periodo >= ?
        AND fecha_inicio_periodo <= ?
        AND (? IS NULL OR ? <= COALESCE(fecha_corte_calendario_nomina, fecha_fin_periodo))
      `,
      [
        action.idEmpresa,
        EstadoCalendarioNomina.EN_PROCESO,
        moneda,
        start,
        end,
        approvedAt,
        approvedAt,
      ],
    );
  }

  private normalizeVacationDates(fechas: Array<{ fecha: string }>): string[] {
    const normalized = fechas
      .map((item) => this.toYmdFlexible(item.fecha))
      .filter((value): value is string => !!value);
    normalized.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    return normalized;
  }

  private async getVacationBalanceForEmployee(
    idEmpresa: number,
    idEmpleado: number,
  ): Promise<number> {
    const accountRows = await this.repo.query(
      `
      SELECT id_vacaciones_cuenta AS idCuenta
      FROM sys_empleado_vacaciones_cuenta
      WHERE id_empleado = ?
        AND id_empresa = ?
        AND estado_vacaciones_cuenta = 1
      LIMIT 1
      `,
      [idEmpleado, idEmpresa],
    );
    if (!accountRows?.length) return 0;

    const accountId = Number(accountRows[0].idCuenta);
    if (!accountId) return 0;

    const balanceRows = await this.repo.query(
      `
      SELECT saldo_resultante_vacaciones AS saldo
      FROM sys_empleado_vacaciones_ledger
      WHERE id_vacaciones_cuenta = ?
      ORDER BY id_vacaciones_ledger DESC
      LIMIT 1
      `,
      [accountId],
    );
    const saldo = balanceRows?.[0]?.saldo;
    return Number(saldo ?? 0);
  }

  private async getVacationReservedDays(
    idEmpresa: number,
    idEmpleado: number,
    excludeActionId?: number,
  ): Promise<number> {
    const rows = await this.repo.query(
      `
      SELECT COALESCE(SUM(a.monto_accion), 0) AS reservado
      FROM acc_acciones_personal a
      WHERE a.id_empresa = ?
        AND a.id_empleado = ?
        AND LOWER(a.tipo_accion) IN ('vacaciones', 'vacacion', 'vacation')
        AND a.estado_accion IN (1, 2, 3, 4)
        AND (? IS NULL OR a.id_accion != ?)
      `,
      [idEmpresa, idEmpleado, excludeActionId ?? null, excludeActionId ?? null],
    );
    const reservado = rows?.[0]?.reservado;
    return Number(reservado ?? 0);
  }

  async getBookedVacationDates(
    userId: number,
    idEmpresa: number,
    idEmpleado: number,
    excludeActionId?: number,
  ): Promise<string[]> {
    await this.assertUserCompanyAccess(userId, idEmpresa);

    const rows = await this.repo.query(
      `
      SELECT v.fecha_vacacion AS fecha
      FROM acc_vacaciones_fechas v
      INNER JOIN acc_acciones_personal a
        ON a.id_accion = v.id_accion
      WHERE v.id_empresa = ?
        AND v.id_empleado = ?
        AND a.estado_accion IN (1, 2, 3, 4)
        AND (? IS NULL OR a.id_accion != ?)
      ORDER BY v.fecha_vacacion ASC
      `,
      [idEmpresa, idEmpleado, excludeActionId ?? null, excludeActionId ?? null],
    );

    return (rows ?? [])
      .map((row: Record<string, unknown>) => this.toYmdFlexible(row.fecha))
      .filter((value): value is string => !!value);
  }

  private async getHolidayRangesBetween(
    startDate: string,
    endDate: string,
  ): Promise<Array<{ start: string; end: string }>> {
    const rows = await this.repo.query(
      `
      SELECT
        fecha_inicio_feriado_planilla AS startDate,
        fecha_fin_feriado_planilla AS endDate
      FROM nom_feriados_planilla
      WHERE fecha_inicio_feriado_planilla <= ?
        AND fecha_fin_feriado_planilla >= ?
      `,
      [endDate, startDate],
    );

    return (rows ?? [])
      .map((row: Record<string, unknown>) => ({
        start: this.toYmdFlexible(row.startDate) ?? '',
        end: this.toYmdFlexible(row.endDate) ?? '',
      }))
      .filter((item) => item.start && item.end);
  }

  private isHolidayDate(date: string, ranges: Array<{ start: string; end: string }>): boolean {
    const target = this.parseYmdToUtc(date);
    for (const range of ranges) {
      const start = this.parseYmdToUtc(range.start);
      const end = this.parseYmdToUtc(range.end);
      if (target >= start && target <= end) return true;
    }
    return false;
  }

  private parseYmdToUtc(value: string): Date {
    const [yearRaw, monthRaw, dayRaw] = value.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return new Date(NaN);
    }
    return new Date(Date.UTC(year, month - 1, day));
  }

  private async countAbsenceLines(idAccion: number): Promise<number> {
    return this.absenceLineRepo.count({ where: { idAccion } });
  }

  private async countLicenseLines(idAccion: number): Promise<number> {
    return this.licenseLineRepo.count({ where: { idAccion } });
  }

  private async countDisabilityLines(idAccion: number): Promise<number> {
    return this.disabilityLineRepo.count({ where: { idAccion } });
  }

  private async countBonusLines(idAccion: number): Promise<number> {
    return this.bonusLineRepo.count({ where: { idAccion } });
  }

  private async countOvertimeLines(idAccion: number): Promise<number> {
    return this.overtimeLineRepo.count({ where: { idAccion } });
  }

  private async countRetentionLines(idAccion: number): Promise<number> {
    return this.retentionLineRepo.count({ where: { idAccion } });
  }

  private async getRetentionLinesForAudit(idAccion: number): Promise<AbsenceAuditLinePayload[]> {
    const rows = await this.dataSource.query(
      `
      SELECT
        l.id_linea_retencion AS idLinea,
        l.orden_linea AS orden,
        l.id_calendario_nomina AS payrollId,
        p.nombre_planilla AS payrollLabel,
        p.estado AS payrollEstado,
        l.id_movimiento_nomina AS movimientoId,
        m.nombre_movimiento AS movimientoLabel,
        m.es_inactivo AS movimientoInactivo,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.formula_linea AS formula,
        l.fecha_efecto_linea AS fechaEfecto
      FROM acc_retenciones_lineas l
      LEFT JOIN nom_movimientos m ON m.id_movimiento = l.id_movimiento_nomina
      LEFT JOIN nom_planillas p ON p.id_planilla = l.id_calendario_nomina
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_retencion ASC
      `,
      [idAccion],
    );

    return this.normalizeAbsenceAuditLines(rows);
  }

  private mapRetentionLinesForAuditFromDto(lines: UpsertRetentionLineDto[]): AbsenceAuditLinePayload[] {
    return this.normalizeAbsenceAuditLines(
      lines.map((line, index) => ({
        orden: index + 1,
        payrollId: line.payrollId,
        movimientoId: line.movimientoId,
        cantidad: line.cantidad,
        monto: line.monto,
        formula: line.formula,
        fechaEfecto: line.fechaEfecto,
      })),
    );
  }

  private async countDiscountLines(idAccion: number): Promise<number> {
    return this.discountLineRepo.count({ where: { idAccion } });
  }

  private async getDiscountLinesForAudit(idAccion: number): Promise<AbsenceAuditLinePayload[]> {
    const rows = await this.dataSource.query(
      `
      SELECT
        l.id_linea_descuento AS idLinea,
        l.orden_linea AS orden,
        l.id_calendario_nomina AS payrollId,
        p.nombre_planilla AS payrollLabel,
        p.estado AS payrollEstado,
        l.id_movimiento_nomina AS movimientoId,
        m.nombre_movimiento AS movimientoLabel,
        m.es_inactivo AS movimientoInactivo,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.formula_linea AS formula,
        l.fecha_efecto_linea AS fechaEfecto
      FROM acc_descuentos_lineas l
      LEFT JOIN nom_movimientos m ON m.id_movimiento = l.id_movimiento_nomina
      LEFT JOIN nom_planillas p ON p.id_planilla = l.id_calendario_nomina
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_descuento ASC
      `,
      [idAccion],
    );

    return this.normalizeAbsenceAuditLines(rows);
  }

  private mapDiscountLinesForAuditFromDto(lines: UpsertDiscountLineDto[]): AbsenceAuditLinePayload[] {
    return this.normalizeAbsenceAuditLines(
      lines.map((line, index) => ({
        orden: index + 1,
        payrollId: line.payrollId,
        movimientoId: line.movimientoId,
        cantidad: line.cantidad,
        monto: line.monto,
        formula: line.formula,
        fechaEfecto: line.fechaEfecto,
      })),
    );
  }

  private async countIncreaseLines(idAccion: number): Promise<number> {
    return this.increaseLineRepo.count({ where: { idAccion } });
  }

  private async countVacationDates(idAccion: number): Promise<number> {
    return this.vacationDateRepo.count({ where: { idAccion } });
  }

  private async getAbsenceLinesForAudit(idAccion: number): Promise<AbsenceAuditLinePayload[]> {
    const rows = await this.repo.query(
      `
      SELECT
        l.orden_linea AS orden,
        l.id_calendario_nomina AS payrollId,
        l.id_movimiento_nomina AS movimientoId,
        l.tipo_ausencia_linea AS tipoAusencia,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.remuneracion_linea AS remuneracion,
        l.fecha_efecto_linea AS fechaEfecto,
        l.formula_linea AS formula
      FROM acc_ausencias_lineas l
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_ausencia ASC
      `,
      [idAccion],
    );

    return this.normalizeAbsenceAuditLines(rows);
  }

  private mapAbsenceLinesForAuditFromDto(lines: UpsertAbsenceLineDto[]): AbsenceAuditLinePayload[] {
    return this.normalizeAbsenceAuditLines(
      lines.map((line, index) => ({
        orden: index + 1,
        payrollId: line.payrollId,
        movimientoId: line.movimientoId,
        tipoAusencia: line.tipoAusencia,
        tipoLicencia: null,
        tipoBonificacion: null,
        tipoIncapacidad: null,
        tipoInstitucion: null,
        cantidad: line.cantidad,
        monto: line.monto,
        montoIns: null,
        montoPatrono: null,
        subsidioCcss: null,
        totalIncapacidad: null,
        remuneracion: line.remuneracion,
        fechaEfecto: line.fechaEfecto,
        formula: line.formula ?? null,
      })),
    );
  }

  private async getLicenseLinesForAudit(idAccion: number): Promise<AbsenceAuditLinePayload[]> {
    const rows = await this.repo.query(
      `
      SELECT
        l.orden_linea AS orden,
        l.id_calendario_nomina AS payrollId,
        l.id_movimiento_nomina AS movimientoId,
        l.tipo_licencia_linea AS tipoLicencia,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.remuneracion_linea AS remuneracion,
        l.fecha_efecto_linea AS fechaEfecto,
        l.formula_linea AS formula
      FROM acc_licencias_lineas l
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_licencia ASC
      `,
      [idAccion],
    );

    return this.normalizeAbsenceAuditLines(rows);
  }

  private mapLicenseLinesForAuditFromDto(lines: UpsertLicenseLineDto[]): AbsenceAuditLinePayload[] {
    return this.normalizeAbsenceAuditLines(
      lines.map((line, index) => ({
        orden: index + 1,
        payrollId: line.payrollId,
        movimientoId: line.movimientoId,
        tipoAusencia: null,
        tipoLicencia: line.tipoLicencia,
        tipoBonificacion: null,
        tipoIncapacidad: null,
        tipoInstitucion: null,
        cantidad: line.cantidad,
        monto: line.monto,
        montoIns: null,
        montoPatrono: null,
        subsidioCcss: null,
        totalIncapacidad: null,
        remuneracion: line.remuneracion,
        fechaEfecto: line.fechaEfecto,
        formula: line.formula ?? null,
      })),
    );
  }

  private async getBonusLinesForAudit(idAccion: number): Promise<AbsenceAuditLinePayload[]> {
    const rows = await this.repo.query(
      `
      SELECT
        l.orden_linea AS orden,
        l.id_calendario_nomina AS payrollId,
        l.id_movimiento_nomina AS movimientoId,
        l.tipo_bonificacion_linea AS tipoBonificacion,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.remuneracion_linea AS remuneracion,
        l.fecha_efecto_linea AS fechaEfecto,
        l.formula_linea AS formula
      FROM acc_bonificaciones_lineas l
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_bonificacion ASC
      `,
      [idAccion],
    );

    return this.normalizeAbsenceAuditLines(rows);
  }

  private mapBonusLinesForAuditFromDto(lines: UpsertBonusLineDto[]): AbsenceAuditLinePayload[] {
    return this.normalizeAbsenceAuditLines(
      lines.map((line, index) => ({
        orden: index + 1,
        payrollId: line.payrollId,
        movimientoId: line.movimientoId,
        tipoAusencia: null,
        tipoLicencia: null,
        tipoBonificacion: line.tipoBonificacion,
        tipoIncapacidad: null,
        tipoInstitucion: null,
        cantidad: line.cantidad,
        monto: line.monto,
        montoIns: null,
        montoPatrono: null,
        subsidioCcss: null,
        totalIncapacidad: null,
        remuneracion: line.remuneracion,
        fechaEfecto: line.fechaEfecto,
        formula: line.formula ?? null,
      })),
    );
  }

  private async getOvertimeLinesForAudit(idAccion: number): Promise<AbsenceAuditLinePayload[]> {
    const rows = await this.repo.query(
      `
      SELECT
        l.orden_linea AS orden,
        l.id_calendario_nomina AS payrollId,
        l.id_movimiento_nomina AS movimientoId,
        l.fecha_inicio_hora_extra_linea AS fechaInicioHoraExtra,
        l.fecha_fin_hora_extra_linea AS fechaFinHoraExtra,
        l.tipo_jornada_horas_extras_linea AS tipoJornadaHorasExtras,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.remuneracion_linea AS remuneracion,
        l.fecha_efecto_linea AS fechaEfecto,
        l.formula_linea AS formula
      FROM acc_horas_extras_lineas l
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_hora_extra ASC
      `,
      [idAccion],
    );

    return this.normalizeAbsenceAuditLines(rows);
  }

  private mapOvertimeLinesForAuditFromDto(lines: UpsertOvertimeLineDto[]): AbsenceAuditLinePayload[] {
    return this.normalizeAbsenceAuditLines(
      lines.map((line, index) => ({
        orden: index + 1,
        payrollId: line.payrollId,
        movimientoId: line.movimientoId,
        tipoAusencia: null,
        tipoLicencia: null,
        tipoBonificacion: null,
        tipoIncapacidad: null,
        tipoInstitucion: null,
        fechaInicioHoraExtra: line.fechaInicioHoraExtra,
        fechaFinHoraExtra: line.fechaFinHoraExtra,
        tipoJornadaHorasExtras: line.tipoJornadaHorasExtras,
        cantidad: line.cantidad,
        monto: line.monto,
        montoIns: null,
        montoPatrono: null,
        subsidioCcss: null,
        totalIncapacidad: null,
        remuneracion: line.remuneracion,
        fechaEfecto: line.fechaEfecto,
        formula: line.formula ?? null,
      })),
    );
  }

  private async getDisabilityLinesForAudit(idAccion: number): Promise<AbsenceAuditLinePayload[]> {
    const rows = await this.repo.query(
      `
      SELECT
        l.orden_linea AS orden,
        l.id_calendario_nomina AS payrollId,
        l.id_movimiento_nomina AS movimientoId,
        l.tipo_incapacidad_linea AS tipoIncapacidad,
        l.tipo_institucion_linea AS tipoInstitucion,
        l.cantidad_linea AS cantidad,
        l.monto_linea AS monto,
        l.monto_ins_linea AS montoIns,
        l.monto_patrono_linea AS montoPatrono,
        l.subsidio_ccss_linea AS subsidioCcss,
        l.total_incapacidad_linea AS totalIncapacidad,
        l.remuneracion_linea AS remuneracion,
        l.fecha_efecto_linea AS fechaEfecto,
        l.formula_linea AS formula
      FROM acc_incapacidades_lineas l
      WHERE l.id_accion = ?
      ORDER BY l.orden_linea ASC, l.id_linea_incapacidad ASC
      `,
      [idAccion],
    );

    return this.normalizeAbsenceAuditLines(rows);
  }

  private mapDisabilityLinesForAuditFromDto(
    lines: UpsertDisabilityLineDto[],
  ): AbsenceAuditLinePayload[] {
    return this.normalizeAbsenceAuditLines(
      lines.map((line, index) => ({
        orden: index + 1,
        payrollId: line.payrollId,
        movimientoId: line.movimientoId,
        tipoAusencia: null,
        tipoLicencia: null,
        tipoBonificacion: null,
        tipoIncapacidad: line.tipoIncapacidad,
        tipoInstitucion: line.tipoInstitucion,
        cantidad: line.cantidad,
        monto: line.monto,
        montoIns: line.montoIns ?? 0,
        montoPatrono: line.montoPatrono ?? 0,
        subsidioCcss: line.subsidioCcss ?? 0,
        totalIncapacidad: line.totalIncapacidad ?? line.monto ?? 0,
        remuneracion: line.remuneracion,
        fechaEfecto: line.fechaEfecto,
        formula: line.formula ?? null,
      })),
    );
  }

  private normalizeAbsenceAuditLines(raw: unknown): AbsenceAuditLinePayload[] {
    if (!Array.isArray(raw)) return [];

    return raw.map((row, index) => {
      const item = (row as Record<string, unknown>) ?? {};
      const cantidadRaw = item.cantidad;
      const montoRaw = item.monto;
      const lineaRaw = item.linea ?? item.orden;
      const remuneracionRaw = item.remuneracion;

      return {
        linea: Number(lineaRaw ?? index + 1),
        payrollId: item.payrollId == null ? null : Number(item.payrollId),
        movimientoId: item.movimientoId == null ? null : Number(item.movimientoId),
        tipoAusencia: item.tipoAusencia == null ? null : String(item.tipoAusencia),
        tipoLicencia: item.tipoLicencia == null ? null : String(item.tipoLicencia),
        tipoBonificacion: item.tipoBonificacion == null ? null : String(item.tipoBonificacion),
        tipoIncapacidad: item.tipoIncapacidad == null ? null : String(item.tipoIncapacidad),
        tipoInstitucion: item.tipoInstitucion == null ? null : String(item.tipoInstitucion),
        fechaInicioHoraExtra: this.toYmd(item.fechaInicioHoraExtra as Date | string | null),
        fechaFinHoraExtra: this.toYmd(item.fechaFinHoraExtra as Date | string | null),
        tipoJornadaHorasExtras:
          item.tipoJornadaHorasExtras == null ? null : String(item.tipoJornadaHorasExtras),
        cantidad: cantidadRaw == null ? null : Number(cantidadRaw),
        monto: montoRaw == null ? null : Number(montoRaw),
        montoIns: item.montoIns == null ? null : Number(item.montoIns),
        montoPatrono: item.montoPatrono == null ? null : Number(item.montoPatrono),
        subsidioCcss: item.subsidioCcss == null ? null : Number(item.subsidioCcss),
        totalIncapacidad: item.totalIncapacidad == null ? null : Number(item.totalIncapacidad),
        remuneracion:
          remuneracionRaw == null
            ? null
            : Number(remuneracionRaw) === 1 || String(remuneracionRaw).toLowerCase() === 'true',
        fechaEfecto: this.toYmd(item.fechaEfecto as Date | string | null),
        formula: item.formula == null ? null : String(item.formula).trim() || null,
      };
    });
  }

  private buildAbsenceAuditPayload(
    action: PersonalAction,
    cantidadLineas: number,
    lineasDetalle: AbsenceAuditLinePayload[] = [],
  ): Record<string, unknown> {
    return {
      idEmpresa: action.idEmpresa ?? null,
      idEmpleado: action.idEmpleado ?? null,
      tipoAccion: action.tipoAccion ?? null,
      estado: action.estado ?? null,
      estadoLabel: this.getEstadoNombre(action.estado),
      descripcion: action.descripcion ?? null,
      fechaEfecto: this.toYmd(action.fechaEfecto),
      fechaInicioEfecto: this.toYmd(action.fechaInicioEfecto),
      fechaFinEfecto: this.toYmd(action.fechaFinEfecto),
      monto: action.monto == null ? null : Number(action.monto),
      moneda: action.moneda ?? null,
      lineas: cantidadLineas,
      lineasDetalle,
      invalidatedReason: action.invalidatedReason ?? null,
      motivoRechazo: action.motivoRechazo ?? null,
    };
  }

  private getEstadoNombre(estado: PersonalActionEstado): string {
    const mapping: Record<number, string> = {
      [PersonalActionEstado.DRAFT]: 'Borrador',
      [PersonalActionEstado.PENDING_SUPERVISOR]: 'Pendiente Supervisor',
      [PersonalActionEstado.PENDING_RRHH]: 'Pendiente RRHH',
      [PersonalActionEstado.APPROVED]: 'Aprobada',
      [PersonalActionEstado.CONSUMED]: 'Consumida',
      [PersonalActionEstado.CANCELLED]: 'Cancelada',
      [PersonalActionEstado.INVALIDATED]: 'Invalidada',
      [PersonalActionEstado.EXPIRED]: 'Expirada',
      [PersonalActionEstado.REJECTED]: 'Rechazada',
    };
    return mapping[Number(estado)] ?? `Estado ${estado}`;
  }

  private readonly auditFieldLabels: Record<string, string> = {
    idEmpresa: 'Empresa',
    idEmpleado: 'Empleado',
    tipoAccion: 'Tipo de accion',
    estadoLabel: 'Estado',
    descripcion: 'Observacion',
    fechaEfecto: 'Fecha efecto',
    fechaInicioEfecto: 'Inicio efecto',
    fechaFinEfecto: 'Fin efecto',
    monto: 'Monto',
    moneda: 'Moneda',
    lineas: 'Lineas de transaccion',
    invalidatedReason: 'Motivo invalidacion',
    motivoRechazo: 'Motivo rechazo',
  };

  private buildAuditChanges(
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
  ): Array<{ campo: string; antes: string; despues: string }> {
    if (!before && !after) return [];
    const keys = new Set<string>([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
    const output: Array<{ campo: string; antes: string; despues: string }> = [];

    keys.forEach((key) => {
      if (key === 'lineasDetalle') return;
      const prev = before?.[key];
      const next = after?.[key];
      const prevText = this.stringifyAuditValue(prev);
      const nextText = this.stringifyAuditValue(next);
      if (prevText === nextText) return;
      output.push({
        campo: this.auditFieldLabels[key] ?? key,
        antes: prevText,
        despues: nextText,
      });
    });

    output.push(...this.buildAbsenceLineAuditChanges(before?.lineasDetalle, after?.lineasDetalle));

    return output;
  }

  private buildAbsenceLineAuditChanges(
    beforeValue: unknown,
    afterValue: unknown,
  ): Array<{ campo: string; antes: string; despues: string }> {
    const beforeLines = this.normalizeAbsenceAuditLines(beforeValue);
    const afterLines = this.normalizeAbsenceAuditLines(afterValue);
    const maxLen = Math.max(beforeLines.length, afterLines.length);
    if (maxLen === 0) return [];

    const fieldDefs: Array<{ key: keyof AbsenceAuditLinePayload; label: string }> = [
      { key: 'payrollId', label: 'Periodo pago' },
      { key: 'movimientoId', label: 'Movimiento' },
      { key: 'tipoAusencia', label: 'Tipo ausencia' },
      { key: 'tipoLicencia', label: 'Tipo licencia' },
      { key: 'tipoBonificacion', label: 'Tipo bonificacion' },
      { key: 'tipoIncapacidad', label: 'Tipo incapacidad' },
      { key: 'tipoInstitucion', label: 'Institucion' },
      { key: 'fechaInicioHoraExtra', label: 'Fecha inicio hora extra' },
      { key: 'fechaFinHoraExtra', label: 'Fecha fin hora extra' },
      { key: 'tipoJornadaHorasExtras', label: 'Tipo jornada horas extra' },
      { key: 'cantidad', label: 'Cantidad' },
      { key: 'monto', label: 'Monto' },
      { key: 'montoIns', label: 'Monto INS' },
      { key: 'montoPatrono', label: 'Monto patrono' },
      { key: 'subsidioCcss', label: 'Subsidio CCSS' },
      { key: 'totalIncapacidad', label: 'Total incapacidad' },
      { key: 'remuneracion', label: 'Remuneracion' },
      { key: 'fechaEfecto', label: 'Fecha efecto' },
      { key: 'formula', label: 'Formula' },
    ];

    const output: Array<{ campo: string; antes: string; despues: string }> = [];
    for (let index = 0; index < maxLen; index += 1) {
      const prev = beforeLines[index];
      const next = afterLines[index];
      const lineNumber = next?.linea ?? prev?.linea ?? index + 1;

      for (const field of fieldDefs) {
        const prevText = this.stringifyAuditValue(prev?.[field.key]);
        const nextText = this.stringifyAuditValue(next?.[field.key]);
        if (prevText === nextText) continue;
        output.push({
          campo: `Linea ${lineNumber} - ${field.label}`,
          antes: prevText,
          despues: nextText,
        });
      }
    }

    return output;
  }

  private stringifyAuditValue(value: unknown): string {
    if (value == null) return '--';
    if (typeof value === 'string') return value.trim() || '--';
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private round2(value: number): number {
    return Number(value.toFixed(2));
  }

  private buildIncreaseFormula(
    salarioActual: number,
    monto: number,
    porcentaje: number,
    metodo: MetodoCalculoAumentoLinea,
  ): string {
    const salarioText = this.round2(salarioActual).toFixed(2);
    const montoText = this.round2(monto).toFixed(2);
    const nuevoText = this.round2(salarioActual + monto).toFixed(2);
    const porcentajeText = this.round2(porcentaje).toFixed(2);

    if (metodo === MetodoCalculoAumentoLinea.PORCENTAJE) {
      return `Nuevo salario = ${salarioText} + (${salarioText} x ${porcentajeText}%) = ${nuevoText}`;
    }
    return `Nuevo salario = ${salarioText} + ${montoText} = ${nuevoText}`;
  }

  private async getIncreaseEmployee(idEmpresa: number, idEmpleado: number) {
    const rows = await this.repo.query(
      `
      SELECT
        id_empleado AS id,
        id_empresa AS idEmpresa,
        id_periodos_pago AS idPeriodoPago,
        moneda_salario_empleado AS monedaSalario,
        salario_base_empleado AS salarioBaseEncrypted
      FROM sys_empleados
      WHERE id_empleado = ?
        AND id_empresa = ?
        AND estado_empleado = 1
      LIMIT 1
      `,
      [idEmpleado, idEmpresa],
    );
    const row = rows?.[0];
    if (!row) return null;

    const decrypted = this.sensitiveDataService.decrypt(row.salarioBaseEncrypted ?? null);
    const parsed = decrypted == null ? NaN : Number(decrypted);

    return {
      id: Number(row.id ?? idEmpleado),
      idEmpresa: Number(row.idEmpresa ?? idEmpresa),
      idPeriodoPago: row.idPeriodoPago == null ? null : Number(row.idPeriodoPago),
      monedaSalario: row.monedaSalario ?? 'CRC',
      salarioBase: Number.isFinite(parsed) ? parsed : null,
    };
  }

  private toYmd(value: Date | string | null): string | null {
    if (value == null) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      return value.toISOString().slice(0, 10);
    }
    const text = String(value).trim();
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }

  private async getAbsenceEmployee(idEmpresa: number, idEmpleado: number) {
    const rows = await this.repo.query(
      `
      SELECT id_empleado AS id, id_empresa AS idEmpresa, id_periodos_pago AS idPeriodoPago, moneda_salario_empleado AS monedaSalario
      FROM sys_empleados
      WHERE id_empleado = ? AND id_empresa = ? AND estado_empleado = 1
      LIMIT 1
      `,
      [idEmpleado, idEmpresa],
    );
    return rows?.[0] ?? null;
  }

  private async validateAbsencePayload(dto: UpsertAbsenceDto, userId: number) {
    if (!dto.lines?.length) {
      throw new BadRequestException('Debe incluir al menos una linea de transaccion');
    }

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    if (!employee) {
      throw new BadRequestException(
        'Empleado no encontrado o inactivo para la empresa seleccionada',
      );
    }

    const eligiblePayrolls = await this.findEligibleAbsencePayrolls(
      userId,
      dto.idEmpresa,
      dto.idEmpleado,
    );
    const payrollMap = new Map<number, (typeof eligiblePayrolls)[number]>();
    eligiblePayrolls.forEach((payroll) => payrollMap.set(payroll.id, payroll));

    for (const [index, line] of dto.lines.entries()) {
      if (line.cantidad < 1) {
        throw new BadRequestException(`Linea ${index + 1}: cantidad debe ser mayor a 0`);
      }
      if (line.monto < 0) {
        throw new BadRequestException(`Linea ${index + 1}: monto no puede ser negativo`);
      }
      const payroll = payrollMap.get(line.payrollId);
      if (!payroll) {
        throw new BadRequestException(
          `Linea ${index + 1}: planilla no elegible para empresa/empleado/periodo/moneda o fuera de ventana`,
        );
      }

      const movementRows = await this.repo.query(
        `
        SELECT id_movimiento_nomina AS id
        FROM nom_movimientos_nomina
        WHERE id_movimiento_nomina = ?
          AND id_empresa_movimiento_nomina = ?
          AND id_tipo_accion_personal_movimiento_nomina = 20
          AND es_inactivo_movimiento_nomina = 1
        LIMIT 1
        `,
        [line.movimientoId, dto.idEmpresa],
      );
      if (!movementRows?.[0]) {
        throw new BadRequestException(
          `Linea ${index + 1}: movimiento invalido o inactivo para Ausencias`,
        );
      }
    }
  }

  private async validateLicensePayload(dto: UpsertLicenseDto, userId: number) {
    if (!dto.lines?.length) {
      throw new BadRequestException('Debe incluir al menos una linea de transaccion');
    }

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    if (!employee) {
      throw new BadRequestException(
        'Empleado no encontrado o inactivo para la empresa seleccionada',
      );
    }

    const eligiblePayrolls = await this.findEligibleAbsencePayrolls(
      userId,
      dto.idEmpresa,
      dto.idEmpleado,
    );
    const payrollMap = new Map<number, (typeof eligiblePayrolls)[number]>();
    eligiblePayrolls.forEach((payroll) => payrollMap.set(payroll.id, payroll));

    for (const [index, line] of dto.lines.entries()) {
      if (Number(line.cantidad) <= 0) {
        throw new BadRequestException(`Linea ${index + 1}: cantidad debe ser mayor a 0`);
      }
      if (line.monto < 0) {
        throw new BadRequestException(`Linea ${index + 1}: monto no puede ser negativo`);
      }
      const payroll = payrollMap.get(line.payrollId);
      if (!payroll) {
        throw new BadRequestException(
          `Linea ${index + 1}: planilla no elegible para empresa/empleado/periodo/moneda o fuera de ventana`,
        );
      }

      const movementRows = await this.repo.query(
        `
        SELECT id_movimiento_nomina AS id
        FROM nom_movimientos_nomina
        WHERE id_movimiento_nomina = ?
          AND id_empresa_movimiento_nomina = ?
          AND id_tipo_accion_personal_movimiento_nomina IN (17, 18, 19, 23)
          AND es_inactivo_movimiento_nomina = 1
        LIMIT 1
        `,
        [line.movimientoId, dto.idEmpresa],
      );
      if (!movementRows?.[0]) {
        throw new BadRequestException(
          `Linea ${index + 1}: movimiento invalido o inactivo para Licencias y Permisos`,
        );
      }
    }
  }

  private async validateDisabilityPayload(dto: UpsertDisabilityDto, userId: number) {
    if (!dto.lines?.length) {
      throw new BadRequestException('Debe incluir al menos una linea de transaccion');
    }

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    if (!employee) {
      throw new BadRequestException(
        'Empleado no encontrado o inactivo para la empresa seleccionada',
      );
    }

    const eligiblePayrolls = await this.findEligibleAbsencePayrolls(
      userId,
      dto.idEmpresa,
      dto.idEmpleado,
    );
    const payrollMap = new Map<number, (typeof eligiblePayrolls)[number]>();
    eligiblePayrolls.forEach((payroll) => payrollMap.set(payroll.id, payroll));

    const ccssTypes = new Set<TipoIncapacidadLinea>([
      TipoIncapacidadLinea.ENFERMEDAD_COMUN_CCSS,
      TipoIncapacidadLinea.ENFERMEDAD_MENTAL_CCSS,
      TipoIncapacidadLinea.COVID19_CCSS,
      TipoIncapacidadLinea.ABORTO_ESPONTANEO_CCSS,
      TipoIncapacidadLinea.REPOSO_POSTOPERATORIO_CCSS,
      TipoIncapacidadLinea.REPOSO_PRENATAL_ADICIONAL_CCSS,
      TipoIncapacidadLinea.REPOSO_POSTNATAL_EXTENDIDO_CCSS,
      TipoIncapacidadLinea.CUIDO_FAMILIAR_GRAVE_CCSS,
      TipoIncapacidadLinea.TRATAMIENTO_ONCOLOGICO_CCSS,
      TipoIncapacidadLinea.TRATAMIENTO_RENAL_CRONICO_CCSS,
      TipoIncapacidadLinea.TRATAMIENTO_VIH_SIDA_CCSS,
    ]);

    const insTypes = new Set<TipoIncapacidadLinea>([
      TipoIncapacidadLinea.ACCIDENTE_TRABAJO_INS,
      TipoIncapacidadLinea.ENFERMEDAD_PROFESIONAL_INS,
      TipoIncapacidadLinea.INCAPACIDAD_PROLONGADA_INS,
    ]);

    for (const [index, line] of dto.lines.entries()) {
      if (Number(line.cantidad) <= 0) {
        throw new BadRequestException(`Linea ${index + 1}: cantidad debe ser mayor a 0`);
      }
      if (line.monto < 0) {
        throw new BadRequestException(`Linea ${index + 1}: monto no puede ser negativo`);
      }
      const payroll = payrollMap.get(line.payrollId);
      if (!payroll) {
        throw new BadRequestException(
          `Linea ${index + 1}: planilla no elegible para empresa/empleado/periodo/moneda o fuera de ventana`,
        );
      }

      const movementRows = await this.repo.query(
        `
        SELECT id_movimiento_nomina AS id
        FROM nom_movimientos_nomina
        WHERE id_movimiento_nomina = ?
          AND id_empresa_movimiento_nomina = ?
          AND id_tipo_accion_personal_movimiento_nomina = 22
          AND es_inactivo_movimiento_nomina = 1
        LIMIT 1
        `,
        [line.movimientoId, dto.idEmpresa],
      );
      if (!movementRows?.[0]) {
        throw new BadRequestException(
          `Linea ${index + 1}: movimiento invalido o inactivo para Incapacidades`,
        );
      }

      if (
        line.tipoInstitucion === TipoInstitucionIncapacidadLinea.CCSS &&
        !ccssTypes.has(line.tipoIncapacidad)
      ) {
        throw new BadRequestException(
          `Linea ${index + 1}: tipo de incapacidad no corresponde a institucion CCSS`,
        );
      }
      if (
        line.tipoInstitucion === TipoInstitucionIncapacidadLinea.INS &&
        !insTypes.has(line.tipoIncapacidad)
      ) {
        throw new BadRequestException(
          `Linea ${index + 1}: tipo de incapacidad no corresponde a institucion INS`,
        );
      }
    }
  }

  private async validateBonusPayload(dto: UpsertBonusDto, userId: number) {
    if (!dto.lines?.length) {
      throw new BadRequestException('Debe incluir al menos una linea de transaccion');
    }

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    if (!employee) {
      throw new BadRequestException(
        'Empleado no encontrado o inactivo para la empresa seleccionada',
      );
    }

    const eligiblePayrolls = await this.findEligibleAbsencePayrolls(
      userId,
      dto.idEmpresa,
      dto.idEmpleado,
    );
    const payrollMap = new Map<number, (typeof eligiblePayrolls)[number]>();
    eligiblePayrolls.forEach((payroll) => payrollMap.set(payroll.id, payroll));

    for (const [index, line] of dto.lines.entries()) {
      if (line.cantidad < 1) {
        throw new BadRequestException(`Linea ${index + 1}: cantidad debe ser mayor a 0`);
      }
      if (line.monto < 0) {
        throw new BadRequestException(`Linea ${index + 1}: monto no puede ser negativo`);
      }
      const payroll = payrollMap.get(line.payrollId);
      if (!payroll) {
        throw new BadRequestException(
          `Linea ${index + 1}: planilla no elegible para empresa/empleado/periodo/moneda o fuera de ventana`,
        );
      }

      const movementRows = await this.repo.query(
        `
        SELECT id_movimiento_nomina AS id
        FROM nom_movimientos_nomina
        WHERE id_movimiento_nomina = ?
          AND id_empresa_movimiento_nomina = ?
          AND id_tipo_accion_personal_movimiento_nomina = 9
          AND es_inactivo_movimiento_nomina = 1
        LIMIT 1
        `,
        [line.movimientoId, dto.idEmpresa],
      );
      if (!movementRows?.length) {
        throw new BadRequestException(
          `Linea ${index + 1}: movimiento no valido para bonificaciones en esta empresa`,
        );
      }
    }
  }

  private async validateRetentionPayload(dto: UpsertRetentionDto, userId: number) {
    if (!dto.lines?.length) {
      throw new BadRequestException('Debe incluir al menos una linea de transaccion');
    }

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    if (!employee) {
      throw new BadRequestException(
        'Empleado no encontrado o inactivo para la empresa seleccionada',
      );
    }

    const eligiblePayrolls = await this.findEligibleAbsencePayrolls(
      userId,
      dto.idEmpresa,
      dto.idEmpleado,
    );
    const payrollMap = new Map<number, (typeof eligiblePayrolls)[number]>();
    eligiblePayrolls.forEach((payroll) => payrollMap.set(payroll.id, payroll));

    for (const [index, line] of dto.lines.entries()) {
      if (line.cantidad < 1) {
        throw new BadRequestException(`Linea ${index + 1}: cantidad debe ser mayor a 0`);
      }
      if (line.monto < 0) {
        throw new BadRequestException(`Linea ${index + 1}: monto no puede ser negativo`);
      }
      const payroll = payrollMap.get(line.payrollId);
      if (!payroll) {
        throw new BadRequestException(
          `Linea ${index + 1}: planilla no elegible para empresa/empleado/periodo/moneda o fuera de ventana`,
        );
      }

      const movementRows = await this.repo.query(
        `
        SELECT id_movimiento_nomina AS id
        FROM nom_movimientos_nomina
        WHERE id_movimiento_nomina = ?
          AND id_empresa_movimiento_nomina = ?
          AND id_tipo_accion_personal_movimiento_nomina = 5
          AND es_inactivo_movimiento_nomina = 1
        LIMIT 1
        `,
        [line.movimientoId, dto.idEmpresa],
      );
      if (!movementRows?.length) {
        throw new BadRequestException(
          `Linea ${index + 1}: movimiento no valido para retenciones en esta empresa`,
        );
      }
    }
  }

  private async validateDiscountPayload(dto: UpsertDiscountDto, userId: number) {
    if (!dto.lines?.length) {
      throw new BadRequestException('Debe incluir al menos una linea de transaccion');
    }

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    if (!employee) {
      throw new BadRequestException(
        'Empleado no encontrado o inactivo para la empresa seleccionada',
      );
    }

    const eligiblePayrolls = await this.findEligibleAbsencePayrolls(
      userId,
      dto.idEmpresa,
      dto.idEmpleado,
    );
    const payrollMap = new Map<number, (typeof eligiblePayrolls)[number]>();
    eligiblePayrolls.forEach((payroll) => payrollMap.set(payroll.id, payroll));

    for (const [index, line] of dto.lines.entries()) {
      if (line.cantidad < 1) {
        throw new BadRequestException(`Linea ${index + 1}: cantidad debe ser mayor a 0`);
      }
      if (line.monto < 0) {
        throw new BadRequestException(`Linea ${index + 1}: monto no puede ser negativo`);
      }
      const payroll = payrollMap.get(line.payrollId);
      if (!payroll) {
        throw new BadRequestException(
          `Linea ${index + 1}: planilla no elegible para empresa/empleado/periodo/moneda o fuera de ventana`,
        );
      }

      const movementRows = await this.repo.query(
        `
        SELECT id_movimiento_nomina AS id
        FROM nom_movimientos_nomina
        WHERE id_movimiento_nomina = ?
          AND id_empresa_movimiento_nomina = ?
          AND id_tipo_accion_personal_movimiento_nomina = 6
          AND es_inactivo_movimiento_nomina = 1
        LIMIT 1
        `,
        [line.movimientoId, dto.idEmpresa],
      );
      if (!movementRows?.length) {
        throw new BadRequestException(
          `Linea ${index + 1}: movimiento no valido para descuentos en esta empresa`,
        );
      }
    }
  }

  private async validateIncreasePayload(dto: UpsertIncreaseDto, userId: number) {
    if (!dto.line) {
      throw new BadRequestException('Debe incluir la informacion del aumento');
    }

    const employee = await this.getIncreaseEmployee(dto.idEmpresa, dto.idEmpleado);
    if (!employee) {
      throw new BadRequestException(
        'Empleado no encontrado o inactivo para la empresa seleccionada',
      );
    }
    if (!employee.idPeriodoPago || !employee.monedaSalario) {
      throw new BadRequestException('Empleado sin configuracion de periodo o moneda');
    }

    const salarioActual = Number(employee.salarioBase ?? 0);
    if (!Number.isFinite(salarioActual) || salarioActual <= 0) {
      throw new BadRequestException('Salario base invalido para calcular el aumento');
    }

    const eligiblePayrolls = await this.findEligibleAbsencePayrolls(
      userId,
      dto.idEmpresa,
      dto.idEmpleado,
    );
    const payroll = eligiblePayrolls.find((item) => item.id === Number(dto.line.payrollId));
    if (!payroll) {
      throw new BadRequestException(
        'Planilla no elegible para empresa/empleado/periodo/moneda o fuera de ventana',
      );
    }

    const method = dto.line.metodoCalculo;
    if (
      method !== MetodoCalculoAumentoLinea.MONTO &&
      method !== MetodoCalculoAumentoLinea.PORCENTAJE
    ) {
      throw new BadRequestException('Metodo de calculo invalido para aumento');
    }

    const montoRaw = Number(dto.line.monto ?? 0);
    const porcentajeRaw = Number(dto.line.porcentaje ?? 0);

    if (method === MetodoCalculoAumentoLinea.MONTO) {
      if (!Number.isFinite(montoRaw) || montoRaw <= 0) {
        throw new BadRequestException('El monto del aumento debe ser mayor a 0');
      }
    }

    if (method === MetodoCalculoAumentoLinea.PORCENTAJE) {
      if (!Number.isFinite(porcentajeRaw) || porcentajeRaw <= 0) {
        throw new BadRequestException('El porcentaje del aumento debe ser mayor a 0');
      }
    }

    const movementRows = await this.repo.query(
      `
      SELECT id_movimiento_nomina AS id
      FROM nom_movimientos_nomina
      WHERE id_movimiento_nomina = ?
        AND id_empresa_movimiento_nomina = ?
        AND id_tipo_accion_personal_movimiento_nomina = 8
        AND es_inactivo_movimiento_nomina = 1
      LIMIT 1
      `,
      [dto.line.movimientoId, dto.idEmpresa],
    );
    if (!movementRows?.length) {
      throw new BadRequestException('Movimiento invalido o inactivo para aumentos en esta empresa');
    }

    const monto =
      method === MetodoCalculoAumentoLinea.PORCENTAJE
        ? this.round2(salarioActual * (porcentajeRaw / 100))
        : this.round2(montoRaw);
    const porcentaje =
      method === MetodoCalculoAumentoLinea.PORCENTAJE
        ? this.round2(porcentajeRaw)
        : this.round2((monto / salarioActual) * 100);
    const nuevoSalario = this.round2(salarioActual + monto);

    return {
      employee,
      payroll,
      line: {
        payrollId: Number(dto.line.payrollId),
        movimientoId: Number(dto.line.movimientoId),
        metodoCalculo: method,
        monto,
        porcentaje,
        salarioActual,
        nuevoSalario,
      },
    };
  }

  private async validateVacationPayload(
    dto: UpsertVacationDto,
    userId: number,
    excludeActionId?: number,
    allowSplit = false,
  ): Promise<{ dates: string[]; payrollMap?: Map<number, string[]> }> {
    if (!dto.fechas?.length) {
      throw new BadRequestException('Debe incluir al menos una fecha de vacaciones');
    }

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    if (!employee) {
      throw new BadRequestException(
        'Empleado no encontrado o inactivo para la empresa seleccionada',
      );
    }

    const eligiblePayrolls = await this.findEligibleAbsencePayrolls(
      userId,
      dto.idEmpresa,
      dto.idEmpleado,
    );
    const referencePayroll = dto.payrollId
      ? eligiblePayrolls.find((item) => item.id === dto.payrollId)
      : null;
    if (dto.payrollId && !referencePayroll) {
      throw new BadRequestException(
        'Planilla no elegible para empresa/empleado/periodo/moneda o fuera de ventana',
      );
    }
    const buildPayrollTypeKey = (item: {
      idTipoPlanilla?: number | null;
      tipoPlanilla?: string | null;
    }) =>
      item.idTipoPlanilla != null
        ? `id:${item.idTipoPlanilla}`
        : `tipo:${String(item.tipoPlanilla ?? '').toLowerCase()}`;
    let referenceTypeKey = referencePayroll ? buildPayrollTypeKey(referencePayroll) : null;
    let lockedPayrollId = referencePayroll ? referencePayroll.id : null;
    const pickPreferredPayroll = (matches: typeof eligiblePayrolls) => {
      if (matches.length === 0) return null;
      if (matches.length === 1) return matches[0];
      return [...matches].sort((a, b) => {
        const estadoA = Number(a.estado ?? 99);
        const estadoB = Number(b.estado ?? 99);
        if (estadoA !== estadoB) return estadoA - estadoB;
        const startA = a.fechaInicioPeriodo ?? '';
        const startB = b.fechaInicioPeriodo ?? '';
        if (startA !== startB) return startA.localeCompare(startB);
        return Number(a.id) - Number(b.id);
      })[0];
    };

    const movementRows = await this.repo.query(
      `
      SELECT id_movimiento_nomina AS id
      FROM nom_movimientos_nomina
      WHERE id_movimiento_nomina = ?
        AND id_empresa_movimiento_nomina = ?
        AND id_tipo_accion_personal_movimiento_nomina = 13
        AND es_inactivo_movimiento_nomina = 1
      LIMIT 1
      `,
      [dto.movimientoId, dto.idEmpresa],
    );
    if (!movementRows?.length) {
      throw new BadRequestException('Movimiento no valido para vacaciones en esta empresa');
    }

    const dates = this.normalizeVacationDates(dto.fechas);
    const uniqueDates = new Set(dates);
    if (uniqueDates.size !== dates.length) {
      throw new BadRequestException('No se permiten fechas duplicadas');
    }

    const holidayRanges = await this.getHolidayRangesBetween(dates[0], dates[dates.length - 1]);
    const bookedDates = await this.getBookedVacationDates(
      userId,
      dto.idEmpresa,
      dto.idEmpleado,
      excludeActionId,
    );
    const bookedSet = new Set(bookedDates);

    const payrollMap = new Map<number, string[]>();

    dates.forEach((date, index) => {
      const asDate = this.parseYmdToUtc(date);
      if (Number.isNaN(asDate.getTime())) {
        throw new BadRequestException(`Fecha ${index + 1}: formato invalido`);
      }
      const day = asDate.getUTCDay();
      if (day === 0 || day === 6) {
        throw new BadRequestException(`Fecha ${index + 1}: no se permiten fines de semana`);
      }
      if (this.isHolidayDate(date, holidayRanges)) {
        throw new BadRequestException(`Fecha ${index + 1}: coincide con feriado de planilla`);
      }
      if (bookedSet.has(date)) {
        throw new BadRequestException(
          `Fecha ${index + 1}: ya se encuentra registrada en otra accion de vacaciones`,
        );
      }

      let matches = eligiblePayrolls.filter((item) => {
        const start = this.toYmdFlexible(item.fechaInicioPeriodo);
        const end = this.toYmdFlexible(item.fechaFinPeriodo);
        if (!start || !end) return false;
        const startDate = this.parseYmdToUtc(start);
        const endDate = this.parseYmdToUtc(end);
        return asDate >= startDate && asDate <= endDate;
      });
      if (referenceTypeKey) {
        matches = matches.filter((item) => buildPayrollTypeKey(item) === referenceTypeKey);
      }

      if (matches.length === 0) {
        throw new BadRequestException(
          `Fecha ${index + 1}: fuera de un periodo de planilla elegible`,
        );
      }
      const targetPayroll = pickPreferredPayroll(matches);
      if (!targetPayroll) {
        throw new BadRequestException(
          `Fecha ${index + 1}: fuera de un periodo de planilla elegible`,
        );
      }
      const targetTypeKey = buildPayrollTypeKey(targetPayroll);
      if (!referenceTypeKey) {
        referenceTypeKey = targetTypeKey;
      } else if (targetTypeKey !== referenceTypeKey) {
        throw new BadRequestException(
          `Fecha ${index + 1}: pertenece a un tipo de planilla diferente`,
        );
      }
      if (!allowSplit) {
        if (!lockedPayrollId) {
          lockedPayrollId = targetPayroll.id;
        } else if (lockedPayrollId !== targetPayroll.id) {
          throw new BadRequestException(
            'Las fechas deben pertenecer al mismo periodo de planilla. Cree acciones separadas por periodo.',
          );
        }
      }
      const existing = payrollMap?.get(targetPayroll.id) ?? [];
      payrollMap?.set(targetPayroll.id, [...existing, date]);
    });

    const saldoReal = await this.getVacationBalanceForEmployee(dto.idEmpresa, dto.idEmpleado);
    const reservado = await this.getVacationReservedDays(
      dto.idEmpresa,
      dto.idEmpleado,
      excludeActionId,
    );
    const disponible = saldoReal - reservado;
    if (dates.length > disponible) {
      throw new BadRequestException(
        `La cantidad solicitada (${dates.length}) supera el saldo disponible (${disponible})`,
      );
    }

    return { dates, payrollMap };
  }

  private async validateOvertimePayload(dto: UpsertOvertimeDto, userId: number) {
    if (!dto.lines?.length) {
      throw new BadRequestException('Debe incluir al menos una linea de transaccion');
    }

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    if (!employee) {
      throw new BadRequestException(
        'Empleado no encontrado o inactivo para la empresa seleccionada',
      );
    }

    const eligiblePayrolls = await this.findEligibleAbsencePayrolls(
      userId,
      dto.idEmpresa,
      dto.idEmpleado,
    );
    const payrollMap = new Map<number, (typeof eligiblePayrolls)[number]>();
    eligiblePayrolls.forEach((payroll) => payrollMap.set(payroll.id, payroll));

    for (const [index, line] of dto.lines.entries()) {
      if (line.cantidad < 1) {
        throw new BadRequestException(`Linea ${index + 1}: cantidad debe ser mayor a 0`);
      }
      if (line.monto < 0) {
        throw new BadRequestException(`Linea ${index + 1}: monto no puede ser negativo`);
      }
      const inicio = this.parseDateOnlyLocal(line.fechaInicioHoraExtra);
      const fin = this.parseDateOnlyLocal(line.fechaFinHoraExtra);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (!inicio || !fin || Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
        throw new BadRequestException(
          `Linea ${index + 1}: rango de fechas de horas extra invalido`,
        );
      }
      if (inicio > hoy || fin > hoy) {
        throw new BadRequestException(
          `Linea ${index + 1}: no se permiten horas extra con fecha futura`,
        );
      }
      if (inicio > fin) {
        throw new BadRequestException(
          `Linea ${index + 1}: fecha inicio no puede ser mayor a fecha fin`,
        );
      }

      const payroll = payrollMap.get(line.payrollId);
      if (!payroll) {
        throw new BadRequestException(
          `Linea ${index + 1}: planilla no elegible para empresa/empleado/periodo/moneda o fuera de ventana`,
        );
      }

      const movementRows = await this.repo.query(
        `
        SELECT id_movimiento_nomina AS id
        FROM nom_movimientos_nomina
        WHERE id_movimiento_nomina = ?
          AND id_empresa_movimiento_nomina = ?
          AND id_tipo_accion_personal_movimiento_nomina = 11
          AND es_inactivo_movimiento_nomina = 1
        LIMIT 1
        `,
        [line.movimientoId, dto.idEmpresa],
      );
      if (!movementRows?.length) {
        throw new BadRequestException(
          `Linea ${index + 1}: movimiento no valido para horas extra en esta empresa`,
        );
      }
    }
  }

  private groupLinesByPayroll<T extends { payrollId: number }>(
    lines: T[],
  ): Array<{ payrollId: number; lines: T[] }> {
    const groups = new Map<number, T[]>();
    for (const line of lines) {
      const payrollId = Number(line.payrollId);
      const current = groups.get(payrollId) ?? [];
      current.push(line);
      groups.set(payrollId, current);
    }
    return Array.from(groups.entries()).map(([payrollId, grouped]) => ({
      payrollId,
      lines: grouped,
    }));
  }

  private async assertEmployeeNotVerifiedForPayrolls(
    idEmpleado: number,
    payrollIds: number[],
    modulo: string,
  ): Promise<void> {
    const uniquePayrolls = Array.from(
      new Set(payrollIds.map((payrollId) => Number(payrollId)).filter((id) => id > 0)),
    );
    if (uniquePayrolls.length === 0) return;

    const verifications = await this.payrollVerificationRepo.find({
      where: {
        idEmpleado,
        idNomina: In(uniquePayrolls),
        verificado: 1,
      },
      take: 1,
    });

    if (verifications.length > 0) {
      throw new BadRequestException(
        `No se pueden agregar acciones de ${modulo} porque el empleado ya fue verificado en la planilla seleccionada.`,
      );
    }
  }

  private assertSinglePayrollOnUpdate<T extends { payrollId: number }>(
    lines: T[],
    modulo: string,
  ): void {
    const uniquePayrolls = new Set(lines.map((line) => Number(line.payrollId)));
    if (uniquePayrolls.size > 1) {
      throw new BadRequestException(
        `La edicion de ${modulo} solo permite lineas del mismo periodo. Cree acciones separadas por periodo.`,
      );
    }
  }

  private async buildActionSummaryFromLines(
    tableName:
      | 'acc_ausencias_lineas'
      | 'acc_licencias_lineas'
      | 'acc_incapacidades_lineas'
      | 'acc_bonificaciones_lineas'
      | 'acc_horas_extras_lineas'
      | 'acc_retenciones_lineas'
      | 'acc_descuentos_lineas'
      | 'acc_aumentos_lineas',
    actionIds: number[],
  ): Promise<
    Map<
      number,
      { periodos: string | null; movimientos: string | null; rem: 'SI' | 'NO' | 'MIXTA' | null }
    >
  > {
    const map = new Map<
      number,
      { periodos: string | null; movimientos: string | null; rem: 'SI' | 'NO' | 'MIXTA' | null }
    >();
    if (actionIds.length === 0) return map;

    const rows = await this.repo.query(
      `
      SELECT
        l.id_accion AS idAccion,
        GROUP_CONCAT(
          DISTINCT COALESCE(c.nombre_planilla_calendario_nomina, CONCAT('Planilla #', l.id_calendario_nomina))
          ORDER BY c.fecha_inicio_periodo ASC
          SEPARATOR ', '
        ) AS periodos,
        GROUP_CONCAT(
          DISTINCT COALESCE(m.nombre_movimiento_nomina, CONCAT('Movimiento #', l.id_movimiento_nomina))
          ORDER BY m.nombre_movimiento_nomina ASC
          SEPARATOR ', '
        ) AS movimientos,
        MIN(l.remuneracion_linea) AS minRem,
        MAX(l.remuneracion_linea) AS maxRem
      FROM ${tableName} l
      LEFT JOIN nom_calendarios_nomina c
        ON c.id_calendario_nomina = l.id_calendario_nomina
      LEFT JOIN nom_movimientos_nomina m
        ON m.id_movimiento_nomina = l.id_movimiento_nomina
      WHERE l.id_accion IN (?)
      GROUP BY l.id_accion
      `,
      [actionIds],
    );

    for (const row of rows ?? []) {
      const minRem = Number((row as Record<string, unknown>).minRem ?? 0);
      const maxRem = Number((row as Record<string, unknown>).maxRem ?? 0);
      let rem: 'SI' | 'NO' | 'MIXTA' | null = null;
      if (minRem === 1 && maxRem === 1) rem = 'SI';
      else if (minRem === 0 && maxRem === 0) rem = 'NO';
      else rem = 'MIXTA';

      map.set(Number((row as Record<string, unknown>).idAccion), {
        periodos: (row as Record<string, unknown>).periodos
          ? String((row as Record<string, unknown>).periodos)
          : null,
        movimientos: (row as Record<string, unknown>).movimientos
          ? String((row as Record<string, unknown>).movimientos)
          : null,
        rem,
      });
    }

    return map;
  }

  private async buildActionSummaryFromVacations(
    actionIds: number[],
  ): Promise<
    Map<
      number,
      { periodos: string | null; movimientos: string | null; rem: 'SI' | 'NO' | 'MIXTA' | null }
    >
  > {
    const map = new Map<
      number,
      { periodos: string | null; movimientos: string | null; rem: 'SI' | 'NO' | 'MIXTA' | null }
    >();
    if (actionIds.length === 0) return map;

    const rows = await this.repo.query(
      `
      SELECT
        l.id_accion AS idAccion,
        GROUP_CONCAT(
          DISTINCT COALESCE(c.nombre_planilla_calendario_nomina, CONCAT('Planilla #', l.id_calendario_nomina))
          ORDER BY c.fecha_inicio_periodo ASC
          SEPARATOR ', '
        ) AS periodos,
        GROUP_CONCAT(
          DISTINCT COALESCE(m.nombre_movimiento_nomina, CONCAT('Movimiento #', l.id_movimiento_nomina))
          ORDER BY m.nombre_movimiento_nomina ASC
          SEPARATOR ', '
        ) AS movimientos
      FROM acc_vacaciones_fechas l
      LEFT JOIN nom_calendarios_nomina c
        ON c.id_calendario_nomina = l.id_calendario_nomina
      LEFT JOIN nom_movimientos_nomina m
        ON m.id_movimiento_nomina = l.id_movimiento_nomina
      WHERE l.id_accion IN (?)
      GROUP BY l.id_accion
      `,
      [actionIds],
    );

    for (const row of rows ?? []) {
      map.set(Number((row as Record<string, unknown>).idAccion), {
        periodos: (row as Record<string, unknown>).periodos
          ? String((row as Record<string, unknown>).periodos)
          : null,
        movimientos: (row as Record<string, unknown>).movimientos
          ? String((row as Record<string, unknown>).movimientos)
          : null,
        rem: null,
      });
    }

    return map;
  }

  /**
   * Normaliza fechas a YYYY-MM-DD usando hora local para evitar desfases por zona horaria.
   */
  private toYmdFlexible(value: unknown): string | null {
    if (value == null) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      return this.formatDateOnly(value);
    }
    const text = String(value);
    if (!text.trim()) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(`${text}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return this.formatDateOnly(parsed);
  }

  private toYmdDateTime(value: Date): string {
    if (Number.isNaN(value.getTime())) return '';
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }

  private parseDateOnlyLocal(value: unknown): Date | null {
    const ymd = this.toYmdFlexible(value);
    if (!ymd) return null;
    const parsed = new Date(`${ymd}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  private formatDateOnly(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
