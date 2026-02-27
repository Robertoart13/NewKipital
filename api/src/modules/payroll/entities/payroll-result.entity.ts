import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nomina_resultados')
export class PayrollResult {
  @PrimaryGeneratedColumn({ name: 'id_resultado' })
  id: number;

  @Column({ name: 'id_nomina', type: 'int' })
  idNomina: number;

  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Column({
    name: 'total_bruto_resultado',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: '0',
  })
  totalBruto: string;

  @Column({
    name: 'total_deducciones_resultado',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: '0',
  })
  totalDeducciones: string;

  @Column({
    name: 'total_neto_resultado',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: '0',
  })
  totalNeto: string;

  @Column({
    name: 'fecha_creacion_resultado',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;
}
