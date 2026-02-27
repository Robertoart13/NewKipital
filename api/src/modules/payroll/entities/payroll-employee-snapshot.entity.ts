import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nomina_empleados_snapshot')
export class PayrollEmployeeSnapshot {
  @PrimaryGeneratedColumn({ name: 'id_snapshot' })
  id: number;

  @Column({ name: 'id_nomina', type: 'int' })
  idNomina: number;

  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Column({ name: 'salario_base_snapshot', type: 'decimal', precision: 18, scale: 2, default: '0' })
  salarioBase: string;

  @Column({ name: 'jornada_snapshot', type: 'varchar', length: 50, nullable: true })
  jornada: string | null;

  @Column({ name: 'moneda_snapshot', type: 'enum', enum: ['CRC', 'USD'], default: 'CRC' })
  moneda: 'CRC' | 'USD';

  @Column({ name: 'centro_costo_snapshot', type: 'varchar', length: 50, nullable: true })
  centroCosto: string | null;

  @Column({ name: 'cuenta_banco_snapshot', type: 'varchar', length: 100, nullable: true })
  cuentaBanco: string | null;

  @Column({ name: 'fecha_creacion_snapshot', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;
}

