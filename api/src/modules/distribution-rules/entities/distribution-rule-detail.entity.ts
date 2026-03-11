import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DistributionRule } from './distribution-rule.entity';

@Entity('config_reglas_distribucion_detalle')
@Index('UQ_regla_detalle_tipo', ['idReglaDistribucion', 'idTipoAccionPersonal'], {
  unique: true,
})
@Index('IDX_regla_detalle_regla', ['idReglaDistribucion'])
@Index('IDX_regla_detalle_tipo_accion', ['idTipoAccionPersonal'])
@Index('IDX_regla_detalle_cuenta', ['idCuentaContable'])
export class DistributionRuleDetail {
  @PrimaryGeneratedColumn({ name: 'id_regla_distribucion_detalle' })
  id: number;

  @Column({ name: 'id_regla_distribucion', type: 'int' })
  idReglaDistribucion: number;

  @Column({ name: 'id_tipo_accion_personal', type: 'int' })
  idTipoAccionPersonal: number;

  @Column({ name: 'id_cuenta_contable', type: 'int' })
  idCuentaContable: number;

  @ManyToOne(() => DistributionRule, (regla) => regla.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_regla_distribucion' })
  regla: DistributionRule;
}

