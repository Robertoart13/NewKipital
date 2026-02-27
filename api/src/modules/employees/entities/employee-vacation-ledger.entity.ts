import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

export enum VacationMovementType {
  INITIAL = 'INITIAL',
  MONTHLY_ACCRUAL = 'MONTHLY_ACCRUAL',
  VACATION_USAGE = 'VACATION_USAGE',
  REVERSAL = 'REVERSAL',
  ADJUSTMENT = 'ADJUSTMENT',
}

/**
 * sys_empleado_vacaciones_ledger — Historial inmutable de movimientos de vacaciones.
 */
@Entity('sys_empleado_vacaciones_ledger')
export class EmployeeVacationLedger {
  @PrimaryGeneratedColumn({ name: 'id_vacaciones_ledger' })
  id: number;

  @Index('IDX_vacaciones_ledger_empleado')
  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Index('IDX_vacaciones_ledger_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'id_vacaciones_cuenta', type: 'int' })
  idVacacionesCuenta: number;

  @Index('IDX_vacaciones_ledger_tipo')
  @Column({
    name: 'tipo_movimiento_vacaciones',
    type: 'enum',
    enum: VacationMovementType,
  })
  tipoMovimiento: VacationMovementType;

  @Column({ name: 'dias_delta_vacaciones', type: 'int' })
  diasDelta: number;

  @Column({ name: 'saldo_resultante_vacaciones', type: 'int' })
  saldoResultante: number;

  @Index('IDX_vacaciones_ledger_fecha')
  @Column({ name: 'fecha_efectiva_vacaciones', type: 'date' })
  fechaEfectiva: Date;

  @Column({ name: 'periodo_referencia_vacaciones', type: 'varchar', length: 7, nullable: true })
  periodoReferencia: string | null;

  @Column({ name: 'source_type_vacaciones', type: 'varchar', length: 40, nullable: true })
  sourceType: string | null;

  @Column({ name: 'source_id_vacaciones', type: 'int', nullable: true })
  sourceId: number | null;

  @Column({ name: 'descripcion_vacaciones', type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @CreateDateColumn({ name: 'fecha_creacion_vacaciones_ledger' })
  fechaCreacion: Date;

  @Column({ name: 'creado_por_vacaciones_ledger', type: 'int', nullable: true })
  creadoPor: number | null;
}
