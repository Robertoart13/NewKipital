import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nom_articulos_nomina')
export class PayrollArticle {
  @PrimaryGeneratedColumn({ name: 'id_articulo_nomina' })
  id: number;

  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'nombre_articulo_nomina', type: 'varchar', length: 200 })
  nombre: string;

  @Column({ name: 'descripcion_articulo_nomina', type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'id_tipo_accion_personal', type: 'int' })
  idTipoAccionPersonal: number;

  @Column({ name: 'id_tipo_articulo_nomina', type: 'int' })
  idTipoArticuloNomina: number;

  @Column({ name: 'id_cuenta_gasto', type: 'int' })
  idCuentaGasto: number;

  @Column({ name: 'id_cuenta_pasivo', type: 'int', nullable: true })
  idCuentaPasivo: number | null;

  @Column({ name: 'es_inactivo', type: 'tinyint', width: 1, default: 0 })
  esInactivo: number;

  @Column({ name: 'fecha_creacion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;

  @Column({ name: 'fecha_modificacion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  fechaModificacion: Date;
}
