import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoBonificacionLinea {
  ORDINARIA_SALARIAL = 'ordinaria_salarial',
  EXTRAORDINARIA_HABITUAL = 'extraordinaria_habitual',
  EXTRAORDINARIA_OCASIONAL = 'extraordinaria_ocasional',
  NO_SALARIAL_REEMBOLSO = 'no_salarial_reembolso',
}

@Entity('acc_bonificaciones_lineas')
export class BonusLine {
  @PrimaryGeneratedColumn({ name: 'id_linea_bonificacion' })
  id: number;

  @Index('IDX_bon_linea_accion')
  @Column({ name: 'id_accion', type: 'int' })
  idAccion: number;

  @Index('IDX_bon_linea_cuota')
  @Column({ name: 'id_cuota', type: 'int', nullable: true })
  idCuota: number | null;

  @Index('IDX_bon_linea_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Index('IDX_bon_linea_empleado')
  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Index('IDX_bon_linea_calendario')
  @Column({ name: 'id_calendario_nomina', type: 'int' })
  idCalendarioNomina: number;

  @Index('IDX_bon_linea_movimiento')
  @Column({ name: 'id_movimiento_nomina', type: 'int' })
  idMovimientoNomina: number;

  @Column({
    name: 'tipo_bonificacion_linea',
    type: 'enum',
    enum: TipoBonificacionLinea,
  })
  tipoBonificacion: TipoBonificacionLinea;

  @Column({ name: 'cantidad_linea', type: 'int' })
  cantidad: number;

  @Column({ name: 'monto_linea', type: 'decimal', precision: 12, scale: 2 })
  monto: number;

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

