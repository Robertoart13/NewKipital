import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoLicenciaLinea {
  MATERNIDAD = 'maternidad',
  PATERNIDAD = 'paternidad',
  ADOPCION = 'adopcion',
  DUELO = 'duelo',
  MATRIMONIO = 'matrimonio',
  ESTUDIOS = 'estudios',
  LACTANCIA = 'lactancia',
  CUIDADO_FAMILIAR = 'cuidado_familiar',
  PERMISO_CON_GOCE = 'permiso_con_goce',
  PERMISO_SIN_GOCE = 'permiso_sin_goce',
  CITACION_JUDICIAL = 'citacion_judicial',
  VOTACION = 'votacion',
  DONACION_SANGRE = 'donacion_sangre',
  LICENCIA_SINDICAL = 'licencia_sindical',
  LICENCIA_ESPECIAL_EMPRESA = 'licencia_especial_empresa',
}

@Entity('acc_licencias_lineas')
export class LicenseLine {
  @PrimaryGeneratedColumn({ name: 'id_linea_licencia' })
  id: number;

  @Index('IDX_lic_linea_accion')
  @Column({ name: 'id_accion', type: 'int' })
  idAccion: number;

  @Index('IDX_lic_linea_cuota')
  @Column({ name: 'id_cuota', type: 'int', nullable: true })
  idCuota: number | null;

  @Index('IDX_lic_linea_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Index('IDX_lic_linea_empleado')
  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Index('IDX_lic_linea_calendario')
  @Column({ name: 'id_calendario_nomina', type: 'int' })
  idCalendarioNomina: number;

  @Index('IDX_lic_linea_movimiento')
  @Column({ name: 'id_movimiento_nomina', type: 'int' })
  idMovimientoNomina: number;

  @Column({
    name: 'tipo_licencia_linea',
    type: 'enum',
    enum: TipoLicenciaLinea,
  })
  tipoLicencia: TipoLicenciaLinea;

  @Column({ name: 'cantidad_linea', type: 'decimal', precision: 12, scale: 4 })
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

