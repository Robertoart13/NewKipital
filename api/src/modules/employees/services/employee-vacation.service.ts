import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { EmployeeVacationAccount } from '../entities/employee-vacation-account.entity';
import {
  EmployeeVacationLedger,
  VacationMovementType,
} from '../entities/employee-vacation-ledger.entity';
import { EmployeeVacationMonetaryProvision } from '../entities/employee-vacation-monetary-provision.entity';
import {
  PERSONAL_ACTION_APPROVED_STATES,
  PersonalAction,
} from '../../personal-actions/entities/personal-action.entity';
import { EmployeeSensitiveDataService } from '../../../common/services/employee-sensitive-data.service';

const VACATION_ACTION_TYPES = new Set(['vacaciones', 'vacacion', 'vacation']);

const PAY_PERIOD_FORMULAS: Record<
  number,
  { divisor: number; label: string } | null
> = {
  8: { divisor: 7, label: 'SEMANAL: salario_base / 7' },
  9: { divisor: 30, label: 'QUINCENAL: (salario_base / 2) / 15' },
  10: { divisor: 30, label: 'MENSUAL: salario_base / 30' },
  11: { divisor: 14, label: 'BISEMANAL: salario_base / 14' },
  12: null,
  13: { divisor: 90, label: 'TRIMESTRAL: salario_base / 90' },
  14: { divisor: 180, label: 'SEMESTRAL: salario_base / 180' },
  15: { divisor: 365, label: 'ANUAL: salario_base / 365' },
};

interface DueAccountRow {
  id_vacaciones_cuenta: number;
  id_empleado: number;
  id_empresa: number;
  dia_ancla_vacaciones: number;
  fecha_ingreso_ancla_vacaciones: string;
  ultima_fecha_provision_vacaciones: string | null;
  id_periodos_pago: number | null;
  salario_base_empleado: string | null;
  fecha_salida_empleado: string | null;
}

@Injectable()
export class EmployeeVacationService {
  private readonly logger = new Logger(EmployeeVacationService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(PersonalAction)
    private readonly personalActionRepo: Repository<PersonalAction>,
    @InjectRepository(EmployeeVacationAccount)
    private readonly accountRepo: Repository<EmployeeVacationAccount>,
    @InjectRepository(EmployeeVacationLedger)
    private readonly ledgerRepo: Repository<EmployeeVacationLedger>,
    @InjectRepository(EmployeeVacationMonetaryProvision)
    private readonly provisionMontoRepo: Repository<EmployeeVacationMonetaryProvision>,
    private readonly sensitiveDataService: EmployeeSensitiveDataService,
  ) {}

  async createInitialAccount(
    manager: EntityManager,
    employee: Employee,
    initialDays: number,
    actorId?: number,
  ): Promise<void> {
    const diasIniciales =
      Number.isInteger(initialDays) && initialDays >= 0 ? initialDays : 0;
    const fechaIngreso = this.toDateOnly(employee.fechaIngreso);
    this.assertJoinDateWithinPolicy(fechaIngreso);

    let account = await manager.findOne(EmployeeVacationAccount, {
      where: { idEmpleado: employee.id },
    });

    if (!account) {
      account = manager.create(EmployeeVacationAccount, {
        idEmpleado: employee.id,
        idEmpresa: employee.idEmpresa,
        diasIniciales,
        inicialBloqueado: 1,
        diaAncla: this.getDay(fechaIngreso),
        fechaIngresoAncla: fechaIngreso,
        ultimaFechaProvision: null,
        estado: employee.estado === 1 ? 1 : 0,
        creadoPor: actorId ?? null,
        modificadoPor: actorId ?? null,
      });
      account = await manager.save(EmployeeVacationAccount, account);
    }

    const existingInitial = await manager.findOne(EmployeeVacationLedger, {
      where: {
        idVacacionesCuenta: account.id,
        tipoMovimiento: VacationMovementType.INITIAL,
      },
      order: { id: 'ASC' },
    });

    if (!existingInitial) {
      await this.appendMovement(manager, {
        account,
        employee,
        movementType: VacationMovementType.INITIAL,
        daysDelta: diasIniciales,
        effectiveDate: fechaIngreso,
        sourceType: 'EMPLOYEE_CREATE',
        sourceId: employee.id,
        description: 'Saldo inicial de vacaciones',
        actorId,
      });
    }
  }

