import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassesService } from './classes.service';
import { OrgClass } from './entities/class.entity';

describe('ClassesService', () => {
  let service: ClassesService;
  let repo: jest.Mocked<Repository<OrgClass>>;

  const mockClass: OrgClass = {
    id: 1,
    nombre: 'Clase QA',
    descripcion: 'Descripcion QA',
    codigo: 'CL-QA',
    idExterno: 'EXT-QA',
    esInactivo: 0,
    fechaCreacion: new Date(),
    fechaModificacion: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        {
          provide: getRepositoryToken(OrgClass),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([mockClass]),
            })),
          },
        },
      ],
    }).compile();

    service = module.get(ClassesService);
    repo = module.get(getRepositoryToken(OrgClass));
  });

  it('creates class successfully', async () => {
    repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    repo.create.mockReturnValue(mockClass);
    repo.save.mockResolvedValue(mockClass);

    const result = await service.create({
      nombre: 'Clase QA',
      descripcion: 'Descripcion QA',
      codigo: 'CL-QA',
      idExterno: 'EXT-QA',
    });

    expect(result.id).toBe(1);
    expect(repo.save).toHaveBeenCalled();
  });

  it('rejects duplicated codigo', async () => {
    repo.findOne.mockResolvedValue(mockClass);

    await expect(
      service.create({
        nombre: 'Clase QA',
        codigo: 'CL-QA',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('updates class and checks uniqueness', async () => {
    repo.findOne
      .mockResolvedValueOnce(mockClass)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    repo.save.mockResolvedValue({ ...mockClass, nombre: 'Clase Editada' });

    const result = await service.update(1, {
      nombre: 'Clase Editada',
      codigo: 'CL-QA-NEW',
      idExterno: 'EXT-NEW',
    });

    expect(result.nombre).toBe('Clase Editada');
  });

  it('throws not found when class does not exist', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });
});

