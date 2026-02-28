import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PersonalAction,
  PERSONAL_ACTION_APPROVED_STATES,
  PERSONAL_ACTION_PENDING_STATES,
  PersonalActionEstado,
} from './entities/personal-action.entity';
import { CreatePersonalActionDto } from './dto/create-personal-action.dto';
import { UpsertAbsenceDto } from './dto/upsert-absence.dto';
import { DOMAIN_EVENTS } from '../../common/events/event-names';
import { UserCompany } from '../access-control/entities/user-company.entity';
import {
  EstadoCalendarioNomina,
  PayrollCalendar,
} from '../payroll/entities/payroll-calendar.entity';
import { EmployeesService } from '../employees/employees.service';
import { ActionQuota, EstadoCuota } from './entities/action-quota.entity';
import { AbsenceLine } from './entities/absence-line.entity';
import { AuditOutboxService } from '../integration/audit-outbox.service';

@Injectable()
export class PersonalActionsService {
  constructor(
    @InjectRepository(PersonalAction)
    private readonly repo: Repository<PersonalAction>,
    @InjectRepository(ActionQuota)
    private readonly actionQuotaRepo: Repository<ActionQuota>,
    @InjectRepository(AbsenceLine)
    private readonly absenceLineRepo: Repository<AbsenceLine>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepo: Repository<UserCompany>,
    @InjectRepository(PayrollCalendar)
    private readonly payrollRepo: Repository<PayrollCalendar>,
    private readonly employeesService: EmployeesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditOutbox: AuditOutboxService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    userId: number,
    idEmpresa?: number,
    estado?: PersonalActionEstado,
  ): Promise<Array<PersonalAction & {
    periodoPagoResumen?: string | null;
    movimientoResumen?: string | null;
    remuneracionResumen?: 'SI' | 'NO' | 'MIXTA' | null;
  }>> {
    const qb = this.repo.createQueryBuilder('a').where('1=1');

    if (idEmpresa != null) {
      await this.assertUserCompanyAccess(userId, idEmpresa);
      qb.andWhere('a.idEmpresa = :idEmpresa', { idEmpresa });
    } else {
      const companyIds = await this.getUserCompanyIds(userId);
      if (companyIds.length === 0) return [];
      qb.andWhere('a.idEmpresa IN (:...companyIds)', { companyIds });
    }

    if (estado !== undefined) {
      qb.andWhere('a.estado = :estado', { estado });
    }

    const actions = await qb.orderBy('a.fechaCreacion', 'DESC').getMany();
    const absenceIds = actions
      .filter((item) => item.tipoAccion?.trim().toLowerCase() === 'ausencia')
      .map((item) => item.id);

    if (absenceIds.length === 0) return actions;

    const summaryRows = await this.repo.query(
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
      FROM acc_ausencias_lineas l
      LEFT JOIN nom_calendarios_nomina c
        ON c.id_calendario_nomina = l.id_calendario_nomina
      LEFT JOIN nom_movimientos_nomina m
        ON m.id_movimiento_nomina = l.id_movimiento_nomina
      WHERE l.id_accion IN (?)
      GROUP BY l.id_accion
      `,
      [absenceIds],
    );

    const summaryMap = new Map<number, {
      periodos: string | null;
      movimientos: string | null;
      rem: 'SI' | 'NO' | 'MIXTA' | null;
    }>();

    for (const row of summaryRows ?? []) {
      const minRem = Number((row as Record<string, unknown>).minRem ?? 0);
      const maxRem = Number((row as Record<string, unknown>).maxRem ?? 0);
      let rem: 'SI' | 'NO' | 'MIXTA' | null = null;
      if (minRem === 1 && maxRem === 1) rem = 'SI';
      else if (minRem === 0 && maxRem === 0) rem = 'NO';
      else rem = 'MIXTA';

      summaryMap.set(Number((row as Record<string, unknown>).idAccion), {
        periodos: (row as Record<string, unknown>).periodos
          ? String((row as Record<string, unknown>).periodos)
          : null,
        movimientos: (row as Record<string, unknown>).movimientos
          ? String((row as Record<string, unknown>).movimientos)
          : null,
        rem,
      });
    }

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
        payrollEstado:
          line.payrollEstado == null ? null : Number(line.payrollEstado),
        movimientoId: Number(line.movimientoId),
        movimientoLabel: line.movimientoLabel ? String(line.movimientoLabel) : null,
        movimientoInactivo:
          line.movimientoInactivo == null
            ? null
            : Number(line.movimientoInactivo) === 1,
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
      [String(action.id), safeLimit],
    );

    return (rows ?? []).map((row: Record<string, unknown>) => {
      const payloadBefore =
        (row.payloadBefore as Record<string, unknown> | null) ?? null;
      const payloadAfter =
        (row.payloadAfter as Record<string, unknown> | null) ?? null;

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
        fechaCreacion: row.fechaCreacion
          ? new Date(String(row.fechaCreacion)).toISOString()
          : null,
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
        cambios: this.buildAuditChanges(payloadBefore, payloadAfter),
      };
    });
  }

  async create(
    dto: CreatePersonalActionDto,
    userId?: number,
  ): Promise<PersonalAction> {
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
      throw new BadRequestException(
        'Solo se puede aprobar una accion en estado pendiente',
      );
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
      throw new BadRequestException(
        'Solo se puede asociar una accion aprobada a una planilla',
      );
    }

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

  async reject(
    id: number,
    motivo: string,
    userId?: number,
  ): Promise<PersonalAction> {
    const action = await this.findOne(id, userId);
    if (!PERSONAL_ACTION_PENDING_STATES.includes(action.estado)) {
      throw new BadRequestException(
        'Solo se puede rechazar una accion pendiente',
      );
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
    const allEmployees: Awaited<
      ReturnType<EmployeesService['findAll']>
    >['data'] = [];

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
        employee.salarioBase != null ? Number(employee.salarioBase) : null,
      monedaSalario: employee.monedaSalario ?? 'CRC',
    }));
  }

  async findEligibleAbsencePayrolls(
    userId: number,
    idEmpresa: number,
    idEmpleado: number,
  ) {
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
        AND c.es_inactivo = 0
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
      idTipoPlanilla:
        row.idTipoPlanilla == null ? null : Number(row.idTipoPlanilla),
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

  async createAbsence(dto: UpsertAbsenceDto, userId: number) {
    await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    await this.validateAbsencePayload(dto, userId);

    const employee = await this.getAbsenceEmployee(dto.idEmpresa, dto.idEmpleado);
    const moneda = String(employee.monedaSalario ?? 'CRC').toUpperCase();
    const groupId = `AUS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const totalMonto = dto.lines.reduce((sum, line) => sum + Number(line.monto || 0), 0);
    const firstDate = dto.lines[0]?.fechaEfecto ? new Date(dto.lines[0].fechaEfecto) : null;
    const lastDate = dto.lines[dto.lines.length - 1]?.fechaEfecto
      ? new Date(dto.lines[dto.lines.length - 1].fechaEfecto)
      : firstDate;

    const saved = await this.dataSource.transaction(async (trx) => {
      const action = trx.create(PersonalAction, {
        idEmpresa: dto.idEmpresa,
        idEmpleado: dto.idEmpleado,
        idCalendarioNomina: null,
        tipoAccion: 'ausencia',
        groupId,
        origen: 'RRHH',
        descripcion: dto.observacion ?? null,
        // En Kpital, Ausencias inicia en flujo operativo (pendiente supervisor), no en borrador.
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
      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
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

      for (let i = 0; i < dto.lines.length; i += 1) {
        const line = dto.lines[i];
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

      return savedAction;
    });

    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
      occurredAt: new Date(),
      payload: {
        actionId: String(saved.id),
        employeeId: String(saved.idEmpleado),
        companyId: String(saved.idEmpresa),
        type: 'ausencia',
        lines: dto.lines.length,
      },
    });

    this.auditOutbox.publish({
      modulo: 'personal-actions',
      accion: 'create',
      entidad: 'personal-action',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.idEmpresa,
      descripcion: `Ausencia creada para empleado #${saved.idEmpleado}`,
      payloadAfter: this.buildAbsenceAuditPayload(saved, dto.lines.length),
    });

    return this.findOne(saved.id, userId);
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

    const payloadBefore = this.buildAbsenceAuditPayload(
      action,
      await this.countAbsenceLines(action.id),
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
      payloadAfter: this.buildAbsenceAuditPayload(action, dto.lines.length),
    });

    return this.findOne(id, userId);
  }

  async advanceAbsenceState(id: number, userId: number) {
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
      payloadAfter: this.buildAbsenceAuditPayload(
        saved,
        await this.countAbsenceLines(saved.id),
      ),
    });

