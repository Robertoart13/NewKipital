import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Controla versionado de autorizacion para invalidar cache de permisos.
 * Convencion:
 * - id_usuario = 0 => version global del sistema
 * - id_usuario > 0 => version especifica del usuario
 */
@Entity('sys_authz_version')
export class AuthzVersion {
  @PrimaryColumn({ name: 'id_usuario', type: 'int' })
  userId: number;

  @Column({ name: 'version_authz', type: 'bigint', unsigned: true, default: 1 })
  version: string;

  @UpdateDateColumn({
    name: 'fecha_actualizacion_authz',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
