import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MetodoCalculoAumentoLinea {
  MONTO = 'MONTO',
  PORCENTAJE = 'PORCENTAJE',
}

@Entity('acc_aumentos_lineas')
export class IncreaseLine {
  @PrimaryGeneratedColumn({ name: 'id_linea_aumento' })
  id: number;

  @Index('IDX_aum_linea_accion')
  @Column({ name: 'id_accion', type: 'int' })
  idAccion: number;

  @Index('IDX_aum_linea_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Index('IDX_aum_linea_empleado')
  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Index('IDX_aum_linea_calendario')
  @Column({ name: 'id_calendario_nomina', type: 'int' })
  idCalendarioNomina: number;

  @Index('IDX_aum_linea_movimiento')
  @Column({ name: 'id_movimiento_nomina', type: 'int' })
  idMovimientoNomina: number;

  @Column({
    name: 'metodo_calculo_linea',
    type: 'enum',
    enum: MetodoCalculoAumentoLinea,
  })
  metodoCalculo: MetodoCalculoAumentoLinea;

  @Column({ name: 'porcentaje_linea', type: 'decimal', precision: 7, scale: 4, default: 0 })
  porcentaje: number;

  @Column({ name: 'monto_linea', type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ name: 'salario_actual_linea', type: 'decimal', precision: 12, scale: 2 })
  salarioActual: number;

  @Column({ name: 'nuevo_salario_linea', type: 'decimal', precision: 12, scale: 2 })
  nuevoSalario: number;

  @Column({ name: 'remuneracion_linea', type: 'tinyint', width: 1, default: 1 })
  remuneracion: number;

  @Column({ name: 'formula_linea', type: 'text', nullable: true })
  formula: string | null;

  @Column({ name: 'orden_linea', type: 'int' })
  orden: number;

  @Column({ name: 'fecha_efecto_linea', type: 'date', nullable: true })
  fechaEfecto: Date | null;

  @CreateDateColumn({ name: 'fecha_creacion_linea' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_linea' })
  fechaModificacion: Date;
}
