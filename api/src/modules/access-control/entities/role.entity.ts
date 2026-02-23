import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * sys_roles — Roles abstractos del sistema.
 * Un rol no tiene empresa, no tiene app. Es abstracto.
 * Ejemplos: ADMIN_SISTEMA, RRHH_MANAGER, EMPLEADO, CONTABILIDAD.
 *
 * Reglas: NO delete físico. Solo inactivación lógica.
 */
@Entity('sys_roles')
export class Role {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  id: number;

  @Index('IDX_rol_codigo', { unique: true })
  @Column({ name: 'codigo_rol', type: 'varchar', length: 50, unique: true })
  codigo: string;

  @Column({ name: 'nombre_rol', type: 'varchar', length: 100 })
  nombre: string;

  @Column({ name: 'descripcion_rol', type: 'varchar', length: 300, nullable: true })
  descripcion: string | null;

  @Index('IDX_rol_estado')
  @Column({ name: 'estado_rol', type: 'tinyint', width: 1, default: 1 })
  estado: number;

  @CreateDateColumn({ name: 'fecha_creacion_rol' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_rol' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_rol', type: 'int' })
  creadoPor: number;

  @Column({ name: 'modificado_por_rol', type: 'int' })
  modificadoPor: number;
}
