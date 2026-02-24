import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpsService } from './ops.service';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeeIdentityQueue } from '../employees/entities/employee-identity-queue.entity';
import { EmployeeEncryptQueue } from '../employees/entities/employee-encrypt-queue.entity';
import { EmployeeDataAutomationWorkerService } from '../employees/services/employee-data-automation-worker.service';

describe('OpsService', () => {
  let service: OpsService;
  let employeeRepo: jest.Mocked<Repository<Employee>>;
  let identityQueueRepo: jest.Mocked<Repository<EmployeeIdentityQueue>>;
  let encryptQueueRepo: jest.Mocked<Repository<EmployeeEncryptQueue>>;
  let workerService: { runRescanNow: jest.Mock; releaseStuckNow: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpsService,
        { provide: getRepositoryToken(Employee), useValue: { query: jest.fn() } },
        { provide: getRepositoryToken(EmployeeIdentityQueue), useValue: { query: jest.fn() } },
        { provide: getRepositoryToken(EmployeeEncryptQueue), useValue: { query: jest.fn() } },
        {
          provide: EmployeeDataAutomationWorkerService,
          useValue: { runRescanNow: jest.fn(), releaseStuckNow: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(OpsService);
    employeeRepo = module.get(getRepositoryToken(Employee));
    identityQueueRepo = module.get(getRepositoryToken(EmployeeIdentityQueue));
    encryptQueueRepo = module.get(getRepositoryToken(EmployeeEncryptQueue));
    workerService = module.get(EmployeeDataAutomationWorkerService);
  });

  it('getSummary should aggregate queue and throughput metrics', async () => {
    identityQueueRepo.query.mockImplementation(async (sql: string) => {
      if (sql.includes('GROUP BY estado_queue')) return [{ estado_queue: 'PENDING', cnt: 2 }];
      if (sql.includes('MIN(ts) AS oldest_pending')) return [{ oldest_pending: '2026-02-24T10:00:00.000Z' }];
      if (sql.includes('INTERVAL 5 MINUTE')) return [{ cnt: 3 }];
      if (sql.includes('DONE') && sql.includes('INTERVAL 15 MINUTE')) return [{ cnt: 6 }];
      if (sql.includes("LIKE 'ERROR%'")) return [{ cnt: 1 }];
      if (sql.includes("estado_queue = 'PROCESSING'")) return [{ cnt: 1 }];
      if (sql.includes('TIMESTAMPDIFF')) return [{ age: 22 }];
      return [{ cnt: 0 }];
    });
    encryptQueueRepo.query.mockImplementation(async (sql: string) => {
      if (sql.includes('GROUP BY estado_queue')) return [{ estado_queue: 'DONE', cnt: 9 }];
      if (sql.includes('INTERVAL 5 MINUTE')) return [{ cnt: 2 }];
      if (sql.includes('DONE') && sql.includes('INTERVAL 15 MINUTE')) return [{ cnt: 4 }];
      if (sql.includes("LIKE 'ERROR%'")) return [{ cnt: 2 }];
      if (sql.includes("estado_queue = 'PROCESSING'")) return [{ cnt: 3 }];
      return [{ cnt: 0 }];
    });
    employeeRepo.query
      .mockResolvedValueOnce([{ cnt: 5 }])
      .mockResolvedValueOnce([{ cnt: 7 }])
      .mockResolvedValueOnce([{ cnt: 1 }]);

    const result = await service.getSummary();

    expect(result.identity).toEqual({ PENDING: 2 });
    expect(result.encrypt).toEqual({ DONE: 9 });
    expect(result.activosSinUsuario).toBe(5);
    expect(result.activosNoCifrados).toBe(7);
    expect(result.plaintextDetected).toBe(1);
    expect(result.oldestPendingAgeMinutes).toBe(22);
    expect(result.throughputJobsPerMin5).toBe(1);
    expect(result.throughputJobsPerMin15).toBeCloseTo(0.67, 2);
    expect(result.errorsLast15m).toBe(3);
    expect(result.stuckProcessing).toBe(4);
    expect(result.lastUpdatedAt).toEqual(expect.any(String));
  });

  it('listQueue should apply filters and redact sensitive lastError', async () => {
    identityQueueRepo.query
      .mockResolvedValueOnce([
        {
          id_queue: 100,
          id_empleado: 77,
          estado_queue: 'ERROR_CONFIG_APP',
          attempts_queue: 4,
          next_retry_at_queue: null,
          locked_by_queue: null,
          locked_at_queue: null,
          last_error_queue: 'Error user test@example.com con id 123456789',
          fecha_creacion_queue: '2026-02-24T11:00:00.000Z',
          fecha_modificacion_queue: '2026-02-24T11:05:00.000Z',
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const result = await service.listQueue('identity', {
      includeDone: 0,
      estado: 'ERROR_CONFIG_APP',
      idEmpleado: 77,
      attemptsMin: 2,
      page: 1,
      pageSize: 25,
      lockedOnly: 0,
      stuckOnly: 0,
    });

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].lastError).toContain('[redacted-email]');
    expect(result.data[0].lastError).toContain('[redacted-id]');
    expect(result.data[0].diagnostico).toContain('ERROR_CONFIG');
  });

  it('healthCheck should return healthy false when stuck jobs exist', async () => {
    identityQueueRepo.query
      .mockResolvedValueOnce([{ cnt: 5 }])
      .mockResolvedValueOnce([{ cnt: 1 }]);
    encryptQueueRepo.query
      .mockResolvedValueOnce([{ cnt: 2 }])
      .mockResolvedValueOnce([{ cnt: 0 }]);

    const result = await service.healthCheck();

    expect(result).toEqual({
      pendingReadyIdentity: 5,
      pendingReadyEncrypt: 2,
      stuckIdentity: 1,
      stuckEncrypt: 0,
      healthy: false,
    });
  });

  it('requeue should run update against selected queue table', async () => {
    identityQueueRepo.query.mockResolvedValue([]);

    const result = await service.requeue('encrypt', 33);

    expect(result).toEqual({ ok: true });
    const [sql, params] = identityQueueRepo.query.mock.calls[0];
    expect(sql).toContain('sys_empleado_encrypt_queue');
    expect(sql).toContain('id_encrypt_queue');
    expect(params).toEqual([33]);
  });

  it('rescanNow and releaseStuckNow should delegate to worker service', async () => {
    workerService.runRescanNow.mockResolvedValue({ ok: true });
    workerService.releaseStuckNow.mockResolvedValue({ released: 2 });

    await expect(service.rescanNow()).resolves.toEqual({ ok: true });
    await expect(service.releaseStuckNow()).resolves.toEqual({ released: 2 });
  });
});
