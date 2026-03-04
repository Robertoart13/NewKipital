import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * nomina_planilla_snapshot_json — Snapshot completo de planilla en JSON.
 * Guarda el detalle completo por empleado para auditoría.
 */
@Entity('nomina_planilla_snapshot_json')
export class PayrollPlanillaSnapshotJson {
  @PrimaryGeneratedColumn({ name: 'id_snapshot_json' })
  id: number;

  @Index('IDX_snapshot_json_nomina')
  @Column({ name: 'id_nomina', type: 'int' })
  idNomina: number;

  @Column({ name: 'snapshot_json', type: 'json' })
  snapshot: Record<string, unknown>;

  @CreateDateColumn({ name: 'fecha_creacion_snapshot' })
  fechaCreacion: Date;
}
