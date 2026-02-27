import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EmployeeQueueStatus } from './employee-identity-queue.entity';

@Entity('sys_empleado_encrypt_queue')
@Index('UQ_employee_encrypt_queue_dedupe', ['dedupeKey'], { unique: true })
export class EmployeeEncryptQueue {
  @PrimaryGeneratedColumn({ name: 'id_encrypt_queue' })
  id: number;

  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Column({ name: 'dedupe_key', type: 'varchar', length: 120 })
  dedupeKey: string;

  @Index('IDX_encrypt_queue_status')
  @Column({ name: 'estado_queue', type: 'varchar', length: 20, default: EmployeeQueueStatus.PENDING })
  estado: EmployeeQueueStatus;

  @Column({ name: 'attempts_queue', type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'next_retry_at_queue', type: 'datetime', nullable: true })
  nextRetryAt: Date | null;

  @Column({ name: 'locked_by_queue', type: 'varchar', length: 80, nullable: true })
  lockedBy: string | null;

  @Column({ name: 'locked_at_queue', type: 'datetime', nullable: true })
  lockedAt: Date | null;

  @Column({ name: 'last_error_queue', type: 'varchar', length: 500, nullable: true })
  lastError: string | null;

  @CreateDateColumn({ name: 'fecha_creacion_queue' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_queue' })
  fechaModificacion: Date;
}
