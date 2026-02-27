import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * sys_empleado_vacaciones_cuenta — Cuenta de vacaciones por empleado.
 *
 * Guarda el saldo inicial inmutable y metadatos de anclaje mensual.
 */
@Entity('sys_empleado_vacaciones_cuenta')
export class EmployeeVacationAccount {
  @PrimaryGeneratedColumn({ name: 'id_vacaciones_cuenta' })
  id: number;

  @Index('UQ_vacaciones_cuenta_empleado', { unique: true })
  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Index('IDX_vacaciones_cuenta_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'dias_iniciales_vacaciones', type: 'int', default: 0 })
  diasIniciales: number;

  @Column({
    name: 'inicial_bloqueado_vacaciones',
    type: 'tinyint',
    width: 1,
    default: 1,
  })
  inicialBloqueado: number;

  @Column({ name: 'dia_ancla_vacaciones', type: 'tinyint', width: 2 })
  diaAncla: number;

  @Column({ name: 'fecha_ingreso_ancla_vacaciones', type: 'date' })
  fechaIngresoAncla: Date;

  @Column({
    name: 'ultima_fecha_provision_vacaciones',
    type: 'date',
    nullable: true,
  })
  ultimaFechaProvision: Date | null;

  @Column({
    name: 'estado_vacaciones_cuenta',
    type: 'tinyint',
    width: 1,
    default: 1,
  })
  estado: number;

  @CreateDateColumn({ name: 'fecha_creacion_vacaciones_cuenta' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_vacaciones_cuenta' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_vacaciones_cuenta', type: 'int', nullable: true })
  creadoPor: number | null;

  @Column({
    name: 'modificado_por_vacaciones_cuenta',
    type: 'int',
    nullable: true,
  })
  modificadoPor: number | null;
}
