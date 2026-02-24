import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AppsService } from './apps.service';
import { App } from './entities/app.entity';

describe('AppsService', () => {
  let service: AppsService;
  let repo: jest.Mocked<Repository<App>>;

  beforeEach(async () => {
    const repoMock = {
      findOne: jest.fn(),
      create: jest.fn((d) => d),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppsService,
        { provide: getRepositoryToken(App), useValue: repoMock },
      ],
    }).compile();

    service = module.get(AppsService);
    repo = module.get(getRepositoryToken(App));
  });

  it('creates app when codigo is unique', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.save.mockResolvedValue({ id: 1, codigo: 'kpital', nombre: 'KPITAL', estado: 1 } as any);

    const result = await service.create({ codigo: 'kpital', nombre: 'KPITAL' } as any);
    expect(result.id).toBe(1);
  });

  it('throws conflict on duplicate codigo', async () => {
    repo.findOne.mockResolvedValue({ id: 2, codigo: 'kpital' } as any);
    await expect(service.create({ codigo: 'kpital', nombre: 'KPITAL' } as any)).rejects.toThrow(
      ConflictException,
    );
  });

  it('throws not found on findOne missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne(77)).rejects.toThrow(NotFoundException);
  });
});
