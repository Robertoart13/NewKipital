import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('acc_vacaciones_fechas')
export class VacationDate {
  @PrimaryGeneratedColumn({ name: 'id_vacacion_fecha' })
  id: number;

  @Index('IDX_vac_fecha_accion')
  @Column({ name: 'id_accion', type: 'int' })
  idAccion: number;

  @Index('IDX_vac_fecha_cuota')
  @Column({ name: 'id_cuota', type: 'int', nullable: true })
  idCuota: number | null;

  @Index('IDX_vac_fecha_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Index('IDX_vac_fecha_empleado')
  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Index('IDX_vac_fecha_calendario')
  @Column({ name: 'id_calendario_nomina', type: 'int' })
  idCalendarioNomina: number;

  @Index('IDX_vac_fecha_movimiento')
  @Column({ name: 'id_movimiento_nomina', type: 'int' })
  idMovimientoNomina: number;

  @Index('IDX_vac_fecha')
  @Column({ name: 'fecha_vacacion', type: 'date' })
  fechaVacacion: Date;

  @Column({ name: 'orden_vacacion', type: 'int' })
  orden: number;

  @CreateDateColumn({ name: 'fecha_creacion_vacacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_vacacion' })
  fechaModificacion: Date;
}
