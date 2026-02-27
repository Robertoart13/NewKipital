import { Injectable, Logger } from '@nestjs/common';
import { DomainEventsService } from './domain-events.service';

export interface AuditOutboxPayload {
  modulo: string;
  accion: string;
  entidad: string;
  entidadId?: string | number | null;
  actorUserId?: number | null;
  companyContextId?: number | null;
  descripcion: string;
  payloadBefore?: Record<string, unknown> | null;
  payloadAfter?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditOutboxService {
  private readonly logger = new Logger(AuditOutboxService.name);

  constructor(private readonly domainEvents: DomainEventsService) {}

  publish(input: AuditOutboxPayload): void {
    const aggregateId = String(input.entidadId ?? 'na');
    const normalizedModulo = input.modulo.trim().toLowerCase();
    const normalizedAccion = input.accion.trim().toLowerCase();

    void this.domainEvents
      .record({
        aggregateType: 'audit',
        aggregateId,
        eventName: `audit.${normalizedModulo}.${normalizedAccion}`,
        payload: {
          modulo: normalizedModulo,
          accion: normalizedAccion,
          entidad: input.entidad.trim().toLowerCase(),
          entidadId: input.entidadId != null ? String(input.entidadId) : null,
          actorUserId: input.actorUserId ?? null,
          companyContextId: input.companyContextId ?? null,
          descripcion: input.descripcion,
          payloadBefore: input.payloadBefore ?? null,
          payloadAfter: input.payloadAfter ?? null,
          metadata: input.metadata ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        },
        createdBy: input.actorUserId ?? null,
        occurredAt: new Date(),
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `No se pudo publicar evento de auditoria: ${(error as Error).message}`,
        );
      });
  }
}
