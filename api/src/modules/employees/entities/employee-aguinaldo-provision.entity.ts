import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EstadoProvisionAguinaldoEmpleado {
  PENDIENTE = 1,
  PAGADO = 2,
}

@Entity('sys_empleado_provision_aguinaldo')
export class EmployeeAguinaldoProvision {
  @PrimaryGeneratedColumn({ name: 'id_provision_aguinaldo' })
  id: number;

  @Index('IDX_provision_aguinaldo_empleado')
  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Index('IDX_provision_aguinaldo_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'monto_provisionado', type: 'varchar', length: 255, nullable: false })
  montoProvisionado: string;

  @Column({ name: 'fecha_inicio_laboral', type: 'date' })
  fechaInicioLaboral: Date;

  @Column({ name: 'fecha_fin_laboral', type: 'date', nullable: true })
  fechaFinLaboral: Date | null;

  @Column({ name: 'registro_empresa', type: 'text', nullable: true })
  registroEmpresa: string | null;

  @Index('IDX_provision_aguinaldo_estado')
  @Column({
    name: 'estado_provision_aguinaldo',
    type: 'tinyint',
    width: 1,
    default: EstadoProvisionAguinaldoEmpleado.PENDIENTE,
  })
  estado: EstadoProvisionAguinaldoEmpleado;

  @CreateDateColumn({ name: 'fecha_creacion_provision_aguinaldo' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_provision_aguinaldo' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_provision_aguinaldo', type: 'int', nullable: true })
  creadoPor: number | null;

  @Column({ name: 'modificado_por_provision_aguinaldo', type: 'int', nullable: true })
  modificadoPor: number | null;

  @Column({ name: 'datos_encriptados_provision', type: 'tinyint', width: 1, default: 0 })
  datosEncriptados: number;

  @Column({ name: 'version_encriptacion_provision', type: 'varchar', length: 10, nullable: true })
  versionEncriptacion: string | null;

  @Column({ name: 'fecha_encriptacion_provision', type: 'datetime', nullable: true })
  fechaEncriptacion: Date | null;
}
