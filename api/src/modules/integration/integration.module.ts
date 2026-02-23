import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainEventEntity } from './entities/domain-event.entity.js';
import { DomainEventsService } from './domain-events.service.js';
import { AuditActionEntity } from './entities/audit-action.entity.js';
import { AuditOutboxService } from './audit-outbox.service.js';
import { AuditWorkerService } from './audit-worker.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([DomainEventEntity, AuditActionEntity])],
  providers: [DomainEventsService, AuditOutboxService, AuditWorkerService],
  exports: [DomainEventsService, AuditOutboxService],
})
export class IntegrationModule {}
