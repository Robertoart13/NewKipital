import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum EstadoCalendarioNomina {
  ABIERTA = 1,
  EN_PROCESO = 2,
  VERIFICADA = 3,
  APLICADA = 4,
  CONTABILIZADA = 5,
  NOTIFICADA = 6,
  INACTIVA = 0,
}

export enum TipoPlanilla {
  REGULAR = 'Regular',
  AGUINALDO = 'Aguinaldo',
  LIQUIDACION = 'Liquidacion',
  EXTRAORDINARIA = 'Extraordinaria',
}

export enum MonedaCalendario {
  CRC = 'CRC',
  USD = 'USD',
}

/**
 * nom_calendarios_nomina — Tabla Maestra de Planillas (Calendario de Nómina).
 *
 * Define qué planillas existen: empresa, periodo, tipo, moneda.
 * Periodo trabajado ≠ ventana de pago (fecha_inicio/fin_periodo vs fecha_inicio/fin_pago).
 * Aplicada = inmutable. Verificada puede reabrirse a Abierta.
 * Unicidad: no duplicar planilla operativa (Abierta/En Proceso/Verificada) para mismo slot.
 */
@Entity('nom_calendarios_nomina')
export class PayrollCalendar {
  @PrimaryGeneratedColumn({ name: 'id_calendario_nomina' })
  id: number;

  @Index('IDX_calendario_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Index('IDX_calendario_periodo_pago')
  @Column({ name: 'id_periodos_pago', type: 'int' })
  idPeriodoPago: number;

  @Column({ name: 'id_tipo_planilla', type: 'int', nullable: true })
  idTipoPlanilla: number | null;

  @Column({ name: 'nombre_planilla_calendario_nomina', type: 'varchar', length: 150, nullable: true })
  nombrePlanilla: string | null;

  @Column({ name: 'tipo_planilla', type: 'varchar', length: 30, default: TipoPlanilla.REGULAR })
  tipoPlanilla: string;

  @Column({ name: 'fecha_inicio_periodo', type: 'date' })
  fechaInicioPeriodo: Date;

  @Column({ name: 'fecha_fin_periodo', type: 'date' })
  fechaFinPeriodo: Date;

  @Column({ name: 'fecha_corte_calendario_nomina', type: 'date', nullable: true })
  fechaCorte: Date | null;

  @Column({ name: 'fecha_inicio_pago', type: 'date' })
  fechaInicioPago: Date;

  @Column({ name: 'fecha_fin_pago', type: 'date' })
  fechaFinPago: Date;

  @Column({ name: 'fecha_pago_programada_calendario_nomina', type: 'date', nullable: true })
  fechaPagoProgramada: Date | null;

  @Column({ name: 'moneda_calendario_nomina', type: 'enum', enum: MonedaCalendario, default: MonedaCalendario.CRC })
  moneda: MonedaCalendario;

  @Index('IDX_calendario_estado')
  @Column({ name: 'estado_calendario_nomina', type: 'tinyint', width: 1, default: EstadoCalendarioNomina.ABIERTA })
  estado: EstadoCalendarioNomina;

  @Column({ name: 'es_inactivo', type: 'tinyint', width: 1, default: 0 })
  esInactivo: number;

  @Column({ name: 'descripcion_evento_calendario_nomina', type: 'text', nullable: true })
  descripcionEvento: string | null;

  @Column({ name: 'etiqueta_color_calendario_nomina', type: 'varchar', length: 20, nullable: true })
  etiquetaColor: string | null;

  @Column({ name: 'prioridad_calendario_nomina', type: 'int', nullable: true })
  prioridad: number | null;

  @Column({ name: 'fecha_aplicacion_calendario_nomina', type: 'datetime', nullable: true })
  fechaAplicacion: Date | null;

  @CreateDateColumn({ name: 'fecha_creacion_calendario_nomina' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_calendario_nomina' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_calendario_nomina', type: 'int', nullable: true })
  creadoPor: number | null;

  @Column({ name: 'modificado_por_calendario_nomina', type: 'int', nullable: true })
  modificadoPor: number | null;

  @Column({ name: 'version_lock_calendario_nomina', type: 'int', default: 0 })
  versionLock: number;

  @Column({ name: 'referencia_netsuite_calendario_nomina', type: 'varchar', length: 100, nullable: true })
  referenciaNetSuite: string | null;

  @Column({ name: 'slot_key_calendario_nomina', type: 'varchar', length: 255, nullable: true })
  slotKey: string | null;

  @Column({ name: 'is_active_slot_calendario_nomina', type: 'tinyint', width: 1, default: 1 })
  isActiveSlot: number;
}
