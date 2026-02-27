import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('nom_feriados_planilla')
export class PayrollHoliday {
  @PrimaryGeneratedColumn({ name: 'id_feriado_planilla' })
  id: number;

  @Column({ name: 'nombre_feriado_planilla', type: 'varchar', length: 200 })
  nombre: string;

  @Column({ name: 'tipo_feriado_planilla', type: 'varchar', length: 50 })
  tipo: string;

  @Column({ name: 'fecha_inicio_feriado_planilla', type: 'date' })
  fechaInicio: string;

  @Column({ name: 'fecha_fin_feriado_planilla', type: 'date' })
  fechaFin: string;

  @Column({ name: 'descripcion_feriado_planilla', type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'fecha_creacion_feriado_planilla', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;

  @Column({
    name: 'fecha_modificacion_feriado_planilla',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaModificacion: Date;
}

