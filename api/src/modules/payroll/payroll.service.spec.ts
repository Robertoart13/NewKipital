import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PayrollService } from './payroll.service';
import { PayrollCalendar, EstadoCalendarioNomina } from './entities/payroll-calendar.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { DomainEventsService } from '../integration/domain-events.service';

describe('PayrollService', () => {
  let service: PayrollService;
  let repo: jest.Mocked<Repository<PayrollCalendar>>;
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
        getOne: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: getRepositoryToken(PayrollCalendar), useValue: repoMock },
        { provide: getRepositoryToken(UserCompany), useValue: { findOne: jest.fn(), find: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: DomainEventsService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = module.get(PayrollService);
    repo = module.get(getRepositoryToken(PayrollCalendar));
    userCompanyRepo = module.get(getRepositoryToken(UserCompany));
  });

  it('create rejects when user has no company access', async () => {
    userCompanyRepo.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          idEmpresa: 1,
          idPeriodoPago: 1,
          periodoInicio: '2026-01-01',
          periodoFin: '2026-01-15',
          fechaInicioPago: '2026-01-16',
          fechaFinPago: '2026-01-20',
        } as any,
        99,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('create rejects when operational payroll already exists', async () => {
    userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
    (repo.createQueryBuilder as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 8 }),
    });

    await expect(
      service.create(
        {
          idEmpresa: 1,
          idPeriodoPago: 1,
          periodoInicio: '2026-01-01',
          periodoFin: '2026-01-15',
          fechaInicioPago: '2026-01-16',
          fechaFinPago: '2026-01-20',
        } as any,
        1,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('verify rejects non-operational state', async () => {
    repo.findOne.mockResolvedValue({ id: 1, idEmpresa: 1, estado: EstadoCalendarioNomina.APLICADA } as any);
    userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);

    await expect(service.verify(1, 1)).rejects.toThrow(BadRequestException);
  });

  it('apply rejects when not verified', async () => {
    repo.findOne.mockResolvedValue({ id: 1, idEmpresa: 1, estado: EstadoCalendarioNomina.ABIERTA } as any);
    userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);

    await expect(service.apply(1, 1)).rejects.toThrow(BadRequestException);
  });
});
