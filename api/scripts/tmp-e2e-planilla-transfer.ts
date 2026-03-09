import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { IntercompanyTransferService } from '../src/modules/payroll/intercompany-transfer.service';
import { PayrollCalendar } from '../src/modules/payroll/entities/payroll-calendar.entity';
import { PayrollService } from '../src/modules/payroll/payroll.service';

function ymd(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

async function findExactPayroll(
  service: PayrollService,
  params: {
    companyId: number;
    periodId: number;
    tipoPlanillaId: number | null;
    tipoPlanilla: string;
    moneda: string;
    inicioPeriodo: string;
    finPeriodo: string;
    fechaCorte: string | null;
    inicioPago: string;
    finPago: string;
    pagoProgramada: string | null;
  },
): Promise<PayrollCalendar | null> {
  const rows = (await (service as any).dataSource.query(
    `SELECT id_calendario_nomina
     FROM nom_calendarios_nomina
     WHERE id_empresa = ?
       AND id_periodos_pago = ?
       AND ((id_tipo_planilla IS NULL AND ? IS NULL) OR id_tipo_planilla = ?)
       AND tipo_planilla = ?
       AND moneda_calendario_nomina = ?
       AND fecha_inicio_periodo = ?
       AND fecha_fin_periodo = ?
       AND ((fecha_corte_calendario_nomina IS NULL AND ? IS NULL) OR fecha_corte_calendario_nomina = ?)
       AND fecha_inicio_pago = ?
       AND fecha_fin_pago = ?
       AND ((fecha_pago_programada_calendario_nomina IS NULL AND ? IS NULL) OR fecha_pago_programada_calendario_nomina = ?)
       AND es_inactivo = 1
       AND estado_calendario_nomina IN (1,2,3)
     ORDER BY id_calendario_nomina DESC
     LIMIT 1`,
    [
      params.companyId,
      params.periodId,
      params.tipoPlanillaId,
      params.tipoPlanillaId,
      params.tipoPlanilla,
      params.moneda,
      params.inicioPeriodo,
      params.finPeriodo,
      params.fechaCorte,
      params.fechaCorte,
      params.inicioPago,
      params.finPago,
      params.pagoProgramada,
      params.pagoProgramada,
    ],
  )) as Array<{ id_calendario_nomina: number }>;

  if (!rows.length) return null;
  return (service as any).repo.findOne({ where: { id: Number(rows[0].id_calendario_nomina) } });
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  try {
    const payrollService = app.get(PayrollService);
    const transferService = app.get(IntercompanyTransferService);

    const userId = 1;

    const baseRows = (await (payrollService as any).dataSource.query(
      `SELECT pri.id_reactivation_item, pri.id_accion, pa.id_empleado, pa.id_empresa, pri.id_calendario_nomina
       FROM acc_planilla_reactivation_items pri
       INNER JOIN acc_acciones_personal pa ON pa.id_accion = pri.id_accion
       WHERE pri.es_procesado_reactivacion = 0
       ORDER BY pri.id_reactivation_item ASC`,
    )) as Array<{
      id_reactivation_item: number;
      id_accion: number;
      id_empleado: number;
      id_empresa: number;
      id_calendario_nomina: number;
    }>;

    if (baseRows.length === 0) {
      console.log(JSON.stringify({ ok: false, reason: 'No hay snapshots pendientes para probar.' }, null, 2));
      return;
    }

    const sample = baseRows[0];
    const sourcePayroll = await (payrollService as any).repo.findOne({ where: { id: sample.id_calendario_nomina } });
    if (!sourcePayroll) {
      console.log(JSON.stringify({ ok: false, reason: 'No existe planilla origen del snapshot.' }, null, 2));
      return;
    }

    const actionIds = Array.from(new Set(baseRows.map((row) => Number(row.id_accion))));

    const sourceParams = {
      companyId: Number(sourcePayroll.idEmpresa),
      periodId: Number(sourcePayroll.idPeriodoPago),
      tipoPlanillaId: sourcePayroll.idTipoPlanilla ?? null,
      tipoPlanilla: String(sourcePayroll.tipoPlanilla),
      moneda: String(sourcePayroll.moneda),
      inicioPeriodo: ymd(sourcePayroll.fechaInicioPeriodo)!,
      finPeriodo: ymd(sourcePayroll.fechaFinPeriodo)!,
      fechaCorte: ymd(sourcePayroll.fechaCorte),
      inicioPago: ymd(sourcePayroll.fechaInicioPago)!,
      finPago: ymd(sourcePayroll.fechaFinPago)!,
      pagoProgramada: ymd(sourcePayroll.fechaPagoProgramada),
    };

    let exactSourcePayroll = await findExactPayroll(payrollService, sourceParams);
    if (!exactSourcePayroll) {
      exactSourcePayroll = await payrollService.create(
        {
          idEmpresa: sourceParams.companyId,
          idPeriodoPago: sourceParams.periodId,
          idTipoPlanilla: sourceParams.tipoPlanillaId ?? undefined,
          nombrePlanilla: `E2E-EXACT-SOURCE-${Date.now()}`,
          tipoPlanilla: sourceParams.tipoPlanilla,
          periodoInicio: sourceParams.inicioPeriodo,
          periodoFin: sourceParams.finPeriodo,
          fechaCorte: sourceParams.fechaCorte ?? undefined,
          fechaInicioPago: sourceParams.inicioPago,
          fechaFinPago: sourceParams.finPago,
          fechaPagoProgramada: sourceParams.pagoProgramada ?? undefined,
          moneda: sourceParams.moneda as any,
        } as any,
        userId,
      );
    }

    const reassociated = await payrollService.reassignOrphanActionsForPayroll(
      exactSourcePayroll.id,
      userId,
      'manual',
    );

    const afterReassociate = (await (payrollService as any).dataSource.query(
      `SELECT resultado_reactivacion, COUNT(*) AS total
       FROM acc_planilla_reactivation_items
       WHERE id_accion IN (${actionIds.map(() => '?').join(',')})
       GROUP BY resultado_reactivacion
       ORDER BY total DESC`,
      actionIds,
    )) as Array<{ resultado_reactivacion: string | null; total: number }>;

    await payrollService.inactivate(exactSourcePayroll.id, userId);

    const pendingAfterInactivate = (await (payrollService as any).dataSource.query(
      `SELECT COUNT(*) AS total
       FROM acc_planilla_reactivation_items pri
       WHERE pri.es_procesado_reactivacion = 0
         AND pri.id_accion IN (${actionIds.map(() => '?').join(',')})`,
      actionIds,
    )) as Array<{ total: number }>;

    const userCompanies = (await (payrollService as any).dataSource.query(
      `SELECT id_empresa FROM sys_usuario_empresa WHERE id_usuario = ? AND estado_usuario_empresa = 1 ORDER BY id_empresa`,
      [userId],
    )) as Array<{ id_empresa: number }>;

    const destinationCandidates = userCompanies
      .map((item) => Number(item.id_empresa))
      .filter((id) => id !== Number(sourcePayroll.idEmpresa));

    let destinationCompanyId: number | null = null;
    let exactDestPayroll: PayrollCalendar | null = null;
    const destinationErrors: string[] = [];

    for (const companyId of destinationCandidates) {
      const candidateParams = { ...sourceParams, companyId };
      try {
        let payroll = await findExactPayroll(payrollService, candidateParams);
        if (!payroll) {
          payroll = await payrollService.create(
            {
              idEmpresa: candidateParams.companyId,
              idPeriodoPago: candidateParams.periodId,
              idTipoPlanilla: candidateParams.tipoPlanillaId ?? undefined,
              nombrePlanilla: `E2E-EXACT-DEST-${companyId}-${Date.now()}`,
              tipoPlanilla: candidateParams.tipoPlanilla,
              periodoInicio: candidateParams.inicioPeriodo,
              periodoFin: candidateParams.finPeriodo,
              fechaCorte: candidateParams.fechaCorte ?? undefined,
              fechaInicioPago: candidateParams.inicioPago,
              fechaFinPago: candidateParams.finPago,
              fechaPagoProgramada: candidateParams.pagoProgramada ?? undefined,
              moneda: candidateParams.moneda as any,
            } as any,
            userId,
          );
        }

        destinationCompanyId = companyId;
        exactDestPayroll = payroll;
        break;
      } catch (error) {
        destinationErrors.push(`empresa ${companyId}: ${(error as Error).message}`);
      }
    }

    if (!destinationCompanyId || !exactDestPayroll) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            reason: 'No se pudo preparar empresa destino para traslado.',
            destinationErrors,
            context: {
              sourceCompanyId: sourcePayroll.idEmpresa,
              reassociated,
              afterReassociate,
              pendingAfterInactivate: pendingAfterInactivate[0]?.total ?? 0,
            },
          },
          null,
          2,
        ),
      );
      return;
    }

    const effectiveDate = sourceParams.inicioPeriodo;
    const simulation = await transferService.simulate(
      {
        idEmpresaDestino: destinationCompanyId,
        fechaEfectiva: effectiveDate,
        empleados: [{ idEmpleado: sample.id_empleado }],
        motivo: 'E2E automatico snapshot invalidation',
      },
      userId,
    );

    let executeResult: unknown = null;
    if (simulation[0]?.eligible && simulation[0]?.transferId) {
      executeResult = await transferService.execute(
        { transferIds: [simulation[0].transferId] },
        userId,
      );
    }

    const invalidatedAfterTransfer = (await (payrollService as any).dataSource.query(
      `SELECT resultado_reactivacion, es_procesado_reactivacion, COUNT(*) AS total
       FROM acc_planilla_reactivation_items
       WHERE id_accion IN (${actionIds.map(() => '?').join(',')})
       GROUP BY resultado_reactivacion, es_procesado_reactivacion
       ORDER BY total DESC`,
      actionIds,
    )) as Array<{ resultado_reactivacion: string | null; es_procesado_reactivacion: number; total: number }>;

    const employeeAfter = (await (payrollService as any).dataSource.query(
      `SELECT id_empleado, id_empresa FROM sys_empleados WHERE id_empleado = ?`,
      [sample.id_empleado],
    )) as Array<{ id_empleado: number; id_empresa: number }>;

    const actionsAfter = (await (payrollService as any).dataSource.query(
      `SELECT id_accion, id_empresa, id_calendario_nomina, estado_accion
       FROM acc_acciones_personal
       WHERE id_accion IN (${actionIds.map(() => '?').join(',')})
       ORDER BY id_accion`,
      actionIds,
    )) as Array<{ id_accion: number; id_empresa: number; id_calendario_nomina: number | null; estado_accion: number }>;

    console.log(
      JSON.stringify(
        {
          ok: true,
          scenarioA: {
            sourceSnapshotPayrollId: sample.id_calendario_nomina,
            exactSourcePayrollId: exactSourcePayroll.id,
            reassociated,
            afterReassociate,
            pendingAfterInactivate: Number(pendingAfterInactivate[0]?.total ?? 0),
          },
          scenarioB: {
            destinationCompanyId,
            exactDestinationPayrollId: exactDestPayroll.id,
            simulation,
            executeResult,
            invalidatedAfterTransfer,
            employeeAfter: employeeAfter[0] ?? null,
            actionsAfter,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

void main();
