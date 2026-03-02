import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
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
import {
  PersonalAction,
  PersonalActionEstado,
  PERSONAL_ACTION_APPROVED_STATES,
} from '../personal-actions/entities/personal-action.entity';
import { PersonalActionAutoInvalidationService } from '../personal-actions/personal-action-auto-invalidation.service';

describe('Payroll DoD Scenarios', () => {
  let service: PayrollService;
  let repo: jest.Mocked<Repository<PayrollCalendar>>;
  let userCompanyRepo: jest.Mocked<Repository<UserCompany>>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    const repoMock = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
    };

    dataSource = {
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
          useValue: { count: jest.fn().mockResolvedValue(1) },
        },
        {
          provide: getRepositoryToken(PayrollInputSnapshot),
          useValue: { count: jest.fn().mockResolvedValue(1) },
        },
        {
          provide: getRepositoryToken(PayrollResult),
          useValue: { count: jest.fn().mockResolvedValue(1) },
        },
        {
          provide: getRepositoryToken(PersonalAction),
          useValue: { count: jest.fn().mockResolvedValue(0) },
        },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: DomainEventsService, useValue: { record: jest.fn() } },
        { provide: AuditOutboxService, useValue: { publish: jest.fn() } },
        {
          provide: EmployeeVacationService,
          useValue: { applyVacationUsageFromPayroll: jest.fn().mockResolvedValue({}) },
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
    userCompanyRepo.findOne.mockResolvedValue({
      idUsuario: 1,
      idEmpresa: 1,
      estado: 1,
    } as any);
  });

  it('DoD 1 - Normal consume: apply dispara consumo de acciones ligadas', async () => {
    const verified = {
      id: 100,
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.VERIFICADA,
      versionLock: 0,
      requiresRecalculation: 0,
    } as PayrollCalendar;
    const applied = {
      ...verified,
      estado: EstadoCalendarioNomina.APLICADA,
      fechaAplicacion: new Date('2026-03-01T12:00:00.000Z'),
    } as PayrollCalendar;
    repo.findOne.mockResolvedValueOnce(verified).mockResolvedValueOnce(applied);

    const updateTargets: unknown[] = [];
    dataSource.transaction.mockImplementationOnce(async (cb: (manager: any) => Promise<any>) => {
      const manager = {
        createQueryBuilder: jest.fn(() => ({
          update: jest.fn((target: unknown) => {
            updateTargets.push(target);
            return manager.createQueryBuilder();
          }),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        })),
      };
      return cb(manager);
    });

    await service.apply(100, 1, 0);
    expect(updateTargets.length).toBeGreaterThanOrEqual(2);
  });

  it('DoD 2 - Retro consume: metadato retro se marca cuando inicio de efecto es anterior al periodo', () => {
    const retro = (service as any).resolveRetroMetadata(
      {
        fechaInicioEfecto: new Date('2026-01-01'),
        fechaEfecto: new Date('2026-01-01'),
      },
      { fechaInicioPeriodo: new Date('2026-02-01') },
    );
    expect(retro.isRetro).toBe(true);
    expect(retro.originalPeriod).toBe('2026-01');
  });

  it('DoD 3 - Cancel no consume: estados cancelados/rechazados no forman parte de estados consumibles', () => {
    expect(PERSONAL_ACTION_APPROVED_STATES).not.toContain(PersonalActionEstado.CANCELLED);
    expect(PERSONAL_ACTION_APPROVED_STATES).not.toContain(PersonalActionEstado.INVALIDATED);
    expect(PERSONAL_ACTION_APPROVED_STATES).not.toContain(PersonalActionEstado.REJECTED);
  });

  it('DoD 4 - Reopen no consume: reabrir no ejecuta consumo de acciones', async () => {
    repo.findOne.mockResolvedValue({
      id: 200,
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.VERIFICADA,
      versionLock: 3,
      descripcionEvento: null,
    } as any);
    repo.save.mockImplementation(async (value) => value as any);

    await service.reopen(200, 'QA reopen', 1);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('DoD 5 - Apply bloquea edicion y deja consumido', async () => {
    // Parte A: edicion bloqueada en aplicada
    repo.findOne.mockResolvedValue({
      id: 300,
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.APLICADA,
    } as any);
    await expect(
      service.update(300, { nombrePlanilla: 'No permitido' } as any, 1),
    ).rejects.toThrow(BadRequestException);

    // Parte B: apply ejecuta ruta de consumo ligada
    const verified = {
      id: 301,
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.VERIFICADA,
      versionLock: 0,
      requiresRecalculation: 0,
    } as PayrollCalendar;
    const applied = {
      ...verified,
      estado: EstadoCalendarioNomina.APLICADA,
      fechaAplicacion: new Date('2026-03-01T12:00:00.000Z'),
    } as PayrollCalendar;
    repo.findOne.mockResolvedValueOnce(verified).mockResolvedValueOnce(applied);

    await service.apply(301, 1, 0);
    expect(dataSource.transaction).toHaveBeenCalled();
  });
});
