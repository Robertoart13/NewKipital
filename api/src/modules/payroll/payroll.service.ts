import {
  Logger,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PayrollCalendar,
  EstadoCalendarioNomina,
  TipoPlanilla,
  MonedaCalendario,
} from './entities/payroll-calendar.entity';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { DOMAIN_EVENTS } from '../../common/events/event-names';
import { DomainEventsService } from '../integration/domain-events.service';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { EmployeeVacationService } from '../employees/services/employee-vacation.service';
import { PayrollEmployeeSnapshot } from './entities/payroll-employee-snapshot.entity';
import {
  PayrollInputSnapshot,
  PayrollInputSourceType,
} from './entities/payroll-input-snapshot.entity';
import { PayrollResult } from './entities/payroll-result.entity';
import {
  PersonalAction,
  PersonalActionEstado,
  PERSONAL_ACTION_APPROVED_STATES,
} from '../personal-actions/entities/personal-action.entity';
import { PersonalActionAutoInvalidationService } from '../personal-actions/personal-action-auto-invalidation.service';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

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
    const fechaDesde = fechaDesdeRaw
      ? this.parseQueryDate(fechaDesdeRaw, 'fechaDesde')
      : undefined;
    const fechaHasta = fechaHastaRaw
      ? this.parseQueryDate(fechaHastaRaw, 'fechaHasta')
      : undefined;

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      throw new BadRequestException(
        'fechaDesde no puede ser mayor que fechaHasta.',
      );
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
      qb.andWhere('(p.esInactivo = 1 OR p.estado = :inactiva)', {
        inactiva: EstadoCalendarioNomina.INACTIVA,
      });
    } else if (!includeInactive) {
      qb.andWhere('p.esInactivo = 0');
      qb.andWhere('p.estado != :inactiva', {
        inactiva: EstadoCalendarioNomina.INACTIVA,
      });
    }

    if (fechaDesde && fechaHasta) {
      qb.andWhere(
        'p.fechaFinPeriodo >= :fechaDesde AND p.fechaInicioPeriodo <= :fechaHasta',
        {
          fechaDesde: this.toYmd(fechaDesde),
          fechaHasta: this.toYmd(fechaHasta),
        },
      );
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

  async create(
    dto: CreatePayrollDto,
    userId?: number,
  ): Promise<PayrollCalendar> {
    if (userId != null) {
      await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    }
    const tipo = (dto.tipoPlanilla as TipoPlanilla) ?? TipoPlanilla.REGULAR;
    const moneda = dto.moneda ?? MonedaCalendario.CRC;
    const resolvedTipoPlanillaId =
      dto.idTipoPlanilla ?? this.resolveTipoPlanillaId(tipo);
    const inicio = new Date(dto.periodoInicio);
    const fin = new Date(dto.periodoFin);
    this.validateDateRules(
      inicio,
      fin,
      dto.fechaCorte ? new Date(dto.fechaCorte) : fin,
      new Date(dto.fechaInicioPago),
      new Date(dto.fechaFinPago),
      dto.fechaPagoProgramada
        ? new Date(dto.fechaPagoProgramada)
        : new Date(dto.fechaFinPago),
    );
    const slotKey = this.buildSlotKey(
      dto.idEmpresa,
      inicio,
      fin,
      resolvedTipoPlanillaId,
      moneda,
    );

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
      nombrePlanilla:
        dto.nombrePlanilla?.trim() || `Planilla ${tipo} ${dto.periodoInicio}`,
      tipoPlanilla: tipo,
      fechaInicioPeriodo: inicio,
      fechaFinPeriodo: fin,
      fechaCorte: dto.fechaCorte ? new Date(dto.fechaCorte) : fin,
      fechaInicioPago: new Date(dto.fechaInicioPago),
      fechaFinPago: new Date(dto.fechaFinPago),
      fechaPagoProgramada: dto.fechaPagoProgramada
        ? new Date(dto.fechaPagoProgramada)
        : new Date(dto.fechaFinPago),
      moneda,
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
      throw new BadRequestException(
        'Solo se puede verificar una planilla en estado En Proceso',
      );
    }

    const snapshotCount = await this.snapshotRepo.count({
      where: { idNomina: p.id },
    });
    if (snapshotCount === 0) {
      throw new BadRequestException(
        'No se puede verificar la planilla sin snapshot de empleados',
      );
    }

    const inputCount = await this.inputSnapshotRepo.count({
      where: { idNomina: p.id },
    });
    if (inputCount === 0) {
      throw new BadRequestException(
        'No se puede verificar la planilla sin snapshot de inputs',
      );
    }

    const resultCount = await this.payrollResultRepo.count({
      where: { idNomina: p.id },
    });
    if (resultCount === 0) {
      throw new BadRequestException(
        'No se puede verificar la planilla sin resultados calculados',
      );
    }

    if (p.esInactivo) {
      throw new BadRequestException(
        'No se puede verificar una planilla inactiva',
      );
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

  async update(
    id: number,
    dto: UpdatePayrollDto,
    userId?: number,
  ): Promise<PayrollCalendar> {
    const payroll = await this.findOne(id, userId);
    const payloadBefore = this.buildAuditPayload(payroll);

    if (
      payroll.estado === EstadoCalendarioNomina.INACTIVA ||
      payroll.esInactivo === 1
    ) {
      throw new BadRequestException(
        'No se puede editar una planilla inactiva.',
      );
    }
    if (
      payroll.estado === EstadoCalendarioNomina.APLICADA ||
      payroll.estado === EstadoCalendarioNomina.CONTABILIZADA
    ) {
      throw new BadRequestException(
        'No se puede editar una planilla aplicada o contabilizada.',
      );
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
      ? new Date(dto.periodoInicio)
      : payroll.fechaInicioPeriodo;
    const nextEnd = dto.periodoFin
      ? new Date(dto.periodoFin)
      : payroll.fechaFinPeriodo;
    const nextCutoff = dto.fechaCorte
      ? new Date(dto.fechaCorte)
      : (payroll.fechaCorte ?? nextEnd);
    const nextPayStart = dto.fechaInicioPago
      ? new Date(dto.fechaInicioPago)
      : payroll.fechaInicioPago;
    const nextPayEnd = dto.fechaFinPago
      ? new Date(dto.fechaFinPago)
      : payroll.fechaFinPago;
    const nextProgrammed = dto.fechaPagoProgramada
      ? new Date(dto.fechaPagoProgramada)
      : (payroll.fechaPagoProgramada ?? nextPayEnd);

    this.validateDateRules(
      nextStart,
      nextEnd,
      nextCutoff,
      nextPayStart,
      nextPayEnd,
      nextProgrammed,
    );

    const nextTipoPlanilla =
      (dto.tipoPlanilla as TipoPlanilla) ?? payroll.tipoPlanilla;
    const nextTipoPlanillaId =
      dto.idTipoPlanilla ??
      payroll.idTipoPlanilla ??
      this.resolveTipoPlanillaId(nextTipoPlanilla);
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
    payroll.nombrePlanilla =
      dto.nombrePlanilla?.trim() || payroll.nombrePlanilla;
    payroll.tipoPlanilla = nextTipoPlanilla;
    payroll.fechaInicioPeriodo = nextStart;
    payroll.fechaFinPeriodo = nextEnd;
    payroll.fechaCorte = nextCutoff;
    payroll.fechaInicioPago = nextPayStart;
    payroll.fechaFinPago = nextPayEnd;
    payroll.fechaPagoProgramada = nextProgrammed;
    payroll.moneda = nextMoneda;
    payroll.descripcionEvento =
      dto.descripcionEvento ?? payroll.descripcionEvento;
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
      throw new BadRequestException(
        'Solo se puede procesar una planilla en estado Abierta',
      );
    }
    if (payroll.esInactivo) {
      throw new BadRequestException(
        'No se puede procesar una planilla inactiva',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const start = this.toYmd(payroll.fechaInicioPeriodo);
      const end = this.toYmd(payroll.fechaFinPeriodo);
      const cutoff = this.toYmd(payroll.fechaCorte ?? payroll.fechaFinPeriodo);

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
      }> = await queryRunner.manager.query(
        `
          SELECT
            id_empleado,
            salario_base_empleado,
            jornada_empleado,
            moneda_salario_empleado,
            cuenta_banco_empleado
          FROM sys_empleados
          WHERE id_empresa = ?
            AND estado_empleado = 1
            AND fecha_ingreso_empleado <= ?
            AND (fecha_salida_empleado IS NULL OR fecha_salida_empleado >= ?)
        `,
        [payroll.idEmpresa, end, start],
      );

      for (const employee of employees) {
        const snapshot = queryRunner.manager.create(PayrollEmployeeSnapshot, {
          idNomina: payroll.id,
          idEmpleado: employee.id_empleado,
          salarioBase: this.toMoney(employee.salario_base_empleado),
          jornada: employee.jornada_empleado,
          moneda: (employee.moneda_salario_empleado ?? payroll.moneda) as
            | 'CRC'
            | 'USD',
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
              TERMINATION_EFFECTIVE:
                invalidationSummary.byReason.TERMINATION_EFFECTIVE,
              COMPANY_MISMATCH:
                invalidationSummary.byReason.COMPANY_MISMATCH,
              CURRENCY_MISMATCH:
                invalidationSummary.byReason.CURRENCY_MISMATCH,
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
        .andWhere(
          '(a.fechaAprobacion IS NULL OR a.fechaAprobacion <= :cutoff)',
          { cutoff },
        )
        .getMany();

      const resultAccumulator = new Map<
        number,
        { gross: number; ded: number }
      >();

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

      for (const employee of employees) {
        const totals = resultAccumulator.get(employee.id_empleado) ?? {
          gross: 0,
          ded: 0,
        };
        const result = queryRunner.manager.create(PayrollResult, {
          idNomina: payroll.id,
          idEmpleado: employee.id_empleado,
          totalBruto: totals.gross.toFixed(2),
          totalDeducciones: totals.ded.toFixed(2),
          totalNeto: (totals.gross - totals.ded).toFixed(2),
        });
        await queryRunner.manager.save(PayrollResult, result);
      }

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
    totalBruto: string;
    totalDeducciones: string;
    totalNeto: string;
  }> {
    const payroll = await this.findOne(id, userId);
    const [empleados, inputs, accionesLigadas] = await Promise.all([
      this.snapshotRepo.count({ where: { idNomina: id } }),
      this.inputSnapshotRepo.count({ where: { idNomina: id } }),
      this.personalActionRepo.count({ where: { idCalendarioNomina: id } }),
    ]);

    const sums = await this.payrollResultRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.totalBruto), 0)', 'totalBruto')
      .addSelect('COALESCE(SUM(r.totalDeducciones), 0)', 'totalDeducciones')
      .addSelect('COALESCE(SUM(r.totalNeto), 0)', 'totalNeto')
      .where('r.idNomina = :id', { id })
      .getRawOne<{
        totalBruto: string;
        totalDeducciones: string;
        totalNeto: string;
      }>();

    return {
      idNomina: payroll.id,
      empleados,
      inputs,
      accionesLigadas,
      totalBruto: sums?.totalBruto ?? '0.00',
      totalDeducciones: sums?.totalDeducciones ?? '0.00',
      totalNeto: sums?.totalNeto ?? '0.00',
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
      const payloadBefore =
        (row.payloadBefore as Record<string, unknown> | null) ?? null;
      const payloadAfter =
        (row.payloadAfter as Record<string, unknown> | null) ?? null;
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
        fechaCreacion: row.fechaCreacion
          ? new Date(String(row.fechaCreacion)).toISOString()
          : null,
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
        cambios: this.buildAuditChanges(payloadBefore, payloadAfter),
      };
    });
  }

  async apply(
    id: number,
    userId?: number,
    expectedVersion?: number,
  ): Promise<PayrollCalendar> {
    const p = await this.findOne(id, userId);
    const payloadBefore = this.buildAuditPayload(p);
    if (p.estado !== EstadoCalendarioNomina.VERIFICADA) {
      throw new BadRequestException(
        'Solo se puede aplicar una planilla en estado Verificada',
      );
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
        throw new ConflictException(
          'Conflicto de concurrencia al aplicar planilla.',
        );
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

  async reopen(
    id: number,
    motivo: string,
    userId?: number,
  ): Promise<PayrollCalendar> {
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
    p.esInactivo = 1;
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

  private async assertUserCompanyAccess(
    userId: number,
    companyId: number,
  ): Promise<void> {
    const exists = await this.userCompanyRepo.findOne({
      where: { idUsuario: userId, idEmpresa: companyId, estado: 1 },
    });
    if (!exists) {
      throw new ForbiddenException(
        `No tiene acceso a la empresa ${companyId}.`,
      );
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
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime()))
        return parsed.toISOString().slice(0, 10);
      throw new BadRequestException(
        'Fecha invalida para conversion YYYY-MM-DD.',
      );
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    throw new BadRequestException('Fecha invalida para conversion YYYY-MM-DD.');
  }

  private parseQueryDate(value: string, fieldName: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(
        `${fieldName} debe tener formato YYYY-MM-DD.`,
      );
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
      fechaInicioPeriodo: entity.fechaInicioPeriodo
        ? this.toYmd(entity.fechaInicioPeriodo)
        : null,
      fechaFinPeriodo: entity.fechaFinPeriodo
        ? this.toYmd(entity.fechaFinPeriodo)
        : null,
      fechaCorte: entity.fechaCorte ? this.toYmd(entity.fechaCorte) : null,
      fechaInicioPago: entity.fechaInicioPago
        ? this.toYmd(entity.fechaInicioPago)
        : null,
      fechaFinPago: entity.fechaFinPago
        ? this.toYmd(entity.fechaFinPago)
        : null,
      fechaPagoProgramada: entity.fechaPagoProgramada
        ? this.toYmd(entity.fechaPagoProgramada)
        : null,
      moneda: entity.moneda ?? null,
      estado: this.normalizeEstadoValue(entity.estado),
      esInactivo: entity.esInactivo === 1 ? 'Inactivo' : 'Activo',
      requiresRecalculation:
        entity.requiresRecalculation === 1 ? 'Si' : 'No',
      lastSnapshotAt: entity.lastSnapshotAt
        ? this.toYmd(entity.lastSnapshotAt)
        : null,
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
    const keys = new Set<string>([
      ...Object.keys(payloadBefore),
      ...Object.keys(payloadAfter),
    ]);
    const changes: Array<{ campo: string; antes: string; despues: string }> =
      [];
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
    const actionEnd =
      action.fechaFinEfecto ?? action.fechaInicioEfecto ?? action.fechaEfecto;

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
    const overlapDays =
      Math.floor((overlapEnd - overlapStart) / millisecondsPerDay) + 1;
    const actionDays =
      Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;

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

  private validateDateRules(
    periodoInicio: Date,
    periodoFin: Date,
    fechaCorte: Date,
    fechaInicioPago: Date,
    fechaFinPago: Date,
    fechaPagoProgramada: Date,
  ): void {
    if (periodoInicio > periodoFin) {
      throw new BadRequestException(
        'Inicio Periodo no puede ser mayor que Fin Periodo.',
      );
    }
    if (fechaCorte < periodoInicio || fechaCorte > periodoFin) {
      throw new BadRequestException(
        'Fecha Corte debe estar dentro del Periodo de Nomina.',
      );
    }
    if (fechaInicioPago > fechaFinPago) {
      throw new BadRequestException(
        'Inicio Pago no puede ser mayor que Fin Pago.',
      );
    }
    if (
      fechaPagoProgramada < fechaInicioPago ||
      fechaPagoProgramada > fechaFinPago
    ) {
      throw new BadRequestException(
        'Fecha Pago Programada debe estar dentro de la Ventana de Pago.',
      );
    }
    if (fechaPagoProgramada < fechaCorte) {
      throw new BadRequestException(
        'Fecha Pago Programada no puede ser menor que Fecha Corte.',
      );
    }
  }

}
