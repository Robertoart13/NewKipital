import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * sys_empresas — Root aggregate del sistema.
 * Sin empresa no existen: usuarios, planillas, acciones, roles, permisos.
 *
 * Reglas enterprise:
 * - NO delete físico. Solo inactivación lógica.
 * - NO cascade delete.
 * - Integridad referencial siempre activa.
 */
@Entity('sys_empresas')
export class Company {
  @PrimaryGeneratedColumn({ name: 'id_empresa' })
  id: number;

  // --- Campos de negocio ---

  @Column({ name: 'nombre_empresa', type: 'varchar', length: 200 })
  nombre: string;

  @Column({ name: 'nombre_legal_empresa', type: 'varchar', length: 300 })
  nombreLegal: string;

  @Index('IDX_empresa_cedula', { unique: true })
  @Column({ name: 'cedula_empresa', type: 'varchar', length: 50, unique: true })
  cedula: string;

  @Column({ name: 'actividad_economica_empresa', type: 'varchar', length: 300, nullable: true })
  actividadEconomica: string | null;

  @Index('IDX_empresa_prefijo', { unique: true })
  @Column({ name: 'prefijo_empresa', type: 'varchar', length: 10, unique: true })
  prefijo: string;

  @Index('IDX_empresa_id_externo')
  @Column({ name: 'id_externo_empresa', type: 'varchar', length: 100, unique: true, nullable: true })
  idExterno: string | null;

  @Column({ name: 'direccion_exacta_empresa', type: 'text', nullable: true })
  direccionExacta: string | null;

  @Column({ name: 'telefono_empresa', type: 'varchar', length: 30, nullable: true })
  telefono: string | null;

  @Column({ name: 'email_empresa', type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ name: 'codigo_postal_empresa', type: 'varchar', length: 20, nullable: true })
  codigoPostal: string | null;

  // --- Estado Enterprise ---

  @Index('IDX_empresa_estado')
  @Column({ name: 'estado_empresa', type: 'tinyint', width: 1, default: 1 })
  estado: number;

  // --- Auditoría ---

  @CreateDateColumn({ name: 'fecha_creacion_empresa' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_empresa' })
  fechaModificacion: Date;

  @Column({ name: 'fecha_inactivacion_empresa', type: 'datetime', nullable: true })
  fechaInactivacion: Date | null;

  @Column({ name: 'creado_por_empresa', type: 'int' })
  creadoPor: number;

  @Column({ name: 'modificado_por_empresa', type: 'int' })
  modificadoPor: number;
}
