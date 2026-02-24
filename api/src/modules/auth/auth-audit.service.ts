import { Injectable, Logger } from '@nestjs/common';
import { DomainEventsService } from '../integration/domain-events.service';

interface AuthAuditInput {
  event: string;
  userId?: number | null;
  email?: string | null;
  ip?: string | null;
  outcome: 'success' | 'failed';
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(private readonly domainEvents: DomainEventsService) {}

  async record(input: AuthAuditInput): Promise<void> {
    this.logger.log(
      JSON.stringify({
        type: 'auth_audit',
        event: input.event,
        outcome: input.outcome,
        userId: input.userId ?? null,
        email: input.email ?? null,
        ip: input.ip ?? null,
        reason: input.reason ?? null,
      }),
    );

    await this.domainEvents.record({
      aggregateType: 'auth',
      aggregateId: String(input.userId ?? input.email ?? 'anonymous'),
      eventName: input.event,
      payload: {
        outcome: input.outcome,
        reason: input.reason ?? null,
        ip: input.ip ?? null,
        email: input.email ?? null,
        ...input.metadata,
      },
      createdBy: input.userId ?? null,
    });
  }
}

