import {
  Logger,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { DOMAIN_EVENTS } from '../../common/events/event-names';
import { EmployeeSensitiveDataService } from '../../common/services/employee-sensitive-data.service';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { AuthService } from '../auth/auth.service';
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
import { PayrollReactivationItem } from './entities/payroll-reactivation-item.entity';
import { PayrollEmployeeVerification } from './entities/payroll-employee-verification.entity';

import type { CreatePayrollDto } from './dto/create-payroll.dto';
import type { PayrollCalendarResponse } from './dto/payroll-response.dto';
import type { UpdatePayrollDto } from './dto/update-payroll.dto';

interface ApprovedActionRuleData {
  absenceNonRemDays: number;
  absenceRemAmount: number;
  licenseNonRemDays: number;
  licenseRemDays: number;
  licenseRemAmount: number;
  disabilityDays: number;
  disabilityCcssAmount: number;
  vacationDays: number;
  increaseAmount: number;
  bonusAmount: number;
  overtimeAmount: number;
  retentionAmount: number;
  discountAmount: number;
}

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);
  // Regla global: 1 = Activo, 0 = Inactivo.
  private readonly activeFlag = 1;
  private readonly inactiveFlag = 0;
  private readonly publicIdSecret =
    process.env.PAYROLL_PUBLIC_ID_SECRET?.trim() || 'kpital-payroll-public-id-secret-v1';

  /**
   * Tramos de impuesto renta Costa Rica (base mensual CRC).
   * Ver: docs/08-planilla/CALCULOS-PLANILLA-CODIGO-COMENTADO.md
   */
  private readonly rentaTramos = [
    { limite: 922000, porcentaje: 0 },
    { limite: 1352000, porcentaje: 0.1 },
    { limite: 2373000, porcentaje: 0.15 },
    { limite: 4745000, porcentaje: 0.2 },
    { limite: Infinity, porcentaje: 0.25 },
  ];

  /** Créditos fiscales por hijo y cónyuge. Ver CALCULOS-PLANILLA-CODIGO-COMENTADO.md */
  private readonly creditosFiscales = {
    porHijo: 1720,
    porConyuge: 2600,
  };

  private readonly personalActionFinalStates: PersonalActionEstado[] = [
    PersonalActionEstado.CONSUMED,
    PersonalActionEstado.CANCELLED,
    PersonalActionEstado.INVALIDATED,
    PersonalActionEstado.EXPIRED,
    PersonalActionEstado.REJECTED,
  ];

  private readonly autoReassignmentEligiblePayrollStates: EstadoCalendarioNomina[] = [
    EstadoCalendarioNomina.ABIERTA,
    EstadoCalendarioNomina.EN_PROCESO,
    EstadoCalendarioNomina.VERIFICADA,
  ];

  constructor(
    @InjectRepository(PayrollCalendar)
    private readonly repo: Repository<PayrollCalendar>,
    @InjectRepository(PayrollReactivationItem)
    private readonly payrollReactivationRepo: Repository<PayrollReactivationItem>,
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
    @InjectRepository(PayrollEmployeeVerification)
    private readonly payrollVerificationRepo: Repository<PayrollEmployeeVerification>,
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
    private readonly authService: AuthService,
    private readonly sensitiveDataService: EmployeeSensitiveDataService,
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
    estados?: number[],
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

    if (estados && estados.length > 0) {
      qb.andWhere('p.estado IN (:...estados)', { estados });
    } else if (inactiveOnly) {
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

    const basePayrollName = dto.nombrePlanilla?.trim() || `Planilla ${tipo} ${dto.periodoInicio}`;

    const planilla = this.repo.create({
      idEmpresa: dto.idEmpresa,
      idPeriodoPago: dto.idPeriodoPago,
      idTipoPlanilla: resolvedTipoPlanillaId,
      nombrePlanilla: this.normalizePayrollNameBase(basePayrollName),
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

    let saved = await this.repo.save(planilla);
    const finalizedPayrollName = this.buildPayrollNameWithConsecutiveSuffix(basePayrollName, saved.id);
    if (saved.nombrePlanilla !== finalizedPayrollName) {
      saved.nombrePlanilla = finalizedPayrollName;
      saved.modificadoPor = userId ?? null;
      saved = await this.repo.save(saved);
    }
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

    await this.tryAutoReassociateSavedPayroll(saved, userId, 'create');

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

    const snapshotEmployeeRows = await this.snapshotRepo.find({
      where: { idNomina: p.id },
      select: ['idEmpleado'],
    });
    const selectionMap = await this.loadEmployeeSelectionMap(
      this.dataSource.manager,
      p.id,
      snapshotEmployeeRows.map((row) => Number(row.idEmpleado)),
    );
    const includedEmployees = snapshotEmployeeRows.filter((row) =>
      this.isEmployeeIncludedInPayroll(selectionMap.get(Number(row.idEmpleado))),
    );
    if (includedEmployees.length === 0) {
      throw new BadRequestException(
        'Debe marcar al menos un empleado para incluirlo en planilla antes de verificar.',
      );
    }
    const requiresRevalidationIncluded = includedEmployees.some((row) =>
      this.requiresEmployeeRevalidation(selectionMap.get(Number(row.idEmpleado))),
    );
    if (requiresRevalidationIncluded) {
      throw new BadRequestException(
        'Hay empleados incluidos que requieren revalidacion. Revise o desmarque esos empleados antes de verificar.',
      );
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
    if (![EstadoCalendarioNomina.ABIERTA, EstadoCalendarioNomina.EN_PROCESO].includes(payroll.estado)) {
      throw new BadRequestException('Solo se puede cargar una planilla en estado Abierta o En Proceso');
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
        fecha_ingreso_empleado: Date | string | null;
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
              estado_civil_empleado,
              fecha_ingreso_empleado
            FROM sys_empleados
          WHERE id_empresa = ?
            AND estado_empleado = 1
            AND fecha_ingreso_empleado <= ?
            AND (fecha_salida_empleado IS NULL OR fecha_salida_empleado >= ?)
        `,
        [payroll.idEmpresa, end, start],
      );

      const selectionMap = await this.loadEmployeeSelectionMap(
        queryRunner.manager,
        payroll.id,
        employees.map((employee) => Number(employee.id_empleado)),
      );
      const excludedEmployeeIds = employees
        .map((employee) => Number(employee.id_empleado))
        .filter((employeeId) => !this.isEmployeeIncludedInPayroll(selectionMap.get(employeeId)));
      if (excludedEmployeeIds.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(PersonalAction)
          .set({
            idCalendarioNomina: null,
            modificadoPor: userId ?? null,
            versionLock: () => 'version_lock_accion + 1',
          })
          .where('id_calendario_nomina = :payrollId', { payrollId: payroll.id })
          .andWhere('id_empleado IN (:...employeeIds)', { employeeIds: excludedEmployeeIds })
          .andWhere('estado_accion IN (:...approvedStates)', {
            approvedStates: PERSONAL_ACTION_APPROVED_STATES,
          })
          .execute();
      }

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
        .andWhere('(a.idCalendarioNomina IS NULL OR a.idCalendarioNomina = :payrollId)', {
          payrollId: payroll.id,
        })
        .andWhere('COALESCE(a.fechaInicioEfecto, a.fechaEfecto) IS NOT NULL')
        .andWhere(
          `COALESCE(a.fechaInicioEfecto, a.fechaEfecto) <= :end
           AND COALESCE(a.fechaFinEfecto, a.fechaInicioEfecto, a.fechaEfecto) >= :start`,
          { start, end },
        )
        .andWhere('(a.fechaAprobacion IS NULL OR a.fechaAprobacion <= :cutoff)', { cutoff })
        .getMany();

      const displayActionStates: PersonalActionEstado[] = [
        PersonalActionEstado.PENDING_SUPERVISOR,
        PersonalActionEstado.PENDING_RRHH,
        PersonalActionEstado.APPROVED,
      ];

      const approvedActionRuleMap = await this.loadApprovedActionRuleMap(
        queryRunner.manager,
        approvedActions.map((action) => action.id),
      );
      const employeeDaysAdjustmentMap = new Map<number, number>();
      const employeeDaysOverrideMap = new Map<number, number>();
      const resultAccumulator = new Map<number, { gross: number; ded: number }>();
      const approvedActionAmountMap = new Map<number, number>();
      const employeePayrollBasisMap = new Map<
        number,
        { salarioBase: number; diasPeriodo: number; isHourly: boolean }
      >();

      for (const employee of employees) {
        const salarioBase = Number(this.toMoney(employee.salario_base_empleado));
        const periodInfo = employee.id_periodos_pago
          ? periodMap.get(employee.id_periodos_pago)
          : null;
        const diasPeriodo = periodInfo?.dias && periodInfo.dias > 0 ? periodInfo.dias : 30;
        const isHourly = String(employee.jornada_empleado ?? '').toLowerCase() === 'por horas';
        employeePayrollBasisMap.set(employee.id_empleado, {
          salarioBase,
          diasPeriodo,
          isHourly,
        });
      }

      for (const action of approvedActions) {
        if (!this.isEmployeeIncludedInPayroll(selectionMap.get(action.idEmpleado))) {
          continue;
        }
        const amount = Number(action.monto ?? 0);
        const prorated = this.calculateProratedAmountForPayroll(
          action,
          payroll.fechaInicioPeriodo,
          payroll.fechaFinPeriodo,
          amount,
        );
        const actionRuleData = approvedActionRuleMap.get(action.id);
        const employeePayrollBasis = employeePayrollBasisMap.get(action.idEmpleado);
        const effectiveAmount = this.resolveApprovedActionAmountForPayroll(
          action.tipoAccion,
          prorated.montoFinal,
          actionRuleData,
          employeePayrollBasis?.salarioBase ?? 0,
          employeePayrollBasis?.isHourly ?? false,
        );
        const daysToSubtract = this.resolveApprovedActionDaysImpact(
          action.tipoAccion,
          actionRuleData,
        );
        if (daysToSubtract > 0 && !(employeePayrollBasis?.isHourly ?? false)) {
          const previousDays = employeeDaysAdjustmentMap.get(action.idEmpleado) ?? 0;
          employeeDaysAdjustmentMap.set(action.idEmpleado, previousDays + daysToSubtract);
        }
        const terminationDays = this.resolveTerminationDaysImpact(
          action,
          payroll.fechaInicioPeriodo,
          payroll.fechaFinPeriodo,
        );
        if (terminationDays != null && !(employeePayrollBasis?.isHourly ?? false)) {
          const currentOverride = employeeDaysOverrideMap.get(action.idEmpleado);
          employeeDaysOverrideMap.set(
            action.idEmpleado,
            currentOverride == null ? terminationDays : Math.min(currentOverride, terminationDays),
          );
        }
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
          montoFinal: effectiveAmount.toFixed(2),
          isRetro: retroMeta.isRetro ? 1 : 0,
          originalPeriod: retroMeta.originalPeriod,
          monto: effectiveAmount.toFixed(4),
        });
        await queryRunner.manager.save(PayrollInputSnapshot, input);

        action.idCalendarioNomina = payroll.id;
        approvedActionAmountMap.set(action.id, effectiveAmount);
        action.modificadoPor = userId ?? null;
        await queryRunner.manager.save(PersonalAction, action);

        const key = action.idEmpleado;
        const prev = resultAccumulator.get(key) ?? { gross: 0, ded: 0 };
        if (this.isNetDeductionAction(action.tipoAccion)) {
          prev.ded += effectiveAmount;
        } else {
          prev.gross += effectiveAmount;
        }
        resultAccumulator.set(key, prev);
      }

      const displayActions = await queryRunner.manager
        .createQueryBuilder(PersonalAction, 'a')
        .where('a.idEmpresa = :companyId', { companyId: payroll.idEmpresa })
        .andWhere('a.estado IN (:...displayStates)', { displayStates: displayActionStates })
        .andWhere('(a.idCalendarioNomina IS NULL OR a.idCalendarioNomina = :payrollId)', {
          payrollId: payroll.id,
        })
        .andWhere('COALESCE(a.fechaInicioEfecto, a.fechaEfecto) IS NOT NULL')
        .andWhere(
          `COALESCE(a.fechaInicioEfecto, a.fechaEfecto) <= :end
           AND COALESCE(a.fechaFinEfecto, a.fechaInicioEfecto, a.fechaEfecto) >= :start`,
          { start, end },
        )
        .getMany();

      const actionDisplayLabelMap = await this.buildActionDisplayLabelMap(
        queryRunner.manager,
        displayActions,
      );

      const displayActionIds = displayActions.map((a) => Number(a.id)).filter((id) => Number.isFinite(id) && id > 0);
      const vacationDaysByActionId = new Map<number, number>();
      if (displayActionIds.length > 0) {
        const placeholders = displayActionIds.map(() => '?').join(',');
        const vacationRows = (await queryRunner.manager.query(
          `
          SELECT id_accion AS actionId, COUNT(*) AS vacationDays
          FROM acc_vacaciones_fechas
          WHERE id_accion IN (${placeholders})
          GROUP BY id_accion
          `,
          displayActionIds,
        )) as Array<{ actionId: number; vacationDays: number | string }>;
        for (const row of vacationRows) {
          vacationDaysByActionId.set(Number(row.actionId), this.toSafeNumber(row.vacationDays));
        }
      }

      const displayActionsByEmployee = new Map<
        number,
        Array<{
          idAccion: number | null;
          tipoAccion: string;
          monto: number;
          fechaEfecto: Date | null;
          estado: string;
          estadoCodigo: number | null;
          canApprove: boolean;
        }>
      >();

      for (const action of displayActions) {
        const approved = action.estado === PersonalActionEstado.APPROVED; // Si aprobada: usa approvedActionAmountMap; si pendiente: usa action.monto o formula (vacaciones)
        let actionAmount: number;
        const actionCategory = this.resolveActionCategory(action.tipoAccion ?? '');
        const isVacaciones = actionCategory === 'Vacaciones';
        const vacationDays = isVacaciones ? vacationDaysByActionId.get(Number(action.id)) : undefined;
        // Cálculo monto por acción: vacaciones=(salarioBase*dias)/30; aprobadas=approvedActionAmountMap; pendientes=action.monto. Ver CALCULOS-PLANILLA-CODIGO-COMENTADO.md
        if (isVacaciones && vacationDays != null && vacationDays > 0) {
          const salarioBase = employeePayrollBasisMap.get(action.idEmpleado)?.salarioBase ?? 0;
          // Vacaciones: aprobada → monto efectivo; pendiente → (salarioBase*dias)/30. Nunca action.monto
          actionAmount = approved
            ? (approvedActionAmountMap.get(Number(action.id)) ?? (salarioBase * vacationDays) / 30)
            : (salarioBase * vacationDays) / 30;
        } else if (approved && approvedActionAmountMap.has(Number(action.id))) {
          // Acción aprobada: monto efectivo aplicado al cálculo
          actionAmount = approvedActionAmountMap.get(Number(action.id)) ?? Number(action.monto ?? 0);
        } else {
          // Acción pendiente u otra: monto capturado por RRHH (no afecta cálculo hasta aprobar)
          actionAmount = Number(action.monto ?? 0);
        }
        const employeeActionRows = displayActionsByEmployee.get(action.idEmpleado) ?? [];
        employeeActionRows.push({
          idAccion: action.id,
          tipoAccion: actionDisplayLabelMap.get(action.id) ?? action.tipoAccion,
          monto: actionAmount,
          fechaEfecto: action.fechaEfecto ?? action.fechaInicioEfecto ?? null,
          estado: this.resolvePersonalActionStatusLabel(action.estado),
          estadoCodigo: Number(action.estado),
          canApprove:
            action.estado === PersonalActionEstado.PENDING_SUPERVISOR ||
            action.estado === PersonalActionEstado.PENDING_RRHH,
        });
        displayActionsByEmployee.set(action.idEmpleado, employeeActionRows);
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
        const daysToSubtract = employeeDaysAdjustmentMap.get(employee.id_empleado) ?? 0;
        let baseDiasLaborados = diasPeriodo;
        if (!isHourly) {
          const ingreso = this.parseFlexibleDate(employee.fecha_ingreso_empleado ?? null);
          if (ingreso) {
            const ingresoMidnight = this.toMidnightUtc(ingreso);
            const startMidnight = this.toMidnightUtc(startDate);
            const endMidnight = this.toMidnightUtc(endDate);
            if (
              ingresoMidnight.getTime() >= startMidnight.getTime() &&
              ingresoMidnight.getTime() <= endMidnight.getTime()
            ) {
              const millisecondsPerDay = 1000 * 60 * 60 * 24;
              baseDiasLaborados =
                Math.floor((endMidnight.getTime() - ingresoMidnight.getTime()) / millisecondsPerDay) +
                1;
            }
          }
          const overrideDays = employeeDaysOverrideMap.get(employee.id_empleado);
          if (overrideDays != null) {
            baseDiasLaborados = Math.max(0, Math.min(baseDiasLaborados, overrideDays));
          }
        }
        const diasLaborados = isHourly ? null : Math.max(0, baseDiasLaborados - daysToSubtract);
        const devengadoDias = isHourly ? null : diasLaborados;
        const devengadoHoras = isHourly ? diasPeriodo * 8 : null;
        // salarioBrutoPeriodo: mensual = base*(dias/30), por horas = base*horas. Ver CALCULOS-PLANILLA-CODIGO-COMENTADO.md
        const salarioBrutoPeriodo = isHourly
          ? salarioBase * (devengadoHoras ?? 0)
          : salarioBase * ((diasLaborados ?? diasPeriodo) / 30);
        const totalBruto = salarioBrutoPeriodo + totals.gross; // gross = acciones aprobadas que suman (aumentos, bonos, vacaciones, etc.)
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
        const totalDeducciones = totals.ded + cargasSociales + impuestoRenta; // ded = retenciones + descuentos aprobados
        const totalNeto = totalBruto - totalDeducciones;
        const employeeSelection = selectionMap.get(Number(employee.id_empleado));
        const isIncludedInPayroll = this.isEmployeeIncludedInPayroll(employeeSelection);

        if (isIncludedInPayroll) {
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
          acciones: [
            ...(displayActionsByEmployee.get(employee.id_empleado) ?? []),
            ...socialChargeDetail.items.map((charge) => ({
              idAccion: null,
              tipoAccion: `CCSS-${charge.nombre}`,
              monto: charge.monto,
              fechaEfecto: payroll.fechaPagoProgramada ?? payroll.fechaFinPeriodo ?? null,
              estado: 'Pendiente',
              estadoCodigo: null,
              canApprove: false,
            })),
            ...(impuestoRenta > 0
              ? [
                  {
                    idAccion: null,
                    tipoAccion: 'impuesto_renta',
                    monto: impuestoRenta,
                    fechaEfecto: payroll.fechaPagoProgramada ?? payroll.fechaFinPeriodo ?? null,
                    estado: 'Pendiente',
                    estadoCodigo: null,
                    canApprove: false,
                  },
                ]
              : []),
          ],
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

  async loadPayrollPreviewTable(
    id: number,
    userId?: number,
  ): Promise<{
    idNomina: number;
    estadoNomina: number;
    generatedAt: string | null;
    totals: {
      totalBruto: string;
      totalDeducciones: string;
      totalNeto: string;
      totalDevengado: string;
      totalCargasSociales: string;
      totalImpuestoRenta: string;
    };
    empleados: Array<{
      idEmpleado: number;
      codigoEmpleado: string;
      nombreEmpleado: string;
      salarioBase: string;
      salarioBrutoPeriodo: string;
      devengadoDias: string;
      devengadoMonto: string;
      cargasSociales: string;
      impuestoRenta: string;
      totalNeto: string;
      dias: string;
      estado: string;
      seleccionadoPlanilla: boolean;
      verificadoEmpleado: boolean;
      requiereRevalidacion: boolean;
      acciones: Array<{
        idAccion: number | null;
        categoria: string;
        tipoAccion: string;
        monto: string;
        tipoSigno: '+' | '-';
        estado: string;
        estadoCodigo?: number | null;
        canApprove?: boolean;
      }>;
    }>;
  }> {
    const payroll = await this.findOne(id, userId);

    if (payroll.esInactivo === this.inactiveFlag) {
      throw new BadRequestException('No se puede cargar una planilla inactiva');
    }

    if ([EstadoCalendarioNomina.ABIERTA, EstadoCalendarioNomina.EN_PROCESO].includes(payroll.estado)) {
      await this.process(id, userId);
    }

    return this.getSnapshotTableDetail(id, userId);
  }

  async getSnapshotTableDetail(
    id: number,
    userId?: number,
  ): Promise<{
    idNomina: number;
    estadoNomina: number;
    generatedAt: string | null;
    totals: {
      totalBruto: string;
      totalDeducciones: string;
      totalNeto: string;
      totalDevengado: string;
      totalCargasSociales: string;
      totalImpuestoRenta: string;
    };
    empleados: Array<{
      idEmpleado: number;
      codigoEmpleado: string;
      nombreEmpleado: string;
      salarioBase: string;
      salarioBrutoPeriodo: string;
      devengadoDias: string;
      devengadoMonto: string;
      cargasSociales: string;
      impuestoRenta: string;
      totalNeto: string;
      dias: string;
      estado: string;
      seleccionadoPlanilla: boolean;
      verificadoEmpleado: boolean;
      requiereRevalidacion: boolean;
      acciones: Array<{
        idAccion: number | null;
        categoria: string;
        tipoAccion: string;
        monto: string;
        tipoSigno: '+' | '-';
        estado: string;
        estadoCodigo?: number | null;
        canApprove?: boolean;
      }>;
    }>;
  }> {
    const payroll = await this.findOne(id, userId);

    const snapshot = await this.planillaSnapshotRepo.findOne({
      where: { idNomina: id },
      order: { id: 'DESC' },
    });

    if (!snapshot?.snapshot) {
      throw new BadRequestException('La planilla aun no tiene datos cargados para mostrar en tabla.');
    }

    const snapshotPayload = snapshot.snapshot as {
      totals?: {
        totalBruto?: number;
        totalDeducciones?: number;
        totalNeto?: number;
        totalDevengado?: number;
        totalCargasSociales?: number;
        totalImpuestoRenta?: number;
      };
      empleados?: Array<{
        idEmpleado?: number;
        salarioBase?: string | number;
        salarioBrutoPeriodo?: string | number;
        totalBruto?: string | number;
        devengadoDias?: string | number | null;
        devengadoHoras?: string | number | null;
        cargasSociales?: string | number;
        impuestoRenta?: string | number;
        totalNeto?: string | number;
        estado?: string;
        seleccionadoPlanilla?: boolean;
        verificadoEmpleado?: boolean;
        requiereRevalidacion?: boolean;
        acciones?: Array<{
          idAccion?: number;
          tipoAccion?: string;
          monto?: number | string;
          estado?: string;
          estadoCodigo?: number | null;
          canApprove?: boolean;
        }>;
      }>;
      generatedAt?: string;
    };

    const rows = Array.isArray(snapshotPayload.empleados) ? snapshotPayload.empleados : [];
    const employeeIds = rows
      .map((row) => Number(row.idEmpleado ?? 0))
      .filter((value) => Number.isInteger(value) && value > 0);

    const canViewSensitive = await this.canViewPayrollSensitiveData(userId, payroll.idEmpresa);
    let employeeInfoMap = new Map<number, { codigo: string; nombre: string }>();
    if (employeeIds.length > 0) {
      const employeesRaw: Array<{
        id_empleado: number;
        codigo_empleado: string | null;
        nombre_empleado: string | null;
        apellido1_empleado: string | null;
        apellido2_empleado: string | null;
      }> = await this.dataSource.query(
        `
          SELECT id_empleado, codigo_empleado, nombre_empleado, apellido1_empleado, apellido2_empleado
          FROM sys_empleados
          WHERE id_empleado IN (${employeeIds.map(() => '?').join(',')})
        `,
        employeeIds,
      );

      employeeInfoMap = new Map(
        employeesRaw.map((row) => {
          const nombre = this.resolveEmployeeDisplayName(
            row.nombre_empleado,
            row.apellido1_empleado,
            row.apellido2_empleado,
            canViewSensitive,
          );
          return [
            Number(row.id_empleado),
            {
              codigo: String(row.codigo_empleado ?? '').trim(),
              nombre,
            },
          ];
        }),
      );
    }

    const selectionMap = await this.loadEmployeeSelectionMap(this.dataSource.manager, id, employeeIds);
    const totals = snapshotPayload.totals ?? {};

    return {
      idNomina: id,
      estadoNomina: payroll.estado,
      generatedAt: snapshotPayload.generatedAt ?? this.toYmd(snapshot.fechaCreacion),
      totals: {
        totalBruto: Number(totals.totalBruto ?? 0).toFixed(2),
        totalDeducciones: Number(totals.totalDeducciones ?? 0).toFixed(2),
        totalNeto: Number(totals.totalNeto ?? 0).toFixed(2),
        totalDevengado: Number(totals.totalDevengado ?? 0).toFixed(2),
        totalCargasSociales: Number(totals.totalCargasSociales ?? 0).toFixed(2),
        totalImpuestoRenta: Number(totals.totalImpuestoRenta ?? 0).toFixed(2),
      },
      empleados: rows.map((row) => {
        const employeeId = Number(row.idEmpleado ?? 0);
        const employeeInfo = employeeInfoMap.get(employeeId);
        const employeeSelection = selectionMap.get(employeeId);
        const isIncludedInPayroll = this.isEmployeeIncludedInPayroll(employeeSelection);
        const devengadoDias = row.devengadoDias ?? row.devengadoHoras ?? 0;
        const actions = Array.isArray(row.acciones) ? row.acciones : [];

        return {
          idEmpleado: employeeId,
          codigoEmpleado: employeeInfo?.codigo || ('KPid-' + employeeId),
          nombreEmpleado: employeeInfo?.nombre || ('Empleado #' + employeeId),
          salarioBase: Number(row.salarioBase ?? 0).toFixed(2),
          salarioBrutoPeriodo: Number(row.salarioBrutoPeriodo ?? 0).toFixed(2),
          devengadoDias: Number(devengadoDias ?? 0).toFixed(4),
          devengadoMonto: Number(row.totalBruto ?? 0).toFixed(2),
          cargasSociales: Number(row.cargasSociales ?? 0).toFixed(2),
          impuestoRenta: Number(row.impuestoRenta ?? 0).toFixed(2),
          totalNeto: Number(row.totalNeto ?? 0).toFixed(2),
          dias: Number(devengadoDias ?? 0).toFixed(2),
          estado:
            typeof row.estado === 'string' && row.estado.trim().length > 0
              ? row.estado.trim()
              : this.resolvePayrollEmployeeReviewStatus(employeeSelection),
          seleccionadoPlanilla:
            typeof row.seleccionadoPlanilla === 'boolean'
              ? row.seleccionadoPlanilla
              : isIncludedInPayroll,
          verificadoEmpleado:
            typeof row.verificadoEmpleado === 'boolean'
              ? row.verificadoEmpleado
              : this.isEmployeeVerifiedForPayroll(employeeSelection),
          requiereRevalidacion:
            typeof row.requiereRevalidacion === 'boolean'
              ? row.requiereRevalidacion
              : this.requiresEmployeeRevalidation(employeeSelection),
          acciones: actions.map((action) => {
            const tipoAccion = String(action.tipoAccion ?? 'Accion').trim() || 'Accion';
            const isDeduction = this.isDeductionAction(tipoAccion) || tipoAccion === 'carga_social' || tipoAccion === 'impuesto_renta' || tipoAccion.toLowerCase().includes('ccss') || tipoAccion.toLowerCase().includes('renta');
            const estadoCodigo = Number.isFinite(Number(action.estadoCodigo))
              ? Number(action.estadoCodigo)
              : null;
            return {
              idAccion: Number.isFinite(Number(action.idAccion)) ? Number(action.idAccion) : null,
              categoria: this.resolveActionCategory(tipoAccion),
              tipoAccion,
              monto: Number(action.monto ?? 0).toFixed(2),
              tipoSigno: isDeduction ? '-' : '+',
              estado:
                typeof action.estado === 'string' && action.estado.trim().length > 0
                  ? action.estado.trim()
                  : this.resolvePersonalActionStatusLabel(estadoCodigo),
              estadoCodigo,
              canApprove: Boolean(action.canApprove),
            };
          }),
        };
      }),
    };
  }

  async findOneByPublicId(publicId: string, userId?: number): Promise<PayrollCalendar> {
    const id = this.decodePayrollPublicId(publicId);
    return this.findOne(id, userId);
  }

  async updateEmployeeSelection(
    payrollId: number,
    employeeIds: number[],
    selected: boolean,
    userId?: number,
  ): Promise<{ updated: number; selected: boolean; employeeIds: number[] }> {
    const payroll = await this.findOne(payrollId, userId);
    if (payroll.esInactivo === this.inactiveFlag || payroll.estado === EstadoCalendarioNomina.APLICADA) {
      throw new BadRequestException(
        'No se puede actualizar seleccion de empleados en una planilla inactiva o aplicada.',
      );
    }

    const uniqueEmployeeIds = Array.from(
      new Set(employeeIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)),
    );
    if (uniqueEmployeeIds.length === 0) {
      throw new BadRequestException('Debe enviar al menos un empleado valido.');
    }

    const validRows: Array<{ id_empleado: number }> = await this.dataSource.query(
      `
        SELECT id_empleado
        FROM sys_empleados
        WHERE id_empresa = ?
          AND id_empleado IN (${uniqueEmployeeIds.map(() => '?').join(',')})
      `,
      [payroll.idEmpresa, ...uniqueEmployeeIds],
    );
    const validEmployeeIds = new Set(validRows.map((row) => Number(row.id_empleado)));
    if (validEmployeeIds.size !== uniqueEmployeeIds.length) {
      throw new BadRequestException(
        'Algunos empleados no pertenecen a la empresa de la planilla seleccionada.',
      );
    }

    const rows = uniqueEmployeeIds.map((employeeId) =>
      this.payrollVerificationRepo.create({
        idNomina: payrollId,
        idEmpleado: employeeId,
        incluidoPlanilla: selected ? 1 : 0,
        verificado: selected ? 1 : 0,
        requiereRevalidacion: 0,
        verificadoPor: selected ? (userId ?? null) : null,
      }),
    );
    await this.payrollVerificationRepo.upsert(rows, ['idNomina', 'idEmpleado']);

    payroll.requiresRecalculation = 1;
    payroll.modificadoPor = userId ?? null;
    payroll.versionLock += 1;
    await this.repo.save(payroll);

    return {
      updated: uniqueEmployeeIds.length,
      selected,
      employeeIds: uniqueEmployeeIds,
    };
  }

  private resolvePersonalActionStatusLabel(
    estadoRaw: PersonalActionEstado | number | null | undefined,
  ): string {
    const estado = Number(estadoRaw ?? 0);
    switch (estado) {
      case PersonalActionEstado.DRAFT:
        return 'Borrador';
      case PersonalActionEstado.PENDING_SUPERVISOR:
        return 'Pendiente Supervisor';
      case PersonalActionEstado.PENDING_RRHH:
        return 'Pendiente RRHH';
      case PersonalActionEstado.APPROVED:
        return 'Aprobada';
      case PersonalActionEstado.CONSUMED:
        return 'Consumida';
      case PersonalActionEstado.CANCELLED:
        return 'Cancelada';
      case PersonalActionEstado.INVALIDATED:
        return 'Invalidada';
      case PersonalActionEstado.EXPIRED:
        return 'Expirada';
      case PersonalActionEstado.REJECTED:
        return 'Rechazada';
      default:
        return 'Pendiente';
    }
  }
  private async canViewPayrollSensitiveData(
    userId: number | undefined,
    companyId: number,
  ): Promise<boolean> {
    if (!userId) return false;
    const resolved = await this.authService.resolvePermissions(userId, companyId, 'kpital');
    return (
      resolved.permissions.includes('payroll:view_sensitive') ||
      resolved.permissions.includes('employee:view-sensitive')
    );
  }

  private resolveEmployeeDisplayName(
    nombreEncrypted: string | null,
    apellido1Encrypted: string | null,
    apellido2Encrypted: string | null,
    canViewSensitive: boolean,
  ): string {
    if (!canViewSensitive) return '';
    return [nombreEncrypted, apellido1Encrypted, apellido2Encrypted]
      .map((part) => this.sensitiveDataService.decrypt(part) ?? '')
      .map((part) => String(part).trim())
      .filter((part) => part.length > 0)
      .join(' ');
  }
  private resolveActionCategory(tipoAccionRaw: string): string {
    const tipoAccion = tipoAccionRaw.toLowerCase();
    if (tipoAccion.includes('carga_social') || tipoAccion.includes('ccss')) return 'Carga Social';
    if (tipoAccion.includes('renta')) return 'Impuesto Renta';
    if (tipoAccion.includes('incapacidad')) return 'Incapacidades';
    if (tipoAccion.includes('ausencia')) return 'Ausencias';
    if (tipoAccion.includes('licencia')) return 'Licencias';
    if (tipoAccion.includes('vacacion')) return 'Vacaciones';
    if (tipoAccion.includes('bonificacion')) return 'Bonificaciones';
    if (tipoAccion.includes('aumento')) return 'Aumentos';
    if (tipoAccion.includes('hora')) return 'Horas Extras';
    if (tipoAccion.includes('retencion')) return 'Retenciones';
    if (tipoAccion.includes('descuento') || tipoAccion.includes('deduccion')) return 'Deducciones';
    return 'Accion Personal';
  }
  private async buildActionDisplayLabelMap(
    manager: EntityManager,
    actions: PersonalAction[],
  ): Promise<Map<number, string>> {
    const actionIds = actions
      .map((action) => Number(action.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    if (!actionIds.length) return new Map<number, string>();

    const idsSql = actionIds.join(',');

    const detailRows = await manager.query(
      `
      SELECT
        x.idAccion,
        x.cantidad,
        x.movimiento,
        x.tipoDetalle,
        x.remuneracion
      FROM (
        SELECT
          l.id_accion AS idAccion,
          l.cantidad_linea AS cantidad,
          m.nombre_movimiento_nomina AS movimiento,
          l.tipo_ausencia_linea AS tipoDetalle,
          l.remuneracion_linea AS remuneracion
        FROM acc_ausencias_lineas l
        LEFT JOIN nom_movimientos_nomina m ON m.id_movimiento_nomina = l.id_movimiento_nomina
        WHERE l.id_accion IN (${idsSql})
        UNION ALL
        SELECT
          l.id_accion AS idAccion,
          l.cantidad_linea AS cantidad,
          m.nombre_movimiento_nomina AS movimiento,
          l.tipo_licencia_linea AS tipoDetalle,
          l.remuneracion_linea AS remuneracion
        FROM acc_licencias_lineas l
        LEFT JOIN nom_movimientos_nomina m ON m.id_movimiento_nomina = l.id_movimiento_nomina
        WHERE l.id_accion IN (${idsSql})
        UNION ALL
        SELECT
          l.id_accion AS idAccion,
          l.cantidad_linea AS cantidad,
          m.nombre_movimiento_nomina AS movimiento,
          l.tipo_incapacidad_linea AS tipoDetalle,
          l.remuneracion_linea AS remuneracion
        FROM acc_incapacidades_lineas l
        LEFT JOIN nom_movimientos_nomina m ON m.id_movimiento_nomina = l.id_movimiento_nomina
        WHERE l.id_accion IN (${idsSql})
        UNION ALL
        SELECT
          l.id_accion AS idAccion,
          l.cantidad_linea AS cantidad,
          m.nombre_movimiento_nomina AS movimiento,
          NULL AS tipoDetalle,
          NULL AS remuneracion
        FROM acc_bonificaciones_lineas l
        LEFT JOIN nom_movimientos_nomina m ON m.id_movimiento_nomina = l.id_movimiento_nomina
        WHERE l.id_accion IN (${idsSql})
        UNION ALL
        SELECT
          l.id_accion AS idAccion,
          l.cantidad_linea AS cantidad,
          m.nombre_movimiento_nomina AS movimiento,
          NULL AS tipoDetalle,
          NULL AS remuneracion
        FROM acc_descuentos_lineas l
        LEFT JOIN nom_movimientos_nomina m ON m.id_movimiento_nomina = l.id_movimiento_nomina
        WHERE l.id_accion IN (${idsSql})
        UNION ALL
        SELECT
          l.id_accion AS idAccion,
          l.cantidad_linea AS cantidad,
          m.nombre_movimiento_nomina AS movimiento,
          NULL AS tipoDetalle,
          NULL AS remuneracion
        FROM acc_retenciones_lineas l
        LEFT JOIN nom_movimientos_nomina m ON m.id_movimiento_nomina = l.id_movimiento_nomina
        WHERE l.id_accion IN (${idsSql})
        UNION ALL
        SELECT
          l.id_accion AS idAccion,
          l.cantidad_linea AS cantidad,
          m.nombre_movimiento_nomina AS movimiento,
          l.tipo_jornada_horas_extras_linea AS tipoDetalle,
          l.remuneracion_linea AS remuneracion
        FROM acc_horas_extras_lineas l
        LEFT JOIN nom_movimientos_nomina m ON m.id_movimiento_nomina = l.id_movimiento_nomina
        WHERE l.id_accion IN (${idsSql})
        UNION ALL
        SELECT
          l.id_accion AS idAccion,
          1 AS cantidad,
          m.nombre_movimiento_nomina AS movimiento,
          l.metodo_calculo_linea AS tipoDetalle,
          l.remuneracion_linea AS remuneracion
        FROM acc_aumentos_lineas l
        LEFT JOIN nom_movimientos_nomina m ON m.id_movimiento_nomina = l.id_movimiento_nomina
        WHERE l.id_accion IN (${idsSql})
        UNION ALL
        -- Vacaciones: días desde acc_vacaciones_fechas (COUNT). Label "Vacaciones (n)". Ver CALCULOS-PLANILLA-CODIGO-COMENTADO.md
        SELECT
          v.id_accion AS idAccion,
          v.cnt AS cantidad,
          NULL AS movimiento,
          NULL AS tipoDetalle,
          NULL AS remuneracion
        FROM (
          SELECT id_accion, COUNT(*) AS cnt
          FROM acc_vacaciones_fechas
          WHERE id_accion IN (${idsSql})
          GROUP BY id_accion
        ) v
      ) x
      `
    );

    const detailByAction = new Map<
      number,
      { cantidad: number; movimiento: string | null; tipoDetalle: string | null; remuneracion: number | null }
    >();

    for (const raw of detailRows as Array<Record<string, unknown>>) {
      const idAccion = Number(raw.idAccion ?? 0);
      if (!Number.isFinite(idAccion) || idAccion <= 0 || detailByAction.has(idAccion)) continue;
      detailByAction.set(idAccion, {
        cantidad: Number(raw.cantidad ?? 0),
        movimiento: raw.movimiento ? String(raw.movimiento) : null,
        tipoDetalle: raw.tipoDetalle ? String(raw.tipoDetalle) : null,
        remuneracion: raw.remuneracion == null ? null : Number(raw.remuneracion),
      });
    }

    const labelMap = new Map<number, string>();
    for (const action of actions) {
      const actionId = Number(action.id);
      const category = this.resolveActionCategory(action.tipoAccion);
      const detail = detailByAction.get(actionId);
      if (!detail) {
        labelMap.set(actionId, category);
        continue;
      }

      const cantidad = Number.isFinite(detail.cantidad) ? detail.cantidad : 0;
      const quantityLabel = this.formatActionQuantityLabel(category, cantidad);
      const baseLabel = quantityLabel ? `${category} (${quantityLabel})` : category;
      const detailParts: string[] = [];

      if (detail.movimiento && detail.movimiento.trim().length > 0) {
        detailParts.push(detail.movimiento.trim());
      }
      if (category === 'Ausencias' && detail.tipoDetalle) {
        detailParts.push(this.resolveAbsenceTypeLabel(detail.tipoDetalle));
        detailParts.push(detail.remuneracion === 1 ? 'Remunerada' : 'No Remunerada');
      }

      labelMap.set(actionId, detailParts.length ? `${baseLabel} - ${detailParts.join(' - ')}` : baseLabel);
    }

    return labelMap;
  }

  private formatActionQuantityLabel(category: string, quantity: number): string {
    if (!Number.isFinite(quantity) || quantity <= 0) return '';
    const normalized = Number(quantity.toFixed(4)).toString();
    if (category === 'Horas Extras') {
      return `${normalized} hrs`;
    }
    return normalized; // Vacaciones y otros: "Vacaciones (n)" con n = cantidad de días
  }

  private resolveAbsenceTypeLabel(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (normalized === 'JUSTIFICADA') return 'Justificada';
    if (normalized === 'NO_JUSTIFICADA') return 'No Justificada';
    return value;
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

    const selectedEmployees = await this.getSelectedEmployeeIdsForPayroll(id);
    if (selectedEmployees.length === 0) {
      throw new BadRequestException(
        'No se puede aplicar: no hay empleados marcados para incluir en la planilla.',
      );
    }
    const blockedForRevalidation = await this.payrollVerificationRepo.count({
      where: {
        idNomina: id,
        idEmpleado: In(selectedEmployees),
        incluidoPlanilla: 1,
        requiereRevalidacion: 1,
      },
    });
    if (blockedForRevalidation > 0) {
      throw new BadRequestException(
        'No se puede aplicar: existen empleados incluidos que requieren revalidacion.',
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
        .andWhere('id_empleado IN (:...selectedEmployees)', { selectedEmployees })
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
   * Registra provision de aguinaldo por planilla aplicada.
   * Formula base: total_bruto / 12 por empleado.
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

    await this.tryAutoReassociateSavedPayroll(saved, userId, 'reopen');

    return saved;
  }

  async inactivate(id: number, userId?: number): Promise<PayrollCalendar> {
    const payroll = await this.findOne(id, userId);
    const payloadBefore = this.buildAuditPayload(payroll);

    if (
      payroll.estado === EstadoCalendarioNomina.APLICADA ||
      payroll.estado === EstadoCalendarioNomina.CONTABILIZADA
    ) {
      throw new BadRequestException(
        'No se puede inactivar una planilla ya aplicada o contabilizada',
      );
    }
    if (payroll.estado === EstadoCalendarioNomina.INACTIVA) {
      throw new BadRequestException('La planilla ya se encuentra inactiva.');
    }

    let affectedActions = 0;
    const saved = await this.dataSource.transaction(async (manager) => {
      const payrollRepo = manager.getRepository(PayrollCalendar);
      const actionRepo = manager.getRepository(PersonalAction);
      const reactivationRepo = manager.getRepository(PayrollReactivationItem);

      const actionsToDetach = await actionRepo.find({
        where: {
          idCalendarioNomina: payroll.id,
          estado: In([
            PersonalActionEstado.DRAFT,
            PersonalActionEstado.PENDING_SUPERVISOR,
            PersonalActionEstado.PENDING_RRHH,
            PersonalActionEstado.APPROVED,
          ] as PersonalActionEstado[]),
        },
      });

      if (actionsToDetach.length > 0) {
        affectedActions = actionsToDetach.length;

        await reactivationRepo.save(
          actionsToDetach.map((action) =>
            reactivationRepo.create({
              idCalendarioNomina: payroll.id,
              idAccion: action.id,
              estadoAnteriorAccion: action.estado,
              estadoNuevoAccion: PersonalActionEstado.PENDING_RRHH,
              esProcesadoReactivacion: 0,
              resultadoReactivacion: null,
              motivoResultadoReactivacion: null,
              creadoPor: userId ?? null,
              modificadoPor: userId ?? null,
            }),
          ),
        );

        await actionRepo
          .createQueryBuilder()
          .update(PersonalAction)
          .set({
            idCalendarioNomina: null,
            estado: PersonalActionEstado.PENDING_RRHH,
            modificadoPor: userId ?? null,
            versionLock: () => 'version_lock_accion + 1',
          })
          .where('id_calendario_nomina = :payrollId', { payrollId: payroll.id })
          .andWhere('estado_accion IN (:...statesToDetach)', {
            statesToDetach: [
              PersonalActionEstado.DRAFT,
              PersonalActionEstado.PENDING_SUPERVISOR,
              PersonalActionEstado.PENDING_RRHH,
              PersonalActionEstado.APPROVED,
            ],
          })
          .execute();
      }

      payroll.esInactivo = this.inactiveFlag;
      payroll.estado = EstadoCalendarioNomina.INACTIVA;
      payroll.isActiveSlot = 0;
      payroll.slotKey = this.buildInactiveSlotKey(payroll.slotKey, payroll.id);
      payroll.modificadoPor = userId ?? null;
      payroll.versionLock += 1;

      return payrollRepo.save(payroll);
    });

    this.auditOutbox.publish({
      modulo: 'payroll',
      accion: 'inactivate',
      entidad: 'payroll',
      entidadId: saved.id,
      actorUserId: userId ?? null,
      descripcion: `Planilla inactivada: ${saved.nombrePlanilla ?? `#${saved.id}`}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
      metadata: {
        accionesDesasociadas: affectedActions,
        nuevoEstadoAcciones: 'PENDING_RRHH',
      },
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PAYROLL.DEACTIVATED, {
      eventName: DOMAIN_EVENTS.PAYROLL.DEACTIVATED,
      occurredAt: new Date(),
      payload: { payrollId: String(saved.id), accionesDesasociadas: affectedActions },
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: DOMAIN_EVENTS.PAYROLL.DEACTIVATED,
      payload: { version: saved.versionLock, accionesDesasociadas: affectedActions },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.deactivated:${saved.id}:${saved.versionLock}`,
    });

    return saved;
  }

  async reactivate(id: number, userId?: number): Promise<PayrollCalendar> {
    const payroll = await this.findOne(id, userId);
    const payloadBefore = this.buildAuditPayload(payroll);

    if (payroll.estado !== EstadoCalendarioNomina.INACTIVA) {
      throw new BadRequestException('Solo se puede reactivar una planilla en estado Inactiva.');
    }

    const operationalSlotKey = this.buildSlotKey(
      payroll.idEmpresa,
      payroll.fechaInicioPeriodo,
      payroll.fechaFinPeriodo,
      payroll.idTipoPlanilla ?? null,
      payroll.moneda,
    );

    const slotConflict = await this.repo
      .createQueryBuilder('p')
      .where('p.slotKey = :slotKey', { slotKey: operationalSlotKey })
      .andWhere('p.isActiveSlot = 1')
      .andWhere('p.id != :id', { id: payroll.id })
      .getOne();

    if (slotConflict) {
      throw new ConflictException(
        'No se puede reactivar porque existe otra planilla operativa para el mismo periodo/tipo/moneda.',
      );
    }

    let reasociadas = 0;
    let pendientes = 0;

    const saved = await this.dataSource.transaction(async (manager) => {
      const payrollRepo = manager.getRepository(PayrollCalendar);
      const actionRepo = manager.getRepository(PersonalAction);
      const reactivationRepo = manager.getRepository(PayrollReactivationItem);

      const snapshots = await reactivationRepo.find({
        where: { idCalendarioNomina: payroll.id, esProcesadoReactivacion: 0 },
        order: { id: 'ASC' },
      });

      const sourcePayrollIds = Array.from(
        new Set(snapshots.map((row) => Number(row.idCalendarioNomina)).filter((value) => value > 0)),
      );
      const sourcePayrollMap = new Map<number, PayrollCalendar>();
      if (sourcePayrollIds.length > 0) {
        const sourcePayrolls = await payrollRepo.find({ where: { id: In(sourcePayrollIds) } });
        sourcePayrolls.forEach((item) => sourcePayrollMap.set(item.id, item));
      }

      const actionIds = Array.from(new Set(snapshots.map((row) => Number(row.idAccion))));
      const actionMap = new Map<number, PersonalAction>();
      if (actionIds.length > 0) {
        const actions = await actionRepo.find({ where: { id: In(actionIds) } });
        actions.forEach((action) => actionMap.set(action.id, action));
      }

      const eligibleActionIds: number[] = [];

      for (const snapshot of snapshots) {
        const action = actionMap.get(Number(snapshot.idAccion));
        const reason = this.resolveReactivationIneligibilityReason(
          action,
          payroll,
          snapshot,
          sourcePayrollMap,
        );

        if (!reason) {
          eligibleActionIds.push(Number(snapshot.idAccion));
          snapshot.resultadoReactivacion = 'REASSOCIATED';
          snapshot.motivoResultadoReactivacion = 'Reasociada a planilla reactivada.';
          reasociadas += 1;
        } else {
          snapshot.resultadoReactivacion = 'PENDING_RRHH';
          snapshot.motivoResultadoReactivacion = reason;
          pendientes += 1;
        }

        snapshot.esProcesadoReactivacion = 1;
        snapshot.modificadoPor = userId ?? null;
      }

      if (eligibleActionIds.length > 0) {
        await actionRepo
          .createQueryBuilder()
          .update(PersonalAction)
          .set({
            idCalendarioNomina: payroll.id,
            estado: PersonalActionEstado.PENDING_RRHH,
            modificadoPor: userId ?? null,
            versionLock: () => 'version_lock_accion + 1',
          })
          .where('id_accion IN (:...ids)', { ids: eligibleActionIds })
          .execute();
      }

      if (snapshots.length > 0) {
        await reactivationRepo.save(snapshots);
      }

      payroll.esInactivo = this.activeFlag;
      payroll.estado = EstadoCalendarioNomina.ABIERTA;
      payroll.isActiveSlot = 1;
      payroll.slotKey = operationalSlotKey;
      payroll.modificadoPor = userId ?? null;
      payroll.versionLock += 1;

      return payrollRepo.save(payroll);
    });

    this.auditOutbox.publish({
      modulo: 'payroll',
      accion: 'reactivate',
      entidad: 'payroll',
      entidadId: saved.id,
      actorUserId: userId ?? null,
      descripcion: `Planilla reactivada: ${saved.nombrePlanilla ?? `#${saved.id}`}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
      metadata: {
        accionesReasociadas: reasociadas,
        accionesPendientesRrhh: pendientes,
      },
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: DOMAIN_EVENTS.PAYROLL.REOPENED,
      payload: {
        version: saved.versionLock,
        accionesReasociadas: reasociadas,
        accionesPendientesRrhh: pendientes,
      },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.reactivated:${saved.id}:${saved.versionLock}`,
    });

    await this.tryAutoReassociateSavedPayroll(saved, userId, 'reactivate');

    return saved;
  }

  async reassignOrphanActionsForPayroll(
    payrollId: number,
    userId?: number,
    trigger: 'create' | 'reopen' | 'reactivate' | 'cron' | 'manual' = 'manual',
  ): Promise<number> {
    const payroll = await this.findOne(payrollId, userId);
    if (
      payroll.esInactivo === this.inactiveFlag ||
      payroll.estado === EstadoCalendarioNomina.INACTIVA ||
      !this.autoReassignmentEligiblePayrollStates.includes(payroll.estado)
    ) {
      return 0;
    }

    return this.dataSource.transaction(async (manager) => {
      const actionRepo = manager.getRepository(PersonalAction);
      const reactivationRepo = manager.getRepository(PayrollReactivationItem);

      const pendingSnapshots = await reactivationRepo.find({
        where: { esProcesadoReactivacion: 0 },
        order: { id: 'ASC' },
      });
      if (pendingSnapshots.length === 0) return 0;

      const sourcePayrollIds = Array.from(
        new Set(
          pendingSnapshots
            .map((row) => Number(row.idCalendarioNomina))
            .filter((value) => Number.isFinite(value) && value > 0),
        ),
      );
      const sourcePayrollMap = new Map<number, PayrollCalendar>();
      if (sourcePayrollIds.length > 0) {
        const sourcePayrolls = await manager.getRepository(PayrollCalendar).find({
          where: { id: In(sourcePayrollIds) },
        });
        sourcePayrolls.forEach((item) => sourcePayrollMap.set(item.id, item));
      }

      const actionIds = Array.from(new Set(pendingSnapshots.map((row) => Number(row.idAccion))));
      const actions = actionIds.length > 0 ? await actionRepo.find({ where: { id: In(actionIds) } }) : [];
      const actionMap = new Map<number, PersonalAction>();
      actions.forEach((action) => actionMap.set(action.id, action));

      const eligibleActionIds: number[] = [];
      const terminalSnapshotIds: number[] = [];
      const terminalReasonsBySnapshotId = new Map<number, string>();

      for (const snapshot of pendingSnapshots) {
        const action = actionMap.get(Number(snapshot.idAccion));
        const reason = this.resolveReactivationIneligibilityReason(
          action,
          payroll,
          snapshot,
          sourcePayrollMap,
        );

        if (!reason) {
          eligibleActionIds.push(Number(snapshot.idAccion));
          continue;
        }

        if (this.isTerminalAutoReassignmentReason(reason)) {
          terminalSnapshotIds.push(snapshot.id);
          terminalReasonsBySnapshotId.set(snapshot.id, reason);
        }
      }

      const uniqueEligibleActionIds = Array.from(new Set(eligibleActionIds));

      if (uniqueEligibleActionIds.length > 0) {
        await actionRepo
          .createQueryBuilder()
          .update(PersonalAction)
          .set({
            idCalendarioNomina: payroll.id,
            estado: PersonalActionEstado.PENDING_RRHH,
            modificadoPor: userId ?? null,
            versionLock: () => 'version_lock_accion + 1',
          })
          .where('id_accion IN (:...ids)', { ids: uniqueEligibleActionIds })
          .andWhere('id_calendario_nomina IS NULL')
          .execute();

        await reactivationRepo
          .createQueryBuilder()
          .update(PayrollReactivationItem)
          .set({
            esProcesadoReactivacion: 1,
            resultadoReactivacion: 'REASSOCIATED_AUTO',
            motivoResultadoReactivacion: `Reasociada automaticamente por ${trigger} a planilla #${payroll.id}.`,
            modificadoPor: userId ?? null,
          })
          .where('id_accion IN (:...ids)', { ids: uniqueEligibleActionIds })
          .andWhere('es_procesado_reactivacion = 0')
          .execute();
      }

      if (terminalSnapshotIds.length > 0) {
        const snapshotsToClose = pendingSnapshots
          .filter((snapshot) => terminalSnapshotIds.includes(snapshot.id))
          .map((snapshot) => {
            snapshot.esProcesadoReactivacion = 1;
            snapshot.resultadoReactivacion = 'PENDING_RRHH';
            snapshot.motivoResultadoReactivacion =
              terminalReasonsBySnapshotId.get(snapshot.id) ?? 'Requiere revision de RRHH.';
            snapshot.modificadoPor = userId ?? null;
            return snapshot;
          });
        await reactivationRepo.save(snapshotsToClose);
      }

      return uniqueEligibleActionIds.length;
    });
  }

  private resolveReactivationIneligibilityReason(
    action: PersonalAction | undefined,
    payroll: PayrollCalendar,
    snapshot: PayrollReactivationItem,
    sourcePayrollMap: Map<number, PayrollCalendar>,
  ): string | null {
    if (!action) return 'La accion ya no existe.';

    const sourcePayroll = sourcePayrollMap.get(Number(snapshot.idCalendarioNomina));
    if (!sourcePayroll) {
      return 'No existe planilla origen del snapshot para comparar compatibilidad.';
    }

    if (!this.arePayrollsStrictlyCompatible(sourcePayroll, payroll)) {
      return 'La planilla destino no coincide exactamente con la planilla origen del snapshot.';
    }

    if (action.idCalendarioNomina != null && action.idCalendarioNomina !== payroll.id) {
      return 'La accion ya esta ligada a otra planilla.';
    }

    if (action.idEmpresa !== payroll.idEmpresa) {
      return 'La accion pertenece a otra empresa.';
    }

    if (action.moneda !== payroll.moneda) {
      return 'Moneda de accion incompatible con la planilla.';
    }

    if (this.personalActionFinalStates.includes(action.estado)) {
      return 'La accion esta en estado final y no puede reasociarse.';
    }

    const effectDate = action.fechaInicioEfecto ?? action.fechaEfecto;
    if (effectDate) {
      const effectYmd = this.toYmd(effectDate);
      if (
        effectYmd < this.toYmd(payroll.fechaInicioPeriodo) ||
        effectYmd > this.toYmd(payroll.fechaFinPeriodo)
      ) {
        return 'Fecha de efecto fuera del periodo de la planilla.';
      }
    }

    return null;
  }

  private arePayrollsStrictlyCompatible(
    sourcePayroll: PayrollCalendar,
    candidatePayroll: PayrollCalendar,
  ): boolean {
    return (
      sourcePayroll.idPeriodoPago === candidatePayroll.idPeriodoPago &&
      (sourcePayroll.idTipoPlanilla ?? null) === (candidatePayroll.idTipoPlanilla ?? null) &&
      sourcePayroll.tipoPlanilla === candidatePayroll.tipoPlanilla &&
      sourcePayroll.moneda === candidatePayroll.moneda &&
      this.sameYmd(sourcePayroll.fechaInicioPeriodo, candidatePayroll.fechaInicioPeriodo) &&
      this.sameYmd(sourcePayroll.fechaFinPeriodo, candidatePayroll.fechaFinPeriodo)
    );
  }

  private sameYmd(left: Date, right: Date): boolean {
    return this.toYmd(left) === this.toYmd(right);
  }

  private isTerminalAutoReassignmentReason(reason: string): boolean {
    const terminalReasons = new Set<string>([
      'La accion ya no existe.',
      'La accion ya esta ligada a otra planilla.',
      'La accion esta en estado final y no puede reasociarse.',
    ]);

    return terminalReasons.has(reason);
  }

  private async tryAutoReassociateSavedPayroll(
    payroll: PayrollCalendar,
    userId: number | undefined,
    trigger: 'create' | 'reopen' | 'reactivate',
  ): Promise<void> {
    try {
      const reassociated = await this.reassignOrphanActionsForPayroll(payroll.id, userId, trigger);
      if (reassociated > 0) {
        this.logger.log(
          JSON.stringify({
            operation: 'payroll-auto-reassociate',
            trigger,
            payrollId: payroll.id,
            reassociated,
          }),
        );
      }
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          operation: 'payroll-auto-reassociate-failed',
          trigger,
          payrollId: payroll.id,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
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
      publicId: this.encodePayrollPublicId(entity.id),
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
      fechaCreacion: entity.fechaCreacion ? this.toYmd(entity.fechaCreacion) : null,
      fechaModificacion: entity.fechaModificacion ? this.toYmd(entity.fechaModificacion) : null,
      creadoPor: entity.creadoPor ?? null,
      modificadoPor: entity.modificadoPor ?? null,
      versionLock: entity.versionLock,
    };
  }

  private encodePayrollPublicId(id: number): string {
    const payload = Buffer.from(String(id), 'utf8').toString('base64url');
    const signature = createHmac('sha256', this.publicIdSecret)
      .update(payload)
      .digest('base64url')
      .slice(0, 16);
    return `p1_${payload}.${signature}`;
  }

  private decodePayrollPublicId(publicId: string): number {
    const raw = String(publicId ?? '').trim();
    const match = /^p1_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(raw);
    if (!match) {
      throw new NotFoundException('Planilla no encontrada');
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
      throw new NotFoundException('Planilla no encontrada');
    }

    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const id = Number(decoded);
    if (!Number.isInteger(id) || id <= 0) {
      throw new NotFoundException('Planilla no encontrada');
    }

    return id;
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

  private normalizePayrollNameBase(name: string): string {
    const compact = String(name ?? '').replace(/\\s+/g, ' ').trim();
    const withoutSuffix = compact.replace(/-\\d{4}$/, '').trim();
    const maxBaseLength = 145;
    return withoutSuffix.slice(0, maxBaseLength).trim();
  }

  private buildPayrollNameWithConsecutiveSuffix(baseName: string, payrollId: number): string {
    const normalizedBase = this.normalizePayrollNameBase(baseName);
    const sequence = String(Math.max(1, Number(payrollId) || 1)).padStart(4, '0');
    return `${normalizedBase}-${sequence}`;
  }

  private buildInactiveSlotKey(currentSlotKey: string | null | undefined, payrollId: number): string {
    const baseSlotKey = String(currentSlotKey ?? '').trim() || ('inactive|' + String(payrollId));
    const suffix = '|inactive|' + String(payrollId);
    const maxLength = 255;
    const maxBaseLength = Math.max(1, maxLength - suffix.length);
    const trimmedBase = baseSlotKey.slice(0, maxBaseLength);
    return `${trimmedBase}${suffix}`;
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
    const decrypted = this.sensitiveDataService.decrypt(value);
    const raw = String(decrypted ?? value ?? '0').replace(/,/g, '').trim();
    const amount = Number(raw);
    if (Number.isNaN(amount)) return '0.00';
    if (amount < 0) return '0.00';
    return amount.toFixed(2);
  }

  private isDeductionAction(actionType: string): boolean {
    return this.isNetDeductionAction(actionType);
  }

  /** Retenciones y descuentos van a deducciones; el resto al bruto. Ver CALCULOS-PLANILLA-CODIGO-COMENTADO.md */
  private isNetDeductionAction(actionType: string): boolean {
    const normalized = this.normalizeActionType(actionType);
    return (
      normalized.includes('deduc') ||
      normalized.includes('retencion') ||
      normalized.includes('descuento')
    );
  }

  private resolveRetroMetadata(
    action: PersonalAction,
    payroll: PayrollCalendar,
  ): { isRetro: boolean; originalPeriod: string | null } {
    const effectStartRaw = action.fechaInicioEfecto ?? action.fechaEfecto;
    const effectStart = this.parseFlexibleDate(effectStartRaw);
    if (!effectStart) {
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
    const actionStartRaw = action.fechaInicioEfecto ?? action.fechaEfecto;
    const actionEndRaw = action.fechaFinEfecto ?? action.fechaInicioEfecto ?? action.fechaEfecto;
    const actionStart = this.parseFlexibleDate(actionStartRaw);
    const actionEnd = this.parseFlexibleDate(actionEndRaw);

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

  /**
   * Carga reglas por tipo de acción desde tablas:
   * - acc_ausencias_lineas, acc_licencias_lineas, acc_incapacidades_lineas
   * - acc_vacaciones_fechas (COUNT días), acc_aumentos_lineas, acc_bonificaciones_lineas
   * - acc_horas_extras_lineas, acc_retenciones_lineas, acc_descuentos_lineas
   * Ver: docs/08-planilla/CALCULOS-PLANILLA-CODIGO-COMENTADO.md
   */
  private async loadApprovedActionRuleMap(
    manager: EntityManager,
    actionIds: number[],
  ): Promise<Map<number, ApprovedActionRuleData>> {
    const map = new Map<number, ApprovedActionRuleData>();
    if (actionIds.length === 0) return map;

    const placeholders = actionIds.map(() => '?').join(', ');

    const absenceRows = (await manager.query(
      `
        SELECT
          id_accion AS actionId,
          COALESCE(SUM(CASE WHEN remuneracion_linea = 0 THEN cantidad_linea ELSE 0 END), 0) AS nonRemDays,
          COALESCE(SUM(CASE WHEN remuneracion_linea = 1 THEN monto_linea ELSE 0 END), 0) AS remAmount
        FROM acc_ausencias_lineas
        WHERE id_accion IN (${placeholders})
        GROUP BY id_accion
      `,
      actionIds,
    )) as Array<{ actionId: number; nonRemDays: number | string; remAmount: number | string }>;

    for (const row of absenceRows) {
      const data = this.getOrInitActionRuleData(map, Number(row.actionId));
      data.absenceNonRemDays = this.toSafeNumber(row.nonRemDays);
      data.absenceRemAmount = this.toSafeNumber(row.remAmount);
    }

    const licenseRows = (await manager.query(
      `
        SELECT
          id_accion AS actionId,
          COALESCE(SUM(CASE WHEN remuneracion_linea = 0 THEN cantidad_linea ELSE 0 END), 0) AS nonRemDays,
          COALESCE(SUM(CASE WHEN remuneracion_linea = 1 THEN cantidad_linea ELSE 0 END), 0) AS remDays,
          COALESCE(SUM(CASE WHEN remuneracion_linea = 1 THEN monto_linea ELSE 0 END), 0) AS remuneratedAmount
        FROM acc_licencias_lineas
        WHERE id_accion IN (${placeholders})
        GROUP BY id_accion
      `,
      actionIds,
    )) as Array<{
      actionId: number;
      nonRemDays: number | string;
      remDays: number | string;
      remuneratedAmount: number | string;
    }>;

    for (const row of licenseRows) {
      const data = this.getOrInitActionRuleData(map, Number(row.actionId));
      data.licenseNonRemDays = this.toSafeNumber(row.nonRemDays);
      data.licenseRemDays = this.toSafeNumber(row.remDays);
      data.licenseRemAmount = this.toSafeNumber(row.remuneratedAmount);
    }

    const disabilityRows = (await manager.query(
      `
        SELECT
          id_accion AS actionId,
          COALESCE(SUM(cantidad_linea), 0) AS disabilityDays,
          COALESCE(SUM(CASE WHEN UPPER(tipo_institucion_linea) = 'CCSS' THEN monto_linea ELSE 0 END), 0) AS ccssAmount
        FROM acc_incapacidades_lineas
        WHERE id_accion IN (${placeholders})
        GROUP BY id_accion
      `,
      actionIds,
    )) as Array<{ actionId: number; disabilityDays: number | string; ccssAmount: number | string }>;

    for (const row of disabilityRows) {
      const data = this.getOrInitActionRuleData(map, Number(row.actionId));
      data.disabilityDays = this.toSafeNumber(row.disabilityDays);
      data.disabilityCcssAmount = this.toSafeNumber(row.ccssAmount);
    }

    const vacationRows = (await manager.query(
      `
        SELECT
          id_accion AS actionId,
          COUNT(*) AS vacationDays
        FROM acc_vacaciones_fechas
        WHERE id_accion IN (${placeholders})
        GROUP BY id_accion
      `,
      actionIds,
    )) as Array<{ actionId: number; vacationDays: number | string }>;

    for (const row of vacationRows) {
      const data = this.getOrInitActionRuleData(map, Number(row.actionId));
      data.vacationDays = this.toSafeNumber(row.vacationDays);
    }

    const increaseRows = (await manager.query(
      `
        SELECT
          id_accion AS actionId,
          COALESCE(SUM(monto_linea), 0) AS amount
        FROM acc_aumentos_lineas
        WHERE id_accion IN (${placeholders})
        GROUP BY id_accion
      `,
      actionIds,
    )) as Array<{ actionId: number; amount: number | string }>;

    for (const row of increaseRows) {
      const data = this.getOrInitActionRuleData(map, Number(row.actionId));
      data.increaseAmount = this.toSafeNumber(row.amount);
    }

    const bonusRows = (await manager.query(
      `
        SELECT
          id_accion AS actionId,
          COALESCE(SUM(monto_linea), 0) AS amount
        FROM acc_bonificaciones_lineas
        WHERE id_accion IN (${placeholders})
        GROUP BY id_accion
      `,
      actionIds,
    )) as Array<{ actionId: number; amount: number | string }>;

    for (const row of bonusRows) {
      const data = this.getOrInitActionRuleData(map, Number(row.actionId));
      data.bonusAmount = this.toSafeNumber(row.amount);
    }

    const overtimeRows = (await manager.query(
      `
        SELECT
          id_accion AS actionId,
          COALESCE(SUM(monto_linea), 0) AS amount
        FROM acc_horas_extras_lineas
        WHERE id_accion IN (${placeholders})
        GROUP BY id_accion
      `,
      actionIds,
    )) as Array<{ actionId: number; amount: number | string }>;

    for (const row of overtimeRows) {
      const data = this.getOrInitActionRuleData(map, Number(row.actionId));
      data.overtimeAmount = this.toSafeNumber(row.amount);
    }

    const retentionRows = (await manager.query(
      `
        SELECT
          id_accion AS actionId,
          COALESCE(SUM(monto_linea), 0) AS amount
        FROM acc_retenciones_lineas
        WHERE id_accion IN (${placeholders})
        GROUP BY id_accion
      `,
      actionIds,
    )) as Array<{ actionId: number; amount: number | string }>;

    for (const row of retentionRows) {
      const data = this.getOrInitActionRuleData(map, Number(row.actionId));
      data.retentionAmount = this.toSafeNumber(row.amount);
    }

    const discountRows = (await manager.query(
      `
        SELECT
          id_accion AS actionId,
          COALESCE(SUM(monto_linea), 0) AS amount
        FROM acc_descuentos_lineas
        WHERE id_accion IN (${placeholders})
        GROUP BY id_accion
      `,
      actionIds,
    )) as Array<{ actionId: number; amount: number | string }>;

    for (const row of discountRows) {
      const data = this.getOrInitActionRuleData(map, Number(row.actionId));
      data.discountAmount = this.toSafeNumber(row.amount);
    }

    return map;
  }

  /** Días a restar del devengado: ausencias, licencias no rem, incapacidades, vacaciones. Ver CALCULOS-PLANILLA-CODIGO-COMENTADO.md */
  private resolveApprovedActionDaysImpact(
    actionType: string,
    data?: ApprovedActionRuleData,
  ): number {
    if (!data) return 0;
    const normalizedType = this.normalizeActionType(actionType);

    if (normalizedType === 'ausencia') return data.absenceNonRemDays;
    if (normalizedType === 'licencia') return data.licenseNonRemDays;
    if (normalizedType === 'incapacidad') return data.disabilityDays;
    if (normalizedType === 'vacaciones' || normalizedType === 'vacacion' || normalizedType === 'vacation') {
      return data.vacationDays;
    }
    return 0;
  }

  /**
   * Monto efectivo por tipo: ausencias=0, licencias=remAmount, incapacidades=ccssAmount,
   * vacaciones=(salarioBase/30)*dias, aumentos/bonos/horas=monto_linea, ret/desc=monto_linea.
   * Ver: docs/08-planilla/CALCULOS-PLANILLA-CODIGO-COMENTADO.md
   */
  private resolveApprovedActionAmountForPayroll(
    actionType: string,
    defaultAmount: number,
    data: ApprovedActionRuleData | undefined,
    salaryBase: number,
    isHourly: boolean,
  ): number {
    const normalizedType = this.normalizeActionType(actionType);

    if (normalizedType === 'ausencia') {
      return data && data.absenceRemAmount > 0 ? data.absenceRemAmount : 0;
    }

    if (normalizedType === 'licencia') {
      if (!data) return defaultAmount;
      if (data.licenseRemAmount > 0) return data.licenseRemAmount;
      if (data.licenseRemDays > 0) return Number(((salaryBase / 30) * data.licenseRemDays).toFixed(2));
      const totalDays = data.licenseNonRemDays + data.licenseRemDays;
      if (totalDays > 0) return Number(((salaryBase / 30) * totalDays).toFixed(2));
      return 0;
    }

    if (normalizedType === 'incapacidad') {
      return data ? data.disabilityCcssAmount : defaultAmount;
    }

    if (normalizedType === 'aumento') {
      return data && data.increaseAmount > 0 ? data.increaseAmount : defaultAmount;
    }

    if (normalizedType === 'bonificacion') {
      return data && data.bonusAmount > 0 ? data.bonusAmount : defaultAmount;
    }

    if (normalizedType === 'hora_extra') {
      return data && data.overtimeAmount > 0 ? data.overtimeAmount : defaultAmount;
    }

    if (normalizedType === 'retencion' || normalizedType === 'deduccion_retencion') {
      return data && data.retentionAmount > 0 ? data.retentionAmount : defaultAmount;
    }

    if (normalizedType === 'descuento' || normalizedType === 'deduccion_descuento') {
      return data && data.discountAmount > 0 ? data.discountAmount : defaultAmount;
    }

    if (normalizedType === 'vacaciones' || normalizedType === 'vacacion' || normalizedType === 'vacation') {
      if (!data || data.vacationDays <= 0) return 0;
      if (isHourly) return defaultAmount;
      return Number(((salaryBase / 30) * data.vacationDays).toFixed(2));
    }

    return defaultAmount;
  }

  private getOrInitActionRuleData(
    map: Map<number, ApprovedActionRuleData>,
    actionId: number,
  ): ApprovedActionRuleData {
    const existing = map.get(actionId);
    if (existing) return existing;
    const created: ApprovedActionRuleData = {
      absenceNonRemDays: 0,
      absenceRemAmount: 0,
      licenseNonRemDays: 0,
      licenseRemDays: 0,
      licenseRemAmount: 0,
      disabilityDays: 0,
      disabilityCcssAmount: 0,
      vacationDays: 0,
      increaseAmount: 0,
      bonusAmount: 0,
      overtimeAmount: 0,
      retentionAmount: 0,
      discountAmount: 0,
    };
    map.set(actionId, created);
    return created;
  }

  private resolveTerminationDaysImpact(
    action: PersonalAction,
    payrollStart: Date,
    payrollEnd: Date,
  ): number | null {
    const normalizedType = this.normalizeActionType(action.tipoAccion);
    if (!normalizedType.includes('renuncia') && !normalizedType.includes('despid')) {
      return null;
    }

    const endRaw = action.fechaFinEfecto ?? action.fechaInicioEfecto ?? action.fechaEfecto;
    const endDate = this.parseFlexibleDate(endRaw);
    if (!endDate) return null;

    const endMidnight = this.toMidnightUtc(endDate);
    const periodStart = this.toMidnightUtc(payrollStart);
    const periodEnd = this.toMidnightUtc(payrollEnd);
    const clampedEnd = Math.min(endMidnight.getTime(), periodEnd.getTime());
    if (clampedEnd < periodStart.getTime()) return 0;

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((clampedEnd - periodStart.getTime()) / millisecondsPerDay) + 1;
  }

  private toSafeNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return 0;
    return parsed;
  }

  private normalizeActionType(actionType: string): string {
    return String(actionType ?? '').trim().toLowerCase();
  }

  private toMidnightUtc(value: Date | string): Date {
    const parsed = this.parseFlexibleDate(value);
    if (!parsed) {
      throw new BadRequestException('Fecha invalida para normalizacion UTC.');
    }
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  private parseFlexibleDate(value: Date | string | null | undefined): Date | null {
    if (value == null) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value !== 'string') return null;

    const normalized = value.trim();
    if (!normalized) return null;

    const isoDateOnly = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateOnly) {
      const [, year, month, day] = isoDateOnly;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }

    const mysqlDateTime = normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/,
    );
    if (mysqlDateTime) {
      const [, year, month, day, hour, minute, second] = mysqlDateTime;
      return new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute),
          Number(second),
        ),
      );
    }

    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    return null;
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

  /** Cargas = totalBruto * porcentaje por cada carga. Ver CALCULOS-PLANILLA-CODIGO-COMENTADO.md */
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

  /** Renta por tramos + créditos. Quincenal solo 2da quincena. Ver CALCULOS-PLANILLA-CODIGO-COMENTADO.md */
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
    return normalized === 'casado' || normalized === 'union libre';
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
      salario_bruto_periodo_resultado: string;
    }> = await manager.query(
      `
        SELECT r.id_empleado, r.salario_bruto_periodo_resultado
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
      map.set(row.id_empleado, Number(row.salario_bruto_periodo_resultado ?? 0));
    }
    return map;
  }

  private async loadEmployeeSelectionMap(
    manager: EntityManager,
    payrollId: number,
    employeeIds: number[],
  ): Promise<Map<number, PayrollEmployeeVerification>> {
    const uniqueEmployeeIds = Array.from(
      new Set(employeeIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)),
    );
    if (uniqueEmployeeIds.length === 0) return new Map();
    const rows = await manager.find(PayrollEmployeeVerification, {
      where: {
        idNomina: payrollId,
        idEmpleado: In(uniqueEmployeeIds),
      },
    });
    return new Map(rows.map((row) => [Number(row.idEmpleado), row]));
  }

  private isEmployeeIncludedInPayroll(selection: PayrollEmployeeVerification | undefined): boolean {
    if (!selection) return false;
    return Number(selection.incluidoPlanilla ?? 0) === 1;
  }

  private isEmployeeVerifiedForPayroll(selection: PayrollEmployeeVerification | undefined): boolean {
    if (!selection) return false;
    return Number(selection.verificado ?? 0) === 1;
  }

  private requiresEmployeeRevalidation(selection: PayrollEmployeeVerification | undefined): boolean {
    if (!selection) return false;
    return Number(selection.requiereRevalidacion ?? 0) === 1;
  }

  private resolvePayrollEmployeeReviewStatus(
    selection: PayrollEmployeeVerification | undefined,
  ): string {
    if (!this.isEmployeeIncludedInPayroll(selection)) return 'Excluido';
    if (this.requiresEmployeeRevalidation(selection)) return 'Requiere revalidacion';
    if (this.isEmployeeVerifiedForPayroll(selection)) return 'Verificado';
    return 'Pendiente';
  }

  private async getSelectedEmployeeIdsForPayroll(payrollId: number): Promise<number[]> {
    const results = await this.payrollResultRepo.find({
      where: { idNomina: payrollId },
      select: ['idEmpleado'],
    });
    return Array.from(
      new Set(
        results
          .map((row) => Number(row.idEmpleado))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );
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




