  async syncAccountAnchorOnJoinDateChange(
    manager: EntityManager,
    employee: Employee,
    actorId?: number,
  ): Promise<void> {
    const fechaIngreso = this.toDateOnly(employee.fechaIngreso);
    this.assertJoinDateWithinPolicy(fechaIngreso);

    let account = await manager.findOne(EmployeeVacationAccount, {
      where: { idEmpleado: employee.id },
    });

    if (!account) {
      account = manager.create(EmployeeVacationAccount, {
        idEmpleado: employee.id,
        idEmpresa: employee.idEmpresa,
        diasIniciales: 0,
        inicialBloqueado: 1,
        diaAncla: this.getDay(fechaIngreso),
        fechaIngresoAncla: fechaIngreso,
        ultimaFechaProvision: null,
        estado: employee.estado === 1 ? 1 : 0,
        creadoPor: actorId ?? null,
        modificadoPor: actorId ?? null,
      });
    } else {
      account.diaAncla = this.getDay(fechaIngreso);
      account.fechaIngresoAncla = fechaIngreso;
      account.modificadoPor = actorId ?? null;
    }

    await manager.save(EmployeeVacationAccount, account);
  }

  async runDailyProvision(referenceDate?: Date): Promise<{
    processedEmployees: number;
    accrualsCreated: number;
    accrualsSkipped: number;
    errors: number;
  }> {
    const todayCR = this.getCostaRicaDateOnly(referenceDate ?? new Date());

    const rows = await this.accountRepo.query(
      `
      SELECT
        c.id_vacaciones_cuenta,
        c.id_empleado,
        c.id_empresa,
        c.dia_ancla_vacaciones,
        c.fecha_ingreso_ancla_vacaciones,
        c.ultima_fecha_provision_vacaciones,
        e.id_periodos_pago,
        e.salario_base_empleado,
        e.fecha_salida_empleado
      FROM sys_empleado_vacaciones_cuenta c
      INNER JOIN sys_empleados e ON e.id_empleado = c.id_empleado
      WHERE c.estado_vacaciones_cuenta = 1
        AND e.estado_empleado = 1
        AND c.dia_ancla_vacaciones BETWEEN 1 AND 28
    `,
    );

    const summary = {
      processedEmployees: 0,
      accrualsCreated: 0,
      accrualsSkipped: 0,
      errors: 0,
    };

    for (const row of rows) {
      summary.processedEmployees += 1;
      try {
        const startAnchorDate = this.toDateOnly(
          row.fecha_ingreso_ancla_vacaciones,
        );
        const lastProvisionDate = row.ultima_fecha_provision_vacaciones
          ? this.toDateOnly(row.ultima_fecha_provision_vacaciones)
          : null;
        const terminationDate = row.fecha_salida_empleado
          ? this.toDateOnly(row.fecha_salida_empleado)
          : null;

        const cutoffDate =
          terminationDate && terminationDate < todayCR
            ? terminationDate
            : todayCR;

        let nextDueDate = lastProvisionDate
          ? this.addOneMonthWithAnchor(
              lastProvisionDate,
              row.dia_ancla_vacaciones,
            )
          : this.addOneMonthWithAnchor(
              startAnchorDate,
              row.dia_ancla_vacaciones,
            );

        while (nextDueDate <= cutoffDate) {
          const result = await this.ledgerRepo.manager.transaction(
            async (manager) => {
              const employee = await manager.findOne(Employee, {
                where: { id: row.id_empleado },
              });
              if (!employee || employee.estado !== 1) {
                return { created: false, skipped: true };
              }

              const account = await manager.findOne(EmployeeVacationAccount, {
                where: { id: row.id_vacaciones_cuenta },
              });
              if (!account || account.estado !== 1) {
                return { created: false, skipped: true };
              }

              const periodRef = this.getPeriodRef(nextDueDate);
              const movement = await this.appendMovement(manager, {
                account,
                employee,
                movementType: VacationMovementType.MONTHLY_ACCRUAL,
                daysDelta: 1,
                effectiveDate: nextDueDate,
                periodRef,
                sourceType: 'VACATION_MONTHLY_PROVISION',
                sourceId: null,
                description: 'ProvisiÃ³n mensual automÃ¡tica de vacaciones',
                actorId: null,
              });

              account.ultimaFechaProvision = nextDueDate;
              await manager.save(EmployeeVacationAccount, account);

              if (movement.created) {
                const money = this.calculateProvisionAmount(
                  row.id_periodos_pago,
                  row.salario_base_empleado,
                );
                await manager.save(
                  EmployeeVacationMonetaryProvision,
                  manager.create(EmployeeVacationMonetaryProvision, {
                    idEmpleado: account.idEmpleado,
                    idEmpresa: account.idEmpresa,
                    idVacacionesLedger: movement.ledger.id,
                    idPeriodoPago: row.id_periodos_pago,
                    fechaProvision: nextDueDate,
                    diasProvisionados: 1,
                    montoProvisionado: money.amount.toFixed(2),
                    formulaAplicada: money.formula,
                    creadoPor: null,
                  }),
                );
              }

              return { created: movement.created, skipped: false };
            },
          );

          if (result.skipped) {
            summary.accrualsSkipped += 1;
          } else if (result.created) {
            summary.accrualsCreated += 1;
          } else {
            summary.accrualsSkipped += 1;
          }

          nextDueDate = this.addOneMonthWithAnchor(
            nextDueDate,
            row.dia_ancla_vacaciones,
          );
        }
      } catch (error) {
        summary.errors += 1;
        this.logger.error(
          `Error provisioning vacations employee=${row.id_empleado}: ${(error as Error).message}`,
        );
      }
    }

    return summary;
  }

