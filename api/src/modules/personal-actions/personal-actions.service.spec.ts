import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PersonalActionsService } from './personal-actions.service';
import {
  PersonalAction,
  PersonalActionEstado,
} from './entities/personal-action.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { PayrollCalendar } from '../payroll/entities/payroll-calendar.entity';
import { ActionQuota } from './entities/action-quota.entity';
import { AbsenceLine } from './entities/absence-line.entity';
import { DisabilityLine } from './entities/disability-line.entity';
import { LicenseLine } from './entities/license-line.entity';
import { BonusLine } from './entities/bonus-line.entity';
import { OvertimeLine } from './entities/overtime-line.entity';
import { RetentionLine } from './entities/retention-line.entity';
import { DiscountLine } from './entities/discount-line.entity';
import { EmployeesService } from '../employees/employees.service';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import { EmployeeSensitiveDataService } from '../../common/services/employee-sensitive-data.service';
import {
  PERSONAL_ACTION_INVALIDATED_BY,
  PERSONAL_ACTION_INVALIDATION_REASON,
} from './constants/personal-action-invalidation.constants';

describe('PersonalActionsService', () => {
  let service: PersonalActionsService;
  let repo: jest.Mocked<Repository<PersonalAction>>;
  let userCompanyRepo: jest.Mocked<Repository<UserCompany>>;
  let actionQuotaRepo: jest.Mocked<Repository<ActionQuota>>;
  let absenceLineRepo: jest.Mocked<Repository<AbsenceLine>>;
  let disabilityLineRepo: jest.Mocked<Repository<DisabilityLine>>;
  let licenseLineRepo: jest.Mocked<Repository<LicenseLine>>;
  let bonusLineRepo: jest.Mocked<Repository<BonusLine>>;
  let overtimeLineRepo: jest.Mocked<Repository<OvertimeLine>>;
  let retentionLineRepo: jest.Mocked<Repository<RetentionLine>>;
  let discountLineRepo: jest.Mocked<Repository<DiscountLine>>;
  let payrollRepo: jest.Mocked<Repository<PayrollCalendar>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let auditOutbox: jest.Mocked<AuditOutboxService>;
  let dataSource: { transaction: jest.Mock };

  const baseAction: Partial<PersonalAction> = {
    id: 10,
    idEmpresa: 1,
    idEmpleado: 99,
    tipoAccion: 'ausencia',
    estado: PersonalActionEstado.DRAFT,
    versionLock: 1,
    moneda: 'CRC',
    fechaEfecto: new Date('2026-02-01'),
    fechaInicioEfecto: new Date('2026-02-01'),
    fechaFinEfecto: new Date('2026-02-15'),
  };

  beforeEach(async () => {
    const repoMock = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((d) => d),
      query: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    const actionQuotaRepoMock = {
      count: jest.fn().mockResolvedValue(0),
    };

    const absenceLineRepoMock = {
      count: jest.fn().mockResolvedValue(0),
    };
    const licenseLineRepoMock = {
      count: jest.fn().mockResolvedValue(0),
    };
    const disabilityLineRepoMock = {
      count: jest.fn().mockResolvedValue(0),
    };
    const bonusLineRepoMock = {
      count: jest.fn().mockResolvedValue(0),
    };
    const overtimeLineRepoMock = {
      count: jest.fn().mockResolvedValue(0),
    };
    const retentionLineRepoMock = {
      count: jest.fn().mockResolvedValue(0),
    };
    const discountLineRepoMock = {
      count: jest.fn().mockResolvedValue(0),
    };

    const userCompanyRepoMock = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const payrollRepoMock = {
      query: jest.fn().mockResolvedValue([]),
    };

    const eventEmitterMock = {
      emit: jest.fn(),
    };

    const auditOutboxMock = {
      publish: jest.fn(),
    };

    const dataSourceMock = {
      transaction: jest.fn(async (cb: (trx: any) => Promise<any>) => {
        const trx = {
          save: jest.fn(async (value: unknown) => value),
          createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          })),
          delete: jest.fn().mockResolvedValue({ affected: 0 }),
          create: jest.fn((_: unknown, payload: unknown) => payload),
        };
        return cb(trx);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalActionsService,
        { provide: getRepositoryToken(PersonalAction), useValue: repoMock },
        { provide: getRepositoryToken(ActionQuota), useValue: actionQuotaRepoMock },
        { provide: getRepositoryToken(AbsenceLine), useValue: absenceLineRepoMock },
        { provide: getRepositoryToken(DisabilityLine), useValue: disabilityLineRepoMock },
        { provide: getRepositoryToken(LicenseLine), useValue: licenseLineRepoMock },
        { provide: getRepositoryToken(BonusLine), useValue: bonusLineRepoMock },
        { provide: getRepositoryToken(OvertimeLine), useValue: overtimeLineRepoMock },
        { provide: getRepositoryToken(RetentionLine), useValue: retentionLineRepoMock },
        { provide: getRepositoryToken(DiscountLine), useValue: discountLineRepoMock },
        { provide: getRepositoryToken(UserCompany), useValue: userCompanyRepoMock },
        { provide: getRepositoryToken(PayrollCalendar), useValue: payrollRepoMock },
        { provide: EventEmitter2, useValue: eventEmitterMock },
        { provide: EmployeesService, useValue: { findAll: jest.fn() } },
        {
          provide: EmployeeSensitiveDataService,
          useValue: { decrypt: jest.fn((value: string | null) => value) },
        },
        { provide: AuditOutboxService, useValue: auditOutboxMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get(PersonalActionsService);
    repo = module.get(getRepositoryToken(PersonalAction));
    userCompanyRepo = module.get(getRepositoryToken(UserCompany));
    actionQuotaRepo = module.get(getRepositoryToken(ActionQuota));
    absenceLineRepo = module.get(getRepositoryToken(AbsenceLine));
    disabilityLineRepo = module.get(getRepositoryToken(DisabilityLine));
    licenseLineRepo = module.get(getRepositoryToken(LicenseLine));
    bonusLineRepo = module.get(getRepositoryToken(BonusLine));
    overtimeLineRepo = module.get(getRepositoryToken(OvertimeLine));
    retentionLineRepo = module.get(getRepositoryToken(RetentionLine));
    discountLineRepo = module.get(getRepositoryToken(DiscountLine));
    payrollRepo = module.get(getRepositoryToken(PayrollCalendar));
    eventEmitter = module.get(EventEmitter2);
    auditOutbox = module.get(AuditOutboxService);
    dataSource = module.get(DataSource);

    userCompanyRepo.findOne.mockResolvedValue({
      idUsuario: 1,
      idEmpresa: 1,
      estado: 1,
    } as any);
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
      estado: PersonalActionEstado.APPROVED,
    } as any);

    await expect(service.approve(1, 1)).rejects.toThrow(BadRequestException);
  });

  it('reject rejects if action is not pending', async () => {
    repo.findOne.mockResolvedValue({
      id: 1,
      idEmpresa: 1,
      estado: PersonalActionEstado.APPROVED,
    } as any);

    await expect(service.reject(1, 'motivo', 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('advanceAbsenceState blocks privilege escalation from supervisor step without approve permission', async () => {
    repo.findOne.mockResolvedValue({
      ...baseAction,
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
    } as PersonalAction);

    await expect(
      service.advanceAbsenceState(10, 1, ['hr-action-ausencias:edit']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('advanceAbsenceState rejects advancing final states', async () => {
    repo.findOne.mockResolvedValue({
      ...baseAction,
      estado: PersonalActionEstado.APPROVED,
    } as PersonalAction);

    await expect(
      service.advanceAbsenceState(10, 1, ['hr-action-ausencias:approve']),
    ).rejects.toThrow(BadRequestException);
  });

  it('advanceAbsenceState approves from pending rrhh with approve permission', async () => {
    const action = {
      ...baseAction,
      estado: PersonalActionEstado.PENDING_RRHH,
      aprobadoPor: null,
      fechaAprobacion: null,
    } as PersonalAction;
    repo.findOne.mockImplementation(async () => action);
    repo.save.mockImplementation(async (entity) => entity as PersonalAction);

    const result = await service.advanceAbsenceState(10, 1, [
      'hr-action-ausencias:approve',
    ]);

    expect(result.estado).toBe(PersonalActionEstado.APPROVED);
    expect(result.aprobadoPor).toBe(1);
    expect(result.fechaAprobacion).toBeInstanceOf(Date);
    expect(eventEmitter.emit).toHaveBeenCalled();
    expect(auditOutbox.publish).toHaveBeenCalled();
    expect(payrollRepo.query).toHaveBeenCalled();
  });

  it('invalidateAbsence rejects non-operational states', async () => {
    repo.findOne.mockResolvedValue({
      ...baseAction,
      estado: PersonalActionEstado.APPROVED,
    } as PersonalAction);

    await expect(
      service.invalidateAbsence(10, 'motivo', 1, ['hr-action-ausencias:cancel']),
    ).rejects.toThrow(BadRequestException);
  });

  it('invalidateAbsence rejects malicious call without cancel permission', async () => {
    repo.findOne.mockResolvedValue({
      ...baseAction,
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
    } as PersonalAction);

    await expect(
      service.invalidateAbsence(10, 'motivo', 1, ['hr-action-ausencias:edit']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('invalidateAbsence should set invalidation metadata and keep traceability', async () => {
    const action = {
      ...baseAction,
      estado: PersonalActionEstado.DRAFT,
      invalidatedAt: null,
      invalidatedReason: null,
      modificadoPor: null,
    } as PersonalAction;

    repo.findOne.mockImplementation(async () => action);

    const result = await service.invalidateAbsence(10, '   ', 1, [
      'hr-action-ausencias:cancel',
    ]);

    expect(result.estado).toBe(PersonalActionEstado.INVALIDATED);
    expect(result.invalidatedAt).toBeInstanceOf(Date);
    expect(result.invalidatedReason).toBe('Invalidada manualmente por RRHH');
    expect(result.invalidatedReasonCode).toBe(
      PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION,
    );
    expect(result.invalidatedByType).toBe(PERSONAL_ACTION_INVALIDATED_BY.USER);
    expect(result.invalidatedByUserId).toBe(1);
    expect(result.invalidatedMeta).toEqual(
      expect.objectContaining({
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: 1,
      }),
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalled();
    expect(auditOutbox.publish).toHaveBeenCalled();
    expect(absenceLineRepo.count).toHaveBeenCalledWith({ where: { idAccion: 10 } });
  });

  it('createLicense rejects payload without lines (malicious payload)', async () => {
    await expect(
      service.createLicense(
        {
          idEmpresa: 1,
          idEmpleado: 99,
          observacion: 'intento sin lineas',
          lines: [],
        } as any,
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('advanceLicenseState blocks privilege escalation without approve permission', async () => {
    repo.findOne.mockResolvedValue({
      ...baseAction,
      tipoAccion: 'licencia',
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
    } as PersonalAction);

    await expect(
      service.advanceLicenseState(10, 1, ['hr-action-licencias:edit']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('invalidateLicense should set forensic metadata as USER', async () => {
    const action = {
      ...baseAction,
      tipoAccion: 'licencia',
      estado: PersonalActionEstado.PENDING_RRHH,
      invalidatedAt: null,
      invalidatedReason: null,
      modificadoPor: null,
    } as PersonalAction;

    repo.findOne.mockImplementation(async () => action);

    const result = await service.invalidateLicense(10, 'regla manual', 1, [
      'hr-action-licencias:cancel',
    ]);

    expect(result.estado).toBe(PersonalActionEstado.INVALIDATED);
    expect(result.invalidatedAt).toBeInstanceOf(Date);
    expect(result.invalidatedReasonCode).toBe(
      PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION,
    );
    expect(result.invalidatedByType).toBe(PERSONAL_ACTION_INVALIDATED_BY.USER);
    expect(result.invalidatedByUserId).toBe(1);
    expect(result.invalidatedMeta).toEqual(
      expect.objectContaining({
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: 1,
      }),
    );
  });

  it('createDisability rejects payload without lines (malicious payload)', async () => {
    await expect(
      service.createDisability(
        {
          idEmpresa: 1,
          idEmpleado: 99,
          observacion: 'intento sin lineas',
          lines: [],
        } as any,
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('invalidateDisability should set forensic metadata as USER', async () => {
    const action = {
      ...baseAction,
      tipoAccion: 'incapacidad',
      estado: PersonalActionEstado.PENDING_RRHH,
      invalidatedAt: null,
      invalidatedReason: null,
      modificadoPor: null,
    } as PersonalAction;

    repo.findOne.mockImplementation(async () => action);

    const result = await service.invalidateDisability(10, 'regla manual', 1, [
      'hr-action-incapacidades:cancel',
    ]);

    expect(result.estado).toBe(PersonalActionEstado.INVALIDATED);
    expect(result.invalidatedAt).toBeInstanceOf(Date);
    expect(result.invalidatedReasonCode).toBe(
      PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION,
    );
    expect(result.invalidatedByType).toBe(PERSONAL_ACTION_INVALIDATED_BY.USER);
    expect(result.invalidatedByUserId).toBe(1);
    expect(result.invalidatedMeta).toEqual(
      expect.objectContaining({
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: 1,
      }),
    );
    expect(disabilityLineRepo.count).toHaveBeenCalledWith({ where: { idAccion: 10 } });
  });

  it('createOvertime rejects payload without lines (malicious payload)', async () => {
    await expect(
      service.createOvertime(
        {
          idEmpresa: 1,
          idEmpleado: 99,
          observacion: 'intento sin lineas',
          lines: [],
        } as any,
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('invalidateOvertime should set forensic metadata as USER', async () => {
    const action = {
      ...baseAction,
      tipoAccion: 'hora_extra',
      estado: PersonalActionEstado.PENDING_RRHH,
      invalidatedAt: null,
      invalidatedReason: null,
      modificadoPor: null,
    } as PersonalAction;

    repo.findOne.mockImplementation(async () => action);

    const result = await service.invalidateOvertime(10, 'regla manual', 1, [
      'hr-action-horas-extras:cancel',
    ]);

    expect(result.estado).toBe(PersonalActionEstado.INVALIDATED);
    expect(result.invalidatedAt).toBeInstanceOf(Date);
    expect(result.invalidatedReasonCode).toBe(
      PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION,
    );
    expect(result.invalidatedByType).toBe(PERSONAL_ACTION_INVALIDATED_BY.USER);
    expect(result.invalidatedByUserId).toBe(1);
    expect(result.invalidatedMeta).toEqual(
      expect.objectContaining({
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: 1,
      }),
    );
    expect(overtimeLineRepo.count).toHaveBeenCalledWith({ where: { idAccion: 10 } });
  });

  it('createAbsence splits actions by payroll period and keeps a shared group id', async () => {
    jest
      .spyOn(service as any, 'validateAbsencePayload')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'getAbsenceEmployee').mockResolvedValue({
      monedaSalario: 'CRC',
    });

    dataSource.transaction.mockImplementationOnce(
      async (cb: (trx: any) => Promise<any>) => {
        let actionId = 101;
        let quotaId = 501;
        const trx = {
          save: jest.fn(async (value: any) => {
            if (value?.tipoAccion) return { ...value, id: actionId++ };
            if (value?.numeroCuota != null) return { ...value, id: quotaId++ };
            return value;
          }),
          createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          })),
          delete: jest.fn().mockResolvedValue({ affected: 0 }),
          create: jest.fn((_: unknown, payload: unknown) => payload),
        };
        return cb(trx);
      },
    );

    repo.findOne.mockImplementation(async ({ where }: any) => ({
      ...baseAction,
      id: where.id,
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
      tipoAccion: 'ausencia',
    } as PersonalAction));

    const result: any = await service.createAbsence(
      {
        idEmpresa: 1,
        idEmpleado: 99,
        observacion: 'lote por periodo',
        lines: [
          {
            payrollId: 10,
            fechaEfecto: '2026-03-01',
            movimientoId: 1,
            tipoAusencia: 'JUSTIFICADA',
            cantidad: 1,
            monto: 1000,
            remuneracion: true,
          },
          {
            payrollId: 20,
            fechaEfecto: '2026-04-01',
            movimientoId: 1,
            tipoAusencia: 'JUSTIFICADA',
            cantidad: 1,
            monto: 2000,
            remuneracion: true,
          },
        ],
      } as any,
      1,
    );

    expect(result.totalCreated).toBe(2);
    expect(Array.isArray(result.createdActionIds)).toBe(true);
    expect(result.createdActionIds).toHaveLength(2);
    expect(result.groupId).toMatch(/^AUS-/);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    expect(auditOutbox.publish).toHaveBeenCalledTimes(2);
  });

  it('updateAbsence rejects cross-period payload in a single action edit', async () => {
    repo.findOne.mockResolvedValue({
      ...baseAction,
      tipoAccion: 'ausencia',
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
    } as PersonalAction);
    jest
      .spyOn(service as any, 'validateAbsencePayload')
      .mockResolvedValue(undefined);

    await expect(
      service.updateAbsence(
        10,
        {
          idEmpresa: 1,
          idEmpleado: 99,
          observacion: 'invalid edit',
          lines: [
            {
              payrollId: 10,
              fechaEfecto: '2026-03-01',
              movimientoId: 1,
              tipoAusencia: 'JUSTIFICADA',
              cantidad: 1,
              monto: 1000,
              remuneracion: true,
            },
            {
              payrollId: 11,
              fechaEfecto: '2026-03-05',
              movimientoId: 1,
              tipoAusencia: 'JUSTIFICADA',
              cantidad: 1,
              monto: 1000,
              remuneracion: true,
            },
          ],
        } as any,
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('createLicense splits actions by payroll period', async () => {
    jest
      .spyOn(service as any, 'validateLicensePayload')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'getAbsenceEmployee').mockResolvedValue({
      monedaSalario: 'CRC',
    });

    dataSource.transaction.mockImplementationOnce(
      async (cb: (trx: any) => Promise<any>) => {
        let actionId = 201;
        let quotaId = 601;
        const trx = {
          save: jest.fn(async (value: any) => {
            if (value?.tipoAccion) return { ...value, id: actionId++ };
            if (value?.numeroCuota != null) return { ...value, id: quotaId++ };
            return value;
          }),
          createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          })),
          delete: jest.fn().mockResolvedValue({ affected: 0 }),
          create: jest.fn((_: unknown, payload: unknown) => payload),
        };
        return cb(trx);
      },
    );

    repo.findOne.mockImplementation(async ({ where }: any) => ({
      ...baseAction,
      id: where.id,
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
      tipoAccion: 'licencia',
    } as PersonalAction));

    const result: any = await service.createLicense(
      {
        idEmpresa: 1,
        idEmpleado: 99,
        observacion: 'lote licencia',
        lines: [
          {
            payrollId: 10,
            fechaEfecto: '2026-03-01',
            movimientoId: 1,
            tipoLicencia: 'permiso_con_goce',
            cantidad: 1,
            monto: 1000,
            remuneracion: true,
          },
          {
            payrollId: 20,
            fechaEfecto: '2026-04-01',
            movimientoId: 1,
            tipoLicencia: 'permiso_con_goce',
            cantidad: 1,
            monto: 2000,
            remuneracion: true,
          },
        ],
      } as any,
      1,
    );

    expect(result.totalCreated).toBe(2);
    expect(result.createdActionIds).toHaveLength(2);
    expect(result.groupId).toMatch(/^LIC-/);
  });

  it('updateLicense rejects cross-period payload in a single action edit', async () => {
    repo.findOne.mockResolvedValue({
      ...baseAction,
      tipoAccion: 'licencia',
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
    } as PersonalAction);
    jest
      .spyOn(service as any, 'validateLicensePayload')
      .mockResolvedValue(undefined);

    await expect(
      service.updateLicense(
        10,
        {
          idEmpresa: 1,
          idEmpleado: 99,
          observacion: 'invalid edit',
          lines: [
            {
              payrollId: 10,
              fechaEfecto: '2026-03-01',
              movimientoId: 1,
              tipoLicencia: 'permiso_con_goce',
              cantidad: 1,
              monto: 1000,
              remuneracion: true,
            },
            {
              payrollId: 11,
              fechaEfecto: '2026-03-05',
              movimientoId: 1,
              tipoLicencia: 'permiso_con_goce',
              cantidad: 1,
              monto: 1000,
              remuneracion: true,
            },
          ],
        } as any,
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('createDisability splits actions by payroll period', async () => {
    jest
      .spyOn(service as any, 'validateDisabilityPayload')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'getAbsenceEmployee').mockResolvedValue({
      monedaSalario: 'CRC',
    });

    dataSource.transaction.mockImplementationOnce(
      async (cb: (trx: any) => Promise<any>) => {
        let actionId = 301;
        let quotaId = 701;
        const trx = {
          save: jest.fn(async (value: any) => {
            if (value?.tipoAccion) return { ...value, id: actionId++ };
            if (value?.numeroCuota != null) return { ...value, id: quotaId++ };
            return value;
          }),
          createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          })),
          delete: jest.fn().mockResolvedValue({ affected: 0 }),
          create: jest.fn((_: unknown, payload: unknown) => payload),
        };
        return cb(trx);
      },
    );

    repo.findOne.mockImplementation(async ({ where }: any) => ({
      ...baseAction,
      id: where.id,
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
      tipoAccion: 'incapacidad',
    } as PersonalAction));

    const result: any = await service.createDisability(
      {
        idEmpresa: 1,
        idEmpleado: 99,
        observacion: 'lote incapacidad',
        lines: [
          {
            payrollId: 10,
            fechaEfecto: '2026-03-01',
            movimientoId: 1,
            tipoIncapacidad: 'enfermedad_comun_ccss',
            tipoInstitucion: 'CCSS',
            cantidad: 1,
            monto: 1000,
            remuneracion: true,
          },
          {
            payrollId: 20,
            fechaEfecto: '2026-04-01',
            movimientoId: 1,
            tipoIncapacidad: 'enfermedad_comun_ccss',
            tipoInstitucion: 'CCSS',
            cantidad: 1,
            monto: 2000,
            remuneracion: true,
          },
        ],
      } as any,
      1,
    );

    expect(result.totalCreated).toBe(2);
    expect(result.createdActionIds).toHaveLength(2);
    expect(result.groupId).toMatch(/^INC-/);
  });

  it('updateDisability rejects cross-period payload in a single action edit', async () => {
    repo.findOne.mockResolvedValue({
      ...baseAction,
      tipoAccion: 'incapacidad',
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
    } as PersonalAction);
    jest
      .spyOn(service as any, 'validateDisabilityPayload')
      .mockResolvedValue(undefined);

    await expect(
      service.updateDisability(
        10,
        {
          idEmpresa: 1,
          idEmpleado: 99,
          observacion: 'invalid edit',
          lines: [
            {
              payrollId: 10,
              fechaEfecto: '2026-03-01',
              movimientoId: 1,
              tipoIncapacidad: 'enfermedad_comun_ccss',
              tipoInstitucion: 'CCSS',
              cantidad: 1,
              monto: 1000,
              remuneracion: true,
            },
            {
              payrollId: 11,
              fechaEfecto: '2026-03-05',
              movimientoId: 1,
              tipoIncapacidad: 'enfermedad_comun_ccss',
              tipoInstitucion: 'CCSS',
              cantidad: 1,
              monto: 1000,
              remuneracion: true,
            },
          ],
        } as any,
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('createBonus splits actions by payroll period', async () => {
    jest
      .spyOn(service as any, 'validateBonusPayload')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'getAbsenceEmployee').mockResolvedValue({
      monedaSalario: 'CRC',
    });

    dataSource.transaction.mockImplementationOnce(
      async (cb: (trx: any) => Promise<any>) => {
        let actionId = 401;
        let quotaId = 801;
        const trx = {
          save: jest.fn(async (value: any) => {
            if (value?.tipoAccion) return { ...value, id: actionId++ };
            if (value?.numeroCuota != null) return { ...value, id: quotaId++ };
            return value;
          }),
          createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          })),
          delete: jest.fn().mockResolvedValue({ affected: 0 }),
          create: jest.fn((_: unknown, payload: unknown) => payload),
        };
        return cb(trx);
      },
    );

    repo.findOne.mockImplementation(async ({ where }: any) => ({
      ...baseAction,
      id: where.id,
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
      tipoAccion: 'bonificacion',
    } as PersonalAction));

    const result: any = await service.createBonus(
      {
        idEmpresa: 1,
        idEmpleado: 99,
        observacion: 'lote bono',
        lines: [
          {
            payrollId: 10,
            fechaEfecto: '2026-03-01',
            movimientoId: 1,
            tipoBonificacion: 'ordinaria_salarial',
            cantidad: 1,
            monto: 1000,
            remuneracion: true,
          },
          {
            payrollId: 20,
            fechaEfecto: '2026-04-01',
            movimientoId: 1,
            tipoBonificacion: 'ordinaria_salarial',
            cantidad: 1,
            monto: 2000,
            remuneracion: true,
          },
        ],
      } as any,
      1,
    );

    expect(result.totalCreated).toBe(2);
    expect(result.createdActionIds).toHaveLength(2);
    expect(result.groupId).toMatch(/^BON-/);
  });

  it('updateBonus rejects cross-period payload in a single action edit', async () => {
    repo.findOne.mockResolvedValue({
      ...baseAction,
      tipoAccion: 'bonificacion',
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
    } as PersonalAction);
    jest
      .spyOn(service as any, 'validateBonusPayload')
      .mockResolvedValue(undefined);

    await expect(
      service.updateBonus(
        10,
        {
          idEmpresa: 1,
          idEmpleado: 99,
          observacion: 'invalid edit',
          lines: [
            {
              payrollId: 10,
              fechaEfecto: '2026-03-01',
              movimientoId: 1,
              tipoBonificacion: 'ordinaria_salarial',
              cantidad: 1,
              monto: 1000,
              remuneracion: true,
            },
            {
              payrollId: 11,
              fechaEfecto: '2026-03-05',
              movimientoId: 1,
              tipoBonificacion: 'ordinaria_salarial',
              cantidad: 1,
              monto: 1000,
              remuneracion: true,
            },
          ],
        } as any,
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('createOvertime splits actions by payroll period', async () => {
    jest
      .spyOn(service as any, 'validateOvertimePayload')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'getAbsenceEmployee').mockResolvedValue({
      monedaSalario: 'CRC',
    });

    dataSource.transaction.mockImplementationOnce(
      async (cb: (trx: any) => Promise<any>) => {
        let actionId = 501;
        let quotaId = 901;
        const trx = {
          save: jest.fn(async (value: any) => {
            if (value?.tipoAccion) return { ...value, id: actionId++ };
            if (value?.numeroCuota != null) return { ...value, id: quotaId++ };
            return value;
          }),
          createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          })),
          delete: jest.fn().mockResolvedValue({ affected: 0 }),
          create: jest.fn((_: unknown, payload: unknown) => payload),
        };
        return cb(trx);
      },
    );

    repo.findOne.mockImplementation(async ({ where }: any) => ({
      ...baseAction,
      id: where.id,
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
      tipoAccion: 'hora_extra',
    } as PersonalAction));

    const result: any = await service.createOvertime(
      {
        idEmpresa: 1,
        idEmpleado: 99,
        observacion: 'lote horas',
        lines: [
          {
            payrollId: 10,
            fechaEfecto: '2026-03-01',
            movimientoId: 1,
            fechaInicioHoraExtra: '2026-02-01',
            fechaFinHoraExtra: '2026-02-01',
            tipoJornadaHorasExtras: '8',
            cantidad: 1,
            monto: 1000,
            remuneracion: true,
          },
          {
            payrollId: 20,
            fechaEfecto: '2026-04-01',
            movimientoId: 1,
            fechaInicioHoraExtra: '2026-02-02',
            fechaFinHoraExtra: '2026-02-02',
            tipoJornadaHorasExtras: '8',
            cantidad: 1,
            monto: 2000,
            remuneracion: true,
          },
        ],
      } as any,
      1,
    );

    expect(result.totalCreated).toBe(2);
    expect(result.createdActionIds).toHaveLength(2);
    expect(result.groupId).toMatch(/^HEX-/);
  });

  it('updateOvertime rejects cross-period payload in a single action edit', async () => {
    repo.findOne.mockResolvedValue({
      ...baseAction,
      tipoAccion: 'hora_extra',
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
    } as PersonalAction);
    jest
      .spyOn(service as any, 'validateOvertimePayload')
      .mockResolvedValue(undefined);

    await expect(
      service.updateOvertime(
        10,
        {
          idEmpresa: 1,
          idEmpleado: 99,
          observacion: 'invalid edit',
          lines: [
            {
              payrollId: 10,
              fechaEfecto: '2026-03-01',
              movimientoId: 1,
              fechaInicioHoraExtra: '2026-02-01',
              fechaFinHoraExtra: '2026-02-01',
              tipoJornadaHorasExtras: '8',
              cantidad: 1,
              monto: 1000,
              remuneracion: true,
            },
            {
              payrollId: 11,
              fechaEfecto: '2026-03-05',
              movimientoId: 1,
              fechaInicioHoraExtra: '2026-02-02',
              fechaFinHoraExtra: '2026-02-02',
              tipoJornadaHorasExtras: '8',
              cantidad: 1,
              monto: 1000,
              remuneracion: true,
            },
          ],
        } as any,
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('createRetention splits actions by payroll period', async () => {
    jest
      .spyOn(service as any, 'validateRetentionPayload')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'getAbsenceEmployee').mockResolvedValue({
      monedaSalario: 'CRC',
    });

    dataSource.transaction.mockImplementationOnce(
      async (cb: (trx: any) => Promise<any>) => {
        let actionId = 601;
        let quotaId = 1001;
        const trx = {
          save: jest.fn(async (value: any) => {
            if (value?.tipoAccion) return { ...value, id: actionId++ };
            if (value?.numeroCuota != null) return { ...value, id: quotaId++ };
            return value;
          }),
          createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          })),
          delete: jest.fn().mockResolvedValue({ affected: 0 }),
          create: jest.fn((_: unknown, payload: unknown) => payload),
        };
        return cb(trx);
      },
    );

    repo.findOne.mockImplementation(async ({ where }: any) => ({
      ...baseAction,
      id: where.id,
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
      tipoAccion: 'deduccion_retencion',
    } as PersonalAction));

    const result: any = await service.createRetention(
      {
        idEmpresa: 1,
        idEmpleado: 99,
        observacion: 'lote retenciones',
        lines: [
          {
            payrollId: 10,
            fechaEfecto: '2026-03-01',
            movimientoId: 1,
            cantidad: 1,
            monto: 1000,
          },
          {
            payrollId: 20,
            fechaEfecto: '2026-04-01',
            movimientoId: 1,
            cantidad: 1,
            monto: 2000,
          },
        ],
      } as any,
      1,
    );

    expect(result.totalCreated).toBe(2);
    expect(result.createdActionIds).toHaveLength(2);
    expect(result.groupId).toMatch(/^RET-/);
  });

  it('updateRetention rejects cross-period payload in a single action edit', async () => {
    repo.findOne.mockResolvedValue({
      ...baseAction,
      tipoAccion: 'deduccion_retencion',
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
    } as PersonalAction);
    jest
      .spyOn(service as any, 'validateRetentionPayload')
      .mockResolvedValue(undefined);

    await expect(
      service.updateRetention(
        10,
        {
          idEmpresa: 1,
          idEmpleado: 99,
          observacion: 'invalid edit',
          lines: [
            {
              payrollId: 10,
              fechaEfecto: '2026-03-01',
              movimientoId: 1,
              cantidad: 1,
              monto: 1000,
            },
            {
              payrollId: 11,
              fechaEfecto: '2026-03-05',
              movimientoId: 1,
              cantidad: 1,
              monto: 1000,
            },
          ],
        } as any,
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('invalidateRetention should set forensic metadata as USER', async () => {
    const action = {
      ...baseAction,
      tipoAccion: 'deduccion_retencion',
      estado: PersonalActionEstado.PENDING_RRHH,
      invalidatedAt: null,
      invalidatedReason: null,
      modificadoPor: null,
    } as PersonalAction;

    repo.findOne.mockImplementation(async () => action);

    const result = await service.invalidateRetention(10, 'regla manual', 1, [
      'hr-action-retenciones:cancel',
    ]);

    expect(result.estado).toBe(PersonalActionEstado.INVALIDATED);
    expect(result.invalidatedAt).toBeInstanceOf(Date);
    expect(result.invalidatedReasonCode).toBe(
      PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION,
    );
    expect(result.invalidatedByType).toBe(PERSONAL_ACTION_INVALIDATED_BY.USER);
    expect(result.invalidatedByUserId).toBe(1);
    expect(result.invalidatedMeta).toEqual(
      expect.objectContaining({
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: 1,
      }),
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalled();
    expect(auditOutbox.publish).toHaveBeenCalled();
    expect(retentionLineRepo.count).toHaveBeenCalledWith({
      where: { idAccion: 10 },
    });
  });

  it('createDiscount splits actions by payroll period', async () => {
    jest
      .spyOn(service as any, 'validateDiscountPayload')
      .mockResolvedValue(undefined);
    jest.spyOn(service as any, 'getAbsenceEmployee').mockResolvedValue({
      monedaSalario: 'CRC',
    });

    dataSource.transaction.mockImplementationOnce(
      async (cb: (trx: any) => Promise<any>) => {
        let actionId = 701;
        let quotaId = 1101;
        const trx = {
          save: jest.fn(async (value: any) => {
            if (value?.tipoAccion) return { ...value, id: actionId++ };
            if (value?.numeroCuota != null) return { ...value, id: quotaId++ };
            return value;
          }),
          createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          })),
          delete: jest.fn().mockResolvedValue({ affected: 0 }),
          create: jest.fn((_: unknown, payload: unknown) => payload),
        };
        return cb(trx);
      },
    );

    repo.findOne.mockImplementation(async ({ where }: any) => ({
      ...baseAction,
      id: where.id,
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
      tipoAccion: 'deduccion_descuento',
    } as PersonalAction));

    const result: any = await service.createDiscount(
      {
        idEmpresa: 1,
        idEmpleado: 99,
        observacion: 'lote descuentos',
        lines: [
          {
            payrollId: 10,
            fechaEfecto: '2026-03-01',
            movimientoId: 1,
            cantidad: 1,
            monto: 1000,
          },
          {
            payrollId: 20,
            fechaEfecto: '2026-04-01',
            movimientoId: 1,
            cantidad: 1,
            monto: 2000,
          },
        ],
      } as any,
      1,
    );

    expect(result.totalCreated).toBe(2);
    expect(result.createdActionIds).toHaveLength(2);
    expect(result.groupId).toMatch(/^DSC-/);
  });

  it('updateDiscount rejects cross-period payload in a single action edit', async () => {
    repo.findOne.mockResolvedValue({
      ...baseAction,
      tipoAccion: 'deduccion_descuento',
      estado: PersonalActionEstado.PENDING_SUPERVISOR,
    } as PersonalAction);
    jest
      .spyOn(service as any, 'validateDiscountPayload')
      .mockResolvedValue(undefined);

    await expect(
      service.updateDiscount(
        10,
        {
          idEmpresa: 1,
          idEmpleado: 99,
          observacion: 'invalid edit',
          lines: [
            {
              payrollId: 10,
              fechaEfecto: '2026-03-01',
              movimientoId: 1,
              cantidad: 1,
              monto: 1000,
            },
            {
              payrollId: 11,
              fechaEfecto: '2026-03-05',
              movimientoId: 1,
              cantidad: 1,
              monto: 1000,
            },
          ],
        } as any,
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('invalidateDiscount should set forensic metadata as USER', async () => {
    const action = {
      ...baseAction,
      tipoAccion: 'deduccion_descuento',
      estado: PersonalActionEstado.PENDING_RRHH,
      invalidatedAt: null,
      invalidatedReason: null,
      modificadoPor: null,
    } as PersonalAction;

    repo.findOne.mockImplementation(async () => action);

    const result = await service.invalidateDiscount(10, 'regla manual', 1, [
      'hr-action-descuentos:cancel',
    ]);

    expect(result.estado).toBe(PersonalActionEstado.INVALIDATED);
    expect(result.invalidatedAt).toBeInstanceOf(Date);
    expect(result.invalidatedReasonCode).toBe(
      PERSONAL_ACTION_INVALIDATION_REASON.MANUAL_INVALIDATION,
    );
    expect(result.invalidatedByType).toBe(PERSONAL_ACTION_INVALIDATED_BY.USER);
    expect(result.invalidatedByUserId).toBe(1);
    expect(result.invalidatedMeta).toEqual(
      expect.objectContaining({
        invalidated_by_type: PERSONAL_ACTION_INVALIDATED_BY.USER,
        invalidated_by_user_id: 1,
      }),
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalled();
    expect(auditOutbox.publish).toHaveBeenCalled();
    expect(discountLineRepo.count).toHaveBeenCalledWith({
      where: { idAccion: 10 },
    });
  });
});
