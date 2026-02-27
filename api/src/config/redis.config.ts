import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Provider factory para el cliente Redis.
 *
 * Si REDIS_HOST está definido → conecta a Redis (para HA distribuida).
 * Si no → devuelve null (fallback a memoria; comportamiento de desarrollo).
 *
 * Env vars:
 *   REDIS_HOST      — hostname del servidor Redis (ej: "127.0.0.1" o "redis")
 *   REDIS_PORT      — puerto (default: 6379)
 *   REDIS_PASSWORD  — contraseña (opcional)
 */
export const redisClientProvider = {
  provide: REDIS_CLIENT,
  useFactory: (config: ConfigService): Redis | null => {
    const host = config.get<string>('REDIS_HOST');
    if (!host) {
      return null;
    }

    return new Redis({
      host,
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
  },
  inject: [ConfigService],
};
