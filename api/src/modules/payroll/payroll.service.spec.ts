import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PayrollService } from './payroll.service';
import {
  PayrollCalendar,
  EstadoCalendarioNomina,
} from './entities/payroll-calendar.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { DomainEventsService } from '../integration/domain-events.service';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import { EmployeeVacationService } from '../employees/services/employee-vacation.service';
import { PayrollEmployeeSnapshot } from './entities/payroll-employee-snapshot.entity';
import { PayrollInputSnapshot } from './entities/payroll-input-snapshot.entity';
import { PayrollResult } from './entities/payroll-result.entity';
import { PersonalAction } from '../personal-actions/entities/personal-action.entity';
import { PersonalActionAutoInvalidationService } from '../personal-actions/personal-action-auto-invalidation.service';

describe('PayrollService', () => {
  let service: PayrollService;
  let repo: jest.Mocked<Repository<PayrollCalendar>>;
  let userCompanyRepo: jest.Mocked<Repository<UserCompany>>;
  let snapshotRepo: jest.Mocked<Repository<PayrollEmployeeSnapshot>>;
  let inputSnapshotRepo: jest.Mocked<Repository<PayrollInputSnapshot>>;
  let resultRepo: jest.Mocked<Repository<PayrollResult>>;
  let personalActionRepo: jest.Mocked<Repository<PersonalAction>>;
  let vacationService: { applyVacationUsageFromPayroll: jest.Mock };

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
        {
          provide: getRepositoryToken(UserCompany),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(PayrollEmployeeSnapshot),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PayrollInputSnapshot),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PayrollResult),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PersonalAction),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              update: jest.fn().mockReturnThis(),
              set: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue({ affected: 1 }),
            })),
            find: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
            transaction: jest.fn(async (cb: (manager: any) => Promise<any>) => {
              const manager = {
                createQueryBuilder: jest.fn(() => ({
                  update: jest.fn().mockReturnThis(),
                  set: jest.fn().mockReturnThis(),
                  where: jest.fn().mockReturnThis(),
                  andWhere: jest.fn().mockReturnThis(),
                  execute: jest.fn().mockResolvedValue({ affected: 1 }),
                })),
              };
              return cb(manager);
            }),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: DomainEventsService, useValue: { record: jest.fn() } },
        { provide: AuditOutboxService, useValue: { publish: jest.fn() } },
        {
          provide: EmployeeVacationService,
          useValue: { applyVacationUsageFromPayroll: jest.fn() },
        },
        {
          provide: PersonalActionAutoInvalidationService,
          useValue: {
            run: jest.fn().mockResolvedValue({
              totalInvalidated: 0,
              byReason: {
                TERMINATION_EFFECTIVE: 0,
                COMPANY_MISMATCH: 0,
                CURRENCY_MISMATCH: 0,
                MANUAL_INVALIDATION: 0,
              },
              sampleActionIds: [],
            }),
          },
        },
      ],
    }).compile();

    service = module.get(PayrollService);
    repo = module.get(getRepositoryToken(PayrollCalendar));
    userCompanyRepo = module.get(getRepositoryToken(UserCompany));
    snapshotRepo = module.get(getRepositoryToken(PayrollEmployeeSnapshot));
    inputSnapshotRepo = module.get(getRepositoryToken(PayrollInputSnapshot));
    resultRepo = module.get(getRepositoryToken(PayrollResult));
    personalActionRepo = module.get(getRepositoryToken(PersonalAction));
    vacationService = module.get(EmployeeVacationService);

    snapshotRepo.count.mockResolvedValue(1);
    inputSnapshotRepo.count.mockResolvedValue(1);
    resultRepo.count.mockResolvedValue(1);
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
    userCompanyRepo.findOne.mockResolvedValue({
      idUsuario: 1,
      idEmpresa: 1,
      estado: 1,
    } as any);
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
    repo.findOne.mockResolvedValue({
      id: 1,
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.APLICADA,
    } as any);
    userCompanyRepo.findOne.mockResolvedValue({
      idUsuario: 1,
      idEmpresa: 1,
      estado: 1,
    } as any);

    await expect(service.verify(1, 1)).rejects.toThrow(BadRequestException);
  });

  it('apply rejects when not verified', async () => {
    repo.findOne.mockResolvedValue({
      id: 1,
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.ABIERTA,
    } as any);
    userCompanyRepo.findOne.mockResolvedValue({
      idUsuario: 1,
      idEmpresa: 1,
      estado: 1,
    } as any);

    await expect(service.apply(1, 1)).rejects.toThrow(BadRequestException);
  });

  it('apply rejects when payroll requires recalculation', async () => {
    repo.findOne.mockResolvedValue({
      id: 2,
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.VERIFICADA,
      versionLock: 0,
      requiresRecalculation: 1,
    } as any);
    userCompanyRepo.findOne.mockResolvedValue({
      idUsuario: 1,
      idEmpresa: 1,
      estado: 1,
    } as any);

    await expect(service.apply(2, 1)).rejects.toThrow(BadRequestException);
  });

  it('apply triggers vacation usage processing when payroll is applied', async () => {
    const verified = {
      id: 5,
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.VERIFICADA,
      versionLock: 0,
      fechaAplicacion: null,
    } as any;
    const applied = {
      ...verified,
      estado: EstadoCalendarioNomina.APLICADA,
      fechaAplicacion: new Date('2026-02-25T22:00:00.000Z'),
    };

    repo.findOne.mockResolvedValueOnce(verified).mockResolvedValueOnce(applied);
    userCompanyRepo.findOne.mockResolvedValue({
      idUsuario: 1,
      idEmpresa: 1,
      estado: 1,
    } as any);
    vacationService.applyVacationUsageFromPayroll.mockResolvedValue({
      processedActions: 1,
      deductedDays: 4,
      skippedActions: 0,
    });

    await service.apply(5, 1, 0);

    expect(vacationService.applyVacationUsageFromPayroll).toHaveBeenCalledWith(
      5,
      applied.fechaAplicacion,
      1,
    );
    expect(personalActionRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('process rejects when payroll is not abierta', async () => {
    repo.findOne.mockResolvedValue({
      id: 10,
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.VERIFICADA,
    } as any);
    userCompanyRepo.findOne.mockResolvedValue({
      idUsuario: 1,
      idEmpresa: 1,
      estado: 1,
    } as any);

    await expect(service.process(10, 1)).rejects.toThrow(BadRequestException);
  });

  it('update rejects when payroll is verified', async () => {
    repo.findOne.mockResolvedValue({
      id: 22,
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.VERIFICADA,
    } as any);
    userCompanyRepo.findOne.mockResolvedValue({
      idUsuario: 1,
      idEmpresa: 1,
      estado: 1,
    } as any);

    await expect(
      service.update(22, { nombrePlanilla: 'Nuevo nombre' } as any, 1),
    ).rejects.toThrow(BadRequestException);
  });

});
