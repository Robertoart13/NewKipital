import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

/**
 * sys_usuario_app — Tabla puente: Usuario ↔ App.
 * Define si un usuario puede ingresar a una aplicación.
 * Aquí NO hay empresa. Solo acceso a la app.
 */
@Entity('sys_usuario_app')
@Index('UQ_usuario_app', ['idUsuario', 'idApp'], { unique: true })
export class UserApp {
  @PrimaryGeneratedColumn({ name: 'id_usuario_app' })
  id: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @Column({ name: 'id_app', type: 'int' })
  idApp: number;

  @Column({ name: 'estado_usuario_app', type: 'tinyint', width: 1, default: 1 })
  estado: number;

  @CreateDateColumn({ name: 'fecha_asignacion_usuario_app' })
  fechaAsignacion: Date;
}
