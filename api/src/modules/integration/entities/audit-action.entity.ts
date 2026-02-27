import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sys_auditoria_acciones')
export class AuditActionEntity {
  @PrimaryGeneratedColumn({ name: 'id_auditoria_accion', type: 'bigint' })
  id: string;

  @Index('IDX_auditoria_modulo_entidad')
  @Column({ name: 'modulo_auditoria', type: 'varchar', length: 80 })
  modulo: string;

  @Column({ name: 'accion_auditoria', type: 'varchar', length: 80 })
  accion: string;

  @Index('IDX_auditoria_entidad_id')
  @Column({ name: 'entidad_auditoria', type: 'varchar', length: 80 })
  entidad: string;

  @Index('IDX_auditoria_entidad_id')
  @Column({
    name: 'id_entidad_auditoria',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  entidadId: string | null;

  @Index('IDX_auditoria_actor')
  @Column({ name: 'id_usuario_actor_auditoria', type: 'int', nullable: true })
  actorUserId: number | null;

  @Column({
    name: 'id_empresa_contexto_auditoria',
    type: 'int',
    nullable: true,
  })
  companyContextId: number | null;

  @Column({ name: 'descripcion_auditoria', type: 'varchar', length: 500 })
  descripcion: string;

  @Column({ name: 'payload_before_auditoria', type: 'json', nullable: true })
  payloadBefore: Record<string, unknown> | null;

  @Column({ name: 'payload_after_auditoria', type: 'json', nullable: true })
  payloadAfter: Record<string, unknown> | null;

  @Column({ name: 'metadata_auditoria', type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'ip_auditoria', type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({
    name: 'user_agent_auditoria',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  userAgent: string | null;

  @Index('IDX_auditoria_fecha')
  @CreateDateColumn({ name: 'fecha_creacion_auditoria' })
  createdAt: Date;
}
