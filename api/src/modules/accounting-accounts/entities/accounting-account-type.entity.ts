import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('erp_tipo_cuenta')
export class AccountingAccountType {
  @PrimaryGeneratedColumn({ name: 'id_tipo_erp' })
  id: number;

  @Column({ name: 'nombre_tipo_erp', type: 'varchar', length: 100 })
  nombre: string;

  @Column({ name: 'descripcion_tipo_erp', type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'id_externo_erp', type: 'varchar', length: 50, nullable: true })
  idExterno: string | null;

  @Index('IDX_tipo_cuenta_status')
  @Column({ name: 'status', type: 'tinyint', width: 1, default: 1 })
  status: number;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion' })
  fechaModificacion: Date;
}
