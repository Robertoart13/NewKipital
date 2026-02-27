import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DOMAIN_EVENTS } from '../../common/events/event-names';

/**
 * EmployeeMovedWorkflow — Política P3: Bloquear hasta resolver.
 *
 * No se permite mover empleado si tiene cuotas/acciones activas sin planilla destino compatible.
 * RRHH debe resolver antes de mover.
 *
 * Evento: employee.moved
 * Payload: { employeeId, fromCompanyId, toCompanyId, movedBy }
 *
 * TODO Fase 2: Integrar con acc_cuotas_accion y validar compatibilidad destino.
 */
@Injectable()
export class EmployeeMovedWorkflow {
  private readonly logger = new Logger(EmployeeMovedWorkflow.name);

  // @OnEvent(DOMAIN_EVENTS.EMPLOYEE.MOVED)
  async handleEmployeeMoved(payload: {
    employeeId: string;
    fromCompanyId: string;
    toCompanyId: string;
    movedBy: number;
  }): Promise<void> {
    this.logger.log(`[P3] Empleado #${payload.employeeId} movido de empresa ${payload.fromCompanyId} a ${payload.toCompanyId}`);
    // Policy P3: Validar que no existan cuotas/acciones activas sin destino compatible.
    // Si existen, lanzar BadRequestException con lista de cuotas que impiden el movimiento.
    // Por ahora: solo log. Implementación completa en Fase 2.
  }
}
