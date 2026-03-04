import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuthzVersionService } from '../authz/authz-version.service';
import { AuditOutboxService } from '../integration/audit-outbox.service';

import { Permission } from './entities/permission.entity';
import { PermissionsService } from './permissions.service';

import type { TestingModule } from '@nestjs/testing';
import type { Repository } from 'typeorm';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let repo: jest.Mocked<Repository<Permission>>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    const mockConfig = { get: jest.fn().mockReturnValue('ui') };
    const mockAudit = { publish: jest.fn() };
    const mockAuthz = { bumpGlobal: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: getRepositoryToken(Permission), useValue: mockRepo },
        { provide: AuditOutboxService, useValue: mockAudit },
        { provide: AuthzVersionService, useValue: mockAuthz },
      ],
    }).compile();

    service = module.get(PermissionsService);
    repo = module.get(getRepositoryToken(Permission));
    configService = module.get(ConfigService);
  });

  it('creates permission in ui mode', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.save.mockResolvedValue({
      id: 1,
      codigo: 'employee:view',
      modulo: 'employee',
    } as any);

    const result = await service.create(
      { codigo: 'employee:view', nombre: 'Ver', modulo: 'employee' },
      10,
    );

    expect(result.id).toBe(1);
    expect(repo.create).toHaveBeenCalled();
  });

  it('rejects create in migration mode', async () => {
    configService.get.mockReturnValue('migration');

    await expect(
      service.create({ codigo: 'employee:view', nombre: 'Ver', modulo: 'employee' }, 10),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects duplicate codigo', async () => {
    repo.findOne.mockResolvedValue({ id: 2, codigo: 'employee:view' } as any);

    await expect(
      service.create({ codigo: 'employee:view', nombre: 'Ver', modulo: 'employee' }, 10),
    ).rejects.toThrow(ConflictException);
  });

  it('findOne throws when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });
});
