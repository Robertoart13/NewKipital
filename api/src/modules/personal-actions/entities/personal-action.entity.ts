import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PersonalActionEstado {
  DRAFT = 1,
  PENDING_SUPERVISOR = 2,
  PENDING_RRHH = 3,
  APPROVED = 4,
  CONSUMED = 5,
  CANCELLED = 6,
  INVALIDATED = 7,
  EXPIRED = 8,
  REJECTED = 9,
  // Alias de compatibilidad legacy
  PENDIENTE = 1,
  APROBADA = 4,
  APROBADA_LEGACY = 2,
  RECHAZADA = 9,
}

export const PERSONAL_ACTION_PENDING_STATES: PersonalActionEstado[] = [
  PersonalActionEstado.DRAFT,
  PersonalActionEstado.PENDING_SUPERVISOR,
  PersonalActionEstado.PENDING_RRHH,
];

export const PERSONAL_ACTION_APPROVED_STATES: PersonalActionEstado[] = [
  PersonalActionEstado.APPROVED,
  PersonalActionEstado.APROBADA_LEGACY,
];

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

  @Column({ name: 'group_id_accion', type: 'varchar', length: 50, nullable: true })
  groupId: string | null;

  @Column({
    name: 'origen_accion',
    type: 'enum',
    enum: ['RRHH', 'IMPORT', 'TIMEWISE'],
    default: 'RRHH',
  })
  origen: 'RRHH' | 'IMPORT' | 'TIMEWISE';

  @Column({ name: 'descripcion_accion', type: 'text', nullable: true })
  descripcion: string | null;

  @Index('IDX_accion_estado')
  @Column({
    name: 'estado_accion',
    type: 'tinyint',
    width: 1,
    default: PersonalActionEstado.PENDIENTE,
  })
  estado: PersonalActionEstado;

  @Column({ name: 'fecha_efecto_accion', type: 'date', nullable: true })
  fechaEfecto: Date | null;

  @Column({
    name: 'fecha_inicio_efecto_accion',
    type: 'date',
    nullable: true,
  })
  fechaInicioEfecto: Date | null;

  @Column({ name: 'fecha_fin_efecto_accion', type: 'date', nullable: true })
  fechaFinEfecto: Date | null;

  @Column({
    name: 'monto_accion',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  monto: number | null;

  @Column({ name: 'moneda_accion', type: 'char', length: 3, default: 'CRC' })
  moneda: string;

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

  @Column({ name: 'version_lock_accion', type: 'int', default: 1 })
  versionLock: number;

  @Column({ name: 'invalidated_at_accion', type: 'datetime', nullable: true })
  invalidatedAt: Date | null;

  @Column({
    name: 'invalidated_reason_accion',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  invalidatedReason: string | null;

  @Column({
    name: 'invalidated_reason_code_accion',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  invalidatedReasonCode: string | null;

  @Column({
    name: 'invalidated_by_type_accion',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  invalidatedByType: string | null;

  @Column({
    name: 'invalidated_by_user_id_accion',
    type: 'int',
    nullable: true,
  })
  invalidatedByUserId: number | null;

  @Column({
    name: 'invalidated_meta_accion',
    type: 'json',
    nullable: true,
  })
  invalidatedMeta: Record<string, unknown> | null;

  @Column({ name: 'expired_at_accion', type: 'datetime', nullable: true })
  expiredAt: Date | null;

  @Column({
    name: 'expired_reason_accion',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  expiredReason: string | null;

  @Column({ name: 'cancelled_at_accion', type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Column({
    name: 'cancel_reason_accion',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  cancelReason: string | null;
}
