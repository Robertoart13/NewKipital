import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('erp_cuentas_contables')
@Index('UQ_cuenta_empresa_codigo', ['idEmpresa', 'codigo'], { unique: true })
@Index('UQ_cuenta_empresa_netsuite', ['idEmpresa', 'idExternoNetsuite'], {
  unique: true,
})
@Index('UQ_cuenta_empresa_codigo_externo', ['idEmpresa', 'codigoExterno'], {
  unique: true,
})
export class AccountingAccount {
  @PrimaryGeneratedColumn({ name: 'id_cuenta_contable' })
  id: number;

  @Index('IDX_cuenta_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'nombre_cuenta_contable', type: 'varchar', length: 255 })
  nombre: string;

  @Column({ name: 'descripcion_cuenta_contable', type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'codigo_cuenta_contable', type: 'varchar', length: 50 })
  codigo: string;

  @Column({
    name: 'id_externo_netsuite',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  idExternoNetsuite: string | null;

  @Column({
    name: 'codigo_externo_cuenta',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  codigoExterno: string | null;

  @Index('IDX_cuenta_tipo')
  @Column({ name: 'id_tipo_erp', type: 'int' })
  idTipoErp: number;

  @Index('IDX_cuenta_tipo_accion')
  @Column({ name: 'id_tipo_accion_personal', type: 'int' })
  idTipoAccionPersonal: number;

  @Index('IDX_cuenta_inactivo')
  @Column({ name: 'es_inactivo', type: 'tinyint', width: 1, default: 0 })
  esInactivo: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion' })
  fechaModificacion: Date;
}
