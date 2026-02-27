import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationUser } from './entities/notification-user.entity';
import { UserRole } from '../access-control/entities/user-role.entity';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notifRepo: jest.Mocked<Repository<Notification>>;
  let notifUserRepo: jest.Mocked<Repository<NotificationUser>>;
  let userRoleRepo: jest.Mocked<Repository<UserRole>>;
  let gateway: {
    emitCountUpdate: jest.Mock;
    emitNotificationUpdate: jest.Mock;
    emitNewNotification: jest.Mock;
  };

  beforeEach(async () => {
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(3),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            create: jest.fn((x) => x),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(NotificationUser),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            create: jest.fn((x) => x),
            createQueryBuilder: jest.fn(() => queryBuilder),
          },
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: { find: jest.fn() },
        },
        {
          provide: NotificationsGateway,
          useValue: {
            emitCountUpdate: jest.fn(),
            emitNotificationUpdate: jest.fn(),
            emitNewNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(NotificationsService);
    notifRepo = module.get(getRepositoryToken(Notification));
    notifUserRepo = module.get(getRepositoryToken(NotificationUser));
    userRoleRepo = module.get(getRepositoryToken(UserRole));
    gateway = module.get(NotificationsGateway);
  });

  it('listForUser should filter deleted and map notification data', async () => {
    notifUserRepo.find.mockResolvedValue([
      {
        id: 1,
        idNotificacion: 10,
        idUsuarioDestino: 5,
        estado: 'UNREAD',
        fechaEntregada: new Date('2026-02-24T10:00:00Z'),
        fechaLeida: null,
        notificacion: {
          id: 10,
          tipo: 'INFO',
          titulo: 'Titulo',
          mensaje: 'Mensaje',
          payload: { x: 1 },
          idApp: 2,
          idEmpresa: 3,
          fechaCreacion: new Date('2026-02-24T09:00:00Z'),
        },
      },
      {
        id: 2,
        idNotificacion: 11,
        idUsuarioDestino: 5,
        estado: 'DELETED',
        fechaEntregada: new Date('2026-02-24T08:00:00Z'),
        fechaLeida: null,
        notificacion: { id: 11, tipo: 'WARN', titulo: 'Oculta' },
      },
    ] as any);

    const rows = await service.listForUser(5, 'all', 2, 3);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(1);
    expect(rows[0].tipo).toBe('INFO');
    expect(rows[0].payload).toEqual({ x: 1 });
  });

  it('getUnreadCount should apply app and company filters', async () => {
    const qb = notifUserRepo.createQueryBuilder();
    await service.getUnreadCount(7, 4, 9);

    expect(qb.andWhere).toHaveBeenCalledWith('(n.id_app IS NULL OR n.id_app = :idApp)', { idApp: 4 });
    expect(qb.andWhere).toHaveBeenCalledWith('(n.id_empresa IS NULL OR n.id_empresa = :idEmpresa)', { idEmpresa: 9 });
    expect(qb.getCount).toHaveBeenCalled();
  });

  it('markAsRead should throw when notification user is missing', async () => {
    notifUserRepo.findOne.mockResolvedValue(null);

    await expect(service.markAsRead(99, 1)).rejects.toThrow(NotFoundException);
  });

  it('markAsDeleted should persist and emit gateway updates', async () => {
    const entity = { id: 2, idUsuarioDestino: 8, estado: 'UNREAD' } as any;
    notifUserRepo.findOne.mockResolvedValue(entity);
    notifUserRepo.save.mockResolvedValue(entity);

    await service.markAsDeleted(2, 8);

    expect(entity.estado).toBe('DELETED');
    expect(entity.fechaEliminada).toEqual(expect.any(Date));
    expect(gateway.emitCountUpdate).toHaveBeenCalledWith(8);
    expect(gateway.emitNotificationUpdate).toHaveBeenCalledWith(8);
  });

  it('dispatch USER should deduplicate recipients and emit events', async () => {
    notifRepo.save.mockImplementation(async (n: any) => {
      n.id = 44;
      return n;
    });
    notifUserRepo.save.mockResolvedValue([] as any);

    const result = await service.dispatch(
      {
        scope: 'USER',
        tipo: 'INFO',
        titulo: 'Hola',
        idUsuarios: [1, 1, 2],
        idUsuariosAdicionales: [2, 3],
      } as any,
      77,
    );

    expect(result).toEqual({ idNotificacion: 44, recipientsCount: 3 });
    expect(notifUserRepo.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ idUsuarioDestino: 1 }),
        expect.objectContaining({ idUsuarioDestino: 2 }),
        expect.objectContaining({ idUsuarioDestino: 3 }),
      ]),
    );
    expect(gateway.emitNewNotification).toHaveBeenCalledTimes(3);
    expect(gateway.emitCountUpdate).toHaveBeenCalledTimes(3);
  });

  it('dispatch ROLE should return zero when there are no recipients', async () => {
    userRoleRepo.find.mockResolvedValue([]);

    const result = await service.dispatch(
      { scope: 'ROLE', idRol: 9, tipo: 'ALERT', titulo: 'Sin destino' } as any,
      1,
    );

    expect(result).toEqual({ idNotificacion: 0, recipientsCount: 0 });
    expect(notifRepo.save).not.toHaveBeenCalled();
  });

  it('markAllAsRead should update unread rows and notify gateway', async () => {
    notifUserRepo.update.mockResolvedValue({ affected: 2 } as any);

    await service.markAllAsRead(11);

    expect(notifUserRepo.update).toHaveBeenCalled();
    expect(gateway.emitCountUpdate).toHaveBeenCalledWith(11);
    expect(gateway.emitNotificationUpdate).toHaveBeenCalledWith(11);
  });
});
