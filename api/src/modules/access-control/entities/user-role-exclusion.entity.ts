import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * sys_usuario_rol_exclusion
 * Excluye un rol global de una empresa específica.
 * Solo aplica a roles que vienen de sys_usuario_rol_global.
 */
@Entity('sys_usuario_rol_exclusion')
@Index(
  'UQ_usuario_rol_exclusion',
  ['idUsuario', 'idEmpresa', 'idApp', 'idRol'],
  { unique: true },
)
export class UserRoleExclusion {
  @PrimaryGeneratedColumn({ name: 'id_usuario_rol_exclusion' })
  id: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'id_app', type: 'int' })
  idApp: number;

  @Column({ name: 'id_rol', type: 'int' })
  idRol: number;

  @Column({
    name: 'estado_usuario_rol_exclusion',
    type: 'tinyint',
    width: 1,
    default: 1,
  })
  estado: number;

  @CreateDateColumn({ name: 'fecha_creacion_usuario_rol_exclusion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_usuario_rol_exclusion' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_usuario_rol_exclusion', type: 'int' })
  creadoPor: number;

  @Column({ name: 'modificado_por_usuario_rol_exclusion', type: 'int' })
  modificadoPor: number;
}
