import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * sys_apps — Catálogo de aplicaciones del ecosistema.
 * Ejemplos: KPITAL, TIMEWISE.
 * Permite escalar a más apps sin rediseñar.
 */
@Entity('sys_apps')
export class App {
  @PrimaryGeneratedColumn({ name: 'id_app' })
  id: number;

  @Index('IDX_app_codigo', { unique: true })
  @Column({ name: 'codigo_app', type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ name: 'nombre_app', type: 'varchar', length: 100 })
  nombre: string;

  @Column({ name: 'descripcion_app', type: 'varchar', length: 300, nullable: true })
  descripcion: string | null;

  @Column({ name: 'url_app', type: 'varchar', length: 300, nullable: true })
  url: string | null;

  @Column({ name: 'icono_app', type: 'varchar', length: 100, nullable: true })
  icono: string | null;

  @Index('IDX_app_estado')
  @Column({ name: 'estado_app', type: 'tinyint', width: 1, default: 1 })
  estado: number;

  @CreateDateColumn({ name: 'fecha_creacion_app' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_app' })
  fechaModificacion: Date;
}
