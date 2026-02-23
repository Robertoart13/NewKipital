import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * nom_periodos_pago — Catálogo de frecuencias de pago.
 * Semanal, Quincenal, Mensual, etc.
 * FK referenciada por sys_empleados.id_periodos_pago.
 */
@Entity('nom_periodos_pago')
export class PayPeriod {
  @PrimaryGeneratedColumn({ name: 'id_periodos_pago' })
  id: number;

  @Column({ name: 'nombre_periodo_pago', type: 'varchar', length: 50 })
  nombre: string;

  @Column({ name: 'dias_periodo_pago', type: 'int' })
  dias: number;

  @Index('IDX_periodo_pago_estado')
  @Column({ name: 'es_inactivo', type: 'tinyint', width: 1, default: 0 })
  esInactivo: number;

  @CreateDateColumn({ name: 'fecha_creacion_periodo_pago' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_periodo_pago' })
  fechaModificacion: Date;
}
