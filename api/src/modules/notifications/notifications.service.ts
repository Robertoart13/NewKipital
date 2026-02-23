import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity.js';
import { NotificationUser, type NotificationUserEstado } from './entities/notification-user.entity.js';
import { DispatchNotificationDto } from './dto/dispatch-notification.dto.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { UserRole } from '../access-control/entities/user-role.entity.js';

export interface NotificationListItem {
  id: number;
  idNotificacion: number;
  tipo: string;
  titulo: string;
  mensaje: string | null;
  payload: Record<string, unknown> | null;
  estado: NotificationUserEstado;
  fechaEntregada: Date;
  fechaLeida: Date | null;
  fechaCreacion: Date;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(NotificationUser)
    private readonly notifUserRepo: Repository<NotificationUser>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    private readonly gateway: NotificationsGateway,
  ) {}

  async listForUser(
    idUsuario: number,
    status: 'unread' | 'all' = 'all',
    idApp?: number,
    idEmpresa?: number,
  ): Promise<NotificationListItem[]> {
    const where: { idUsuarioDestino: number; estado?: NotificationUserEstado } = { idUsuarioDestino: idUsuario };
    if (status === 'unread') where.estado = 'UNREAD';

    const rows = await this.notifUserRepo.find({
      where,
      relations: ['notificacion'],
      order: { fechaEntregada: 'DESC' },
      take: 50,
    });

    let filtered = rows.filter((nu) => nu.estado !== 'DELETED');
    if (idApp != null || idEmpresa != null) {
      filtered = filtered.filter((nu) => {
        const n = nu.notificacion;
        if (!n) return false;
        if (idApp != null && n.idApp != null && n.idApp !== idApp) return false;
        if (idEmpresa != null && n.idEmpresa != null && n.idEmpresa !== idEmpresa) return false;
        return true;
      });
    }

    return filtered.map((nu) => ({
      id: nu.id,
      idNotificacion: nu.idNotificacion,
      tipo: nu.notificacion?.tipo ?? '',
      titulo: nu.notificacion?.titulo ?? '',
      mensaje: nu.notificacion?.mensaje ?? null,
      payload: nu.notificacion?.payload ?? null,
      estado: nu.estado,
      fechaEntregada: nu.fechaEntregada,
      fechaLeida: nu.fechaLeida,
      fechaCreacion: nu.notificacion?.fechaCreacion ?? nu.fechaEntregada,
    }));
  }

  async getUnreadCount(
    idUsuario: number,
    idApp?: number,
    idEmpresa?: number,
  ): Promise<number> {
    const qb = this.notifUserRepo
      .createQueryBuilder('nu')
      .innerJoin('nu.notificacion', 'n')
      .where('nu.id_usuario_destino = :idUsuario', { idUsuario })
      .andWhere('nu.estado_notificacion_usuario = :unread', { unread: 'UNREAD' });

    if (idApp != null) {
      qb.andWhere('(n.id_app IS NULL OR n.id_app = :idApp)', { idApp });
    }
    if (idEmpresa != null) {
      qb.andWhere('(n.id_empresa IS NULL OR n.id_empresa = :idEmpresa)', { idEmpresa });
    }

    return qb.getCount();
  }

  async markAsRead(idNotifUsuario: number, idUsuario: number): Promise<void> {
    const nu = await this.notifUserRepo.findOne({
      where: { id: idNotifUsuario, idUsuarioDestino: idUsuario },
    });
    if (!nu) throw new NotFoundException('Notificación no encontrada');
    nu.estado = 'READ';
    nu.fechaLeida = new Date();
    await this.notifUserRepo.save(nu);
    this.gateway.emitCountUpdate(idUsuario);
  }

  async markAsDeleted(idNotifUsuario: number, idUsuario: number): Promise<void> {
    const nu = await this.notifUserRepo.findOne({
      where: { id: idNotifUsuario, idUsuarioDestino: idUsuario },
    });
    if (!nu) throw new NotFoundException('Notificación no encontrada');
    nu.estado = 'DELETED';
    nu.fechaEliminada = new Date();
    await this.notifUserRepo.save(nu);
    this.gateway.emitCountUpdate(idUsuario);
    this.gateway.emitNotificationUpdate(idUsuario);
  }

  async markAllAsRead(idUsuario: number, _idApp?: number, _idEmpresa?: number): Promise<void> {
    await this.notifUserRepo.update(
      { idUsuarioDestino: idUsuario, estado: 'UNREAD' as NotificationUserEstado },
      { estado: 'READ' as NotificationUserEstado, fechaLeida: new Date() },
    );
    this.gateway.emitCountUpdate(idUsuario);
    this.gateway.emitNotificationUpdate(idUsuario);
  }

  async dispatch(dto: DispatchNotificationDto, creadoPor: number): Promise<{ idNotificacion: number; recipientsCount: number }> {
    let userIds: number[] = [];
    const idApp = dto.idApp ?? null;
    const idEmpresa = dto.idEmpresa ?? null;

    if (dto.scope === 'USER' && dto.idUsuarios?.length) {
      userIds = [...new Set(dto.idUsuarios)];
    } else if (dto.scope === 'ROLE' && dto.idRol) {
      const rows = await this.userRoleRepo.find({
        where: {
          idRol: dto.idRol,
          estado: 1,
          ...(idEmpresa != null ? { idEmpresa } : {}),
          ...(idApp != null ? { idApp } : {}),
        },
      });
      userIds = [...new Set(rows.map((r) => r.idUsuario))];
    }

    if (userIds.length === 0 && dto.scope !== 'GLOBAL') {
      return { idNotificacion: 0, recipientsCount: 0 };
    }

    const notif = this.notifRepo.create({
      tipo: dto.tipo,
      titulo: dto.titulo,
      mensaje: dto.mensaje ?? null,
      payload: dto.payload ?? null,
      scope: dto.scope ?? 'ROLE',
      idApp,
      idEmpresa,
      creadoPor,
      estado: 1,
    });
    await this.notifRepo.save(notif);

    const recipients = userIds.map((id) =>
      this.notifUserRepo.create({
        idNotificacion: notif.id,
        idUsuarioDestino: id,
        estado: 'UNREAD' as NotificationUserEstado,
      }),
    );
    await this.notifUserRepo.save(recipients);

    for (const userId of userIds) {
      this.gateway.emitNewNotification(userId, notif.id);
      this.gateway.emitCountUpdate(userId);
    }

    return { idNotificacion: notif.id, recipientsCount: userIds.length };
  }
}
