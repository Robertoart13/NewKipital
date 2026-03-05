import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, DataSource, Repository } from 'typeorm';

import { UserCompany } from '../access-control/entities/user-company.entity';
import {
  EmployeeAguinaldoProvision,
  EstadoProvisionAguinaldoEmpleado,
} from '../employees/entities/employee-aguinaldo-provision.entity';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeeVacationService } from '../employees/services/employee-vacation.service';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import {
  PersonalAction,
  PERSONAL_ACTION_APPROVED_STATES,
  PERSONAL_ACTION_PENDING_STATES,
} from '../personal-actions/entities/personal-action.entity';

import { EmployeeTransfer, EstadoTransferenciaEmpleado } from './entities/employee-transfer.entity';
import { EstadoCalendarioNomina, PayrollCalendar } from './entities/payroll-calendar.entity';

import type { ExecuteIntercompanyTransferDto } from './dto/execute-intercompany-transfer.dto';
import type { SimulateIntercompanyTransferDto } from './dto/simulate-intercompany-transfer.dto';
import type { PersonalActionEstado } from '../personal-actions/entities/personal-action.entity';

type TransferBlockingReason = {
  code: string;
  message: string;
  metadata?: Record<string, unknown>;
};

type ActionTransferPlan = {
  idAccion: number;
  tipoAccion: string;
  estado: PersonalActionEstado;
  fechaEfecto: Date | null;
  fechaInicioEfecto: Date | null;
  fechaFinEfecto: Date | null;
  idCalendarioOrigen: number | null;
  shouldMove: boolean;
  requiresSplit: boolean;
  crossesTransfer: boolean;
  assignedToPayroll: boolean;
  calendarAssignments?: Array<{
    date: string;
    calendarId: number;
    calendarName: string | null;
  }>;
};

type TransferSimulationResult = {
  employeeId: number;
  fromCompanyId: number;
  toCompanyId: number;
  effectiveDate: string;
  eligible: boolean;
  transferId: number | null;
  blockingReasons: TransferBlockingReason[];
  actionsToMove: ActionTransferPlan[];
  actionsIgnored: number;
  aguinaldoProvision?: {
    totalBruto: number;
    montoProvisionado: number;
  };
  vacationBalance?: {
    balance: number;
    movedDays: number;
    accountId: number | null;
  };
};

type LineTableConfig = {
  table: string;
  primaryKey: string;
  dateColumn: string;
};

const BLOCKING_PAYROLL_STATES = [
  EstadoCalendarioNomina.ABIERTA,
  EstadoCalendarioNomina.EN_PROCESO,
  EstadoCalendarioNomina.VERIFICADA,
];

const TRANSFERABLE_ACTION_STATES = [
  ...PERSONAL_ACTION_PENDING_STATES,
  ...PERSONAL_ACTION_APPROVED_STATES,
];

const BLOCKING_ACTION_TYPES = new Set([
  'licencia',
  'licencias',
  'incapacidad',
  'incapacidades',
  'aumento',
  'aumentos',
]);

const LINE_TABLES: LineTableConfig[] = [
  {
    table: 'acc_aumentos_lineas',
    primaryKey: 'id_linea_aumento',
    dateColumn: 'fecha_efecto_linea',
  },
  {
    table: 'acc_ausencias_lineas',
    primaryKey: 'id_linea_ausencia',
    dateColumn: 'fecha_efecto_linea',
  },
  {
    table: 'acc_bonificaciones_lineas',
    primaryKey: 'id_linea_bonificacion',
    dateColumn: 'fecha_efecto_linea',
  },
  {
    table: 'acc_descuentos_lineas',
    primaryKey: 'id_linea_descuento',
    dateColumn: 'fecha_efecto_linea',
  },
  {
    table: 'acc_horas_extras_lineas',
    primaryKey: 'id_linea_hora_extra',
    dateColumn: 'fecha_efecto_linea',
  },
  {
    table: 'acc_incapacidades_lineas',
    primaryKey: 'id_linea_incapacidad',
    dateColumn: 'fecha_efecto_linea',
  },
  {
    table: 'acc_licencias_lineas',
    primaryKey: 'id_linea_licencia',
    dateColumn: 'fecha_efecto_linea',
  },
  {
    table: 'acc_retenciones_lineas',
    primaryKey: 'id_linea_retencion',
    dateColumn: 'fecha_efecto_linea',
  },
  { table: 'acc_vacaciones_fechas', primaryKey: 'id_vacacion_fecha', dateColumn: 'fecha_vacacion' },
  { table: 'acc_cuotas_accion', primaryKey: 'id_cuota', dateColumn: 'fecha_efecto_cuota' },
];

