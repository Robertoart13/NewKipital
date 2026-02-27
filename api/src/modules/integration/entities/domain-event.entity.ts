import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sys_domain_events')
export class DomainEventEntity {
  @PrimaryGeneratedColumn({ name: 'id_domain_event', type: 'bigint' })
  id: string;

  @Column({ name: 'aggregate_type_domain_event', type: 'varchar', length: 100 })
  aggregateType: string;

  @Column({ name: 'aggregate_id_domain_event', type: 'varchar', length: 64 })
  aggregateId: string;

  @Index('IDX_domain_event_name')
  @Column({ name: 'event_name_domain_event', type: 'varchar', length: 120 })
  eventName: string;

  @Index('UQ_domain_event_idempotency', { unique: true })
  @Column({
    name: 'idempotency_key_domain_event',
    type: 'varchar',
    length: 140,
    unique: true,
  })
  idempotencyKey: string;

  @Column({ name: 'payload_domain_event', type: 'json' })
  payload: Record<string, unknown>;

  @Index('IDX_domain_event_status')
  @Column({
    name: 'status_domain_event',
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: string;

  @Column({ name: 'occurred_at_domain_event', type: 'datetime' })
  occurredAt: Date;

  @Column({
    name: 'published_at_domain_event',
    type: 'datetime',
    nullable: true,
  })
  publishedAt: Date | null;

  @Column({ name: 'created_by_domain_event', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'fecha_creacion_domain_event' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_domain_event' })
  updatedAt: Date;
}
