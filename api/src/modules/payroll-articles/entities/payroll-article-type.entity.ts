import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nom_tipo_articulo_nomina')
export class PayrollArticleType {
  @PrimaryGeneratedColumn({ name: 'id_tipo_articulo_nomina' })
  id: number;

  @Column({ name: 'nombre_tipo_articulo_nomina', type: 'varchar', length: 150 })
  nombre: string;

  @Column({
    name: 'descripcion_tipo_articulo_nomina',
    type: 'text',
    nullable: true,
  })
  descripcion: string | null;

  @Column({ name: 'es_inactivo', type: 'tinyint', width: 1, default: 0 })
  esInactivo: number;

  @Column({
    name: 'fecha_creacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column({
    name: 'fecha_modificacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaModificacion: Date;
}
