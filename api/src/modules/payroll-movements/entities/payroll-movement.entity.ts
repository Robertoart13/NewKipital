import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nom_movimientos_nomina')
export class PayrollMovement {
  @PrimaryGeneratedColumn({ name: 'id_movimiento_nomina' })
  id: number;

  @Column({ name: 'id_empresa_movimiento_nomina', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'nombre_movimiento_nomina', type: 'varchar', length: 200 })
  nombre: string;

  @Column({ name: 'id_articulo_nomina_movimiento_nomina', type: 'int' })
  idArticuloNomina: number;

  @Column({ name: 'id_tipo_accion_personal_movimiento_nomina', type: 'int' })
  idTipoAccionPersonal: number;

  @Column({ name: 'id_clase_movimiento_nomina', type: 'int', nullable: true })
  idClase: number | null;

  @Column({
    name: 'id_proyecto_movimiento_nomina',
    type: 'int',
    nullable: true,
  })
  idProyecto: number | null;

  @Column({
    name: 'descripcion_movimiento_nomina',
    type: 'text',
    nullable: true,
  })
  descripcion: string | null;

  @Column({
    name: 'es_monto_fijo_movimiento_nomina',
    type: 'tinyint',
    width: 1,
    default: 1,
  })
  esMontoFijo: number;

  @Column({
    name: 'monto_fijo_movimiento_nomina',
    type: 'varchar',
    length: 50,
    default: '0',
  })
  montoFijo: string;

  @Column({
    name: 'porcentaje_movimiento_nomina',
    type: 'varchar',
    length: 50,
    default: '0',
  })
  porcentaje: string;

  @Column({
    name: 'formula_ayuda_movimiento_nomina',
    type: 'text',
    nullable: true,
  })
  formulaAyuda: string | null;

  @Column({
    name: 'es_inactivo_movimiento_nomina',
    type: 'tinyint',
    width: 1,
    default: 0,
  })
  esInactivo: number;

  @Column({
    name: 'fecha_creacion_movimiento_nomina',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column({
    name: 'fecha_modificacion_movimiento_nomina',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaModificacion: Date;
}
