import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UserPermissionOverrideEffect = 'ALLOW' | 'DENY';

/**
 * sys_usuario_permiso
 * Overrides directos de permiso por usuario y contexto (empresa + app).
 * Regla de resolucion: DENY gana sobre ALLOW.
 */
@Entity('sys_usuario_permiso')
@Index('UQ_usuario_permiso_contexto', ['idUsuario', 'idEmpresa', 'idApp', 'idPermiso'], { unique: true })
export class UserPermissionOverride {
  @PrimaryGeneratedColumn({ name: 'id_usuario_permiso' })
  id: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @Index('IDX_usuario_permiso_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Index('IDX_usuario_permiso_app')
  @Column({ name: 'id_app', type: 'int' })
  idApp: number;

  @Column({ name: 'id_permiso', type: 'int' })
  idPermiso: number;

  @Column({ name: 'efecto_usuario_permiso', type: 'varchar', length: 10 })
  efecto: UserPermissionOverrideEffect;

  @Index('IDX_usuario_permiso_estado')
  @Column({ name: 'estado_usuario_permiso', type: 'tinyint', width: 1, default: 1 })
  estado: number;

  @CreateDateColumn({ name: 'fecha_creacion_usuario_permiso' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_usuario_permiso' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_usuario_permiso', type: 'int' })
  creadoPor: number;

  @Column({ name: 'modificado_por_usuario_permiso', type: 'int' })
  modificadoPor: number;
}
