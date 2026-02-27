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

  @Column({ name: 'source_type_input', type: 'enum', enum: PayrollInputSourceType, default: PayrollInputSourceType.HR_ACTION })
  sourceType: PayrollInputSourceType;

  @Column({ name: 'source_id_input', type: 'int', nullable: true })
  sourceId: number | null;

  @Column({ name: 'concepto_codigo_input', type: 'varchar', length: 50, nullable: true })
  conceptoCodigo: string | null;

  @Column({ name: 'monto_input', type: 'decimal', precision: 18, scale: 4, default: '0' })
  monto: string;

  @Column({ name: 'fecha_creacion_input', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;
}

