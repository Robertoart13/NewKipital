import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EstadoTransferenciaEmpleado {
  SIMULATED = 1,
  EXECUTED = 2,
  FAILED = 3,
  CANCELLED = 4,
}

/**
 * sys_empleado_transferencias — Auditoría de traslados interempresas.
 *
 * Registra simulaciones y ejecuciones de traslados para trazabilidad.
 */
@Entity('sys_empleado_transferencias')
export class EmployeeTransfer {
  @PrimaryGeneratedColumn({ name: 'id_transferencia' })
  id: number;

  @Index('IDX_transfer_empleado')
  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Index('IDX_transfer_empresa_origen')
  @Column({ name: 'id_empresa_origen', type: 'int' })
  idEmpresaOrigen: number;

  @Index('IDX_transfer_empresa_destino')
  @Column({ name: 'id_empresa_destino', type: 'int' })
  idEmpresaDestino: number;

  @Column({ name: 'fecha_efectiva_transferencia', type: 'date' })
  fechaEfectiva: Date;

  @Index('IDX_transfer_estado')
  @Column({
    name: 'estado_transferencia',
    type: 'tinyint',
    width: 1,
    default: EstadoTransferenciaEmpleado.SIMULATED,
  })
  estado: EstadoTransferenciaEmpleado;

  @Column({
    name: 'resumen_transferencia',
    type: 'json',
    nullable: true,
  })
  resumen: Record<string, unknown> | null;

  @Column({
    name: 'motivo_transferencia',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  motivo: string | null;

  @Column({ name: 'simulado_por', type: 'int', nullable: true })
  simuladoPor: number | null;

  @Column({ name: 'ejecutado_por', type: 'int', nullable: true })
  ejecutadoPor: number | null;

  @Column({
    name: 'fecha_ejecucion_transferencia',
    type: 'datetime',
    nullable: true,
  })
  fechaEjecucion: Date | null;

  @CreateDateColumn({ name: 'fecha_creacion_transferencia' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_transferencia' })
  fechaModificacion: Date;
}

