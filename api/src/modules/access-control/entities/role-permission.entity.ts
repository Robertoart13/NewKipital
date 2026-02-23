import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

/**
 * sys_rol_permiso — Tabla puente: Rol ↔ Permiso.
 * Define qué acciones puede ejecutar cada rol.
 * No depende de usuario ni de empresa.
 */
@Entity('sys_rol_permiso')
@Index('UQ_rol_permiso', ['idRol', 'idPermiso'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn({ name: 'id_rol_permiso' })
  id: number;

  @Column({ name: 'id_rol', type: 'int' })
  idRol: number;

  @Column({ name: 'id_permiso', type: 'int' })
  idPermiso: number;

  @CreateDateColumn({ name: 'fecha_asignacion_rol_permiso' })
  fechaAsignacion: Date;
}
