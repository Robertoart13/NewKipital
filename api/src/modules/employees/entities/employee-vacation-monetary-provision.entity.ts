import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

/**
 * sys_empleado_vacaciones_provision_monto — Historial monetario de provisiones de vacaciones.
 */
@Entity('sys_empleado_vacaciones_provision_monto')
export class EmployeeVacationMonetaryProvision {
  @PrimaryGeneratedColumn({ name: 'id_vacaciones_provision_monto' })
  id: number;

  @Index('IDX_vacaciones_provision_monto_empleado')
  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Index('IDX_vacaciones_provision_monto_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'id_vacaciones_ledger', type: 'int' })
  idVacacionesLedger: number;

  @Column({ name: 'id_periodos_pago', type: 'int', nullable: true })
  idPeriodoPago: number | null;

  @Index('IDX_vacaciones_provision_monto_fecha')
  @Column({ name: 'fecha_provision_monto_vacaciones', type: 'date' })
  fechaProvision: Date;

  @Column({ name: 'dias_provisionados_monto_vacaciones', type: 'int', default: 1 })
  diasProvisionados: number;

  @Column({ name: 'monto_provisionado_vacaciones', type: 'decimal', precision: 14, scale: 2, default: 0 })
  montoProvisionado: string;

  @Column({ name: 'formula_aplicada_vacaciones', type: 'varchar', length: 120, nullable: true })
  formulaAplicada: string | null;

  @CreateDateColumn({ name: 'fecha_creacion_provision_monto_vacaciones' })
  fechaCreacion: Date;

  @Column({ name: 'creado_por_provision_monto_vacaciones', type: 'int', nullable: true })
  creadoPor: number | null;
}
