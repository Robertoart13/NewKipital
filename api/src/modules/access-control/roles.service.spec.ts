import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { App } from './entities/app.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { UserRoleGlobal } from './entities/user-role-global.entity';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import { AuthzVersionService } from '../authz/authz-version.service';
import { AuthzRealtimeService } from '../authz/authz-realtime.service';

describe('RolesService', () => {
  let service: RolesService;
  let roleRepo: jest.Mocked<Repository<Role>>;
  let appRepo: jest.Mocked<Repository<App>>;
  let permissionRepo: jest.Mocked<Repository<Permission>>;
  let rpRepo: jest.Mocked<Repository<RolePermission>>;
  let userRoleRepo: jest.Mocked<Repository<UserRole>>;
  let userRoleGlobalRepo: jest.Mocked<Repository<UserRoleGlobal>>;
  let authzVersionService: { bumpUsers: jest.Mock };
  let authzRealtimeService: { notifyUsers: jest.Mock };

  beforeEach(async () => {
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const roleRepoMock = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => qb),
      find: jest.fn(),
    };
    const appRepoMock = { findOne: jest.fn() };
    const permissionRepoMock = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
      find: jest.fn(),
    };
    const rpRepoMock = {
      findOne: jest.fn(),
      create: jest.fn((d) => d),
      save: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    };
    const userRoleRepoMock = { find: jest.fn().mockResolvedValue([]) };
    const userRoleGlobalRepoMock = { find: jest.fn().mockResolvedValue([]) };
    authzVersionService = { bumpUsers: jest.fn() };
    authzRealtimeService = { notifyUsers: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Role), useValue: roleRepoMock },
        { provide: getRepositoryToken(App), useValue: appRepoMock },
        {
          provide: getRepositoryToken(Permission),
          useValue: permissionRepoMock,
        },
        { provide: getRepositoryToken(RolePermission), useValue: rpRepoMock },
        { provide: getRepositoryToken(UserRole), useValue: userRoleRepoMock },
        { provide: getRepositoryToken(UserRoleGlobal), useValue: userRoleGlobalRepoMock },
        { provide: AuditOutboxService, useValue: { publish: jest.fn() } },
        { provide: AuthzVersionService, useValue: authzVersionService },
        { provide: AuthzRealtimeService, useValue: authzRealtimeService },
      ],
    }).compile();

    service = module.get(RolesService);
    roleRepo = module.get(getRepositoryToken(Role));
    appRepo = module.get(getRepositoryToken(App));
    permissionRepo = module.get(getRepositoryToken(Permission));
    rpRepo = module.get(getRepositoryToken(RolePermission));
    userRoleRepo = module.get(getRepositoryToken(UserRole));
    userRoleGlobalRepo = module.get(getRepositoryToken(UserRoleGlobal));
  });

  it('creates role when app exists and codigo unique', async () => {
    roleRepo.findOne.mockResolvedValue(null);
    appRepo.findOne.mockResolvedValue({
      id: 1,
      codigo: 'kpital',
      estado: 1,
    } as any);
    roleRepo.save.mockResolvedValue({
      id: 1,
      codigo: 'R1',
      nombre: 'Role1',
    } as any);

    const result = await service.create(
      { codigo: 'R1', nombre: 'Role1', appCode: 'kpital' },
      5,
    );

    expect(result.id).toBe(1);
  });

  it('rejects duplicate role codigo', async () => {
    roleRepo.findOne.mockResolvedValue({ id: 9, codigo: 'R1' } as any);

    await expect(
      service.create({ codigo: 'R1', nombre: 'Role1', appCode: 'kpital' }, 5),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects missing app', async () => {
    roleRepo.findOne.mockResolvedValue(null);
    appRepo.findOne.mockResolvedValue(null);

    await expect(
      service.create({ codigo: 'R1', nombre: 'Role1', appCode: 'kpital' }, 5),
    ).rejects.toThrow(BadRequestException);
  });

  it('assignPermission rejects missing permission', async () => {
    roleRepo.findOne.mockResolvedValue({ id: 1 } as any);
    permissionRepo.findOne.mockResolvedValue(null);

    await expect(
      service.assignPermission({ idRol: 1, idPermiso: 99 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('removePermission rejects missing relation', async () => {
    rpRepo.findOne.mockResolvedValue(null);
    await expect(service.removePermission(1, 10)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('replacePermissionsByCodes invalidates and notifies only affected users', async () => {
    roleRepo.findOne.mockResolvedValue({ id: 7, nombre: 'Role', codigo: 'ROLE' } as any);
    permissionRepo.find.mockResolvedValue([{ id: 2, codigo: 'employee:view', estado: 1 } as any]);
    rpRepo.find.mockResolvedValue([] as any);
    rpRepo.save.mockResolvedValue([] as any);
    userRoleRepo.find.mockResolvedValue([{ idUsuario: 10 } as any, { idUsuario: 11 } as any]);
    userRoleGlobalRepo.find.mockResolvedValue([{ idUsuario: 11 } as any, { idUsuario: 12 } as any]);

    await service.replacePermissionsByCodes(7, ['employee:view'], 99);

    expect(authzVersionService.bumpUsers).toHaveBeenCalledWith([10, 11, 12]);
    expect(authzRealtimeService.notifyUsers).toHaveBeenCalledWith(
      [10, 11, 12],
      expect.objectContaining({ type: 'permissions.changed', roleId: 7 }),
    );
  });
});
