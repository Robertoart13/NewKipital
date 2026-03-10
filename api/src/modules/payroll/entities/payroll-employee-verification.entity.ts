import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nomina_empleado_verificado')
export class PayrollEmployeeVerification {
  @PrimaryGeneratedColumn({ name: 'id_verificacion' })
  id: number;

  @Index('IDX_verificacion_nomina')
  @Column({ name: 'id_nomina', type: 'int' })
  idNomina: number;

  @Index('IDX_verificacion_empleado')
  @Column({ name: 'id_empleado', type: 'int' })
  idEmpleado: number;

  @Column({
    name: 'verificado_empleado',
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  verificado: number;

  @Column({
    name: 'incluido_planilla_empleado',
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  incluidoPlanilla: number;

  @Column({
    name: 'requiere_revalidacion_empleado',
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  requiereRevalidacion: number;

  @Column({
    name: 'verificado_por',
    type: 'int',
    nullable: true,
  })
  verificadoPor: number | null;

  @CreateDateColumn({ name: 'fecha_verificacion' })
  fechaVerificacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_verificacion' })
  fechaModificacion: Date;
}
