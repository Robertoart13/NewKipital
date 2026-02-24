import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainEventEntity } from './entities/domain-event.entity';
import { DomainEventsService } from './domain-events.service';
import { AuditActionEntity } from './entities/audit-action.entity';
import { AuditOutboxService } from './audit-outbox.service';
import { AuditWorkerService } from './audit-worker.service';

@Module({
  imports: [TypeOrmModule.forFeature([DomainEventEntity, AuditActionEntity])],
  providers: [DomainEventsService, AuditOutboxService, AuditWorkerService],
  exports: [DomainEventsService, AuditOutboxService],
})
export class IntegrationModule {}
