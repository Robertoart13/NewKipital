import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * sys_permisos — Permisos atómicos del sistema.
 * Acciones puras: employees.list, payroll.approve, company.edit.
 * No saben de empresa ni de usuario.
 */
@Entity('sys_permisos')
export class Permission {
  @PrimaryGeneratedColumn({ name: 'id_permiso' })
  id: number;

  @Index('IDX_permiso_codigo', { unique: true })
  @Column({ name: 'codigo_permiso', type: 'varchar', length: 100, unique: true })
  codigo: string;

  @Column({ name: 'nombre_permiso', type: 'varchar', length: 150 })
  nombre: string;

  @Column({ name: 'descripcion_permiso', type: 'varchar', length: 300, nullable: true })
  descripcion: string | null;

  @Index('IDX_permiso_modulo')
  @Column({ name: 'modulo_permiso', type: 'varchar', length: 50 })
  modulo: string;

  @Index('IDX_permiso_estado')
  @Column({ name: 'estado_permiso', type: 'tinyint', width: 1, default: 1 })
  estado: number;

  @CreateDateColumn({ name: 'fecha_creacion_permiso' })
  fechaCreacion: Date;

  @UpdateDateColumn({
    name: 'fecha_modificacion_permiso',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaModificacion: Date | null;

  @Column({ name: 'creado_por_permiso', type: 'int', nullable: true })
  creadoPor: number | null;

  @Column({ name: 'modificado_por_permiso', type: 'int', nullable: true })
  modificadoPor: number | null;
}
