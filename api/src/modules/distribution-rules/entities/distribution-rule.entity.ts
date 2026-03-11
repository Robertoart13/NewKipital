import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DistributionRuleDetail } from './distribution-rule-detail.entity';

@Entity('config_reglas_distribucion')
@Index('UQ_regla_public_id', ['publicId'], { unique: true })
@Index('IDX_regla_empresa', ['idEmpresa'])
@Index('IDX_regla_global', ['esReglaGlobal'])
@Index('IDX_regla_departamento', ['idDepartamento'])
@Index('IDX_regla_puesto', ['idPuesto'])
@Index('IDX_regla_estado', ['estadoRegla'])
export class DistributionRule {
  @PrimaryGeneratedColumn({ name: 'id_regla_distribucion' })
  id: number;

  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'public_id_regla_distribucion', type: 'varchar', length: 80 })
  publicId: string;

  @Column({ name: 'es_regla_global', type: 'tinyint', width: 1, default: 1 })
  esReglaGlobal: number;

  @Column({ name: 'id_departamento', type: 'int', nullable: true })
  idDepartamento: number | null;

  @Column({ name: 'id_puesto', type: 'int', nullable: true })
  idPuesto: number | null;

  @Column({ name: 'estado_regla', type: 'tinyint', width: 1, default: 1 })
  estadoRegla: number;

  @CreateDateColumn({ name: 'fecha_creacion_regla', type: 'datetime' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_regla', type: 'datetime' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_regla', type: 'int', nullable: true })
  creadoPor: number | null;

  @Column({ name: 'modificado_por_regla', type: 'int', nullable: true })
  modificadoPor: number | null;

  @OneToMany(() => DistributionRuleDetail, (detail) => detail.regla, {
    cascade: false,
  })
  detalles: DistributionRuleDetail[];
}
