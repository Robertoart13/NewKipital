import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * org_puestos — Catálogo de puestos / cargos.
 * FK referenciada por sys_empleados.id_puesto.
 */
@Entity('org_puestos')
export class Position {
  @PrimaryGeneratedColumn({ name: 'id_puesto' })
  id: number;

  @Column({ name: 'nombre_puesto', type: 'varchar', length: 100 })
  nombre: string;

  @Column({ name: 'descripcion_puesto', type: 'text', nullable: true })
  descripcion: string | null;

  @Index('IDX_puesto_estado')
  @Column({ name: 'estado_puesto', type: 'tinyint', width: 1, default: 1 })
  estado: number;

  @CreateDateColumn({ name: 'fecha_creacion_puesto' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_puesto' })
  fechaModificacion: Date;
}
