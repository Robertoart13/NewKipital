import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum PersonalActionEstado {
  PENDIENTE = 1,
  APROBADA = 2,
  RECHAZADA = 3,
}

export enum TipoAccionPersonal {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  AUMENTO = 'aumento',
  BONIFICACION = 'bonificacion',
  DEDUCCION = 'deduccion',
  OTRO = 'otro',
}

/**
 * acc_acciones_personal — Acciones de personal (aumentos, deducciones, etc.).
 *
 * Flujo: Pendiente → Aprobada | Rechazada.
 * Cuando está aprobada, puede asociarse a planilla abierta (id_planilla).
 * Evento: personal-action.approved → payroll puede asociar.
 */
@Entity('acc_acciones_personal')
export class PersonalAction {
  @PrimaryGeneratedColumn({ name: 'id_accion' })
  id: number;

  @Index('IDX_accion_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Index('IDX_accion_empleado')
  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Index('IDX_accion_calendario_nomina')
  @Column({ name: 'id_calendario_nomina', type: 'int', nullable: true })
  idCalendarioNomina: number | null;

  @Column({ name: 'tipo_accion', type: 'varchar', length: 50 })
  tipoAccion: string;

  @Column({ name: 'descripcion_accion', type: 'text', nullable: true })
  descripcion: string | null;

  @Index('IDX_accion_estado')
  @Column({ name: 'estado_accion', type: 'tinyint', width: 1, default: PersonalActionEstado.PENDIENTE })
  estado: PersonalActionEstado;

  @Column({ name: 'fecha_efecto_accion', type: 'date', nullable: true })
  fechaEfecto: Date | null;

  @Column({ name: 'monto_accion', type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto: number | null;

  @Column({ name: 'aprobado_por_accion', type: 'int', nullable: true })
  aprobadoPor: number | null;

  @Column({ name: 'fecha_aprobacion_accion', type: 'datetime', nullable: true })
  fechaAprobacion: Date | null;

  @Column({ name: 'motivo_rechazo_accion', type: 'text', nullable: true })
  motivoRechazo: string | null;

  @CreateDateColumn({ name: 'fecha_creacion_accion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_accion' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_accion', type: 'int', nullable: true })
  creadoPor: number | null;

  @Column({ name: 'modificado_por_accion', type: 'int', nullable: true })
  modificadoPor: number | null;
}
