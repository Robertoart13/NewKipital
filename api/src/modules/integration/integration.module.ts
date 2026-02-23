import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainEventEntity } from './entities/domain-event.entity.js';
import { DomainEventsService } from './domain-events.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([DomainEventEntity])],
  providers: [DomainEventsService],
  exports: [DomainEventsService],
})
export class IntegrationModule {}
