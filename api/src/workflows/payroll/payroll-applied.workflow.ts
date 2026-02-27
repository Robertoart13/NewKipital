import { Injectable, Logger } from '@nestjs/common';
import { DOMAIN_EVENTS } from '../../common/events/event-names';

/**
 * PayrollAppliedWorkflow — Efectos al aplicar planilla.
 *
 * - Cuotas/acciones asociadas pasan a Pagada
 * - Cuotas pendientes que no entraron: estado "Pendiente no ejecutada" con motivo
 * - Bloquear edición de planilla y cálculos
 *
 * TODO Fase 2: Integrar con acc_cuotas_accion.
 */
@Injectable()
export class PayrollAppliedWorkflow {
  private readonly logger = new Logger(PayrollAppliedWorkflow.name);

  // @OnEvent(DOMAIN_EVENTS.PAYROLL.APPLIED)
  async handlePayrollApplied(payload: {
    payrollId: string;
    companyId: string;
  }): Promise<void> {
    this.logger.log(
      `Planilla #${payload.payrollId} aplicada. Cuotas asociadas → Pagada.`,
    );
    // TODO: actualizar estado de cuotas asociadas a PAGADA
  }
}
