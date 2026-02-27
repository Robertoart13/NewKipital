import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainEventEntity } from './entities/domain-event.entity';

interface RecordDomainEventInput {
  aggregateType: string;
  aggregateId: string;
  eventName: string;
  payload: Record<string, unknown>;
  occurredAt?: Date;
  createdBy?: number | null;
  idempotencyKey?: string;
}

@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);

  constructor(
    @InjectRepository(DomainEventEntity)
    private readonly repository: Repository<DomainEventEntity>,
  ) {}

  async record(input: RecordDomainEventInput): Promise<void> {
    const occurredAt = input.occurredAt ?? new Date();
    const idempotencyKey =
      input.idempotencyKey ??
      `${input.eventName}:${input.aggregateId}:${occurredAt.getTime()}`;

    const event = this.repository.create({
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventName: input.eventName,
      payload: input.payload,
      occurredAt,
      createdBy: input.createdBy ?? null,
      idempotencyKey,
      status: 'pending',
    });

    try {
      await this.repository.save(event);
    } catch (error) {
      this.logger.warn(
        `Domain event duplicated/failed: ${idempotencyKey} - ${(error as Error).message}`,
      );
    }
  }
}
