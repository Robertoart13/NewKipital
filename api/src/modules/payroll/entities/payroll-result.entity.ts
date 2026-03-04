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
    name: 'salario_bruto_periodo_resultado',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: '0',
  })
  salarioBrutoPeriodo: string;

  @Column({
    name: 'devengado_dias_resultado',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  devengadoDias: string | null;

  @Column({
    name: 'devengado_horas_resultado',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  devengadoHoras: string | null;

  @Column({
    name: 'cargas_sociales_resultado',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: '0',
  })
  cargasSociales: string;

  @Column({
    name: 'impuesto_renta_resultado',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: '0',
  })
  impuestoRenta: string;

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