  async applyVacationUsageFromPayroll(
    payrollId: number,
    effectiveDate: Date,
    actorId?: number,
  ): Promise<{
    processedActions: number;
    deductedDays: number;
    skippedActions: number;
  }> {
    const actions = await this.personalActionRepo.find({
      where: {
        idCalendarioNomina: payrollId,
        estado: In(PERSONAL_ACTION_APPROVED_STATES),
      },
    });

    let processedActions = 0;
    let deductedDays = 0;
    let skippedActions = 0;

    for (const action of actions) {
      const actionType = (action.tipoAccion ?? '').toLowerCase().trim();
      if (!VACATION_ACTION_TYPES.has(actionType)) {
        skippedActions += 1;
        continue;
      }

      const days = Number(action.monto ?? 0);
      if (!Number.isInteger(days) || days <= 0) {
        skippedActions += 1;
        continue;
      }

      const created = await this.ledgerRepo.manager.transaction(
        async (manager) => {
          const employee = await manager.findOne(Employee, {
            where: { id: action.idEmpleado },
          });
          if (!employee) return false;

          const account = await manager.findOne(EmployeeVacationAccount, {
            where: { idEmpleado: action.idEmpleado },
          });
          if (!account) return false;

          const movement = await this.appendMovement(manager, {
            account,
            employee,
            movementType: VacationMovementType.VACATION_USAGE,
            daysDelta: -days,
            effectiveDate: this.toDateOnly(effectiveDate),
            sourceType: 'PAYROLL_APPLIED_ACTION',
            sourceId: action.id,
            description: `Descuento vacaciones por acciÃ³n #${action.id} aplicada en planilla #${payrollId}`,
            actorId,
          });

          return movement.created;
        },
      );

      if (created) {
        processedActions += 1;
        deductedDays += days;
      } else {
        skippedActions += 1;
      }
    }

    return { processedActions, deductedDays, skippedActions };
  }

