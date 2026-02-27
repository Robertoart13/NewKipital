import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import type Redis from 'ioredis';
import {
  RateLimiterAbstract,
  RateLimiterMemory,
  RateLimiterRedis,
} from 'rate-limiter-flexible';
import { REDIS_CLIENT } from '../../config/redis.config';

/**
 * Servicio de rate limiting para endpoints de autenticación.
 *
 * - Con REDIS_HOST configurado → usa RateLimiterRedis (distribuido, apto para HA).
 * - Sin REDIS_HOST → usa RateLimiterMemory (fallback de desarrollo).
 *
 * El pool de limiters se crea lazy por combinación (points, durationSec)
 * para reutilizar instancias entre llamadas.
 */
@Injectable()
export class AuthRateLimitService {
  private readonly limiters = new Map<string, RateLimiterAbstract>();

  constructor(
    @Optional()
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis | null,
  ) {}

  private getLimiter(points: number, durationSec: number): RateLimiterAbstract {
    const cacheKey = `${points}:${durationSec}`;

    if (!this.limiters.has(cacheKey)) {
      const opts = { points, duration: durationSec, keyPrefix: 'auth-rl' };
      const limiter: RateLimiterAbstract = this.redisClient
        ? new RateLimiterRedis({ storeClient: this.redisClient, ...opts })
        : new RateLimiterMemory(opts);

      this.limiters.set(cacheKey, limiter);
    }

    return this.limiters.get(cacheKey)!;
  }

  async consume(key: string, limit: number, windowMs: number): Promise<void> {
    const durationSec = Math.ceil(windowMs / 1000);
    const limiter = this.getLimiter(limit, durationSec);

    try {
      await limiter.consume(key);
    } catch {
      throw new HttpException(
        'Demasiados intentos. Intente nuevamente en unos minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