@Injectable()
export class IntercompanyTransferService {
  constructor(
    @InjectRepository(UserCompany)
    private readonly userCompanyRepo: Repository<UserCompany>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(PersonalAction)
    private readonly personalActionRepo: Repository<PersonalAction>,
    @InjectRepository(PayrollCalendar)
    private readonly payrollCalendarRepo: Repository<PayrollCalendar>,
    @InjectRepository(EmployeeTransfer)
    private readonly transferRepo: Repository<EmployeeTransfer>,
    private readonly dataSource: DataSource,
    private readonly auditOutbox: AuditOutboxService,
    private readonly vacationService: EmployeeVacationService,
  ) {}

  /**
   * Simula el traslado interempresas para una lista de empleados.
   * No ejecuta cambios; registra simulaciones elegibles para ejecución posterior.
   */
  async simulate(
    dto: SimulateIntercompanyTransferDto,
    userId: number,
  ): Promise<TransferSimulationResult[]> {
    const effectiveDate = this.parseDateOnlyForDb(dto.fechaEfectiva);
    const results: TransferSimulationResult[] = [];

    for (const item of dto.empleados) {
      const result = await this.simulateSingle(
        item.idEmpleado,
        dto.idEmpresaDestino,
        effectiveDate,
        dto.motivo ?? null,
        userId,
        true,
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Ejecuta traslados previamente simulados.
   */
  async execute(
    dto: ExecuteIntercompanyTransferDto,
    userId: number,
  ): Promise<
    Array<{
      transferId: number;
      status: 'EXECUTED' | 'FAILED';
      message: string;
    }>
  > {
    const responses: Array<{
      transferId: number;
      status: 'EXECUTED' | 'FAILED';
      message: string;
    }> = [];

    for (const transferId of dto.transferIds) {
      const response = await this.executeSingle(transferId, userId);
      responses.push(response);
    }

    return responses;
  }

  private async simulateSingle(
    employeeId: number,
    destinationCompanyId: number,
    effectiveDate: Date,
    motivo: string | null,
    userId: number,
    persistSimulation: boolean,
  ): Promise<TransferSimulationResult> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new NotFoundException(`Empleado con ID ${employeeId} no encontrado.`);
    }
    await this.assertUserCompanyAccess(userId, employee.idEmpresa);
    await this.assertUserCompanyAccess(userId, destinationCompanyId);

    const blockingReasons: TransferBlockingReason[] = [];

    if (employee.idEmpresa === destinationCompanyId) {
      blockingReasons.push({
        code: 'MISMA_EMPRESA',
        message: 'El empleado ya pertenece a la empresa destino.',
      });
    }

    if (employee.estado !== 1) {
      blockingReasons.push({
        code: 'EMPLEADO_INACTIVO',
        message: 'El empleado está inactivo y no puede trasladarse.',
      });
    }

    if (!employee.idPeriodoPago) {
      blockingReasons.push({
        code: 'PERIODO_PAGO_NO_DEFINIDO',
        message: 'El empleado no tiene periodo de pago definido y no puede trasladarse.',
      });
    }

    const effectiveKey = this.toDateKey(effectiveDate);
    if (!effectiveKey) {
      throw new BadRequestException('Fecha efectiva inválida.');
    }

    const blockingPayrolls = await this.findBlockingPayrolls(employee.idEmpresa, effectiveDate);
    if (blockingPayrolls.length > 0) {
      blockingReasons.push({
        code: 'PLANILLAS_ACTIVAS_ORIGEN',
        message:
          'Planillas activas en empresa origen. Debe cerrar/terminar esas planillas antes del traslado.',
        metadata: { planillas: blockingPayrolls },
      });
    }

    const actions = await this.personalActionRepo.find({
      where: {
        idEmpleado: employee.id,
        estado: In(TRANSFERABLE_ACTION_STATES),
      },
    });

    const blockingActions = actions.filter((action) =>
      this.isBlockingActionType(action.tipoAccion),
    );
    if (blockingActions.length > 0) {
      blockingReasons.push({
        code: 'ACCIONES_BLOQUEANTES',
        message:
          'Acciones bloqueantes pendientes. Apruebe/rechace/cancele esas acciones antes de trasladar.',
        metadata: {
          acciones: blockingActions.map((action) => ({
            id: action.id,
            tipo: action.tipoAccion,
            estado: action.estado,
          })),
        },
      });
    }

    const actionPlans = this.buildActionPlans(actions, effectiveDate);
    const actionIdsToMove = actionPlans
      .filter((plan) => plan.shouldMove)
      .map((plan) => plan.idAccion);

    const lineDateMap = await this.collectLineDatesByAction(actionIdsToMove);
    const actionMinDate = this.getMinActionDate(actionPlans, lineDateMap);
    const actionMaxDate = this.getMaxActionDate(actionPlans, lineDateMap);
    const destinationCalendarsForActions =
      actionMinDate && actionMaxDate
        ? await this.findCalendarsForRange(
            destinationCompanyId,
            actionMinDate,
            actionMaxDate,
            employee.idPeriodoPago ?? undefined,
            employee.monedaSalario ?? undefined,
          )
        : [];

    const missingDestinationDates = new Set<string>();
    for (const plan of actionPlans) {
      if (!plan.shouldMove) {
        if (!plan.fechaEfecto && !plan.fechaInicioEfecto && !plan.fechaFinEfecto) {
          blockingReasons.push({
            code: 'ACCION_SIN_FECHA',
            message: 'La acción no tiene fechas definidas y no puede trasladarse.',
            metadata: { idAccion: plan.idAccion },
          });
        }
        continue;
      }
      if (plan.crossesTransfer && plan.assignedToPayroll) {
        blockingReasons.push({
          code: 'ACCION_ASIGNADA_PLANILLA',
          message: 'La acción cruza la fecha de traslado y ya está asociada a planilla.',
          metadata: { idAccion: plan.idAccion },
        });
        continue;
      }
      const requiredDates = this.getRequiredDatesForAction(plan, lineDateMap.get(plan.idAccion) ?? []);
      const assignmentResults = requiredDates.map((date) =>
        this.resolveCalendarForDate(date, destinationCalendarsForActions),
      );
      if (assignmentResults.some((calendar) => !calendar)) {
        requiredDates.forEach((date, index) => {
          if (!assignmentResults[index]) {
            const key = this.toDateKey(date);
            if (key) missingDestinationDates.add(key);
          }
        });
      } else {
        plan.calendarAssignments = assignmentResults.map((calendar, index) => {
          const date = requiredDates[index];
          return {
            date: this.toDateKey(date) ?? '',
            calendarId: calendar!.id,
            calendarName: calendar!.nombrePlanilla ?? null,
          };
        });
      }
      if (plan.requiresSplit && (lineDateMap.get(plan.idAccion) ?? []).some((date) => !date)) {
        blockingReasons.push({
          code: 'LINEA_SIN_FECHA',
          message: 'La acción tiene líneas sin fecha; no es posible recalcular el traslado.',
          metadata: { idAccion: plan.idAccion },
        });
      }
    }

    if (missingDestinationDates.size > 0) {
      const missingDates = Array.from(missingDestinationDates);
      blockingReasons.push({
        code: 'SIN_PERIODO_DESTINO',
        message: this.formatMissingDestinationDatesMessage(missingDates),
        metadata: { fechas: missingDates },
      });
    }

    const aguinaldoProvision = await this.calculateAguinaldoProvisionSnapshot(
      employee.id,
      employee.idEmpresa,
      effectiveDate,
    );

    const vacationBalance = await this.vacationService.getBalanceSnapshot(
      this.dataSource.manager,
      employee.id,
    );

    const eligible = blockingReasons.length === 0;
    let transferId: number | null = null;

    if (eligible && persistSimulation) {
      const transfer = this.transferRepo.create({
        idEmpleado: employee.id,
        idEmpresaOrigen: employee.idEmpresa,
        idEmpresaDestino: destinationCompanyId,
        fechaEfectiva: effectiveDate,
        estado: EstadoTransferenciaEmpleado.SIMULATED,
        resumen: this.buildTransferSummary(
          employee.id,
          employee.idEmpresa,
          destinationCompanyId,
          effectiveDate,
          actionPlans,
          actionPlans.length,
          aguinaldoProvision,
          vacationBalance,
        ),
        motivo,
        simuladoPor: userId,
      });
      const saved = await this.transferRepo.save(transfer);
      transferId = saved.id;
    }

    return {
      employeeId: employee.id,
      fromCompanyId: employee.idEmpresa,
      toCompanyId: destinationCompanyId,
      effectiveDate: effectiveKey,
      eligible,
      transferId,
      blockingReasons,
      actionsToMove: actionPlans.filter((plan) => plan.shouldMove),
      actionsIgnored: actionPlans.filter((plan) => !plan.shouldMove).length,
      aguinaldoProvision,
      vacationBalance: {
        balance: vacationBalance.balance,
        movedDays: vacationBalance.balance,
        accountId: vacationBalance.accountId,
      },
    };
  }

  private async executeSingle(
    transferId: number,
    userId: number,
  ): Promise<{ transferId: number; status: 'EXECUTED' | 'FAILED'; message: string }> {
    const transfer = await this.transferRepo.findOne({
      where: { id: transferId },
    });
    if (!transfer) {
      throw new NotFoundException(`Transferencia ${transferId} no encontrada.`);
    }
    if (transfer.estado !== EstadoTransferenciaEmpleado.SIMULATED) {
      throw new ConflictException(`Transferencia ${transferId} no está en estado simulado.`);
    }

    await this.assertUserCompanyAccess(userId, transfer.idEmpresaOrigen);
    await this.assertUserCompanyAccess(userId, transfer.idEmpresaDestino);

    const effectiveDate = new Date(transfer.fechaEfectiva);
    const simulation = await this.simulateSingle(
      transfer.idEmpleado,
      transfer.idEmpresaDestino,
      effectiveDate,
      transfer.motivo ?? null,
      userId,
      false,
    );

    if (!simulation.eligible) {
      transfer.estado = EstadoTransferenciaEmpleado.FAILED;
      transfer.resumen = {
        ...simulation,
        blockingReasons: simulation.blockingReasons,
      };
      await this.transferRepo.save(transfer);
      return {
        transferId,
        status: 'FAILED',
        message: 'Transferencia bloqueada por validaciones.',
      };
    }

    await this.dataSource.transaction(async (trx) => {
      const employee = await trx.findOne(Employee, {
        where: { id: transfer.idEmpleado },
      });
      if (!employee) {
        throw new NotFoundException(`Empleado ${transfer.idEmpleado} no encontrado.`);
      }

      if (employee.idEmpresa !== transfer.idEmpresaOrigen) {
        throw new ConflictException('La empresa origen del empleado cambió desde la simulación.');
      }

      const actionPlans = simulation.actionsToMove;
      const actionIds = actionPlans.map((plan) => plan.idAccion);
      const calendars = await this.findCalendarsForRange(
        transfer.idEmpresaDestino,
        effectiveDate,
        this.getMaxActionDate(actionPlans, await this.collectLineDatesByAction(actionIds)) ??
          effectiveDate,
        employee.idPeriodoPago ?? undefined,
        employee.monedaSalario ?? undefined,
      );

      await this.moveActions(trx, actionPlans, transfer.idEmpresaDestino, effectiveDate, calendars);

      const aguinaldoProvision = await this.createAguinaldoProvisionForTransfer(
        trx,
        employee,
        transfer,
        effectiveDate,
        userId,
      );

      const vacationBalance = await this.vacationService.transferBalanceForIntercompany(trx, {
        employee,
        sourceCompanyId: transfer.idEmpresaOrigen,
        destinationCompanyId: transfer.idEmpresaDestino,
        transferId: transfer.id,
        effectiveDate,
        actorId: userId,
      });

      employee.idEmpresa = transfer.idEmpresaDestino;
      employee.modificadoPor = userId;
      await trx.save(Employee, employee);

      transfer.estado = EstadoTransferenciaEmpleado.EXECUTED;
      transfer.ejecutadoPor = userId;
      transfer.fechaEjecucion = new Date();
      transfer.resumen = {
        ...simulation,
        aguinaldoProvision,
        vacationBalance,
      };
      await trx.save(EmployeeTransfer, transfer);

      this.auditOutbox.publish({
        modulo: 'payroll',
        accion: 'intercompany-transfer',
        entidad: 'employee_transfer',
        entidadId: transfer.id,
        actorUserId: userId,
        descripcion: `Traslado interempresas ejecutado para empleado ${transfer.idEmpleado}`,
        payloadBefore: null,
        payloadAfter: simulation,
      });
    });

    return {
      transferId,
      status: 'EXECUTED',
      message: 'Transferencia ejecutada correctamente.',
    };
  }

  private async moveActions(
    trx: DataSource['manager'],
    actionPlans: ActionTransferPlan[],
    destinationCompanyId: number,
    effectiveDate: Date,
    calendars: PayrollCalendar[],
  ): Promise<void> {
    for (const plan of actionPlans) {
      const action = await trx.findOne(PersonalAction, {
        where: { id: plan.idAccion },
      });
      if (!action) continue;

      if (plan.requiresSplit) {
        await this.splitActionByEffectiveDate(
          trx,
          action,
          destinationCompanyId,
          effectiveDate,
          calendars,
        );
        continue;
      }

      const targetDate = plan.fechaEfecto ?? plan.fechaInicioEfecto ?? effectiveDate;
      const calendar = this.resolveCalendarForDate(targetDate, calendars);
      if (!calendar) {
        throw new BadRequestException(
          `No existe planilla destino para la fecha ${this.toDateKey(targetDate)}.`,
        );
      }

      action.idEmpresa = destinationCompanyId;
      action.idCalendarioNomina = calendar.id;
      if (action.fechaInicioEfecto && action.fechaInicioEfecto < effectiveDate) {
        action.fechaInicioEfecto = effectiveDate;
      }
      if (action.fechaEfecto && action.fechaEfecto < effectiveDate) {
        action.fechaEfecto = effectiveDate;
      }
      await trx.save(PersonalAction, action);

      await this.updateLineTablesForAction(
        trx,
        action.id,
        destinationCompanyId,
        calendars,
        effectiveDate,
      );
    }
  }

  private async splitActionByEffectiveDate(
    trx: DataSource['manager'],
    action: PersonalAction,
    destinationCompanyId: number,
    effectiveDate: Date,
    calendars: PayrollCalendar[],
  ): Promise<void> {
    const calendar = this.resolveCalendarForDate(effectiveDate, calendars);
    if (!calendar) {
      throw new BadRequestException(
        `No existe planilla destino para fecha ${this.toDateKey(effectiveDate)}.`,
      );
    }
    const newAction = trx.create(PersonalAction, {
      idEmpresa: destinationCompanyId,
      idEmpleado: action.idEmpleado,
      idCalendarioNomina: calendar.id,
      tipoAccion: action.tipoAccion,
      groupId: action.groupId,
      origen: action.origen,
      descripcion: action.descripcion,
      estado: action.estado,
      fechaEfecto: effectiveDate,
      fechaInicioEfecto: effectiveDate,
      fechaFinEfecto: action.fechaFinEfecto,
      monto: action.monto,
      moneda: action.moneda,
      aprobadoPor: action.aprobadoPor,
      fechaAprobacion: action.fechaAprobacion,
      creadoPor: action.creadoPor,
      modificadoPor: action.modificadoPor,
      versionLock: action.versionLock,
    });
    const savedNewAction = await trx.save(PersonalAction, newAction);

    if (action.fechaFinEfecto) {
      const dayBefore = new Date(effectiveDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      action.fechaFinEfecto = dayBefore;
    }
    await trx.save(PersonalAction, action);

    await this.moveActionLinesToNewAction(
      trx,
      action.id,
      savedNewAction.id,
      destinationCompanyId,
      calendars,
      effectiveDate,
    );
  }

  private async moveActionLinesToNewAction(
    trx: DataSource['manager'],
    originalActionId: number,
    newActionId: number,
    destinationCompanyId: number,
    calendars: PayrollCalendar[],
    effectiveDate: Date,
  ): Promise<void> {
    for (const table of LINE_TABLES) {
      const rows: Record<string, unknown>[] = await trx.query(
        `SELECT * FROM ${table.table} WHERE id_accion = ?`,
        [originalActionId],
      );
      if (!rows.length) continue;

      const toMove = rows.filter((row) => {
        const dateValue = row[table.dateColumn] as string | null;
        if (!dateValue) {
          return true;
        }
        const date = new Date(dateValue);
        return date >= effectiveDate;
      });

      if (!toMove.length) continue;

      const idsToDelete = toMove.map((row) => row[table.primaryKey]);
      const newRows = toMove.map((row) => {
        const clone = { ...row };
        delete clone[table.primaryKey];
        clone['id_accion'] = newActionId;
        clone['id_empresa'] = destinationCompanyId;
        const rawDate = clone[table.dateColumn] as string | null;
        const date = rawDate ? new Date(rawDate) : effectiveDate;
        const calendar = this.resolveCalendarForDate(date, calendars);
        if (!calendar) {
          throw new BadRequestException(
            `No existe planilla destino para fecha ${this.toDateKey(date)}.`,
          );
        }
        clone['id_calendario_nomina'] = calendar.id;
        return clone;
      });

      await trx.query(
        `DELETE FROM ${table.table} WHERE ${table.primaryKey} IN (${idsToDelete.map(() => '?').join(',')})`,
        idsToDelete,
      );

      for (const newRow of newRows) {
        const columns = Object.keys(newRow);
        const values = Object.values(newRow);
        await trx.query(
          `INSERT INTO ${table.table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
          values,
        );
      }
    }
  }

  private async updateLineTablesForAction(
    trx: DataSource['manager'],
    actionId: number,
    destinationCompanyId: number,
    calendars: PayrollCalendar[],
    effectiveDate: Date,
  ): Promise<void> {
    for (const table of LINE_TABLES) {
      const rows: Record<string, unknown>[] = await trx.query(
        `SELECT ${table.primaryKey}, ${table.dateColumn} FROM ${table.table} WHERE id_accion = ?`,
        [actionId],
      );
      if (!rows.length) continue;

      for (const row of rows) {
        const dateValue = row[table.dateColumn] as string | null;
        const date = dateValue ? new Date(dateValue) : effectiveDate;
        const calendar = this.resolveCalendarForDate(date, calendars);
        if (!calendar) {
          throw new BadRequestException(
            `No existe planilla destino para fecha ${this.toDateKey(date)}.`,
          );
        }
        await trx.query(
          `UPDATE ${table.table}
            SET id_empresa = ?, id_calendario_nomina = ?
            WHERE ${table.primaryKey} = ?`,
          [destinationCompanyId, calendar.id, row[table.primaryKey]],
        );
      }
    }
  }

  private buildActionPlans(actions: PersonalAction[], effectiveDate: Date): ActionTransferPlan[] {
    return actions.map((action) => {
      const fechaEfecto = action.fechaEfecto ?? null;
      const fechaInicio = action.fechaInicioEfecto ?? null;
      const fechaFin = action.fechaFinEfecto ?? null;
      const actionDate = fechaEfecto ?? fechaInicio;

      if (!actionDate && !fechaFin) {
        return {
          idAccion: action.id,
          tipoAccion: action.tipoAccion,
          estado: action.estado,
          fechaEfecto,
          fechaInicioEfecto: fechaInicio,
          fechaFinEfecto: fechaFin,
          idCalendarioOrigen: action.idCalendarioNomina,
          shouldMove: false,
          requiresSplit: false,
          crossesTransfer: false,
          assignedToPayroll: action.idCalendarioNomina != null,
        };
      }

      if (actionDate && actionDate < effectiveDate && (!fechaFin || fechaFin < effectiveDate)) {
        return {
          idAccion: action.id,
          tipoAccion: action.tipoAccion,
          estado: action.estado,
          fechaEfecto,
          fechaInicioEfecto: fechaInicio,
          fechaFinEfecto: fechaFin,
          idCalendarioOrigen: action.idCalendarioNomina,
          shouldMove: false,
          requiresSplit: false,
          crossesTransfer: false,
          assignedToPayroll: action.idCalendarioNomina != null,
        };
      }

      const requiresSplit =
        fechaInicio != null &&
        fechaFin != null &&
        fechaInicio < effectiveDate &&
        fechaFin >= effectiveDate &&
        action.idCalendarioNomina == null;
      const crossesTransfer =
        fechaInicio != null &&
        fechaFin != null &&
        fechaInicio < effectiveDate &&
        fechaFin >= effectiveDate;

      return {
        idAccion: action.id,
        tipoAccion: action.tipoAccion,
        estado: action.estado,
        fechaEfecto,
        fechaInicioEfecto: fechaInicio,
        fechaFinEfecto: fechaFin,
        idCalendarioOrigen: action.idCalendarioNomina,
        shouldMove: true,
        requiresSplit,
        crossesTransfer,
        assignedToPayroll: action.idCalendarioNomina != null,
      };
    });
  }

  private buildTransferSummary(
    employeeId: number,
    fromCompanyId: number,
    toCompanyId: number,
    effectiveDate: Date,
    actionPlans: ActionTransferPlan[],
    totalActions: number,
    aguinaldoProvision?: { totalBruto: number; montoProvisionado: number },
    vacationBalance?: { accountId: number | null; balance: number },
  ): Record<string, unknown> {
    return {
      employeeId,
      fromCompanyId,
      toCompanyId,
      effectiveDate: this.toDateKey(effectiveDate),
      totalActions,
      actionsToMove: actionPlans.filter((plan) => plan.shouldMove).length,
      actionsIgnored: actionPlans.filter((plan) => !plan.shouldMove).length,
      actionsSplit: actionPlans.filter((plan) => plan.requiresSplit).length,
      aguinaldoProvision: aguinaldoProvision ?? null,
      vacationBalance: vacationBalance ?? null,
    };
  }

  private isBlockingActionType(actionType: string | null | undefined): boolean {
    const normalized = (actionType ?? '').trim().toLowerCase();
    return normalized.length > 0 && BLOCKING_ACTION_TYPES.has(normalized);
  }

  private async collectLineDatesByAction(
    actionIds: number[],
  ): Promise<Map<number, Array<Date | null>>> {
    const map = new Map<number, Array<Date | null>>();
    if (!actionIds.length) return map;

    for (const table of LINE_TABLES) {
      const rows: Array<{ id_accion: number; fecha: string | null }> = await this.dataSource.query(
        `SELECT id_accion, ${table.dateColumn} AS fecha FROM ${table.table} WHERE id_accion IN (${actionIds.map(() => '?').join(',')})`,
        actionIds,
      );
      for (const row of rows) {
        const list = map.get(row.id_accion) ?? [];
        if (row.fecha) {
          list.push(new Date(row.fecha));
        } else {
          list.push(null);
        }
        map.set(row.id_accion, list);
      }
    }

    return map;
  }

  private getRequiredDatesForAction(
    plan: ActionTransferPlan,
    lineDates: Array<Date | null>,
  ): Date[] {
    if (lineDates.length > 0) {
      return lineDates.filter((date): date is Date => date instanceof Date);
    }
    const dates: Date[] = [];
    if (plan.fechaEfecto) dates.push(plan.fechaEfecto);
    if (plan.fechaInicioEfecto) dates.push(plan.fechaInicioEfecto);
    if (plan.fechaFinEfecto) dates.push(plan.fechaFinEfecto);
    return dates;
  }

  private getMinActionDate(
    actionPlans: ActionTransferPlan[],
    lineDatesMap?: Map<number, Array<Date | null>>,
  ): Date | null {
    const dates: Date[] = [];
    for (const plan of actionPlans) {
      if (plan.fechaInicioEfecto) dates.push(plan.fechaInicioEfecto);
      if (plan.fechaEfecto) dates.push(plan.fechaEfecto);
      if (plan.fechaFinEfecto) dates.push(plan.fechaFinEfecto);
      const lineDates = (lineDatesMap?.get(plan.idAccion) ?? []).filter(
        (date): date is Date => date instanceof Date,
      );
      dates.push(...lineDates);
    }
    if (!dates.length) return null;
    return dates.reduce((min, date) => (date < min ? date : min));
  }

  /**
   * Mensaje UX para fechas sin planilla destino.
   * Se limita el detalle para evitar listas extensas en UI.
   */
  private formatMissingDestinationDatesMessage(missingDates: string[]): string {
    if (!missingDates.length) {
      return 'No existe planilla destino para fechas del traslado.';
    }
    const uniqueSorted = Array.from(new Set(missingDates)).sort();
    const maxPreview = 5;
    const preview = uniqueSorted.slice(0, maxPreview);
    const remaining = uniqueSorted.length - preview.length;
    const previewText = preview.join(', ');
    const extraText = remaining > 0 ? ` y ${remaining} fechas más` : '';
    return `Faltan planillas en empresa destino para ${uniqueSorted.length} fechas de acciones: ${previewText}${extraText}.`;
  }

  private getMaxActionDate(
    actionPlans: ActionTransferPlan[],
    lineDatesMap?: Map<number, Array<Date | null>>,
  ): Date | null {
    const dates: Date[] = [];
    for (const plan of actionPlans) {
      if (plan.fechaFinEfecto) dates.push(plan.fechaFinEfecto);
      if (plan.fechaEfecto) dates.push(plan.fechaEfecto);
      if (plan.fechaInicioEfecto) dates.push(plan.fechaInicioEfecto);
      if (plan.requiresSplit)
        dates.push(plan.fechaFinEfecto ?? plan.fechaInicioEfecto ?? plan.fechaEfecto ?? new Date());
      const lineDates = (lineDatesMap?.get(plan.idAccion) ?? []).filter(
        (date): date is Date => date instanceof Date,
      );
      dates.push(...lineDates);
    }
    if (!dates.length) return null;
    return dates.reduce((max, date) => (date > max ? date : max));
  }

  private async findBlockingPayrolls(
    companyId: number,
    effectiveDate: Date,
  ): Promise<
    Array<{ id: number; fechaInicioPeriodo: Date; fechaFinPeriodo: Date; estado: number }>
  > {
    return this.payrollCalendarRepo
      .createQueryBuilder('c')
      .select([
        'c.id AS id',
        'c.fechaInicioPeriodo AS fechaInicioPeriodo',
        'c.fechaFinPeriodo AS fechaFinPeriodo',
        'c.estado AS estado',
      ])
      .where('c.idEmpresa = :companyId', { companyId })
      .andWhere('c.estado IN (:...states)', {
        states: BLOCKING_PAYROLL_STATES,
      })
      .andWhere('c.esInactivo = 0')
      .andWhere('c.fechaInicioPeriodo <= :effectiveDate', { effectiveDate })
      .andWhere('c.fechaFinPeriodo >= :effectiveDate', { effectiveDate })
      .getRawMany();
  }

  private async findCalendarsForRange(
    companyId: number,
    fromDate: Date,
    toDate: Date,
    periodId?: number,
    currency?: string,
  ): Promise<PayrollCalendar[]> {
    const start = fromDate <= toDate ? fromDate : toDate;
    const end = fromDate <= toDate ? toDate : fromDate;
    const qb = this.payrollCalendarRepo
      .createQueryBuilder('c')
      .where('c.idEmpresa = :companyId', { companyId })
      .andWhere('c.esInactivo = 0')
      .andWhere('c.estado IN (:...states)', {
        states: [
          EstadoCalendarioNomina.ABIERTA,
          EstadoCalendarioNomina.EN_PROCESO,
          EstadoCalendarioNomina.VERIFICADA,
          EstadoCalendarioNomina.APLICADA,
          EstadoCalendarioNomina.CONTABILIZADA,
          EstadoCalendarioNomina.NOTIFICADA,
        ],
      })
      .andWhere('c.fechaFinPeriodo >= :start', { start })
      .andWhere('c.fechaInicioPeriodo <= :end', { end });

    if (periodId != null) {
      qb.andWhere('c.idPeriodoPago = :periodId', { periodId });
    }
    if (currency) {
      qb.andWhere('c.moneda = :currency', { currency });
    }

    return qb.orderBy('c.fechaInicioPeriodo', 'ASC').getMany();
  }

  private resolveCalendarForDate(date: Date, calendars: PayrollCalendar[]): PayrollCalendar | null {
    for (const calendar of calendars) {
      if (date >= calendar.fechaInicioPeriodo && date <= calendar.fechaFinPeriodo) {
        return calendar;
      }
    }
    return null;
  }

  private async assertUserCompanyAccess(userId: number, companyId: number): Promise<void> {
    const hasAccess = await this.userCompanyRepo.findOne({
      where: { idUsuario: userId, idEmpresa: companyId, estado: 1 },
    });
    if (!hasAccess) {
      throw new ForbiddenException(
        `No tiene acceso a la empresa ${companyId} para esta operación.`,
      );
    }
  }

  private parseDateOnlyForDb(dateValue: string): Date {
    const raw = dateValue.trim();
    const onlyDate = raw.includes('T') ? raw.split('T')[0] : raw;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(onlyDate);
    if (!match) {
      throw new BadRequestException('Fecha inválida.');
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const normalized = new Date(year, month - 1, day, 12, 0, 0, 0);

    if (
      Number.isNaN(normalized.getTime()) ||
      normalized.getFullYear() !== year ||
      normalized.getMonth() !== month - 1 ||
      normalized.getDate() !== day
    ) {
      throw new BadRequestException('Fecha inválida.');
    }

    return normalized;
  }

  private toDateKey(dateValue: Date | null): string | null {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async calculateAguinaldoProvisionSnapshot(
    employeeId: number,
    companyId: number,
    effectiveDate: Date,
  ): Promise<{ totalBruto: number; montoProvisionado: number }> {
    const total = await this.sumEmployeeTotalBruto(
      this.dataSource,
      employeeId,
      companyId,
      effectiveDate,
    );
    const montoProvisionado = Number((total / 12).toFixed(2));
    return { totalBruto: total, montoProvisionado };
  }

  private async createAguinaldoProvisionForTransfer(
    trx: DataSource['manager'],
    employee: Employee,
    transfer: EmployeeTransfer,
    effectiveDate: Date,
    userId: number,
  ): Promise<{ totalBruto: number; montoProvisionado: number }> {
    const dateKey = this.toDateKey(effectiveDate);
    if (!dateKey) {
      return { totalBruto: 0, montoProvisionado: 0 };
    }

    const existing = await trx.query(
      `
        SELECT id_provision_aguinaldo
        FROM sys_empleado_provision_aguinaldo
        WHERE id_empleado = ?
          AND id_empresa = ?
          AND fecha_fin_laboral = ?
          AND registro_empresa = 'Traslado de empresa'
        LIMIT 1
      `,
      [employee.id, transfer.idEmpresaOrigen, dateKey],
    );
    if (existing.length > 0) {
      const total = await this.sumEmployeeTotalBruto(
        trx,
        employee.id,
        transfer.idEmpresaOrigen,
        effectiveDate,
      );
      return {
        totalBruto: total,
        montoProvisionado: Number((total / 12).toFixed(2)),
      };
    }

    const total = await this.sumEmployeeTotalBruto(
      trx,
      employee.id,
      transfer.idEmpresaOrigen,
      effectiveDate,
    );
    const montoProvisionado = Number((total / 12).toFixed(2));

    const provision = trx.create(EmployeeAguinaldoProvision, {
      idEmpleado: employee.id,
      idEmpresa: transfer.idEmpresaOrigen,
      montoProvisionado: montoProvisionado.toFixed(2),
      fechaInicioLaboral: employee.fechaIngreso,
      fechaFinLaboral: new Date(dateKey),
      registroEmpresa: 'Traslado de empresa',
      estado: EstadoProvisionAguinaldoEmpleado.PENDIENTE,
      creadoPor: userId,
      modificadoPor: userId,
    });
    await trx.save(EmployeeAguinaldoProvision, provision);

    return { totalBruto: total, montoProvisionado };
  }

  private async sumEmployeeTotalBruto(
    runner: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> },
    employeeId: number,
    companyId: number,
    effectiveDate: Date,
  ): Promise<number> {
    const dateKey = this.toDateKey(effectiveDate);
    if (!dateKey) return 0;
    const rows = await runner.query(
      `
        SELECT COALESCE(SUM(r.total_bruto_resultado), 0) AS total
        FROM nomina_resultados r
        INNER JOIN nom_calendarios_nomina p
          ON p.id_calendario_nomina = r.id_nomina
        WHERE r.id_empleado = ?
          AND p.id_empresa = ?
          AND p.estado_calendario_nomina IN (?, ?)
          AND p.fecha_fin_periodo <= ?
      `,
      [
        employeeId,
        companyId,
        EstadoCalendarioNomina.APLICADA,
        EstadoCalendarioNomina.CONTABILIZADA,
        dateKey,
      ],
    );
    const total = Number((rows?.[0] as { total?: string })?.total ?? 0);
    return Number.isNaN(total) ? 0 : total;
  }
}