  private async appendMovement(
    manager: EntityManager,
    input: {
      account: EmployeeVacationAccount;
      employee: Employee;
      movementType: VacationMovementType;
      daysDelta: number;
      effectiveDate: Date;
      periodRef?: string;
      sourceType?: string | null;
      sourceId?: number | null;
      description?: string | null;
      actorId?: number | null;
    },
  ): Promise<{ created: boolean; ledger: EmployeeVacationLedger }> {
    if (input.sourceType && input.sourceId != null) {
      const existingBySource = await manager.findOne(EmployeeVacationLedger, {
        where: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          tipoMovimiento: input.movementType,
        },
      });
      if (existingBySource) {
        return { created: false, ledger: existingBySource };
      }
    }

    if (
      input.movementType === VacationMovementType.MONTHLY_ACCRUAL &&
      input.periodRef
    ) {
      const existingByPeriod = await manager.findOne(EmployeeVacationLedger, {
        where: {
          idEmpleado: input.employee.id,
          tipoMovimiento: VacationMovementType.MONTHLY_ACCRUAL,
          periodoReferencia: input.periodRef,
        },
      });
      if (existingByPeriod) {
        return { created: false, ledger: existingByPeriod };
      }
    }

    const lastMovement = await manager.findOne(EmployeeVacationLedger, {
      where: { idVacacionesCuenta: input.account.id },
      order: { id: 'DESC' },
    });

    const currentBalance = lastMovement?.saldoResultante ?? 0;
    const nextBalance = currentBalance + input.daysDelta;

    const ledger = manager.create(EmployeeVacationLedger, {
      idEmpleado: input.employee.id,
      idEmpresa: input.employee.idEmpresa,
      idVacacionesCuenta: input.account.id,
      tipoMovimiento: input.movementType,
      diasDelta: input.daysDelta,
      saldoResultante: nextBalance,
      fechaEfectiva: input.effectiveDate,
      periodoReferencia: input.periodRef ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      descripcion: input.description ?? null,
      creadoPor: input.actorId ?? null,
    });

    const saved = await manager.save(EmployeeVacationLedger, ledger);
    return { created: true, ledger: saved };
  }

  private calculateProvisionAmount(
    idPeriodoPago: number | null,
    encryptedSalaryBase: string | null,
  ): { amount: number; formula: string } {
    const salaryRaw = this.sensitiveDataService.decrypt(encryptedSalaryBase);
    const salary = Number(salaryRaw ?? 0);

    if (!Number.isFinite(salary) || salary <= 0) {
      return { amount: 0, formula: 'SALARIO_INVALIDO' };
    }

    if (idPeriodoPago === 12) {
      return {
        amount: this.roundMoney(salary),
        formula: 'DIARIO: salario_base',
      };
    }

    const formula = idPeriodoPago
      ? PAY_PERIOD_FORMULAS[idPeriodoPago]
      : undefined;
    if (!formula) {
      return {
        amount: this.roundMoney(salary / 30),
        formula: 'DEFAULT: salario_base / 30',
      };
    }

    return {
      amount: this.roundMoney(salary / formula.divisor),
      formula: formula.label,
    };
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private getCostaRicaDateOnly(now: Date): Date {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateString = formatter.format(now);
    return this.toDateOnly(dateString);
  }

  private toDateOnly(value: Date | string): Date {
    if (value instanceof Date) {
      return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
        12,
        0,
        0,
        0,
      );
    }

    const raw = value.includes('T') ? value.split('T')[0] : value;
    const [year, month, day] = raw.split('-').map((v) => Number(v));
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  private addOneMonthWithAnchor(date: Date, anchorDay: number): Date {
    const y = date.getFullYear();
    const m = date.getMonth();
    return new Date(y, m + 1, anchorDay, 12, 0, 0, 0);
  }

  private getDay(value: Date): number {
    return value.getDate();
  }

  private getPeriodRef(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  assertJoinDateWithinPolicy(fechaIngreso: Date): void {
    const day = this.getDay(fechaIngreso);
    if (day < 1 || day > 28) {
      throw new Error(
        'La fecha de ingreso debe estar entre el dÃ­a 1 y 28 del mes.',
      );
    }
  }
}
