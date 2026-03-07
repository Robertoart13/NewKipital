import {
  Logger,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { DOMAIN_EVENTS } from '../../common/events/event-names';
import { UserCompany } from '../access-control/entities/user-company.entity';
import {
  EmployeeAguinaldoProvision,
  EstadoProvisionAguinaldoEmpleado,
} from '../employees/entities/employee-aguinaldo-provision.entity';
import { EmployeeVacationService } from '../employees/services/employee-vacation.service';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import { DomainEventsService } from '../integration/domain-events.service';
import {
  PersonalAction,
  PersonalActionEstado,
  PERSONAL_ACTION_APPROVED_STATES,
} from '../personal-actions/entities/personal-action.entity';
import { PersonalActionAutoInvalidationService } from '../personal-actions/personal-action-auto-invalidation.service';

import {
  PayrollCalendar,
  EstadoCalendarioNomina,
  TipoPlanilla,
  MonedaCalendario,
} from './entities/payroll-calendar.entity';
import { PayrollEmployeeSnapshot } from './entities/payroll-employee-snapshot.entity';
import {
  PayrollInputSnapshot,
  PayrollInputSourceType,
} from './entities/payroll-input-snapshot.entity';
import { PayrollPlanillaSnapshotJson } from './entities/payroll-planilla-snapshot.entity';
import { PayrollResult } from './entities/payroll-result.entity';
import { PayrollSocialCharge } from './entities/payroll-social-charge.entity';

import type { CreatePayrollDto } from './dto/create-payroll.dto';
import type { PayrollCalendarResponse } from './dto/payroll-response.dto';
import type { UpdatePayrollDto } from './dto/update-payroll.dto';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);
  // Regla global: 1 = Activo, 0 = Inactivo.
  private readonly activeFlag = 1;
  private readonly inactiveFlag = 0;

  private readonly rentaTramos = [
    { limite: 922000, porcentaje: 0 },
    { limite: 1352000, porcentaje: 0.1 },
    { limite: 2373000, porcentaje: 0.15 },
    { limite: 4745000, porcentaje: 0.2 },
    { limite: Infinity, porcentaje: 0.25 },
  ];

  private readonly creditosFiscales = {
    porHijo: 1720,
    porConyuge: 2600,
  };

  constructor(
    @InjectRepository(PayrollCalendar)
    private readonly repo: Repository<PayrollCalendar>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepo: Repository<UserCompany>,
    @InjectRepository(PayrollEmployeeSnapshot)
    private readonly snapshotRepo: Repository<PayrollEmployeeSnapshot>,
    @InjectRepository(PayrollInputSnapshot)
    private readonly inputSnapshotRepo: Repository<PayrollInputSnapshot>,
    @InjectRepository(PayrollResult)
    private readonly payrollResultRepo: Repository<PayrollResult>,
    @InjectRepository(PayrollPlanillaSnapshotJson)
    private readonly planillaSnapshotRepo: Repository<PayrollPlanillaSnapshotJson>,
    @InjectRepository(PayrollSocialCharge)
    private readonly socialChargeRepo: Repository<PayrollSocialCharge>,
    @InjectRepository(EmployeeAguinaldoProvision)
    private readonly aguinaldoProvisionRepo: Repository<EmployeeAguinaldoProvision>,
    @InjectRepository(PersonalAction)
    private readonly personalActionRepo: Repository<PersonalAction>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly domainEvents: DomainEventsService,
    private readonly auditOutbox: AuditOutboxService,
    private readonly vacationService: EmployeeVacationService,
    private readonly autoInvalidationService: PersonalActionAutoInvalidationService,
  ) {}

  private readonly auditFieldLabels: Record<string, string> = {
    idEmpresa: 'Empresa',
    idPeriodoPago: 'Periodo de pago',
    idTipoPlanilla: 'Tipo planilla ID',
    nombrePlanilla: 'Nombre planilla',
    tipoPlanilla: 'Tipo planilla',
    fechaInicioPeriodo: 'Inicio periodo',
    fechaFinPeriodo: 'Fin periodo',
    fechaCorte: 'Fecha corte',
    fechaInicioPago: 'Inicio pago',
    fechaFinPago: 'Fin pago',
    fechaPagoProgramada: 'Fecha pago programada',
    moneda: 'Moneda',
    estado: 'Estado',
    esInactivo: 'Estado registro',
    requiresRecalculation: 'Requiere recalculo',
    lastSnapshotAt: 'Ultimo snapshot',
  };

  async findAll(
    userId: number,
    idEmpresa?: number,
    includeInactive = false,
    inactiveOnly = false,
    fechaDesdeRaw?: string,
    fechaHastaRaw?: string,
  ): Promise<PayrollCalendar[]> {
    const qb = this.repo.createQueryBuilder('p').where('1=1');
    const fechaDesde = fechaDesdeRaw ? this.parseQueryDate(fechaDesdeRaw, 'fechaDesde') : undefined;
    const fechaHasta = fechaHastaRaw ? this.parseQueryDate(fechaHastaRaw, 'fechaHasta') : undefined;

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      throw new BadRequestException('fechaDesde no puede ser mayor que fechaHasta.');
    }

    if (idEmpresa != null) {
      await this.assertUserCompanyAccess(userId, idEmpresa);
      qb.andWhere('p.idEmpresa = :idEmpresa', { idEmpresa });
    } else {
      const companyIds = await this.getUserCompanyIds(userId);
      if (companyIds.length === 0) return [];
      qb.andWhere('p.idEmpresa IN (:...companyIds)', { companyIds });
    }

    if (inactiveOnly) {
      qb.andWhere('(p.esInactivo = :inactiveFlag OR p.estado = :inactiva)', {
        inactiveFlag: this.inactiveFlag,
        inactiva: EstadoCalendarioNomina.INACTIVA,
      });
    } else if (!includeInactive) {
      qb.andWhere('p.esInactivo = :activeFlag', { activeFlag: this.activeFlag });
      qb.andWhere('p.estado != :inactiva', {
        inactiva: EstadoCalendarioNomina.INACTIVA,
      });
    }

    if (fechaDesde && fechaHasta) {
      qb.andWhere('p.fechaFinPeriodo >= :fechaDesde AND p.fechaInicioPeriodo <= :fechaHasta', {
        fechaDesde: this.toYmd(fechaDesde),
        fechaHasta: this.toYmd(fechaHasta),
      });
    } else if (fechaDesde) {
      qb.andWhere('p.fechaFinPeriodo >= :fechaDesde', {
        fechaDesde: this.toYmd(fechaDesde),
      });
    } else if (fechaHasta) {
      qb.andWhere('p.fechaInicioPeriodo <= :fechaHasta', {
        fechaHasta: this.toYmd(fechaHasta),
      });
    }

    return qb.orderBy('p.fechaInicioPeriodo', 'DESC').getMany();
  }

  async findOne(id: number, userId?: number): Promise<PayrollCalendar> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Planilla #${id} no encontrada`);
    if (userId != null) {
      await this.assertUserCompanyAccess(userId, p.idEmpresa);
    }
    return p;
  }

  async create(dto: CreatePayrollDto, userId?: number): Promise<PayrollCalendar> {
    if (userId != null) {
      await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    }
    const tipo = (dto.tipoPlanilla as TipoPlanilla) ?? TipoPlanilla.REGULAR;
    const moneda = dto.moneda ?? MonedaCalendario.CRC;
    const resolvedTipoPlanillaId = dto.idTipoPlanilla ?? this.resolveTipoPlanillaId(tipo);
    const inicio = this.parseDateOnly(dto.periodoInicio, 'periodoInicio');
    const fin = this.parseDateOnly(dto.periodoFin, 'periodoFin');
    this.validateDateRules(
      inicio,
      fin,
      dto.fechaCorte ? this.parseDateOnly(dto.fechaCorte, 'fechaCorte') : fin,
      this.parseDateOnly(dto.fechaInicioPago, 'fechaInicioPago'),
      this.parseDateOnly(dto.fechaFinPago, 'fechaFinPago'),
      dto.fechaPagoProgramada
        ? this.parseDateOnly(dto.fechaPagoProgramada, 'fechaPagoProgramada')
        : this.parseDateOnly(dto.fechaFinPago, 'fechaFinPago'),
    );
    const slotKey = this.buildSlotKey(dto.idEmpresa, inicio, fin, resolvedTipoPlanillaId, moneda);

    const existeOperativa = await this.repo
      .createQueryBuilder('p')
      .where('p.slotKey = :slotKey', { slotKey })
      .andWhere('p.isActiveSlot = 1')
      .getOne();

    if (existeOperativa) {
      throw new ConflictException(
        'Ya existe una planilla operativa para este periodo, empresa, moneda y tipo',
      );
    }

    const planilla = this.repo.create({
      idEmpresa: dto.idEmpresa,
      idPeriodoPago: dto.idPeriodoPago,
      idTipoPlanilla: resolvedTipoPlanillaId,
      nombrePlanilla: dto.nombrePlanilla?.trim() || `Planilla ${tipo} ${dto.periodoInicio}`,
      tipoPlanilla: tipo,
      fechaInicioPeriodo: inicio,
      fechaFinPeriodo: fin,
      fechaCorte: dto.fechaCorte ? this.parseDateOnly(dto.fechaCorte, 'fechaCorte') : fin,
      fechaInicioPago: this.parseDateOnly(dto.fechaInicioPago, 'fechaInicioPago'),
      fechaFinPago: this.parseDateOnly(dto.fechaFinPago, 'fechaFinPago'),
      fechaPagoProgramada: dto.fechaPagoProgramada
        ? this.parseDateOnly(dto.fechaPagoProgramada, 'fechaPagoProgramada')
        : this.parseDateOnly(dto.fechaFinPago, 'fechaFinPago'),
      moneda,
      esInactivo: this.activeFlag,
      estado: EstadoCalendarioNomina.ABIERTA,
      descripcionEvento: dto.descripcionEvento ?? null,
      etiquetaColor: dto.etiquetaColor ?? null,
      creadoPor: userId ?? null,
      modificadoPor: userId ?? null,
      versionLock: 0,
      slotKey,
      isActiveSlot: 1,
    });

    const saved = await this.repo.save(planilla);
    this.auditOutbox.publish({
      modulo: 'payroll',
      accion: 'create',
      entidad: 'payroll',
      entidadId: saved.id,
      actorUserId: userId ?? null,
      descripcion: `Planilla creada: ${saved.nombrePlanilla ?? `#${saved.id}`}`,
      payloadAfter: this.buildAuditPayload(saved),
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PAYROLL.OPENED, {
      eventName: DOMAIN_EVENTS.PAYROLL.OPENED,
      occurredAt: new Date(),
      payload: {
        payrollId: String(saved.id),
        companyId: String(saved.idEmpresa),
      },
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: DOMAIN_EVENTS.PAYROLL.OPENED,
      payload: { companyId: saved.idEmpresa, estado: saved.estado },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.opened:${saved.id}:${saved.versionLock}`,
    });

    return saved;
  }

  async verify(id: number, userId?: number): Promise<PayrollCalendar> {
    const p = await this.findOne(id, userId);
    const payloadBefore = this.buildAuditPayload(p);
    if (p.estado !== EstadoCalendarioNomina.EN_PROCESO) {
      throw new BadRequestException('Solo se puede verificar una planilla en estado En Proceso');
    }

    const snapshotCount = await this.snapshotRepo.count({
      where: { idNomina: p.id },
    });
    if (snapshotCount === 0) {
      throw new BadRequestException('No se puede verificar la planilla sin snapshot de empleados');
    }

    const inputCount = await this.inputSnapshotRepo.count({
      where: { idNomina: p.id },
    });
    const hasSocialCharges = await this.hasActiveSocialCharges(p.idEmpresa);
    if (inputCount === 0 && !hasSocialCharges) {
      throw new BadRequestException(
        'No se puede verificar la planilla sin snapshot de inputs ni cargas sociales configuradas',
      );
    }

    const resultCount = await this.payrollResultRepo.count({
      where: { idNomina: p.id },
    });
    if (resultCount === 0) {
      throw new BadRequestException('No se puede verificar la planilla sin resultados calculados');
    }

    if (p.esInactivo === this.inactiveFlag) {
      throw new BadRequestException('No se puede verificar una planilla inactiva');
    }
    p.estado = EstadoCalendarioNomina.VERIFICADA;
    p.modificadoPor = userId ?? null;
    p.versionLock += 1;

    const saved = await this.repo.save(p);
    this.auditOutbox.publish({
      modulo: 'payroll',
      accion: 'verify',
      entidad: 'payroll',
      entidadId: saved.id,
      actorUserId: userId ?? null,
      descripcion: `Planilla verificada: ${saved.nombrePlanilla ?? `#${saved.id}`}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    this.eventEmitter.emit(DOMAIN_EVENTS.PAYROLL.VERIFIED, {
      eventName: DOMAIN_EVENTS.PAYROLL.VERIFIED,
      occurredAt: new Date(),
      payload: { payrollId: String(saved.id) },
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: DOMAIN_EVENTS.PAYROLL.VERIFIED,
      payload: { version: saved.versionLock },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.verified:${saved.id}:${saved.versionLock}`,
    });

    return saved;
  }

  async update(id: number, dto: UpdatePayrollDto, userId?: number): Promise<PayrollCalendar> {
    const payroll = await this.findOne(id, userId);
    const payloadBefore = this.buildAuditPayload(payroll);

    if (
      payroll.estado === EstadoCalendarioNomina.INACTIVA ||
      payroll.esInactivo === this.inactiveFlag
    ) {
      throw new BadRequestException('No se puede editar una planilla inactiva.');
    }
    if (
      payroll.estado === EstadoCalendarioNomina.APLICADA ||
      payroll.estado === EstadoCalendarioNomina.CONTABILIZADA
    ) {
      throw new BadRequestException('No se puede editar una planilla aplicada o contabilizada.');
    }
    if (payroll.estado === EstadoCalendarioNomina.EN_PROCESO) {
      throw new BadRequestException(
        'No se puede editar una planilla en proceso. Espere a que termine el proceso.',
      );
    }
    if (payroll.estado === EstadoCalendarioNomina.VERIFICADA) {
      throw new BadRequestException(
        'No se puede editar una planilla verificada. Primero debe reabrirla.',
      );
    }

    const nextCompanyId = dto.idEmpresa ?? payroll.idEmpresa;
    if (userId != null && nextCompanyId !== payroll.idEmpresa) {
      await this.assertUserCompanyAccess(userId, nextCompanyId);
    }

    const nextStart = dto.periodoInicio
      ? this.parseDateOnly(dto.periodoInicio, 'periodoInicio')
      : payroll.fechaInicioPeriodo;
    const nextEnd = dto.periodoFin
      ? this.parseDateOnly(dto.periodoFin, 'periodoFin')
      : payroll.fechaFinPeriodo;
    const nextCutoff = dto.fechaCorte
      ? this.parseDateOnly(dto.fechaCorte, 'fechaCorte')
      : (payroll.fechaCorte ?? nextEnd);
    const nextPayStart = dto.fechaInicioPago
      ? this.parseDateOnly(dto.fechaInicioPago, 'fechaInicioPago')
      : payroll.fechaInicioPago;
    const nextPayEnd = dto.fechaFinPago
      ? this.parseDateOnly(dto.fechaFinPago, 'fechaFinPago')
      : payroll.fechaFinPago;
    const nextProgrammed = dto.fechaPagoProgramada
      ? this.parseDateOnly(dto.fechaPagoProgramada, 'fechaPagoProgramada')
      : (payroll.fechaPagoProgramada ?? nextPayEnd);

    this.validateDateRules(
      nextStart,
      nextEnd,
      nextCutoff,
      nextPayStart,
      nextPayEnd,
      nextProgrammed,
    );

    const nextTipoPlanilla = (dto.tipoPlanilla as TipoPlanilla) ?? payroll.tipoPlanilla;
    const nextTipoPlanillaId =
      dto.idTipoPlanilla ?? payroll.idTipoPlanilla ?? this.resolveTipoPlanillaId(nextTipoPlanilla);
    const nextMoneda = dto.moneda ?? payroll.moneda;
    const nextSlotKey = this.buildSlotKey(
      nextCompanyId,
      nextStart,
      nextEnd,
      nextTipoPlanillaId,
      nextMoneda,
    );

    const duplicate = await this.repo
      .createQueryBuilder('p')
      .where('p.slotKey = :slotKey', { slotKey: nextSlotKey })
      .andWhere('p.isActiveSlot = 1')
      .andWhere('p.id != :id', { id: payroll.id })
      .getOne();

    if (duplicate) {
      throw new ConflictException(
        'Ya existe una planilla operativa con este periodo, tipo y moneda para la empresa.',
      );
    }

    payroll.idEmpresa = nextCompanyId;
    payroll.idPeriodoPago = dto.idPeriodoPago ?? payroll.idPeriodoPago;
    payroll.idTipoPlanilla = nextTipoPlanillaId;
    payroll.nombrePlanilla = dto.nombrePlanilla?.trim() || payroll.nombrePlanilla;
    payroll.tipoPlanilla = nextTipoPlanilla;
    payroll.fechaInicioPeriodo = nextStart;
    payroll.fechaFinPeriodo = nextEnd;
    payroll.fechaCorte = nextCutoff;
    payroll.fechaInicioPago = nextPayStart;
    payroll.fechaFinPago = nextPayEnd;
    payroll.fechaPagoProgramada = nextProgrammed;
    payroll.moneda = nextMoneda;
    payroll.descripcionEvento = dto.descripcionEvento ?? payroll.descripcionEvento;
    payroll.etiquetaColor = dto.etiquetaColor ?? payroll.etiquetaColor;
    payroll.slotKey = nextSlotKey;
    payroll.modificadoPor = userId ?? null;
    payroll.versionLock += 1;

    const saved = await this.repo.save(payroll);
    this.auditOutbox.publish({
      modulo: 'payroll',
      accion: 'update',
      entidad: 'payroll',
      entidadId: saved.id,
      actorUserId: userId ?? null,
      descripcion: `Planilla actualizada: ${saved.nombrePlanilla ?? `#${saved.id}`}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: 'payroll.updated',
      payload: { companyId: saved.idEmpresa, version: saved.versionLock },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.updated:${saved.id}:${saved.versionLock}`,
    });

    return saved;
  }

  async process(id: number, userId?: number): Promise<PayrollCalendar> {
    const payroll = await this.findOne(id, userId);
    const payloadBefore = this.buildAuditPayload(payroll);
    if (payroll.estado !== EstadoCalendarioNomina.ABIERTA) {
      throw new BadRequestException('Solo se puede procesar una planilla en estado Abierta');
    }
    if (payroll.esInactivo === this.inactiveFlag) {
      throw new BadRequestException('No se puede procesar una planilla inactiva');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const startDate = this.ensureDateOnly(payroll.fechaInicioPeriodo, 'fechaInicioPeriodo');
      const endDate = this.ensureDateOnly(payroll.fechaFinPeriodo, 'fechaFinPeriodo');
      const cutoffDate = this.ensureDateOnly(
        payroll.fechaCorte ?? payroll.fechaFinPeriodo,
        'fechaCorte',
      );
      const start = this.toYmd(startDate);
      const end = this.toYmd(endDate);
      const cutoff = this.toYmd(cutoffDate);

      await queryRunner.manager.delete(PayrollEmployeeSnapshot, {
        idNomina: payroll.id,
      });
      await queryRunner.manager.delete(PayrollInputSnapshot, {
        idNomina: payroll.id,
      });
      await queryRunner.manager.delete(PayrollResult, { idNomina: payroll.id });

      payroll.estado = EstadoCalendarioNomina.EN_PROCESO;
      payroll.modificadoPor = userId ?? null;
      payroll.versionLock += 1;
      payroll.requiresRecalculation = 0;
      payroll.lastSnapshotAt = null;
      await queryRunner.manager.save(PayrollCalendar, payroll);

      const employees: Array<{
        id_empleado: number;
        salario_base_empleado: string | null;
        jornada_empleado: string | null;
        moneda_salario_empleado: 'CRC' | 'USD' | null;
        cuenta_banco_empleado: string | null;
        id_periodos_pago: number | null;
        cantidad_hijos_empleado: number | null;
        estado_civil_empleado: string | null;
      }> = await queryRunner.manager.query(
        `
            SELECT
              id_empleado,
              salario_base_empleado,
              jornada_empleado,
              moneda_salario_empleado,
              cuenta_banco_empleado,
              id_periodos_pago,
              cantidad_hijos_empleado,
              estado_civil_empleado
            FROM sys_empleados
          WHERE id_empresa = ?
            AND estado_empleado = 1
            AND fecha_ingreso_empleado <= ?
            AND (fecha_salida_empleado IS NULL OR fecha_salida_empleado >= ?)
        `,
        [payroll.idEmpresa, end, start],
      );

      const periodIds = Array.from(
        new Set(
          employees.map((emp) => emp.id_periodos_pago).filter((idPeriod) => idPeriod != null),
        ),
      );
      const periodMap = new Map<number, { dias: number; nombre: string }>();
      if (periodIds.length > 0) {
        const periods: Array<{
          id_periodos_pago: number;
          dias_periodo_pago: number;
          nombre_periodo_pago: string;
        }> = await queryRunner.manager.query(
          `
              SELECT id_periodos_pago, dias_periodo_pago, nombre_periodo_pago
              FROM nom_periodos_pago
              WHERE id_periodos_pago IN (${periodIds.map(() => '?').join(',')})
            `,
          periodIds,
        );
        for (const period of periods) {
          periodMap.set(period.id_periodos_pago, {
            dias: Number(period.dias_periodo_pago ?? 0),
            nombre: String(period.nombre_periodo_pago ?? ''),
          });
        }
      }

      const socialChargeConfigs = await this.loadSocialChargeConfigs(
        queryRunner.manager,
        payroll.idEmpresa,
      );
      const quincenalPeriodIds = Array.from(periodMap.entries())
        .filter(([, info]) => this.isQuincenalPeriod(info.nombre))
        .map(([id]) => id);
      const shouldApplyQuincenalTax =
        quincenalPeriodIds.length > 0 && this.isSecondHalfOfMonth(endDate);
      const previousQuincenalTotals = shouldApplyQuincenalTax
        ? await this.getPreviousQuincenalTotals(
            queryRunner.manager,
            payroll.idEmpresa,
            endDate,
            startDate,
            quincenalPeriodIds,
          )
        : new Map<number, number>();

      for (const employee of employees) {
        const snapshot = queryRunner.manager.create(PayrollEmployeeSnapshot, {
          idNomina: payroll.id,
          idEmpleado: employee.id_empleado,
          salarioBase: this.toMoney(employee.salario_base_empleado),
          jornada: employee.jornada_empleado,
          moneda: (employee.moneda_salario_empleado ?? payroll.moneda) as 'CRC' | 'USD',
          centroCosto: null,
          cuentaBanco: employee.cuenta_banco_empleado,
        });
        await queryRunner.manager.save(PayrollEmployeeSnapshot, snapshot);
      }

      const invalidationSummary = await this.autoInvalidationService.run({
        manager: queryRunner.manager,
        source: 'payroll_collector_pre_snapshot',
        companyId: payroll.idEmpresa,
        payrollId: payroll.id,
        payrollCurrency: payroll.moneda,
      });
      if (invalidationSummary.totalInvalidated > 0) {
        this.logger.warn(
          JSON.stringify({
            job: 'payroll-collector-auto-invalidation',
            payrollId: payroll.id,
            companyId: payroll.idEmpresa,
            totalInvalidated: invalidationSummary.totalInvalidated,
            breakdown: {
              TERMINATION_EFFECTIVE: invalidationSummary.byReason.TERMINATION_EFFECTIVE,
              COMPANY_MISMATCH: invalidationSummary.byReason.COMPANY_MISMATCH,
              CURRENCY_MISMATCH: invalidationSummary.byReason.CURRENCY_MISMATCH,
            },
            sampleActionIds: invalidationSummary.sampleActionIds.slice(0, 10),
          }),
        );
      }

      const approvedActions = await queryRunner.manager
        .createQueryBuilder(PersonalAction, 'a')
        .where('a.idEmpresa = :companyId', { companyId: payroll.idEmpresa })
        .andWhere('a.estado = :approvedState', {
          approvedState: PersonalActionEstado.APPROVED,
        })
        .andWhere('a.idCalendarioNomina IS NULL')
        .andWhere('COALESCE(a.fechaInicioEfecto, a.fechaEfecto) IS NOT NULL')
        .andWhere(
          `COALESCE(a.fechaInicioEfecto, a.fechaEfecto) <= :end
           AND COALESCE(a.fechaFinEfecto, a.fechaInicioEfecto, a.fechaEfecto) >= :start`,
          { start, end },
        )
        .andWhere('(a.fechaAprobacion IS NULL OR a.fechaAprobacion <= :cutoff)', { cutoff })
        .getMany();

      const resultAccumulator = new Map<number, { gross: number; ded: number }>();

      for (const action of approvedActions) {
        const amount = Number(action.monto ?? 0);
        const prorated = this.calculateProratedAmountForPayroll(
          action,
          payroll.fechaInicioPeriodo,
          payroll.fechaFinPeriodo,
          amount,
        );
        const retroMeta = this.resolveRetroMetadata(action, payroll);
        const input = queryRunner.manager.create(PayrollInputSnapshot, {
          idNomina: payroll.id,
          idEmpleado: action.idEmpleado,
          sourceType: PayrollInputSourceType.HR_ACTION,
          sourceId: action.id,
          movementId: null,
          conceptoCodigo: action.tipoAccion,
          tipoAccion: action.tipoAccion,
          unidades: prorated.unidades.toFixed(4),
          montoBase: prorated.montoBase.toFixed(6),
          montoFinal: prorated.montoFinal.toFixed(2),
          isRetro: retroMeta.isRetro ? 1 : 0,
          originalPeriod: retroMeta.originalPeriod,
          monto: prorated.montoFinal.toFixed(4),
        });
        await queryRunner.manager.save(PayrollInputSnapshot, input);

        action.idCalendarioNomina = payroll.id;
        action.modificadoPor = userId ?? null;
        await queryRunner.manager.save(PersonalAction, action);

        const key = action.idEmpleado;
        const prev = resultAccumulator.get(key) ?? { gross: 0, ded: 0 };
        if (this.isDeductionAction(action.tipoAccion)) {
          prev.ded += prorated.montoFinal;
        } else {
          prev.gross += prorated.montoFinal;
        }
        resultAccumulator.set(key, prev);
      }

      const snapshotEmployees: Array<Record<string, unknown>> = [];
      let totalBrutoPlanilla = 0;
      let totalDeduccionesPlanilla = 0;
      let totalNetoPlanilla = 0;
      let totalDevengadoPlanilla = 0;
      let totalCargasPlanilla = 0;
      let totalImpuestoPlanilla = 0;

      for (const employee of employees) {
        const totals = resultAccumulator.get(employee.id_empleado) ?? {
          gross: 0,
          ded: 0,
        };
        const salarioBaseText = this.toMoney(employee.salario_base_empleado);
        const salarioBase = Number(salarioBaseText);
        const periodInfo = employee.id_periodos_pago
          ? periodMap.get(employee.id_periodos_pago)
          : null;
        const diasPeriodo = periodInfo?.dias && periodInfo.dias > 0 ? periodInfo.dias : 30;
        const nombrePeriodo = periodInfo?.nombre ?? '';
        const isHourly = String(employee.jornada_empleado ?? '').toLowerCase() === 'por horas';
        const devengadoDias = isHourly ? null : diasPeriodo;
        const devengadoHoras = isHourly ? diasPeriodo * 8 : null;
        const salarioBrutoPeriodo = isHourly
          ? salarioBase * (devengadoHoras ?? 0)
          : salarioBase * (diasPeriodo / 30);
        const totalBruto = salarioBrutoPeriodo + totals.gross;
        const socialChargeDetail = this.calculateSocialCharges(totalBruto, socialChargeConfigs);
        const cargasSociales = socialChargeDetail.total;
        const impuestoRenta = this.calculateIncomeTax({
          totalBruto,
          periodName: nombrePeriodo,
          isSecondHalf: shouldApplyQuincenalTax,
          previousQuincenalTotal: previousQuincenalTotals.get(employee.id_empleado) ?? 0,
          cantidadHijos: Number(employee.cantidad_hijos_empleado ?? 0),
          estadoCivil: employee.estado_civil_empleado ?? null,
        });
        const totalDeducciones = totals.ded + cargasSociales + impuestoRenta;
        const totalNeto = totalBruto - totalDeducciones;

        totalBrutoPlanilla += totalBruto;
        totalDeduccionesPlanilla += totalDeducciones;
        totalNetoPlanilla += totalNeto;
        totalDevengadoPlanilla += salarioBrutoPeriodo;
        totalCargasPlanilla += cargasSociales;
        totalImpuestoPlanilla += impuestoRenta;

        const result = queryRunner.manager.create(PayrollResult, {
          idNomina: payroll.id,
          idEmpleado: employee.id_empleado,
          totalBruto: totalBruto.toFixed(2),
          salarioBrutoPeriodo: salarioBrutoPeriodo.toFixed(2),
          devengadoDias: devengadoDias != null ? devengadoDias.toFixed(4) : null,
          devengadoHoras: devengadoHoras != null ? devengadoHoras.toFixed(4) : null,
          cargasSociales: cargasSociales.toFixed(2),
          impuestoRenta: impuestoRenta.toFixed(2),
          totalDeducciones: totalDeducciones.toFixed(2),
          totalNeto: totalNeto.toFixed(2),
        });
        await queryRunner.manager.save(PayrollResult, result);

        for (const charge of socialChargeDetail.items) {
          const chargeInput = queryRunner.manager.create(PayrollInputSnapshot, {
            idNomina: payroll.id,
            idEmpleado: employee.id_empleado,
            sourceType: PayrollInputSourceType.MANUAL,
            sourceId: charge.idCargaSocial,
            movementId: charge.idMovimiento,
            conceptoCodigo: 'CCSS',
            tipoAccion: 'carga_social',
            unidades: '1.0000',
            montoBase: totalBruto.toFixed(6),
            montoFinal: charge.monto.toFixed(2),
            isRetro: 0,
            originalPeriod: null,
            monto: charge.monto.toFixed(4),
          });
          await queryRunner.manager.save(PayrollInputSnapshot, chargeInput);
        }

        if (impuestoRenta > 0) {
          const rentaInput = queryRunner.manager.create(PayrollInputSnapshot, {
            idNomina: payroll.id,
            idEmpleado: employee.id_empleado,
            sourceType: PayrollInputSourceType.MANUAL,
            sourceId: null,
            movementId: null,
            conceptoCodigo: 'RENTA',
            tipoAccion: 'impuesto_renta',
            unidades: '1.0000',
            montoBase: totalBruto.toFixed(6),
            montoFinal: impuestoRenta.toFixed(2),
            isRetro: 0,
            originalPeriod: null,
            monto: impuestoRenta.toFixed(4),
          });
          await queryRunner.manager.save(PayrollInputSnapshot, rentaInput);
        }

        snapshotEmployees.push({
          idEmpleado: employee.id_empleado,
          salarioBase: salarioBaseText,
          salarioBrutoPeriodo,
          devengadoDias,
          devengadoHoras,
          cargasSociales,
          impuestoRenta,
          totalBruto,
          totalDeducciones,
          totalNeto,
          cargasSocialesDetalle: socialChargeDetail.items,
          acciones: approvedActions
            .filter((action) => action.idEmpleado === employee.id_empleado)
            .map((action) => ({
              idAccion: action.id,
              tipoAccion: action.tipoAccion,
              monto: Number(action.monto ?? 0),
              fechaEfecto: action.fechaEfecto ?? action.fechaInicioEfecto ?? null,
            })),
        });
      }

      await queryRunner.manager.delete(PayrollPlanillaSnapshotJson, {
        idNomina: payroll.id,
      });
      const planillaSnapshot = queryRunner.manager.create(PayrollPlanillaSnapshotJson, {
        idNomina: payroll.id,
        snapshot: {
          idNomina: payroll.id,
          idEmpresa: payroll.idEmpresa,
          periodoInicio: payroll.fechaInicioPeriodo,
          periodoFin: payroll.fechaFinPeriodo,
          moneda: payroll.moneda,
          totals: {
            totalBruto: totalBrutoPlanilla,
            totalDeducciones: totalDeduccionesPlanilla,
            totalNeto: totalNetoPlanilla,
            totalDevengado: totalDevengadoPlanilla,
            totalCargasSociales: totalCargasPlanilla,
            totalImpuestoRenta: totalImpuestoPlanilla,
          },
          empleados: snapshotEmployees,
          generatedAt: new Date(),
        },
      });
      await queryRunner.manager.save(PayrollPlanillaSnapshotJson, planillaSnapshot);

      await this.domainEvents.record({
        aggregateType: 'payroll',
        aggregateId: String(payroll.id),
        eventName: 'payroll.processed',
        payload: {
          companyId: payroll.idEmpresa,
          employees: employees.length,
          actions: approvedActions.length,
        },
        createdBy: userId ?? null,
        idempotencyKey: `payroll.processed:${payroll.id}:${payroll.versionLock}`,
      });

      payroll.lastSnapshotAt = new Date();
      payroll.requiresRecalculation = 0;
      payroll.modificadoPor = userId ?? null;
      payroll.versionLock += 1;
      await queryRunner.manager.save(PayrollCalendar, payroll);

      await queryRunner.commitTransaction();
      const saved = await this.findOne(id, userId);
      this.auditOutbox.publish({
        modulo: 'payroll',
        accion: 'process',
        entidad: 'payroll',
        entidadId: saved.id,
        actorUserId: userId ?? null,
        descripcion: `Planilla procesada: ${saved.nombrePlanilla ?? `#${saved.id}`}`,
        payloadBefore,
        payloadAfter: this.buildAuditPayload(saved),
      });
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getSnapshotSummary(
    id: number,
    userId?: number,
  ): Promise<{
    idNomina: number;
    empleados: number;
    inputs: number;
    accionesLigadas: number;
    hasSocialCharges: boolean;
    totalBruto: string;
    totalDeducciones: string;
    totalNeto: string;
    totalDevengado: string;
    totalCargasSociales: string;
    totalImpuestoRenta: string;
  }> {
    const payroll = await this.findOne(id, userId);
    const [empleados, inputs, accionesLigadas, hasSocialCharges] = await Promise.all([
      this.snapshotRepo.count({ where: { idNomina: id } }),
      this.inputSnapshotRepo.count({ where: { idNomina: id } }),
      this.personalActionRepo.count({ where: { idCalendarioNomina: id } }),
      this.hasActiveSocialCharges(payroll.idEmpresa),
    ]);

    const sums = await this.payrollResultRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.totalBruto), 0)', 'totalBruto')
      .addSelect('COALESCE(SUM(r.totalDeducciones), 0)', 'totalDeducciones')
      .addSelect('COALESCE(SUM(r.totalNeto), 0)', 'totalNeto')
      .addSelect('COALESCE(SUM(r.salarioBrutoPeriodo), 0)', 'totalDevengado')
      .addSelect('COALESCE(SUM(r.cargasSociales), 0)', 'totalCargasSociales')
      .addSelect('COALESCE(SUM(r.impuestoRenta), 0)', 'totalImpuestoRenta')
      .where('r.idNomina = :id', { id })
      .getRawOne<{
        totalBruto: string;
        totalDeducciones: string;
        totalNeto: string;
        totalDevengado: string;
        totalCargasSociales: string;
        totalImpuestoRenta: string;
      }>();

    return {
      idNomina: payroll.id,
      empleados,
      inputs,
      accionesLigadas,
      hasSocialCharges,
      totalBruto: sums?.totalBruto ?? '0.00',
      totalDeducciones: sums?.totalDeducciones ?? '0.00',
      totalNeto: sums?.totalNeto ?? '0.00',
      totalDevengado: sums?.totalDevengado ?? '0.00',
      totalCargasSociales: sums?.totalCargasSociales ?? '0.00',
      totalImpuestoRenta: sums?.totalImpuestoRenta ?? '0.00',
    };
  }

  async getAuditTrail(
    id: number,
    userId: number,
    limit = 100,
  ): Promise<
    Array<{
      id: string;
      modulo: string;
      accion: string;
      entidad: string;
      entidadId: string | null;
      actorUserId: number | null;
      actorNombre: string | null;
      actorEmail: string | null;
      descripcion: string;
      fechaCreacion: string | null;
      metadata: Record<string, unknown> | null;
      cambios: Array<{ campo: string; antes: string; despues: string }>;
    }>
  > {
    const payroll = await this.findOne(id, userId);
    const safeLimit = Math.min(Math.max(Number(limit || 100), 1), 500);

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
        CONCAT_WS(' ', u.nombre_usuario, u.apellido_usuario) AS actorNombre,
        u.email_usuario AS actorEmail
      FROM sys_auditoria_acciones a
      LEFT JOIN sys_usuarios u
        ON u.id_usuario = a.id_usuario_actor_auditoria
      WHERE a.entidad_auditoria = 'payroll'
        AND a.id_entidad_auditoria = ?
      ORDER BY a.fecha_creacion_auditoria DESC
      LIMIT ?
      `,
      [String(payroll.id), safeLimit],
    );

    return (rows ?? []).map((row: Record<string, unknown>) => {
      const payloadBefore = (row.payloadBefore as Record<string, unknown> | null) ?? null;
      const payloadAfter = (row.payloadAfter as Record<string, unknown> | null) ?? null;
      return {
        id: String(row.id ?? ''),
        modulo: String(row.modulo ?? 'payroll'),
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

  async apply(id: number, userId?: number, expectedVersion?: number): Promise<PayrollCalendar> {
    const p = await this.findOne(id, userId);
    const payloadBefore = this.buildAuditPayload(p);
    if (p.estado !== EstadoCalendarioNomina.VERIFICADA) {
      throw new BadRequestException('Solo se puede aplicar una planilla en estado Verificada');
    }
    if (p.requiresRecalculation === 1) {
      throw new BadRequestException(
        'La planilla requiere recalculo. Procese nuevamente antes de aplicar.',
      );
    }

    if (expectedVersion !== undefined && p.versionLock !== expectedVersion) {
      throw new ConflictException(
        'La planilla fue modificada por otro proceso. Recargue e intente de nuevo.',
      );
    }

    const nextVersion = p.versionLock + 1;
    await this.dataSource.transaction(async (manager) => {
      const updateResult = await manager
        .createQueryBuilder()
        .update(PayrollCalendar)
        .set({
          estado: EstadoCalendarioNomina.APLICADA,
          fechaAplicacion: new Date(),
          modificadoPor: userId ?? null,
          isActiveSlot: 0,
          versionLock: () => 'version_lock_calendario_nomina + 1',
        })
        .where('id_calendario_nomina = :id', { id })
        .andWhere('estado_calendario_nomina = :estado', {
          estado: EstadoCalendarioNomina.VERIFICADA,
        })
        .andWhere('version_lock_calendario_nomina = :version', {
          version: p.versionLock,
        })
        .andWhere('requires_recalculation_calendario_nomina = 0')
        .execute();

      if (!updateResult.affected) {
        throw new ConflictException('Conflicto de concurrencia al aplicar planilla.');
      }

      // Cierre de consumo: todas las acciones aprobadas ligadas a esta planilla
      // pasan a CONSUMED en forma idempotente.
      await manager
        .createQueryBuilder()
        .update(PersonalAction)
        .set({
          estado: PersonalActionEstado.CONSUMED,
          modificadoPor: userId ?? null,
          versionLock: () => 'version_lock_accion + 1',
        })
        .where('id_calendario_nomina = :id', { id })
        .andWhere('estado_accion IN (:...approvedStates)', {
          approvedStates: PERSONAL_ACTION_APPROVED_STATES,
        })
        .execute();

      await this.createAguinaldoProvisionsFromPayroll(manager, p, userId ?? null);
    });

    const saved = await this.findOne(id, userId);
    this.auditOutbox.publish({
      modulo: 'payroll',
      accion: 'apply',
      entidad: 'payroll',
      entidadId: saved.id,
      actorUserId: userId ?? null,
      descripcion: `Planilla aplicada: ${saved.nombrePlanilla ?? `#${saved.id}`}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });

    await this.vacationService.applyVacationUsageFromPayroll(
      saved.id,
      saved.fechaAplicacion ?? new Date(),
      userId ?? undefined,
    );

    this.eventEmitter.emit(DOMAIN_EVENTS.PAYROLL.APPLIED, {
      eventName: DOMAIN_EVENTS.PAYROLL.APPLIED,
      occurredAt: new Date(),
      payload: {
        payrollId: String(saved.id),
        companyId: String(saved.idEmpresa),
      },
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: DOMAIN_EVENTS.PAYROLL.APPLIED,
      payload: { companyId: saved.idEmpresa, version: nextVersion },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.applied:${saved.id}:${nextVersion}`,
    });

    return saved;
  }

  /**
   * Registra provisión de aguinaldo por planilla aplicada.
   * Fórmula base: total_bruto / 12 por empleado.
   */
  private async createAguinaldoProvisionsFromPayroll(
    manager: EntityManager,
    payroll: PayrollCalendar,
    userId: number | null,
  ): Promise<void> {
    const registroEmpresa = `Planilla aplicada #${payroll.id}`;
    const existing = await manager.find(EmployeeAguinaldoProvision, {
      where: {
        idEmpresa: payroll.idEmpresa,
        fechaInicioLaboral: payroll.fechaInicioPeriodo,
        fechaFinLaboral: payroll.fechaFinPeriodo,
        registroEmpresa,
      },
    });
    const existingByEmployee = new Set(existing.map((row) => Number(row.idEmpleado)));

    const results = await manager.find(PayrollResult, {
      where: { idNomina: payroll.id },
    });

    const provisions = results
      .filter((row) => !existingByEmployee.has(Number(row.idEmpleado)))
      .map((row) => {
        const totalBruto = Number(row.totalBruto ?? 0);
        const provision = totalBruto / 12;
        return manager.create(EmployeeAguinaldoProvision, {
          idEmpleado: row.idEmpleado,
          idEmpresa: payroll.idEmpresa,
          montoProvisionado: provision.toFixed(2),
          fechaInicioLaboral: payroll.fechaInicioPeriodo,
          fechaFinLaboral: payroll.fechaFinPeriodo,
          registroEmpresa,
          estado: EstadoProvisionAguinaldoEmpleado.PENDIENTE,
          creadoPor: userId,
          modificadoPor: userId,
        });
      })
      .filter((row) => Number(row.montoProvisionado) > 0);

    if (provisions.length > 0) {
      await manager.save(EmployeeAguinaldoProvision, provisions);
    }
  }

  async reopen(id: number, motivo: string, userId?: number): Promise<PayrollCalendar> {
    const p = await this.findOne(id, userId);
    const payloadBefore = this.buildAuditPayload(p);
    if (p.estado !== EstadoCalendarioNomina.VERIFICADA) {
      throw new BadRequestException(
        'Solo se puede reabrir una planilla en estado Verificada. Aplicada/Contabilizada son inmutables.',
      );
    }
    p.estado = EstadoCalendarioNomina.ABIERTA;
    p.descripcionEvento = p.descripcionEvento
      ? `${p.descripcionEvento}\n[Reapertura] ${motivo}`
      : `[Reapertura] ${motivo}`;
    p.modificadoPor = userId ?? null;
    p.versionLock += 1;

    const saved = await this.repo.save(p);
    this.auditOutbox.publish({
      modulo: 'payroll',
      accion: 'reopen',
      entidad: 'payroll',
      entidadId: saved.id,
      actorUserId: userId ?? null,
      descripcion: `Planilla reabierta: ${saved.nombrePlanilla ?? `#${saved.id}`}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
      metadata: { motivo },
    });
    this.eventEmitter.emit(DOMAIN_EVENTS.PAYROLL.REOPENED, {
      eventName: DOMAIN_EVENTS.PAYROLL.REOPENED,
      occurredAt: new Date(),
      payload: { payrollId: String(saved.id), motivo },
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: DOMAIN_EVENTS.PAYROLL.REOPENED,
      payload: { motivo, version: saved.versionLock },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.reopened:${saved.id}:${saved.versionLock}`,
    });

    return saved;
  }

  async inactivate(id: number, userId?: number): Promise<PayrollCalendar> {
    const p = await this.findOne(id, userId);
    const payloadBefore = this.buildAuditPayload(p);
    if (
      p.estado === EstadoCalendarioNomina.APLICADA ||
      p.estado === EstadoCalendarioNomina.CONTABILIZADA
    ) {
      throw new BadRequestException(
        'No se puede inactivar una planilla ya aplicada o contabilizada',
      );
    }
    p.esInactivo = this.inactiveFlag;
    p.estado = EstadoCalendarioNomina.INACTIVA;
    p.isActiveSlot = 0;
    p.modificadoPor = userId ?? null;
    p.versionLock += 1;

    const saved = await this.repo.save(p);
    this.auditOutbox.publish({
      modulo: 'payroll',
      accion: 'inactivate',
      entidad: 'payroll',
      entidadId: saved.id,
      actorUserId: userId ?? null,
      descripcion: `Planilla inactivada: ${saved.nombrePlanilla ?? `#${saved.id}`}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    this.eventEmitter.emit(DOMAIN_EVENTS.PAYROLL.DEACTIVATED, {
      eventName: DOMAIN_EVENTS.PAYROLL.DEACTIVATED,
      occurredAt: new Date(),
      payload: { payrollId: String(saved.id) },
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: DOMAIN_EVENTS.PAYROLL.DEACTIVATED,
      payload: { version: saved.versionLock },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.deactivated:${saved.id}:${saved.versionLock}`,
    });

    return saved;
  }

  private async getUserCompanyIds(userId: number): Promise<number[]> {
    const rows = await this.userCompanyRepo.find({
      where: { idUsuario: userId, estado: 1 },
    });
    return rows.map((row) => row.idEmpresa);
  }

  /**
   * Serializa fechas como YYYY-MM-DD para evitar desfases por zona horaria en la UI.
   */
  toResponse(entity: PayrollCalendar): PayrollCalendarResponse {
    return {
      id: entity.id,
      idEmpresa: entity.idEmpresa,
      idPeriodoPago: entity.idPeriodoPago,
      idTipoPlanilla: entity.idTipoPlanilla ?? null,
      nombrePlanilla: entity.nombrePlanilla ?? null,
      tipoPlanilla: entity.tipoPlanilla,
      fechaInicioPeriodo: this.toYmd(entity.fechaInicioPeriodo),
      fechaFinPeriodo: this.toYmd(entity.fechaFinPeriodo),
      fechaCorte: entity.fechaCorte ? this.toYmd(entity.fechaCorte) : null,
      fechaInicioPago: this.toYmd(entity.fechaInicioPago),
      fechaFinPago: this.toYmd(entity.fechaFinPago),
      fechaPagoProgramada: entity.fechaPagoProgramada
        ? this.toYmd(entity.fechaPagoProgramada)
        : null,
      moneda: entity.moneda,
      estado: entity.estado,
      esInactivo: entity.esInactivo,
      requiresRecalculation: entity.requiresRecalculation,
      fechaAplicacion: entity.fechaAplicacion ? this.toYmd(entity.fechaAplicacion) : null,
      descripcionEvento: entity.descripcionEvento ?? null,
      etiquetaColor: entity.etiquetaColor ?? null,
    };
  }

  private async assertUserCompanyAccess(userId: number, companyId: number): Promise<void> {
    const exists = await this.userCompanyRepo.findOne({
      where: { idUsuario: userId, idEmpresa: companyId, estado: 1 },
    });
    if (!exists) {
      throw new ForbiddenException(`No tiene acceso a la empresa ${companyId}.`);
    }
  }

  private buildSlotKey(
    companyId: number,
    startDate: Date,
    endDate: Date,
    tipoPlanillaId: number | null,
    moneda: MonedaCalendario,
  ): string {
    const start = this.toYmd(startDate);
    const end = this.toYmd(endDate);
    return `${companyId}|${start}|${end}|${tipoPlanillaId ?? 0}|${moneda}`;
  }

  private toYmd(value: Date | string): string {
    if (typeof value === 'string') {
      const direct = value.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;
      const parsed = this.parseDateOnly(value, 'fecha');
      if (!Number.isNaN(parsed.getTime())) return this.formatDateOnly(parsed);
      throw new BadRequestException('Fecha invalida para conversion YYYY-MM-DD.');
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return this.formatDateOnly(value);
    }
    throw new BadRequestException('Fecha invalida para conversion YYYY-MM-DD.');
  }

  /**
   * Convierte YYYY-MM-DD a Date con hora local 00:00 para evitar desfases de zona horaria.
   */
  private parseDateOnly(value: string, field: string): Date {
    const normalized = value?.trim();
    if (!normalized || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new BadRequestException(`${field} debe tener formato YYYY-MM-DD.`);
    }
    const parsed = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} es una fecha invalida.`);
    }
    return parsed;
  }

  private ensureDateOnly(value: Date | string, field: string): Date {
    if (value instanceof Date) return value;
    return this.parseDateOnly(value, field);
  }

  private formatDateOnly(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseQueryDate(value: string, fieldName: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${fieldName} debe tener formato YYYY-MM-DD.`);
    }
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} es una fecha invalida.`);
    }
    return parsed;
  }

  private resolveTipoPlanillaId(tipoPlanilla: TipoPlanilla): number | null {
    const normalized = String(tipoPlanilla).trim().toUpperCase();
    const map: Record<string, number> = {
      REGULAR: 1,
      AGUINALDO: 2,
      LIQUIDACION: 3,
      EXTRAORDINARIA: 4,
    };
    return map[normalized] ?? null;
  }

  private buildAuditPayload(entity: PayrollCalendar): Record<string, unknown> {
    return {
      idEmpresa: entity.idEmpresa ?? null,
      idPeriodoPago: entity.idPeriodoPago ?? null,
      idTipoPlanilla: entity.idTipoPlanilla ?? null,
      nombrePlanilla: entity.nombrePlanilla ?? null,
      tipoPlanilla: entity.tipoPlanilla ?? null,
      fechaInicioPeriodo: entity.fechaInicioPeriodo ? this.toYmd(entity.fechaInicioPeriodo) : null,
      fechaFinPeriodo: entity.fechaFinPeriodo ? this.toYmd(entity.fechaFinPeriodo) : null,
      fechaCorte: entity.fechaCorte ? this.toYmd(entity.fechaCorte) : null,
      fechaInicioPago: entity.fechaInicioPago ? this.toYmd(entity.fechaInicioPago) : null,
      fechaFinPago: entity.fechaFinPago ? this.toYmd(entity.fechaFinPago) : null,
      fechaPagoProgramada: entity.fechaPagoProgramada
        ? this.toYmd(entity.fechaPagoProgramada)
        : null,
      moneda: entity.moneda ?? null,
      estado: this.normalizeEstadoValue(entity.estado),
      esInactivo: entity.esInactivo === this.inactiveFlag ? 'Inactivo' : 'Activo',
      requiresRecalculation: entity.requiresRecalculation === 1 ? 'Si' : 'No',
      lastSnapshotAt: entity.lastSnapshotAt ? this.toYmd(entity.lastSnapshotAt) : null,
    };
  }

  private normalizeEstadoValue(value: number): string {
    const map: Record<number, string> = {
      [EstadoCalendarioNomina.ABIERTA]: 'Abierta',
      [EstadoCalendarioNomina.EN_PROCESO]: 'En proceso',
      [EstadoCalendarioNomina.VERIFICADA]: 'Verificada',
      [EstadoCalendarioNomina.APLICADA]: 'Aplicada',
      [EstadoCalendarioNomina.CONTABILIZADA]: 'Contabilizada',
      [EstadoCalendarioNomina.NOTIFICADA]: 'Notificada',
      [EstadoCalendarioNomina.INACTIVA]: 'Inactiva',
    };
    return map[value] ?? String(value);
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
    const keys = new Set<string>([...Object.keys(payloadBefore), ...Object.keys(payloadAfter)]);
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

  private toMoney(value: string | null): string {
    const amount = Number(value ?? 0);
    if (Number.isNaN(amount)) return '0.00';
    if (amount < 0) return '0.00';
    return amount.toFixed(2);
  }

  private isDeductionAction(actionType: string): boolean {
    return actionType.toLowerCase().includes('deduc');
  }

  private resolveRetroMetadata(
    action: PersonalAction,
    payroll: PayrollCalendar,
  ): { isRetro: boolean; originalPeriod: string | null } {
    const effectStart = action.fechaInicioEfecto ?? action.fechaEfecto;
    if (!effectStart || Number.isNaN(effectStart.getTime())) {
      return { isRetro: false, originalPeriod: null };
    }

    const isRetro = this.toYmd(effectStart) < this.toYmd(payroll.fechaInicioPeriodo);
    if (!isRetro) {
      return { isRetro: false, originalPeriod: null };
    }

    return {
      isRetro: true,
      originalPeriod: `${effectStart.getUTCFullYear()}-${String(effectStart.getUTCMonth() + 1).padStart(2, '0')}`,
    };
  }

  private calculateProratedAmountForPayroll(
    action: PersonalAction,
    periodoInicio: Date,
    periodoFin: Date,
    montoOriginal: number,
  ): { unidades: number; montoBase: number; montoFinal: number } {
    const actionStart = action.fechaInicioEfecto ?? action.fechaEfecto;
    const actionEnd = action.fechaFinEfecto ?? action.fechaInicioEfecto ?? action.fechaEfecto;

    if (!actionStart || !actionEnd) {
      return { unidades: 1, montoBase: montoOriginal, montoFinal: montoOriginal };
    }

    const start = this.toMidnightUtc(actionStart);
    const end = this.toMidnightUtc(actionEnd);
    const payStart = this.toMidnightUtc(periodoInicio);
    const payEnd = this.toMidnightUtc(periodoFin);

    const overlapStart = Math.max(start.getTime(), payStart.getTime());
    const overlapEnd = Math.min(end.getTime(), payEnd.getTime());

    if (overlapEnd < overlapStart) {
      return { unidades: 0, montoBase: montoOriginal, montoFinal: 0 };
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const overlapDays = Math.floor((overlapEnd - overlapStart) / millisecondsPerDay) + 1;
    const actionDays = Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;

    if (actionDays <= 0) {
      return { unidades: overlapDays, montoBase: montoOriginal, montoFinal: montoOriginal };
    }

    const montoBase = montoOriginal;
    const montoProrated = (montoOriginal / actionDays) * overlapDays;

    return {
      unidades: overlapDays,
      montoBase,
      montoFinal: Number(montoProrated.toFixed(2)),
    };
  }

  private toMidnightUtc(value: Date): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  private async loadSocialChargeConfigs(
    manager: EntityManager,
    companyId: number,
  ): Promise<
    Array<{
      id: number;
      nombre: string;
      porcentaje: number;
      idMovimiento: number;
    }>
  > {
    const charges = await manager.find(PayrollSocialCharge, {
      where: { idEmpresa: companyId, esInactivo: this.activeFlag },
      order: { id: 'ASC' },
    });
    return charges.map((charge) => ({
      id: charge.id,
      nombre: charge.nombre,
      porcentaje: Number(charge.porcentaje ?? 0),
      idMovimiento: charge.idMovimiento,
    }));
  }

  /**
   * Determina si la empresa tiene cargas sociales activas configuradas.
   * Regla: si existen, la verificacion puede continuar aunque no haya inputs.
   */
  private async hasActiveSocialCharges(companyId: number): Promise<boolean> {
    const activeCharges = await this.socialChargeRepo.count({
      where: { idEmpresa: companyId, esInactivo: this.activeFlag },
    });
    return activeCharges > 0;
  }

  private calculateSocialCharges(
    totalBruto: number,
    configs: Array<{
      id: number;
      nombre: string;
      porcentaje: number;
      idMovimiento: number;
    }>,
  ): {
    total: number;
    items: Array<{
      idCargaSocial: number;
      nombre: string;
      porcentaje: number;
      monto: number;
      idMovimiento: number;
    }>;
  } {
    if (!configs.length || totalBruto <= 0) {
      return { total: 0, items: [] };
    }
    let total = 0;
    const items = configs.map((config) => {
      const monto = Number((totalBruto * config.porcentaje).toFixed(2));
      total += monto;
      return {
        idCargaSocial: config.id,
        nombre: config.nombre,
        porcentaje: config.porcentaje,
        monto,
        idMovimiento: config.idMovimiento,
      };
    });
    return { total: Number(total.toFixed(2)), items };
  }

  private calculateIncomeTax(params: {
    totalBruto: number;
    periodName: string;
    isSecondHalf: boolean;
    previousQuincenalTotal: number;
    cantidadHijos: number;
    estadoCivil: string | null;
  }): number {
    const periodName = params.periodName.toLowerCase();
    const isMonthly = this.isMonthlyPeriod(periodName);
    const isQuincenal = this.isQuincenalPeriod(periodName);

    if (!isMonthly && !isQuincenal) return 0;
    if (isQuincenal && !params.isSecondHalf) return 0;

    const base = (isQuincenal ? params.previousQuincenalTotal : 0) + params.totalBruto;
    if (base <= 0) return 0;

    let impuesto = 0;
    let acumulado = 0;
    for (const tramo of this.rentaTramos) {
      const limite = tramo.limite;
      if (base <= acumulado) break;
      const baseTramo = Math.min(base, limite) - acumulado;
      if (baseTramo > 0 && tramo.porcentaje > 0) {
        impuesto += baseTramo * tramo.porcentaje;
      }
      acumulado = limite;
      if (limite === Infinity) break;
    }

    const creditos =
      (params.cantidadHijos || 0) * this.creditosFiscales.porHijo +
      (this.isCivilStatusWithSpouse(params.estadoCivil) ? this.creditosFiscales.porConyuge : 0);
    const resultado = Math.max(0, impuesto - creditos);
    return Number(resultado.toFixed(2));
  }

  private isSecondHalfOfMonth(date: Date | string): boolean {
    const resolved = this.ensureDateOnly(date, 'fechaFinPeriodo');
    return resolved.getDate() >= 16;
  }

  private isQuincenalPeriod(name: string): boolean {
    return name.toLowerCase().includes('quincen');
  }

  private isMonthlyPeriod(name: string): boolean {
    return name.toLowerCase().includes('mensual');
  }

  private isCivilStatusWithSpouse(status: string | null): boolean {
    if (!status) return false;
    const normalized = status.toLowerCase();
    return normalized === 'casado' || normalized === 'unión libre';
  }

  private async getPreviousQuincenalTotals(
    manager: EntityManager,
    companyId: number,
    fechaFinPeriodo: Date,
    fechaInicioPeriodo: Date,
    periodIds: number[],
  ): Promise<Map<number, number>> {
    if (periodIds.length === 0) return new Map();
    const params = [
      companyId,
      ...periodIds,
      this.toYmd(fechaInicioPeriodo),
      this.toYmd(fechaFinPeriodo),
      this.toYmd(fechaFinPeriodo),
    ];
    const rows: Array<{
      id_empleado: number;
      total_bruto_resultado: string;
    }> = await manager.query(
      `
        SELECT r.id_empleado, r.total_bruto_resultado
        FROM nomina_resultados r
        INNER JOIN nom_calendarios_nomina p
          ON p.id_calendario_nomina = r.id_nomina
        INNER JOIN (
          SELECT r2.id_empleado, p2.id_periodos_pago, MAX(p2.fecha_fin_periodo) AS max_fin
          FROM nomina_resultados r2
          INNER JOIN nom_calendarios_nomina p2
            ON p2.id_calendario_nomina = r2.id_nomina
          WHERE p2.id_empresa = ?
            AND p2.id_periodos_pago IN (${periodIds.map(() => '?').join(',')})
            AND p2.fecha_fin_periodo < ?
            AND YEAR(p2.fecha_fin_periodo) = YEAR(?)
            AND MONTH(p2.fecha_fin_periodo) = MONTH(?)
          GROUP BY r2.id_empleado, p2.id_periodos_pago
        ) last
          ON last.id_empleado = r.id_empleado
         AND last.max_fin = p.fecha_fin_periodo
         AND last.id_periodos_pago = p.id_periodos_pago
      `,
      params,
    );
    const map = new Map<number, number>();
    for (const row of rows) {
      map.set(row.id_empleado, Number(row.total_bruto_resultado ?? 0));
    }
    return map;
  }

  private validateDateRules(
    periodoInicio: Date,
    periodoFin: Date,
    fechaCorte: Date,
    fechaInicioPago: Date,
    fechaFinPago: Date,
    fechaPagoProgramada: Date,
  ): void {
    if (periodoInicio > periodoFin) {
      throw new BadRequestException('Inicio Periodo no puede ser mayor que Fin Periodo.');
    }
    if (fechaCorte < periodoInicio || fechaCorte > periodoFin) {
      throw new BadRequestException('Fecha Corte debe estar dentro del Periodo de Nomina.');
    }
    if (fechaInicioPago > fechaFinPago) {
      throw new BadRequestException('Inicio Pago no puede ser mayor que Fin Pago.');
    }
    if (fechaPagoProgramada < fechaInicioPago || fechaPagoProgramada > fechaFinPago) {
      throw new BadRequestException(
        'Fecha Pago Programada debe estar dentro de la Ventana de Pago.',
      );
    }
    if (fechaPagoProgramada < fechaCorte) {
      throw new BadRequestException('Fecha Pago Programada no puede ser menor que Fecha Corte.');
    }
  }
}

