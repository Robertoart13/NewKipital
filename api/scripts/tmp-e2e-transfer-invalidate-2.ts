import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { IntercompanyTransferService } from '../src/modules/payroll/intercompany-transfer.service';
import { PayrollService } from '../src/modules/payroll/payroll.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const userId = 1;
  const transferService = app.get(IntercompanyTransferService);
  const payrollService = app.get(PayrollService);
  const ds = (payrollService as any).dataSource;

  let backup: Array<{ id: number; estado: number }> = [];
  try {
    const actionRows = (await ds.query(
      `SELECT pri.id_accion, pa.id_empleado, pa.id_empresa
       FROM acc_planilla_reactivation_items pri
       INNER JOIN acc_acciones_personal pa ON pa.id_accion = pri.id_accion
       WHERE pri.es_procesado_reactivacion = 0
       ORDER BY pri.id_reactivation_item ASC`,
    )) as Array<{ id_accion: number; id_empleado: number; id_empresa: number }>;

    const employeeId = Number(actionRows[0]?.id_empleado ?? 0);
    if (!employeeId) {
      console.log(JSON.stringify({ ok: false, reason: 'No hay empleado de prueba.' }, null, 2));
      return;
    }

    const actionIds = Array.from(
      new Set(actionRows.filter((r) => Number(r.id_empleado) === employeeId).map((r) => Number(r.id_accion))),
    );

    const blockers = (await ds.query(
      `SELECT id_accion, estado_accion
       FROM acc_acciones_personal
       WHERE id_accion IN (${actionIds.map(() => '?').join(',')})
         AND tipo_accion IN ('licencia','licencias','incapacidad','incapacidades','aumento','aumentos')
         AND estado_accion IN (1,2,3,4)`,
      actionIds,
    )) as Array<{ id_accion: number; estado_accion: number }>;

    backup = blockers.map((r) => ({ id: Number(r.id_accion), estado: Number(r.estado_accion) }));
    if (backup.length > 0) {
      await ds.query(
        `UPDATE acc_acciones_personal SET estado_accion = 6, modificado_por_accion = ? WHERE id_accion IN (${backup
          .map(() => '?')
          .join(',')})`,
        [userId, ...backup.map((b) => b.id)],
      );
    }

    const emp = (await ds.query(
      `SELECT id_empresa, id_periodos_pago, moneda_salario_empleado FROM sys_empleados WHERE id_empleado = ? LIMIT 1`,
      [employeeId],
    )) as Array<{ id_empresa: number; id_periodos_pago: number; moneda_salario_empleado: string }>;

    const sourceCompanyId = Number(emp[0].id_empresa);
    const periodId = Number(emp[0].id_periodos_pago);
    const moneda = String(emp[0].moneda_salario_empleado || 'CRC').toUpperCase();

    const userCompanies = (await ds.query(
      `SELECT id_empresa FROM sys_usuario_empresa WHERE id_usuario = ? AND estado_usuario_empresa = 1 ORDER BY id_empresa`,
      [userId],
    )) as Array<{ id_empresa: number }>;
    const destinationCompanyId =
      userCompanies.map((r) => Number(r.id_empresa)).find((id) => id !== sourceCompanyId) ?? 0;

    await payrollService.create(
      {
        idEmpresa: destinationCompanyId,
        idPeriodoPago: periodId,
        tipoPlanilla: 'Regular',
        periodoInicio: '2026-02-28',
        periodoFin: '2026-03-15',
        fechaCorte: '2026-03-13',
        fechaInicioPago: '2026-03-13',
        fechaFinPago: '2026-03-15',
        fechaPagoProgramada: '2026-03-15',
        moneda: moneda as any,
        nombrePlanilla: `E2E-TZ-${Date.now()}`,
      } as any,
      userId,
    ).catch(() => undefined);

    const simulation = await transferService.simulate(
      {
        idEmpresaDestino: destinationCompanyId,
        fechaEfectiva: '2026-03-01',
        empleados: [{ idEmpleado: employeeId }],
        motivo: 'E2E transfer invalidation',
      },
      userId,
    );

    let executeResult: unknown = null;
    if (simulation[0]?.eligible && simulation[0]?.transferId) {
      executeResult = await transferService.execute({ transferIds: [simulation[0].transferId] }, userId);
    }

    const invalidated = (await ds.query(
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
          simulation,
          executeResult,
          invalidatedByTransferCount: Number(invalidated[0]?.total ?? 0),
        },
        null,
        2,
      ),
    );
  } finally {
    if (backup.length > 0) {
      for (const row of backup) {
        await ds.query(
          `UPDATE acc_acciones_personal SET estado_accion = ?, modificado_por_accion = ? WHERE id_accion = ?`,
          [row.estado, userId, row.id],
        );
      }
    }
    await app.close();
  }
}

void main();
