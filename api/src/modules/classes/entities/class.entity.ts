import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('org_clases')
export class OrgClass {
  @PrimaryGeneratedColumn({ name: 'id_clase' })
  id: number;

  @Column({ name: 'nombre_clase', type: 'varchar', length: 255 })
  nombre: string;

  @Column({ name: 'descripcion_clase', type: 'text', nullable: true })
  descripcion: string | null;

  @Index('UQ_clase_codigo', { unique: true })
  @Column({ name: 'codigo_clase', type: 'varchar', length: 50, unique: true })
  codigo: string;

  @Index('UQ_clase_id_externo', { unique: true })
  @Column({
    name: 'id_externos_clase',
    type: 'varchar',
    length: 45,
    nullable: true,
    unique: true,
  })
  idExterno: string | null;

  @Index('IDX_clase_inactivo')
  @Column({ name: 'es_inactivo', type: 'tinyint', width: 1, default: 0 })
  esInactivo: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion' })
  fechaModificacion: Date;
}
