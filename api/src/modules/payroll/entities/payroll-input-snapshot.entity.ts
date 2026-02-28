import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum PayrollInputSourceType {
  HR_ACTION = 'HR_ACTION',
  TIME = 'TIME',
  MANUAL = 'MANUAL',
}

@Entity('nomina_inputs_snapshot')
export class PayrollInputSnapshot {
  @PrimaryGeneratedColumn({ name: 'id_input' })
  id: number;

  @Column({ name: 'id_nomina', type: 'int' })
  idNomina: number;

  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Column({
    name: 'source_type_input',
    type: 'enum',
    enum: PayrollInputSourceType,
    default: PayrollInputSourceType.HR_ACTION,
  })
  sourceType: PayrollInputSourceType;

  @Column({ name: 'source_id_input', type: 'int', nullable: true })
  sourceId: number | null;

  @Column({ name: 'movement_id_input', type: 'int', nullable: true })
  movementId: number | null;

  @Column({
    name: 'concepto_codigo_input',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  conceptoCodigo: string | null;

  @Column({
    name: 'tipo_accion_input',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  tipoAccion: string | null;

  @Column({
    name: 'unidades_input',
    type: 'decimal',
    precision: 10,
    scale: 4,
    default: '1.0000',
  })
  unidades: string;

  @Column({
    name: 'monto_base_input',
    type: 'decimal',
    precision: 18,
    scale: 6,
    default: '0.000000',
  })
  montoBase: string;

  @Column({
    name: 'monto_final_input',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: '0.00',
  })
  montoFinal: string;

  @Column({
    name: 'is_retro_input',
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  isRetro: number;

  @Column({
    name: 'original_period_input',
    type: 'varchar',
    length: 7,
    nullable: true,
  })
  originalPeriod: string | null;

  @Column({
    name: 'monto_input',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: '0',
  })
  monto: string;

  @Column({
    name: 'fecha_creacion_input',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;
}
