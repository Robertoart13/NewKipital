import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { UserCompany } from '../access-control/entities/user-company.entity';
import { EmployeeAguinaldoProvision } from '../employees/entities/employee-aguinaldo-provision.entity';
import { EmployeeVacationService } from '../employees/services/employee-vacation.service';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import { DomainEventsService } from '../integration/domain-events.service';
import { PersonalAction } from '../personal-actions/entities/personal-action.entity';
import { PersonalActionAutoInvalidationService } from '../personal-actions/personal-action-auto-invalidation.service';

import { PayrollCalendar, EstadoCalendarioNomina } from './entities/payroll-calendar.entity';
import { PayrollReactivationItem } from './entities/payroll-reactivation-item.entity';
import { PayrollEmployeeSnapshot } from './entities/payroll-employee-snapshot.entity';
import { PayrollInputSnapshot } from './entities/payroll-input-snapshot.entity';
import { PayrollPlanillaSnapshotJson } from './entities/payroll-planilla-snapshot.entity';
import { PayrollResult } from './entities/payroll-result.entity';
import { PayrollSocialCharge } from './entities/payroll-social-charge.entity';
import { PayrollService } from './payroll.service';

import type { TestingModule } from '@nestjs/testing';
import type { Repository } from 'typeorm';

describe('PayrollService', () => {
  let service: PayrollService;
  let repo: jest.Mocked<Repository<PayrollCalendar>>;
  let userCompanyRepo: jest.Mocked<Repository<UserCompany>>;
  let snapshotRepo: jest.Mocked<Repository<PayrollEmployeeSnapshot>>;
  let inputSnapshotRepo: jest.Mocked<Repository<PayrollInputSnapshot>>;
  let resultRepo: jest.Mocked<Repository<PayrollResult>>;
  let personalActionRepo: jest.Mocked<Repository<PersonalAction>>;
  let reactivationRepo: jest.Mocked<Repository<PayrollReactivationItem>>;
  let auditOutbox: { publish: jest.Mock };
  let vacationService: { applyVacationUsageFromPayroll: jest.Mock };

  beforeEach(async () => {
    const repoMock = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
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

    const personalActionRepoMock = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
      find: jest.fn(),
    };

    const reactivationRepoMock = {
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
      find: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      create: jest.fn((d) => d),
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
          provide: getRepositoryToken(PayrollPlanillaSnapshotJson),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PayrollSocialCharge),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EmployeeAguinaldoProvision),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PersonalAction),
          useValue: personalActionRepoMock,
        },
        {
          provide: getRepositoryToken(PayrollReactivationItem),
          useValue: reactivationRepoMock,
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
            transaction: jest.fn(async (cb: (manager: any) => Promise<any>) => {
              const manager = {
                getRepository: jest.fn((entity: unknown) => {
                  if (entity === PayrollCalendar) return repoMock;
                  if (entity === PersonalAction) return personalActionRepoMock;
                  if (entity === PayrollReactivationItem) return reactivationRepoMock;
                  return {
                    find: jest.fn().mockResolvedValue([]),
                    save: jest.fn().mockResolvedValue([]),
                    create: jest.fn((d) => d),
                    createQueryBuilder: jest.fn(() => ({
                      update: jest.fn().mockReturnThis(),
                      set: jest.fn().mockReturnThis(),
                      where: jest.fn().mockReturnThis(),
                      andWhere: jest.fn().mockReturnThis(),
                      execute: jest.fn().mockResolvedValue({ affected: 1 }),
                    })),
                  };
                }),
                createQueryBuilder: jest.fn(() => ({
                  update: jest.fn().mockReturnThis(),
                  set: jest.fn().mockReturnThis(),
                  where: jest.fn().mockReturnThis(),
                  andWhere: jest.fn().mockReturnThis(),
                  execute: jest.fn().mockResolvedValue({ affected: 1 }),
                })),
                find: jest.fn().mockResolvedValue([]),
                save: jest.fn().mockResolvedValue([]),
                create: jest.fn((entity) => entity),
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
    reactivationRepo = module.get(getRepositoryToken(PayrollReactivationItem));
    reactivationRepo.find.mockResolvedValue([]);
    personalActionRepo.find.mockResolvedValue([]);
    auditOutbox = module.get(AuditOutboxService);
    vacationService = module.get(EmployeeVacationService);

    snapshotRepo.count.mockResolvedValue(1);
    inputSnapshotRepo.count.mockResolvedValue(1);
    resultRepo.count.mockResolvedValue(1);
    repo.find.mockResolvedValue([] as any);
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

    await expect(service.update(22, { nombrePlanilla: 'Nuevo nombre' } as any, 1)).rejects.toThrow(
      BadRequestException,
    );
  });
  it('inactivate detaches linked non-final actions and snapshots them for reactivation', async () => {
    repo.findOne.mockResolvedValue({
      id: 31,
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.ABIERTA,
      esInactivo: 1,
      isActiveSlot: 1,
      versionLock: 0,
      nombrePlanilla: 'Planilla QA',
    } as any);
    repo.save.mockImplementation(async (entity: any) => entity);

    userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
    personalActionRepo.find.mockResolvedValue([
      { id: 1001, estado: 4, idCalendarioNomina: 31 } as any,
      { id: 1002, estado: 3, idCalendarioNomina: 31 } as any,
    ]);
    reactivationRepo.create.mockImplementation((entity: any) => entity);
    reactivationRepo.save.mockResolvedValue([] as any);

    const updateQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    personalActionRepo.createQueryBuilder.mockReturnValue(updateQb as any);

    const result = await service.inactivate(31, 1);

    expect(result.estado).toBe(EstadoCalendarioNomina.INACTIVA);
    expect(result.esInactivo).toBe(0);
    expect(reactivationRepo.save).toHaveBeenCalled();
    expect(updateQb.where).toHaveBeenCalledWith('id_calendario_nomina = :payrollId', {
      payrollId: 31,
    });
    expect(auditOutbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'inactivate',
        metadata: expect.objectContaining({ accionesDesasociadas: 2 }),
      }),
    );
  });

  it('reactivate performs partial reassociation and keeps non-eligible actions pending RRHH', async () => {
    repo.findOne.mockResolvedValue({
      id: 45,
      idEmpresa: 1,
      idPeriodoPago: 1,
      idTipoPlanilla: 1,
      tipoPlanilla: 'Regular',
      estado: EstadoCalendarioNomina.INACTIVA,
      esInactivo: 0,
      isActiveSlot: 0,
      versionLock: 1,
      slotKey: '1|2026-03-01|2026-03-15|1|CRC',
      moneda: 'CRC',
      fechaInicioPeriodo: new Date('2026-03-01T00:00:00'),
      fechaFinPeriodo: new Date('2026-03-15T00:00:00'),
      fechaCorte: null,
      fechaInicioPago: new Date('2026-03-16T00:00:00'),
      fechaFinPago: new Date('2026-03-18T00:00:00'),
      fechaPagoProgramada: null,
      nombrePlanilla: 'Planilla Reac',
    } as any);
    repo.save.mockImplementation(async (entity: any) => entity);

    const conflictQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(conflictQb);

    userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
    repo.find.mockResolvedValue([
      {
        id: 45,
        idPeriodoPago: 1,
        idTipoPlanilla: 1,
        tipoPlanilla: 'Regular',
        moneda: 'CRC',
        fechaInicioPeriodo: new Date('2026-03-01T00:00:00'),
        fechaFinPeriodo: new Date('2026-03-15T00:00:00'),
        fechaCorte: null,
        fechaInicioPago: new Date('2026-03-16T00:00:00'),
        fechaFinPago: new Date('2026-03-18T00:00:00'),
        fechaPagoProgramada: null,
      } as any,
    ]);

    reactivationRepo.find.mockResolvedValue([
      { id: 1, idCalendarioNomina: 45, idAccion: 2001, esProcesadoReactivacion: 0 } as any,
      { id: 2, idCalendarioNomina: 45, idAccion: 2002, esProcesadoReactivacion: 0 } as any,
    ]);
    reactivationRepo.save.mockResolvedValue([] as any);

    personalActionRepo.find.mockResolvedValue([
      {
        id: 2001,
        idEmpresa: 1,
        idCalendarioNomina: null,
        moneda: 'CRC',
        estado: 3,
        fechaEfecto: new Date('2026-03-10T00:00:00'),
      } as any,
      {
        id: 2002,
        idEmpresa: 1,
        idCalendarioNomina: null,
        moneda: 'USD',
        estado: 3,
        fechaEfecto: new Date('2026-03-10T00:00:00'),
      } as any,
    ]);

    const updateQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    personalActionRepo.createQueryBuilder.mockReturnValue(updateQb as any);

    const result = await service.reactivate(45, 1);

    expect(result.estado).toBe(EstadoCalendarioNomina.ABIERTA);
    expect(result.esInactivo).toBe(1);
    expect(updateQb.where).toHaveBeenCalledWith('id_accion IN (:...ids)', { ids: [2001] });
    expect(auditOutbox.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'reactivate',
        metadata: expect.objectContaining({
          accionesReasociadas: 1,
          accionesPendientesRrhh: 1,
        }),
      }),
    );
  });
  it('reassignOrphanActionsForPayroll skips snapshots when period range does not match', async () => {
    repo.findOne.mockResolvedValue({
      id: 77,
      idEmpresa: 1,
      estado: EstadoCalendarioNomina.ABIERTA,
      esInactivo: 1,
      idPeriodoPago: 1,
      idTipoPlanilla: 1,
      tipoPlanilla: 'Regular',
      moneda: 'CRC',
      fechaInicioPeriodo: new Date('2026-03-01T00:00:00'),
      fechaFinPeriodo: new Date('2026-03-15T00:00:00'),
      fechaCorte: null,
      fechaInicioPago: new Date('2026-03-16T00:00:00'),
      fechaFinPago: new Date('2026-03-18T00:00:00'),
      fechaPagoProgramada: null,
    } as any);
    userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
    reactivationRepo.find.mockResolvedValue([
      { id: 501, idCalendarioNomina: 10, idAccion: 9001, esProcesadoReactivacion: 0 } as any,
    ]);
    repo.find.mockResolvedValue([
      {
        id: 10,
        idPeriodoPago: 1,
        idTipoPlanilla: 1,
        tipoPlanilla: 'Regular',
        moneda: 'CRC',
        fechaInicioPeriodo: new Date('2026-03-01T00:00:00'),
        fechaFinPeriodo: new Date('2026-03-16T00:00:00'),
        fechaCorte: null,
        fechaInicioPago: new Date('2026-03-16T00:00:00'),
        fechaFinPago: new Date('2026-03-19T00:00:00'),
        fechaPagoProgramada: null,
      } as any,
    ]);
    personalActionRepo.find.mockResolvedValue([
      {
        id: 9001,
        idEmpresa: 1,
        idCalendarioNomina: null,
        moneda: 'CRC',
        estado: 3,
        fechaEfecto: new Date('2026-03-10T00:00:00'),
      } as any,
    ]);

    const reassociated = await service.reassignOrphanActionsForPayroll(77, 1, 'manual');

    expect(reassociated).toBe(0);
  });
});




