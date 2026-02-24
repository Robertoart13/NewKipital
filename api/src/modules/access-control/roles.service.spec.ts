import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { App } from './entities/app.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { AuditOutboxService } from '../integration/audit-outbox.service';

describe('RolesService', () => {
  let service: RolesService;
  let roleRepo: jest.Mocked<Repository<Role>>;
  let appRepo: jest.Mocked<Repository<App>>;
  let permissionRepo: jest.Mocked<Repository<Permission>>;
  let rpRepo: jest.Mocked<Repository<RolePermission>>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Role), useValue: roleRepoMock },
        { provide: getRepositoryToken(App), useValue: appRepoMock },
        { provide: getRepositoryToken(Permission), useValue: permissionRepoMock },
        { provide: getRepositoryToken(RolePermission), useValue: rpRepoMock },
        { provide: AuditOutboxService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get(RolesService);
    roleRepo = module.get(getRepositoryToken(Role));
    appRepo = module.get(getRepositoryToken(App));
    permissionRepo = module.get(getRepositoryToken(Permission));
    rpRepo = module.get(getRepositoryToken(RolePermission));
  });

  it('creates role when app exists and codigo unique', async () => {
    roleRepo.findOne.mockResolvedValue(null);
    appRepo.findOne.mockResolvedValue({ id: 1, codigo: 'kpital', estado: 1 } as any);
    roleRepo.save.mockResolvedValue({ id: 1, codigo: 'R1', nombre: 'Role1' } as any);

    const result = await service.create({ codigo: 'R1', nombre: 'Role1', appCode: 'kpital' }, 5);

    expect(result.id).toBe(1);
  });

  it('rejects duplicate role codigo', async () => {
    roleRepo.findOne.mockResolvedValue({ id: 9, codigo: 'R1' } as any);

    await expect(service.create({ codigo: 'R1', nombre: 'Role1', appCode: 'kpital' }, 5)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects missing app', async () => {
    roleRepo.findOne.mockResolvedValue(null);
    appRepo.findOne.mockResolvedValue(null);

    await expect(service.create({ codigo: 'R1', nombre: 'Role1', appCode: 'kpital' }, 5)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('assignPermission rejects missing permission', async () => {
    roleRepo.findOne.mockResolvedValue({ id: 1 } as any);
    permissionRepo.findOne.mockResolvedValue(null);

    await expect(service.assignPermission({ idRol: 1, idPermiso: 99 })).rejects.toThrow(NotFoundException);
  });

  it('removePermission rejects missing relation', async () => {
    rpRepo.findOne.mockResolvedValue(null);
    await expect(service.removePermission(1, 10)).rejects.toThrow(NotFoundException);
  });
});
