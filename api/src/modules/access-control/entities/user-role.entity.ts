import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * sys_usuario_rol — TABLA CORE DEL MODELO DE IDENTIDAD.
 *
 * Relación: Usuario ↔ Rol ↔ Empresa ↔ App
 * Define el scope real de cada usuario en el sistema.
 *
 * Permite:
 * - Un usuario puede ser ADMIN en KPITAL para Empresa A
 * - El mismo usuario puede ser EMPLEADO en TIMEWISE para Empresa B
 * - Múltiples roles en la misma empresa
 *
 * Reglas: NO delete físico. Solo inactivación lógica.
 */
@Entity('sys_usuario_rol')
@Index(
  'UQ_usuario_rol_empresa_app',
  ['idUsuario', 'idRol', 'idEmpresa', 'idApp'],
  { unique: true },
)
export class UserRole {
  @PrimaryGeneratedColumn({ name: 'id_usuario_rol' })
  id: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @Column({ name: 'id_rol', type: 'int' })
  idRol: number;

  @Index('IDX_usuario_rol_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Index('IDX_usuario_rol_app')
  @Column({ name: 'id_app', type: 'int' })
  idApp: number;

  @Column({ name: 'estado_usuario_rol', type: 'tinyint', width: 1, default: 1 })
  estado: number;

  @CreateDateColumn({ name: 'fecha_asignacion_usuario_rol' })
  fechaAsignacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_usuario_rol' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_usuario_rol', type: 'int' })
  creadoPor: number;

  @Column({ name: 'modificado_por_usuario_rol', type: 'int' })
  modificadoPor: number;
}
