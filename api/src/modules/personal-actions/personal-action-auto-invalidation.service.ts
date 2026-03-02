import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PersonalAction, PersonalActionEstado } from './entities/personal-action.entity';
import {
  PERSONAL_ACTION_INVALIDATED_BY,
  PERSONAL_ACTION_INVALIDATION_REASON,
  type PersonalActionInvalidationReasonCode,
} from './constants/personal-action-invalidation.constants';

interface AutoInvalidationOptions {
  manager?: EntityManager;
  employeeId?: number;
  companyId?: number;
  payrollId?: number;
  payrollCurrency?: string | null;
  reasonCodes?: PersonalActionInvalidationReasonCode[];
  source: string;
}

export interface AutoInvalidationSummary {
  totalInvalidated: number;
  byReason: Record<PersonalActionInvalidationReasonCode, number>;
  sampleActionIds: number[];
}

@Injectable()
export class PersonalActionAutoInvalidationService {
  constructor(
    @InjectRepository(PersonalAction)
    private readonly personalActionRepo: Repository<PersonalAction>,
  ) {}

  async run(options: AutoInvalidationOptions): Promise<AutoInvalidationSummary> {
    const reasonCodes = options.reasonCodes?.length
      ? options.reasonCodes
      : [
          PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE,
          PERSONAL_ACTION_INVALIDATION_REASON.COMPANY_MISMATCH,
          PERSONAL_ACTION_INVALIDATION_REASON.CURRENCY_MISMATCH,
        ];

    const byReason: Record<PersonalActionInvalidationReasonCode, number> = {
      [PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE]: 0,
      [PERSONAL_ACTION_INVALIDATION_REASON.COMPANY_MISMATCH]: 0,
      [PERSONAL_ACTION_INVALIDATION_REASON.CURRENCY_MISMATCH]: 0,
      [PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION]: 0,
    };
    const sampleActionIdsSet = new Set<number>();

    for (const reasonCode of reasonCodes) {
      const result = await this.invalidateByReason(reasonCode, options);
      byReason[reasonCode] = result.affected;
      for (const id of result.sampleActionIds) sampleActionIdsSet.add(id);
    }

    const totalInvalidated =
      byReason[PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE] +
      byReason[PERSONAL_ACTION_INVALIDATION_REASON.COMPANY_MISMATCH] +
      byReason[PERSONAL_ACTION_INVALIDATION_REASON.CURRENCY_MISMATCH];

    return {
      totalInvalidated,
      byReason,
      sampleActionIds: Array.from(sampleActionIdsSet).slice(0, 10),
    };
  }

