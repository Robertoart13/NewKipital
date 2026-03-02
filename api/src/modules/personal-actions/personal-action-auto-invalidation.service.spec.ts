import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PersonalAction,
  PersonalActionEstado,
} from './entities/personal-action.entity';
import { PersonalActionAutoInvalidationService } from './personal-action-auto-invalidation.service';
import { PERSONAL_ACTION_INVALIDATION_REASON } from './constants/personal-action-invalidation.constants';

type DbEmployee = {
  id: number;
  companyId: number;
  currency: 'CRC' | 'USD';
  terminationDate: string | null;
};

type DbAction = {
  id: number;
  employeeId: number;
  companyId: number;
  currency: 'CRC' | 'USD';
  effectiveStart: string;
  estado: PersonalActionEstado;
  payrollId: number | null;
  versionLock: number;
  invalidatedAt: Date | null;
  invalidatedReasonCode: string | null;
  invalidatedByType: string | null;
  invalidatedByUserId: number | null;
  invalidatedMeta: Record<string, unknown> | null;
};

describe('PersonalActionAutoInvalidationService', () => {
  let service: PersonalActionAutoInvalidationService;
  let repo: jest.Mocked<Repository<PersonalAction>>;
  let employees: DbEmployee[];
  let actions: DbAction[];

  const toTime = (dateValue: string): number => new Date(dateValue).getTime();

  const getEmployee = (employeeId: number): DbEmployee | undefined =>
    employees.find((employee) => employee.id === employeeId);

  const selectByReason = (
    reasonCode: string,
    payrollCurrency?: string | null,
  ): DbAction[] =>
    actions.filter((action) => {
      if (action.estado !== PersonalActionEstado.APPROVED) return false;
      if (action.payrollId != null) return false;
      const employee = getEmployee(action.employeeId);
      if (!employee) return false;

      if (
        reasonCode === PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE
      ) {
        if (!employee.terminationDate) return false;
        return toTime(action.effectiveStart) > toTime(employee.terminationDate);
      }

      if (
        reasonCode === PERSONAL_ACTION_INVALIDATION_REASON.COMPANY_MISMATCH
      ) {
        return employee.companyId !== action.companyId;
      }

      if (
        reasonCode === PERSONAL_ACTION_INVALIDATION_REASON.CURRENCY_MISMATCH
      ) {
        if (employee.currency !== action.currency) return true;
        if (payrollCurrency && payrollCurrency !== action.currency) return true;
        return false;
      }

      return false;
    });

  beforeEach(async () => {
    employees = [
      { id: 1, companyId: 1, currency: 'CRC', terminationDate: '2026-02-01' },
      { id: 2, companyId: 2, currency: 'CRC', terminationDate: null },
      { id: 3, companyId: 1, currency: 'USD', terminationDate: null },
      { id: 4, companyId: 1, currency: 'CRC', terminationDate: '2026-02-01' },
      { id: 5, companyId: 2, currency: 'USD', terminationDate: null },
    ];

    actions = [
      {
        id: 101,
        employeeId: 1,
        companyId: 1,
        currency: 'CRC',
        effectiveStart: '2026-03-01',
        estado: PersonalActionEstado.APPROVED,
        payrollId: null,
        versionLock: 1,
        invalidatedAt: null,
        invalidatedReasonCode: null,
        invalidatedByType: null,
        invalidatedByUserId: null,
        invalidatedMeta: null,
      },
      {
        id: 102,
        employeeId: 2,
        companyId: 1,
        currency: 'CRC',
        effectiveStart: '2026-02-05',
        estado: PersonalActionEstado.APPROVED,
        payrollId: null,
        versionLock: 1,
        invalidatedAt: null,
        invalidatedReasonCode: null,
        invalidatedByType: null,
        invalidatedByUserId: null,
        invalidatedMeta: null,
      },
      {
        id: 103,
        employeeId: 3,
        companyId: 1,
        currency: 'CRC',
        effectiveStart: '2026-02-05',
        estado: PersonalActionEstado.APPROVED,
        payrollId: null,
        versionLock: 1,
        invalidatedAt: null,
        invalidatedReasonCode: null,
        invalidatedByType: null,
        invalidatedByUserId: null,
        invalidatedMeta: null,
      },
      {
        id: 104,
        employeeId: 4,
        companyId: 1,
        currency: 'CRC',
        effectiveStart: '2026-03-01',
        estado: PersonalActionEstado.PENDING_SUPERVISOR,
        payrollId: null,
        versionLock: 1,
        invalidatedAt: null,
        invalidatedReasonCode: null,
        invalidatedByType: null,
        invalidatedByUserId: null,
        invalidatedMeta: null,
      },
      {
        id: 105,
        employeeId: 5,
        companyId: 1,
        currency: 'CRC',
        effectiveStart: '2026-03-01',
        estado: PersonalActionEstado.CONSUMED,
        payrollId: 999,
        versionLock: 1,
        invalidatedAt: null,
        invalidatedReasonCode: null,
        invalidatedByType: null,
        invalidatedByUserId: null,
        invalidatedMeta: null,
      },
    ];

    const repoMock = {
      query: jest.fn(async (sql: string, params: unknown[]) => {
        const isSelect = sql.trimStart().startsWith('SELECT a.id_accion');
        const isUpdate = sql.trimStart().startsWith('UPDATE acc_acciones_personal');
        if (!isSelect && !isUpdate) return [];

        let reasonCode = PERSONAL_ACTION_INVALIDATION_REASON.CURRENCY_MISMATCH;
        if (sql.includes('fecha_salida_empleado')) {
          reasonCode = PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE;
        } else if (sql.includes('e.id_empresa <> a.id_empresa')) {
          reasonCode = PERSONAL_ACTION_INVALIDATION_REASON.COMPANY_MISMATCH;
        }

        const payrollCurrency =
          reasonCode === PERSONAL_ACTION_INVALIDATION_REASON.CURRENCY_MISMATCH
            ? (params.find((param) => param === 'CRC' || param === 'USD') as
                | string
                | undefined)
            : undefined;
        const candidates = selectByReason(reasonCode, payrollCurrency);

        if (isSelect) {
          return candidates.slice(0, 10).map((action) => ({
            id_accion: action.id,
          }));
        }

        for (const action of candidates) {
          action.estado = PersonalActionEstado.INVALIDATED;
          action.invalidatedAt = new Date();
          action.invalidatedReasonCode = reasonCode;
          action.invalidatedByType = 'SYSTEM';
          action.invalidatedByUserId = null;
          action.invalidatedMeta = {
            invalidated_by_type: 'SYSTEM',
            source: 'test-suite',
            action_id: action.id,
          };
          action.versionLock += 1;
        }
        return { affectedRows: candidates.length };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalActionAutoInvalidationService,
        { provide: getRepositoryToken(PersonalAction), useValue: repoMock },
      ],
    }).compile();

    service = module.get(PersonalActionAutoInvalidationService);
    repo = module.get(getRepositoryToken(PersonalAction));
  });

  it('F1 termination invalida approved futura + auditoria', async () => {
    const result = await service.run({
      source: 'test-suite',
      reasonCodes: [PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE],
    });

    const target = actions.find((item) => item.id === 101);
    expect(result.totalInvalidated).toBe(1);
    expect(target?.estado).toBe(PersonalActionEstado.INVALIDATED);
    expect(target?.invalidatedReasonCode).toBe(
      PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE,
    );
    expect(target?.invalidatedAt).toBeInstanceOf(Date);
    expect(target?.invalidatedByType).toBe('SYSTEM');
    expect(target?.invalidatedMeta).toEqual(
      expect.objectContaining({ invalidated_by_type: 'SYSTEM' }),
    );
  });

  it('F2 company mismatch invalida approved + auditoria', async () => {
    await service.run({
      source: 'test-suite',
      reasonCodes: [PERSONAL_ACTION_INVALIDATION_REASON.COMPANY_MISMATCH],
    });

    const target = actions.find((item) => item.id === 102);
    expect(target?.estado).toBe(PersonalActionEstado.INVALIDATED);
    expect(target?.invalidatedReasonCode).toBe(
      PERSONAL_ACTION_INVALIDATION_REASON.COMPANY_MISMATCH,
    );
    expect(target?.invalidatedByType).toBe('SYSTEM');
  });

  it('F3 currency mismatch invalida approved + auditoria', async () => {
    await service.run({
      source: 'test-suite',
      reasonCodes: [PERSONAL_ACTION_INVALIDATION_REASON.CURRENCY_MISMATCH],
    });

    const target = actions.find((item) => item.id === 103);
    expect(target?.estado).toBe(PersonalActionEstado.INVALIDATED);
    expect(target?.invalidatedReasonCode).toBe(
      PERSONAL_ACTION_INVALIDATION_REASON.CURRENCY_MISMATCH,
    );
    expect(target?.invalidatedByType).toBe('SYSTEM');
  });

  it('F4 pending no se invalida', async () => {
    await service.run({
      source: 'test-suite',
      reasonCodes: [PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE],
    });

    const pending = actions.find((item) => item.id === 104);
    expect(pending?.estado).toBe(PersonalActionEstado.PENDING_SUPERVISOR);
    expect(pending?.invalidatedAt).toBeNull();
  });

  it('F5 consumed no cambia (inmutable)', async () => {
    await service.run({
      source: 'test-suite',
      reasonCodes: [
        PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE,
        PERSONAL_ACTION_INVALIDATION_REASON.COMPANY_MISMATCH,
        PERSONAL_ACTION_INVALIDATION_REASON.CURRENCY_MISMATCH,
      ],
      payrollCurrency: 'USD',
    });

    const consumed = actions.find((item) => item.id === 105);
    expect(consumed?.estado).toBe(PersonalActionEstado.CONSUMED);
    expect(consumed?.invalidatedAt).toBeNull();
  });

  it('idempotencia: correr dos veces no duplica invalidaciones', async () => {
    const first = await service.run({
      source: 'test-suite',
      reasonCodes: [PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE],
    });
    const second = await service.run({
      source: 'test-suite',
      reasonCodes: [PERSONAL_ACTION_INVALIDATION_REASON.TERMINATION_EFFECTIVE],
    });

    expect(first.totalInvalidated).toBe(1);
    expect(second.totalInvalidated).toBe(0);
    expect(repo.query).toHaveBeenCalled();
  });
});
