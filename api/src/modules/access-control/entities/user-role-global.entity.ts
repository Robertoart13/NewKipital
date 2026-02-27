import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * sys_usuario_rol_global
 * Rol asignado globalmente: aplica a TODAS las empresas del usuario.
 * Estilo NetSuite Oracle.
 */
@Entity('sys_usuario_rol_global')
@Index('UQ_usuario_rol_global', ['idUsuario', 'idApp', 'idRol'], { unique: true })
export class UserRoleGlobal {
  @PrimaryGeneratedColumn({ name: 'id_usuario_rol_global' })
  id: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @Column({ name: 'id_app', type: 'int' })
  idApp: number;

  @Column({ name: 'id_rol', type: 'int' })
  idRol: number;

  @Column({ name: 'estado_usuario_rol_global', type: 'tinyint', width: 1, default: 1 })
  estado: number;

  @CreateDateColumn({ name: 'fecha_creacion_usuario_rol_global' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_usuario_rol_global' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_usuario_rol_global', type: 'int' })
  creadoPor: number;

  @Column({ name: 'modificado_por_usuario_rol_global', type: 'int' })
  modificadoPor: number;
}
