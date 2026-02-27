import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * org_departamentos — Catálogo de departamentos organizacionales.
 * FK referenciada por sys_empleados.id_departamento.
 */
@Entity('org_departamentos')
export class Department {
  @PrimaryGeneratedColumn({ name: 'id_departamento' })
  id: number;

  @Column({ name: 'nombre_departamento', type: 'varchar', length: 100 })
  nombre: string;

  @Index('IDX_departamento_externo')
  @Column({
    name: 'id_externo_departamento',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  idExterno: string | null;

  @Index('IDX_departamento_estado')
  @Column({
    name: 'estado_departamento',
    type: 'tinyint',
    width: 1,
    default: 1,
  })
  estado: number;

  @CreateDateColumn({ name: 'fecha_creacion_departamento' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_departamento' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_departamento', type: 'int', nullable: true })
  creadoPor: number | null;

  @Column({ name: 'modificado_por_departamento', type: 'int', nullable: true })
  modificadoPor: number | null;
}
