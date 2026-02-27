import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sys_refresh_sessions')
export class RefreshSession {
  @PrimaryGeneratedColumn({ name: 'id_refresh_session' })
  id: number;

  @Index('IDX_refresh_session_jti', { unique: true })
  @Column({
    name: 'jti_refresh_session',
    type: 'varchar',
    length: 64,
    unique: true,
  })
  jti: string;

  @Index('IDX_refresh_session_user')
  @Column({ name: 'id_usuario', type: 'int' })
  userId: number;

  @Column({ name: 'token_hash_refresh_session', type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ name: 'expires_at_refresh_session', type: 'datetime' })
  expiresAt: Date;

  @Column({
    name: 'rotated_at_refresh_session',
    type: 'datetime',
    nullable: true,
  })
  rotatedAt: Date | null;

  @Column({
    name: 'revoked_at_refresh_session',
    type: 'datetime',
    nullable: true,
  })
  revokedAt: Date | null;

  @Column({
    name: 'replaced_by_jti_refresh_session',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  replacedByJti: string | null;

  @Column({
    name: 'created_ip_refresh_session',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  createdIp: string | null;

  @Column({
    name: 'created_ua_refresh_session',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  createdUa: string | null;

  @CreateDateColumn({ name: 'fecha_creacion_refresh_session' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_refresh_session' })
  updatedAt: Date;
}
