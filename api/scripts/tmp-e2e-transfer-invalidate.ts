import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { IntercompanyTransferService } from '../src/modules/payroll/intercompany-transfer.service';
import { PayrollService } from '../src/modules/payroll/payroll.service';

function ymd(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const userId = 1;

  let blockerStateBackup: Array<{ id: number; estado: number }> = [];

  try {
    const payrollService = app.get(PayrollService);
    const transferService = app.get(IntercompanyTransferService);
    const ds = (payrollService as any).dataSource;

    const rows = (await ds.query(
      `SELECT pri.id_reactivation_item, pri.id_accion, pa.id_empleado, pa.id_empresa
       FROM acc_planilla_reactivation_items pri
       INNER JOIN acc_acciones_personal pa ON pa.id_accion = pri.id_accion
       WHERE pri.es_procesado_reactivacion = 0
       ORDER BY pri.id_reactivation_item ASC`,
    )) as Array<{ id_reactivation_item: number; id_accion: number; id_empleado: number; id_empresa: number }>;

    if (!rows.length) {
      console.log(JSON.stringify({ ok: false, reason: 'No hay snapshots pendientes.' }, null, 2));
      return;
    }

    const employeeId = Number(rows[0].id_empleado);
    const actionIds = Array.from(new Set(rows.filter((r) => Number(r.id_empleado) === employeeId).map((r) => Number(r.id_accion))));

    const employee = (await ds.query(
      `SELECT id_empleado, id_empresa, id_periodos_pago, moneda_salario_empleado
       FROM sys_empleados WHERE id_empleado = ? LIMIT 1`,
      [employeeId],
    )) as Array<{ id_empleado: number; id_empresa: number; id_periodos_pago: number; moneda_salario_empleado: string | null }>;

    if (!employee.length) {
      console.log(JSON.stringify({ ok: false, reason: 'Empleado no encontrado.' }, null, 2));
      return;
    }

    const sourceCompanyId = Number(employee[0].id_empresa);
    const employeePeriodId = Number(employee[0].id_periodos_pago);
    const employeeCurrency = String(employee[0].moneda_salario_empleado || 'CRC').toUpperCase();

    const blockingActions = (await ds.query(
      `SELECT id_accion, estado_accion
       FROM acc_acciones_personal
       WHERE id_accion IN (${actionIds.map(() => '?').join(',')})
         AND tipo_accion IN ('licencia','licencias','incapacidad','incapacidades','aumento','aumentos')
         AND estado_accion IN (1,2,3,4)`,
      actionIds,
    )) as Array<{ id_accion: number; estado_accion: number }>;

    blockerStateBackup = blockingActions.map((row) => ({ id: Number(row.id_accion), estado: Number(row.estado_accion) }));

    if (blockerStateBackup.length > 0) {
      await ds.query(
        `UPDATE acc_acciones_personal
         SET estado_accion = 6, modificado_por_accion = ?
         WHERE id_accion IN (${blockerStateBackup.map(() => '?').join(',')})`,
        [userId, ...blockerStateBackup.map((row) => row.id)],
      );
    }

    const dateWindow = (await ds.query(
      `SELECT
         MIN(COALESCE(fecha_inicio_efecto_accion, fecha_efecto_accion)) AS min_fecha,
         MAX(COALESCE(fecha_fin_efecto_accion, fecha_efecto_accion, fecha_inicio_efecto_accion)) AS max_fecha
       FROM acc_acciones_personal
       WHERE id_accion IN (${actionIds.map(() => '?').join(',')})`,
      actionIds,
    )) as Array<{ min_fecha: string; max_fecha: string }>;

    const periodoInicio = ymd(dateWindow[0]?.min_fecha as any) ?? '2026-03-01';
    const periodoFin = ymd(dateWindow[0]?.max_fecha as any) ?? periodoInicio;

    const userCompanies = (await ds.query(
      `SELECT id_empresa FROM sys_usuario_empresa WHERE id_usuario = ? AND estado_usuario_empresa = 1 ORDER BY id_empresa`,
      [userId],
    )) as Array<{ id_empresa: number }>;

    const destinationCompanyId =
      userCompanies.map((row) => Number(row.id_empresa)).find((id) => id !== sourceCompanyId) ?? null;

    if (!destinationCompanyId) {
      console.log(JSON.stringify({ ok: false, reason: 'No hay empresa destino con acceso para usuario test.' }, null, 2));
      return;
    }

    let destinationPayroll = (await ds.query(
      `SELECT id_calendario_nomina
       FROM nom_calendarios_nomina
       WHERE id_empresa = ?
         AND id_periodos_pago = ?
         AND tipo_planilla = 'Regular'
         AND moneda_calendario_nomina = ?
         AND fecha_inicio_periodo = ?
         AND fecha_fin_periodo = ?
         AND estado_calendario_nomina IN (1,2,3)
         AND es_inactivo = 1
       ORDER BY id_calendario_nomina DESC LIMIT 1`,
      [destinationCompanyId, employeePeriodId, employeeCurrency, periodoInicio, periodoFin],
    )) as Array<{ id_calendario_nomina: number }>;

    if (!destinationPayroll.length) {
      await payrollService.create(
        {
          idEmpresa: destinationCompanyId,
          idPeriodoPago: employeePeriodId,
          tipoPlanilla: 'Regular',
          periodoInicio,
          periodoFin,
          fechaInicioPago: periodoFin,
          fechaFinPago: periodoFin,
          fechaCorte: periodoFin,
          fechaPagoProgramada: periodoFin,
          moneda: employeeCurrency as any,
          nombrePlanilla: `E2E-TRANSFER-${Date.now()}`,
        } as any,
        userId,
      );

      destinationPayroll = (await ds.query(
        `SELECT id_calendario_nomina
         FROM nom_calendarios_nomina
         WHERE id_empresa = ?
           AND id_periodos_pago = ?
           AND tipo_planilla = 'Regular'
           AND moneda_calendario_nomina = ?
           AND fecha_inicio_periodo = ?
           AND fecha_fin_periodo = ?
           AND estado_calendario_nomina IN (1,2,3)
           AND es_inactivo = 1
         ORDER BY id_calendario_nomina DESC LIMIT 1`,
        [destinationCompanyId, employeePeriodId, employeeCurrency, periodoInicio, periodoFin],
      )) as Array<{ id_calendario_nomina: number }>;
    }

    const before = (await ds.query(
      `SELECT resultado_reactivacion, es_procesado_reactivacion, COUNT(*) AS total
       FROM acc_planilla_reactivation_items
       WHERE id_accion IN (${actionIds.map(() => '?').join(',')})
       GROUP BY resultado_reactivacion, es_procesado_reactivacion
       ORDER BY total DESC`,
      actionIds,
    )) as Array<{ resultado_reactivacion: string | null; es_procesado_reactivacion: number; total: number }>;

    const simulation = await transferService.simulate(
      {
        idEmpresaDestino: destinationCompanyId,
        fechaEfectiva: periodoInicio,
        empleados: [{ idEmpleado: employeeId }],
        motivo: 'E2E validate INVALIDATED_BY_TRANSFER',
      },
      userId,
    );

    let executeResult: unknown = null;
    if (simulation[0]?.eligible && simulation[0]?.transferId) {
      executeResult = await transferService.execute({ transferIds: [simulation[0].transferId] }, userId);
    }

    const after = (await ds.query(
      `SELECT resultado_reactivacion, es_procesado_reactivacion, COUNT(*) AS total
       FROM acc_planilla_reactivation_items
       WHERE id_accion IN (${actionIds.map(() => '?').join(',')})
       GROUP BY resultado_reactivacion, es_procesado_reactivacion
       ORDER BY total DESC`,
      actionIds,
    )) as Array<{ resultado_reactivacion: string | null; es_procesado_reactivacion: number; total: number }>;

    const invalidatedCount = (await ds.query(
      `SELECT COUNT(*) AS total
       FROM acc_planilla_reactivation_items
       WHERE id_accion IN (${actionIds.map(() => '?').join(',')})
         AND resultado_reactivacion = 'INVALIDATED_BY_TRANSFER'
         AND es_procesado_reactivacion = 1`,
      actionIds,
    )) as Array<{ total: number }>;

    console.log(
      JSON.stringify(
        {
          ok: true,
          employeeId,
          sourceCompanyId,
          destinationCompanyId,
          employeePeriodId,
          employeeCurrency,
          periodoInicio,
          periodoFin,
          destinationPayrollId: destinationPayroll[0]?.id_calendario_nomina ?? null,
          simulation,
          executeResult,
          before,
          after,
          invalidatedByTransferCount: Number(invalidatedCount[0]?.total ?? 0),
        },
        null,
        2,
      ),
    );
  } finally {
    try {
      if (blockerStateBackup.length > 0) {
        const payrollService = app.get(PayrollService);
        const ds = (payrollService as any).dataSource;
        for (const item of blockerStateBackup) {
          await ds.query(
            `UPDATE acc_acciones_personal SET estado_accion = ?, modificado_por_accion = ? WHERE id_accion = ?`,
            [item.estado, userId, item.id],
          );
        }
      }
    } finally {
      await app.close();
    }
  }
}

void main();


