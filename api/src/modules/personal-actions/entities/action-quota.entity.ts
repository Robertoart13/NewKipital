import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EstadoCuota {
  BORRADOR = 0,
  PENDIENTE_APROBACION = 1,
  APROBADA = 2,
  PROGRAMADA = 3,
  ASOCIADA = 4,
  PAGADA = 5,
  CANCELADA = 6,
  BLOQUEADA_INCOMPATIBLE = 7,
}

/**
 * acc_cuotas_accion — Cuotas de acciones multi-período.
 *
 * Una acción puede generar N cuotas (una por período).
 * Enrutamiento automático a planilla compatible cuando estado permite.
 */
@Entity('acc_cuotas_accion')
export class ActionQuota {
  @PrimaryGeneratedColumn({ name: 'id_cuota' })
  id: number;

  @Index('IDX_cuota_accion')
  @Column({ name: 'id_accion', type: 'int' })
  idAccion: number;

  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Index('IDX_cuota_calendario')
  @Column({ name: 'id_calendario_nomina', type: 'int', nullable: true })
  idCalendarioNomina: number | null;

  @Column({ name: 'numero_cuota', type: 'int' })
  numeroCuota: number;

  @Column({ name: 'monto_cuota', type: 'decimal', precision: 12, scale: 2 })
  montoCuota: number;

  @Index('IDX_cuota_estado')
  @Column({
    name: 'estado_cuota',
    type: 'tinyint',
    width: 1,
    default: EstadoCuota.PENDIENTE_APROBACION,
  })
  estado: EstadoCuota;

  @Column({ name: 'fecha_efecto_cuota', type: 'date', nullable: true })
  fechaEfecto: Date | null;

  @Column({ name: 'motivo_estado_cuota', type: 'text', nullable: true })
  motivoEstado: string | null;

  @CreateDateColumn({ name: 'fecha_creacion_cuota' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_cuota' })
  fechaModificacion: Date;
}
