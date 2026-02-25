import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('org_proyectos')
export class OrgProject {
  @PrimaryGeneratedColumn({ name: 'id_proyecto' })
  id: number;

  @Index('IDX_proyecto_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'nombre_proyecto', type: 'varchar', length: 255 })
  nombre: string;

  @Column({ name: 'descripcion_proyecto', type: 'text', nullable: true })
  descripcion: string | null;

  @Index('UQ_proyecto_codigo', { unique: true })
  @Column({ name: 'codigo_proyecto', type: 'varchar', length: 50, unique: true })
  codigo: string;

  @Index('UQ_proyecto_id_externo', { unique: true })
  @Column({ name: 'id_externo_proyecto', type: 'varchar', length: 45, nullable: true, unique: true })
  idExterno: string | null;

  @Index('IDX_proyecto_inactivo')
  @Column({ name: 'es_inactivo', type: 'tinyint', width: 1, default: 0 })
  esInactivo: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion' })
  fechaModificacion: Date;
}
