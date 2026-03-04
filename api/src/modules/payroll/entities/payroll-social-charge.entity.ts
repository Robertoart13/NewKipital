import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nom_cargas_sociales')
export class PayrollSocialCharge {
  @PrimaryGeneratedColumn({ name: 'id_carga_social' })
  id: number;

  @Index('IDX_carga_social_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({
    name: 'nombre_carga_social',
    type: 'varchar',
    length: 200,
  })
  nombre: string;

  @Index('IDX_carga_social_movimiento')
  @Column({ name: 'id_movimiento_carga_social', type: 'int' })
  idMovimiento: number;

  @Column({
    name: 'porcentaje_carga_social',
    type: 'decimal',
    precision: 10,
    scale: 4,
    default: '0',
  })
  porcentaje: string;

  @Column({
    name: 'monto_carga_social',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: '0',
  })
  monto: string;

  @Column({
    name: 'es_inactivo_carga_social',
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  esInactivo: number;

  @CreateDateColumn({ name: 'fecha_creacion_carga_social' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_carga_social' })
  fechaModificacion: Date;
}
