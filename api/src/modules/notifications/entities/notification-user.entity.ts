import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Notification } from './notification.entity.js';

export type NotificationUserEstado = 'UNREAD' | 'READ' | 'DELETED';

@Entity('sys_notificacion_usuarios')
@Index('UQ_notif_usuario', ['idNotificacion', 'idUsuarioDestino'], { unique: true })
export class NotificationUser {
  @PrimaryGeneratedColumn({ name: 'id_notificacion_usuario' })
  id: number;

  @Column({ name: 'id_notificacion', type: 'int' })
  idNotificacion: number;

  @Index('IDX_notif_user_usuario')
  @Column({ name: 'id_usuario_destino', type: 'int' })
  idUsuarioDestino: number;

  @Index('IDX_notif_user_estado')
  @Column({ name: 'estado_notificacion_usuario', type: 'varchar', length: 20, default: 'UNREAD' })
  estado: NotificationUserEstado;

  @CreateDateColumn({ name: 'fecha_entregada_notificacion_usuario' })
  fechaEntregada: Date;

  @Column({ name: 'fecha_leida_notificacion_usuario', type: 'datetime', nullable: true })
  fechaLeida: Date | null;

  @Column({ name: 'fecha_eliminada_notificacion_usuario', type: 'datetime', nullable: true })
  fechaEliminada: Date | null;

  @ManyToOne(() => Notification, (n) => n.usuarios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_notificacion' })
  notificacion: Notification;
}
