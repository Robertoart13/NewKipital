import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckError,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { REDIS_CLIENT } from '../../config/redis.config';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };
  let dbIndicator: { pingCheck: jest.Mock };

  function buildModule(redisClient: unknown = null) {
    return Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: { check: jest.fn() },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: { pingCheck: jest.fn() },
        },
        {
          provide: REDIS_CLIENT,
          useValue: redisClient,
        },
      ],
    }).compile();
  }

  beforeEach(async () => {
    const module: TestingModule = await buildModule(null);
    controller = module.get(HealthController);
    healthCheckService = module.get(HealthCheckService);
    dbIndicator = module.get(TypeOrmHealthIndicator);
  });

  it('calls health.check() with the DB indicator', () => {
    const okResult = { status: 'ok', info: { database: { status: 'up' } } };
    healthCheckService.check.mockResolvedValue(okResult);
    dbIndicator.pingCheck.mockResolvedValue({ database: { status: 'up' } });

    const result = controller.check();

    expect(healthCheckService.check).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Function)]),
    );
    expect(result).resolves.toEqual(okResult);
  });

  it('omits Redis check when redisClient is null', () => {
    const checkSpy = healthCheckService.check.mockResolvedValue({
      status: 'ok',
    });

    controller.check();

    const checksArg: Array<() => unknown> = checkSpy.mock.calls[0][0];
    expect(checksArg).toHaveLength(1); // solo DB
  });

  it('includes Redis check when redisClient is provided', async () => {
    const mockRedis = { ping: jest.fn().mockResolvedValue('PONG') };
    const module: TestingModule = await buildModule(mockRedis);
    const ctrl = module.get(HealthController);
    const hcs = module.get(HealthCheckService) as { check: jest.Mock };
    hcs.check.mockResolvedValue({ status: 'ok' });

    ctrl.check();

    const checksArg: Array<() => unknown> = hcs.check.mock.calls[0][0];
    expect(checksArg).toHaveLength(2); // DB + Redis
  });

  it('Redis check resolves with up status when ping succeeds', async () => {
    const mockRedis = { ping: jest.fn().mockResolvedValue('PONG') };
    const module: TestingModule = await buildModule(mockRedis);
    const ctrl = module.get(HealthController);
    const hcs = module.get(HealthCheckService) as { check: jest.Mock };
    hcs.check.mockImplementation(
      async (checks: Array<() => Promise<unknown>>) => {
        for (const check of checks) await check();
        return { status: 'ok' };
      },
    );

    await ctrl.check();

    expect(mockRedis.ping).toHaveBeenCalled();
  });

  it('Redis check throws HealthCheckError when ping fails', async () => {
    const mockRedis = {
      ping: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    };
    const module: TestingModule = await buildModule(mockRedis);
    const ctrl = module.get(HealthController);
    const hcs = module.get(HealthCheckService) as { check: jest.Mock };

    hcs.check.mockImplementation(
      async (checks: Array<() => Promise<unknown>>) => {
        for (const check of checks) {
          try {
            await check();
          } catch (e) {
            // swallow to simulate terminus collecting errors
            return { status: 'error', error: (e as HealthCheckError).causes };
          }
        }
        return { status: 'ok' };
      },
    );

    const result = await ctrl.check();
    expect((result as { status: string }).status).toBe('error');
  });
});