  private async invalidateByReason(
    reasonCode: PersonalActionInvalidationReasonCode,
    options: AutoInvalidationOptions,
  ): Promise<{ affected: number; sampleActionIds: number[] }> {
    if (reasonCode === PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION) {
      return { affected: 0, sampleActionIds: [] };
    }

    const { manager, source } = options;
    const scope = this.resolveScopeFilters(options);

    let whereSql = '';
    let whereParams: unknown[] = [];
    let updateSql = '';
    let updateParams: unknown[] = [];

    if (reasonCode === PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE) {
      whereSql = `
        FROM acc_acciones_personal a
        INNER JOIN sys_empleados e ON e.id_empleado = a.id_empleado
        WHERE a.estado_accion = ?
          AND a.id_calendario_nomina IS NULL
          AND e.fecha_salida_empleado IS NOT NULL
          AND COALESCE(a.fecha_inicio_efecto_accion, a.fecha_efecto_accion) > e.fecha_salida_empleado
          ${scope.sql}
      `;
      whereParams = [PersonalActionEstado.APPROVED, ...scope.params];
      updateSql = `
        UPDATE acc_acciones_personal a
        INNER JOIN sys_empleados e ON e.id_empleado = a.id_empleado
        SET
          a.estado_accion = ?,
          a.invalidated_at_accion = NOW(),
          a.invalidated_reason_code_accion = ?,
          a.invalidated_reason_accion = CONCAT(
            'Empleado terminado a partir de ',
            DATE_FORMAT(e.fecha_salida_empleado, '%Y-%m-%d'),
            '. Accion futura invalida.'
          ),
          a.invalidated_by_type_accion = ?,
          a.invalidated_by_user_id_accion = NULL,
          a.invalidated_meta_accion = JSON_OBJECT(
            'invalidated_by_type', ?,
            'source', ?,
            'employee_id', a.id_empleado,
            'company_id', a.id_empresa,
            'termination_date', DATE_FORMAT(e.fecha_salida_empleado, '%Y-%m-%d')
          ),
          a.modificado_por_accion = NULL,
          a.version_lock_accion = a.version_lock_accion + 1
        WHERE a.estado_accion = ?
          AND a.id_calendario_nomina IS NULL
          AND e.fecha_salida_empleado IS NOT NULL
          AND COALESCE(a.fecha_inicio_efecto_accion, a.fecha_efecto_accion) > e.fecha_salida_empleado
          ${scope.sql}
      `;
      updateParams = [
        PersonalActionEstado.INVALIDATED,
        PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE,
        PERSONAL_ACTION_INVALIDATED_BY.SYSTEM,
        PERSONAL_ACTION_INVALIDATED_BY.SYSTEM,
        source,
        PersonalActionEstado.APPROVED,
        ...scope.params,
      ];
    }

    if (reasonCode === PERSONAL_ACTION_INVALIDATION_REASON.COMPANY_MISMATCH) {
      whereSql = `
        FROM acc_acciones_personal a
        INNER JOIN sys_empleados e ON e.id_empleado = a.id_empleado
        WHERE a.estado_accion = ?
          AND a.id_calendario_nomina IS NULL
          AND e.id_empresa <> a.id_empresa
          ${scope.sql}
      `;
      whereParams = [PersonalActionEstado.APPROVED, ...scope.params];
      updateSql = `
        UPDATE acc_acciones_personal a
        INNER JOIN sys_empleados e ON e.id_empleado = a.id_empleado
        SET
          a.estado_accion = ?,
          a.invalidated_at_accion = NOW(),
          a.invalidated_reason_code_accion = ?,
          a.invalidated_reason_accion = CONCAT(
            'Accion creada para empresa ',
            a.id_empresa,
            ', empleado vigente en empresa ',
            e.id_empresa,
            '.'
          ),
          a.invalidated_by_type_accion = ?,
          a.invalidated_by_user_id_accion = NULL,
          a.invalidated_meta_accion = JSON_OBJECT(
            'invalidated_by_type', ?,
            'source', ?,
            'employee_id', a.id_empleado,
            'action_company_id', a.id_empresa,
            'employee_company_id', e.id_empresa
          ),
          a.modificado_por_accion = NULL,
          a.version_lock_accion = a.version_lock_accion + 1
        WHERE a.estado_accion = ?
          AND a.id_calendario_nomina IS NULL
          AND e.id_empresa <> a.id_empresa
          ${scope.sql}
      `;
      updateParams = [
        PersonalActionEstado.INVALIDATED,
        PERSONAL_ACTION_INVALIDATION_REASON.COMPANY_MISMATCH,
        PERSONAL_ACTION_INVALIDATED_BY.SYSTEM,
        PERSONAL_ACTION_INVALIDATED_BY.SYSTEM,
        source,
        PersonalActionEstado.APPROVED,
        ...scope.params,
      ];
    }

    if (reasonCode === PERSONAL_ACTION_INVALIDATION_REASON.CURRENCY_MISMATCH) {
      const includePayrollCurrencyCheck = !!options.payrollCurrency;
      const payrollCurrencyCondition = includePayrollCurrencyCheck
        ? ' OR a.moneda_accion <> ?'
        : '';
      const payrollCurrencyParams = includePayrollCurrencyCheck
        ? [options.payrollCurrency]
        : [];

      whereSql = `
        FROM acc_acciones_personal a
        INNER JOIN sys_empleados e ON e.id_empleado = a.id_empleado
        WHERE a.estado_accion = ?
          AND a.id_calendario_nomina IS NULL
          AND (
            (e.moneda_salario_empleado IS NOT NULL AND a.moneda_accion <> e.moneda_salario_empleado)
            ${payrollCurrencyCondition}
          )
          ${scope.sql}
      `;
      whereParams = [
        PersonalActionEstado.APPROVED,
        ...payrollCurrencyParams,
        ...scope.params,
      ];
      updateSql = `
        UPDATE acc_acciones_personal a
        INNER JOIN sys_empleados e ON e.id_empleado = a.id_empleado
        SET
          a.estado_accion = ?,
          a.invalidated_at_accion = NOW(),
          a.invalidated_reason_code_accion = ?,
          a.invalidated_reason_accion = CONCAT(
            'Moneda accion ',
            a.moneda_accion,
            ' incompatible con empleado/planilla ',
            e.moneda_salario_empleado,
            ${includePayrollCurrencyCheck ? "'/'" : "''"},
            ${includePayrollCurrencyCheck ? '?' : "''"},
            '.'
          ),
          a.invalidated_by_type_accion = ?,
          a.invalidated_by_user_id_accion = NULL,
          a.invalidated_meta_accion = JSON_OBJECT(
            'invalidated_by_type', ?,
            'source', ?,
            'employee_id', a.id_empleado,
            'action_currency', a.moneda_accion,
            'employee_currency', e.moneda_salario_empleado
            ${includePayrollCurrencyCheck ? ", 'payroll_currency', ?" : ''}
          ),
          a.modificado_por_accion = NULL,
          a.version_lock_accion = a.version_lock_accion + 1
        WHERE a.estado_accion = ?
          AND a.id_calendario_nomina IS NULL
          AND (
            (e.moneda_salario_empleado IS NOT NULL AND a.moneda_accion <> e.moneda_salario_empleado)
            ${payrollCurrencyCondition}
          )
          ${scope.sql}
      `;
      updateParams = [
        PersonalActionEstado.INVALIDATED,
        PERSONAL_ACTION_INVALIDATION_REASON.CURRENCY_MISMATCH,
        ...(includePayrollCurrencyCheck ? [options.payrollCurrency] : []),
        PERSONAL_ACTION_INVALIDATED_BY.SYSTEM,
        PERSONAL_ACTION_INVALIDATED_BY.SYSTEM,
        source,
        ...(includePayrollCurrencyCheck ? [options.payrollCurrency] : []),
        PersonalActionEstado.APPROVED,
        ...payrollCurrencyParams,
        ...scope.params,
      ];
    }

    if (!whereSql || !updateSql) {
      return { affected: 0, sampleActionIds: [] };
    }

    const sampleRows = await this.execQuery<{ id_accion: number }>(
      `SELECT a.id_accion ${whereSql} ORDER BY a.id_accion ASC LIMIT 10`,
      whereParams,
      manager,
    );
    const sampleActionIds = Array.isArray(sampleRows)
      ? sampleRows.map((row) => Number(row.id_accion))
      : [];

    const raw = await this.execQuery<{ affectedRows?: number }>(
      updateSql,
      updateParams,
      manager,
    );
    const first = Array.isArray(raw) ? raw[0] : (raw as { affectedRows?: number });
    const affected = Number(first?.affectedRows ?? 0);

    return { affected, sampleActionIds };
  }

  private resolveScopeFilters(options: AutoInvalidationOptions): {
    sql: string;
    params: unknown[];
  } {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (options.employeeId) {
      clauses.push('AND a.id_empleado = ?');
      params.push(options.employeeId);
    }
    if (options.companyId) {
      clauses.push('AND a.id_empresa = ?');
      params.push(options.companyId);
    }

    return {
      sql: clauses.length > 0 ? `\n${clauses.join('\n')}` : '',
      params,
    };
  }

  private execQuery<T>(
    sql: string,
    params: unknown[],
    manager?: EntityManager,
  ): Promise<T[] | T> {
    if (manager) return manager.query(sql, params);
    return this.personalActionRepo.query(sql, params);
  }
}
