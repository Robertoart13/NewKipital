import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('acc_planilla_reactivation_items')
export class PayrollReactivationItem {
  @PrimaryGeneratedColumn({ name: 'id_reactivation_item' })
  id: number;

  @Index('IDX_reactivation_item_payroll')
  @Column({ name: 'id_calendario_nomina', type: 'int' })
  idCalendarioNomina: number;

  @Index('IDX_reactivation_item_action')
  @Column({ name: 'id_accion', type: 'int' })
  idAccion: number;

  @Column({ name: 'estado_anterior_accion', type: 'tinyint', width: 1 })
  estadoAnteriorAccion: number;

  @Column({ name: 'estado_nuevo_accion', type: 'tinyint', width: 1 })
  estadoNuevoAccion: number;

  @Column({ name: 'es_procesado_reactivacion', type: 'tinyint', width: 1, default: 0 })
  esProcesadoReactivacion: number;

  @Column({ name: 'resultado_reactivacion', type: 'varchar', length: 32, nullable: true })
  resultadoReactivacion: string | null;

  @Column({ name: 'motivo_resultado_reactivacion', type: 'varchar', length: 255, nullable: true })
  motivoResultadoReactivacion: string | null;

  @CreateDateColumn({ name: 'fecha_creacion_reactivation_item' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_reactivation_item' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_reactivation_item', type: 'int', nullable: true })
  creadoPor: number | null;

  @Column({ name: 'modificado_por_reactivation_item', type: 'int', nullable: true })
  modificadoPor: number | null;
}
