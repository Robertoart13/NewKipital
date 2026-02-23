/**
 * Contrato base que todo evento de dominio del sistema debe cumplir.
 * Fase 1: eventos síncronos locales via @nestjs/event-emitter.
 * Fase 2: se reemplaza el transporte por Redis/RabbitMQ sin cambiar esta interfaz.
 *
 * IMPORTANTE: En Fase 1 los handlers corren en el mismo hilo que el request.
 * Mantener los @OnEvent() livianos (logs, actualizar estado, notificar).
 * Trabajo pesado (recálculos masivos, sync externa) se moverá a cola en Fase 2.
 */
export interface DomainEvent<T = unknown> {
  eventName: string;
  payload: T;
  occurredAt: Date;
  triggeredBy: string;
}
