import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PersonalActionsService } from './personal-actions.service';
import {
  PersonalAction,
  PersonalActionEstado,
} from './entities/personal-action.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { PayrollCalendar } from '../payroll/entities/payroll-calendar.entity';

describe('PersonalActionsService', () => {
  let service: PersonalActionsService;
  let repo: jest.Mocked<Repository<PersonalAction>>;
  let userCompanyRepo: jest.Mocked<Repository<UserCompany>>;

  beforeEach(async () => {
    const repoMock = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((d) => d),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalActionsService,
        { provide: getRepositoryToken(PersonalAction), useValue: repoMock },
        {
          provide: getRepositoryToken(UserCompany),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(PayrollCalendar),
          useValue: { query: jest.fn() },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(PersonalActionsService);
    repo = module.get(getRepositoryToken(PersonalAction));
    userCompanyRepo = module.get(getRepositoryToken(UserCompany));
  });

  it('create rejects without company access', async () => {
    userCompanyRepo.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        { idEmpresa: 1, idEmpleado: 1, tipoAccion: 'BONO' } as any,
        9,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('findOne throws not found', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne(55)).rejects.toThrow(NotFoundException);
  });

  it('approve rejects if action is not pending', async () => {
    repo.findOne.mockResolvedValue({
      id: 1,
      idEmpresa: 1,
      estado: PersonalActionEstado.APROBADA,
    } as any);
    userCompanyRepo.findOne.mockResolvedValue({
      idUsuario: 1,
      idEmpresa: 1,
      estado: 1,
    } as any);

    await expect(service.approve(1, 1)).rejects.toThrow(BadRequestException);
  });

  it('reject rejects if action is not pending', async () => {
    repo.findOne.mockResolvedValue({
      id: 1,
      idEmpresa: 1,
      estado: PersonalActionEstado.APROBADA,
    } as any);
    userCompanyRepo.findOne.mockResolvedValue({
      idUsuario: 1,
      idEmpresa: 1,
      estado: 1,
    } as any);

    await expect(service.reject(1, 'motivo', 1)).rejects.toThrow(
      BadRequestException,
    );
  });
});