    return saved;
  }

  async invalidateAbsence(id: number, motivo: string | undefined, userId: number) {
    const action = await this.findOne(id, userId);
    if (action.tipoAccion.trim().toLowerCase() !== 'ausencia') {
      throw new BadRequestException('La accion no corresponde al modulo de ausencias');
    }

    if (
      [
        PersonalActionEstado.CONSUMED,
        PersonalActionEstado.CANCELLED,
        PersonalActionEstado.INVALIDATED,
        PersonalActionEstado.EXPIRED,
      ].includes(action.estado)
    ) {
      throw new BadRequestException(
        'La ausencia no se puede invalidar en su estado actual',
      );
    }

    await this.dataSource.transaction(async (trx) => {
      action.estado = PersonalActionEstado.INVALIDATED;
      action.invalidatedAt = new Date();
      action.invalidatedReason = motivo?.trim() || 'Invalidada manualmente por RRHH';
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
      payloadAfter: this.buildAbsenceAuditPayload(
        action,
        await this.countAbsenceLines(action.id),
      ),
    });

    return this.findOne(action.id, userId);
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

  private async flagRecalculationForOpenPayrolls(
    action: PersonalAction,
  ): Promise<void> {
    const start = this.toYmd(action.fechaInicioEfecto ?? action.fechaEfecto);
    if (!start) return;
    const end = this.toYmd(
      action.fechaFinEfecto ?? action.fechaInicioEfecto ?? action.fechaEfecto,
    );
    if (!end) return;
    const approvedAt = action.fechaAprobacion
      ? this.toYmdDateTime(action.fechaAprobacion)
      : null;
    const moneda = (action.moneda || 'CRC').toUpperCase();

    await this.payrollRepo.query(
      `
      UPDATE nom_calendarios_nomina
      SET requires_recalculation_calendario_nomina = 1
      WHERE id_empresa = ?
        AND estado_calendario_nomina = ?
        AND es_inactivo = 0
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

  private async countAbsenceLines(idAccion: number): Promise<number> {
    return this.absenceLineRepo.count({ where: { idAccion } });
  }

  private buildAbsenceAuditPayload(
    action: PersonalAction,
    cantidadLineas: number,
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
    const keys = new Set<string>([
      ...Object.keys(before ?? {}),
      ...Object.keys(after ?? {}),
    ]);
    const output: Array<{ campo: string; antes: string; despues: string }> = [];

    keys.forEach((key) => {
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
      throw new BadRequestException('Empleado no encontrado o inactivo para la empresa seleccionada');
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
          AND es_inactivo_movimiento_nomina = 0
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

  private toYmdFlexible(value: unknown): string | null {
    if (value == null) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      return value.toISOString().slice(0, 10);
    }
    const text = String(value);
    if (!text.trim()) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }

  private toYmdDateTime(value: Date): string {
    if (Number.isNaN(value.getTime())) return '';
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }
}
