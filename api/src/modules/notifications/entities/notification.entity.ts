import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { NotificationUser } from './notification-user.entity';

@Entity('sys_notificaciones')
export class Notification {
  @PrimaryGeneratedColumn({ name: 'id_notificacion' })
  id: number;

  @Index('IDX_notif_tipo')
  @Column({ name: 'tipo_notificacion', type: 'varchar', length: 60 })
  tipo: string;

  @Column({ name: 'titulo_notificacion', type: 'varchar', length: 200 })
  titulo: string;

  @Column({ name: 'mensaje_notificacion', type: 'text', nullable: true })
  mensaje: string | null;

  @Column({ name: 'payload_notificacion', type: 'json', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({
    name: 'scope_notificacion',
    type: 'varchar',
    length: 20,
    default: 'ROLE',
  })
  scope: string;

  @Column({ name: 'id_app', type: 'int', nullable: true })
  idApp: number | null;

  @Column({ name: 'id_empresa', type: 'int', nullable: true })
  idEmpresa: number | null;

  @Column({ name: 'creado_por_notificacion', type: 'int' })
  creadoPor: number;

  @CreateDateColumn({ name: 'fecha_creacion_notificacion' })
  fechaCreacion: Date;

  @Column({
    name: 'fecha_expira_notificacion',
    type: 'datetime',
    nullable: true,
  })
  fechaExpira: Date | null;

  @Column({
    name: 'estado_notificacion',
    type: 'tinyint',
    width: 1,
    default: 1,
  })
  estado: number;

  @OneToMany(() => NotificationUser, (nu) => nu.notificacion)
  usuarios: NotificationUser[];
}
