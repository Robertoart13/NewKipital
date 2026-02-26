import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nom_tipos_accion_personal')
export class PersonalActionType {
  @PrimaryGeneratedColumn({ name: 'id_tipo_accion_personal' })
  id: number;

  @Column({ name: 'codigo_accion', type: 'varchar', length: 20 })
  codigo: string;

  @Column({ name: 'nombre_accion', type: 'varchar', length: 150 })
  nombre: string;

  @Index('IDX_tipo_accion_estado')
  @Column({ name: 'estado', type: 'tinyint', width: 1, default: 1 })
  estado: number;
}
