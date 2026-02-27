import {
  Controller,
  Get,
  Inject,
  Optional,
} from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckService,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import type Redis from 'ioredis';
import { Public } from '../../common/decorators/public.decorator';
import { SkipCsrf } from '../../common/decorators/skip-csrf.decorator';
import { REDIS_CLIENT } from '../../config/redis.config';

/**
 * GET /api/health
 *
 * Endpoint de health check para readiness/liveness probes de LB y Kubernetes.
 * Está marcado como @Public y @SkipCsrf para ser accesible sin autenticación.
 *
 * Siempre comprueba la conexión a la base de datos (TypeORM pingCheck).
 * Si hay cliente Redis configurado (REDIS_HOST env var), también lo comprueba.
 *
 * Respuesta OK:   { status: 'ok',    info: { database: { status: 'up' } } }
 * Respuesta FAIL: { status: 'error', error: { database: { status: 'down' } } }
 */
@Public()
@SkipCsrf()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis | null,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const checks: Array<() => Promise<HealthIndicatorResult>> = [
      () => this.db.pingCheck('database'),
    ];

    if (this.redisClient) {
      checks.push(() => this.redisCheck());
    }

    return this.health.check(checks);
  }

  private async redisCheck(): Promise<HealthIndicatorResult> {
    try {
      await this.redisClient!.ping();
      return { redis: { status: 'up' } };
    } catch {
      throw new HealthCheckError('Redis ping failed', {
        redis: { status: 'down' },
      });
    }
  }
}
