import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoIncapacidadLinea {
  ENFERMEDAD_COMUN_CCSS = 'enfermedad_comun_ccss',
  ENFERMEDAD_MENTAL_CCSS = 'enfermedad_mental_ccss',
  COVID19_CCSS = 'covid19_ccss',
  ABORTO_ESPONTANEO_CCSS = 'aborto_espontaneo_ccss',
  REPOSO_POSTOPERATORIO_CCSS = 'reposo_postoperatorio_ccss',
  REPOSO_PRENATAL_ADICIONAL_CCSS = 'reposo_prenatal_adicional_ccss',
  REPOSO_POSTNATAL_EXTENDIDO_CCSS = 'reposo_postnatal_extendido_ccss',
  CUIDO_FAMILIAR_GRAVE_CCSS = 'cuido_familiar_grave_ccss',
  TRATAMIENTO_ONCOLOGICO_CCSS = 'tratamiento_oncologico_ccss',
  TRATAMIENTO_RENAL_CRONICO_CCSS = 'tratamiento_renal_cronico_ccss',
  TRATAMIENTO_VIH_SIDA_CCSS = 'tratamiento_vih_sida_ccss',
  ACCIDENTE_TRABAJO_INS = 'accidente_trabajo_ins',
  ENFERMEDAD_PROFESIONAL_INS = 'enfermedad_profesional_ins',
  INCAPACIDAD_PROLONGADA_INS = 'incapacidad_prolongada_ins',
}

export enum TipoInstitucionIncapacidadLinea {
  CCSS = 'CCSS',
  INS = 'INS',
}

@Entity('acc_incapacidades_lineas')
export class DisabilityLine {
  @PrimaryGeneratedColumn({ name: 'id_linea_incapacidad' })
  id: number;

  @Index('IDX_inc_linea_accion')
  @Column({ name: 'id_accion', type: 'int' })
  idAccion: number;

  @Index('IDX_inc_linea_cuota')
  @Column({ name: 'id_cuota', type: 'int', nullable: true })
  idCuota: number | null;

  @Index('IDX_inc_linea_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Index('IDX_inc_linea_empleado')
  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Index('IDX_inc_linea_calendario')
  @Column({ name: 'id_calendario_nomina', type: 'int' })
  idCalendarioNomina: number;

  @Index('IDX_inc_linea_movimiento')
  @Column({ name: 'id_movimiento_nomina', type: 'int' })
  idMovimientoNomina: number;

  @Column({
    name: 'tipo_incapacidad_linea',
    type: 'enum',
    enum: TipoIncapacidadLinea,
    default: TipoIncapacidadLinea.ENFERMEDAD_COMUN_CCSS,
  })
  tipoIncapacidad: TipoIncapacidadLinea;

  @Column({
    name: 'tipo_institucion_linea',
    type: 'enum',
    enum: TipoInstitucionIncapacidadLinea,
    default: TipoInstitucionIncapacidadLinea.CCSS,
  })
  tipoInstitucion: TipoInstitucionIncapacidadLinea;

  @Column({ name: 'cantidad_linea', type: 'decimal', precision: 12, scale: 4 })
  cantidad: number;

  @Column({ name: 'monto_linea', type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ name: 'monto_ins_linea', type: 'decimal', precision: 12, scale: 2, default: 0 })
  montoIns: number;

  @Column({ name: 'monto_patrono_linea', type: 'decimal', precision: 12, scale: 2, default: 0 })
  montoPatrono: number;

  @Column({ name: 'subsidio_ccss_linea', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subsidioCcss: number;

  @Column({ name: 'total_incapacidad_linea', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalIncapacidad: number;

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
