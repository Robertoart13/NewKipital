import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * sys_usuario_permiso_global
 * Denegación de un permiso para un usuario en todas las empresas.
 * Si existe un registro, el usuario NO tendrá ese permiso en ninguna empresa.
 */
@Entity('sys_usuario_permiso_global')
@Index('UQ_usuario_permiso_global', ['idUsuario', 'idApp', 'idPermiso'], { unique: true })
export class UserPermissionGlobalDeny {
  @PrimaryGeneratedColumn({ name: 'id_usuario_permiso_global' })
  id: number;

  @Index('IDX_usuario_permiso_global_usuario')
  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @Column({ name: 'id_app', type: 'int' })
  idApp: number;

  @Column({ name: 'id_permiso', type: 'int' })
  idPermiso: number;

  @Column({ name: 'estado_usuario_permiso_global', type: 'tinyint', width: 1, default: 1 })
  estado: number;

  @CreateDateColumn({ name: 'fecha_creacion_usuario_permiso_global' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_usuario_permiso_global' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_usuario_permiso_global', type: 'int' })
  creadoPor: number;

  @Column({ name: 'modificado_por_usuario_permiso_global', type: 'int' })
  modificadoPor: number;
}
