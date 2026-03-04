import { createHash } from 'crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';

import { REDIS_CLIENT } from '../../config/redis.config';
import { DEFAULT_CACHE_TTL_MS } from '../constants/cache.constants';

import type { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type CacheStatsSnapshot = {
  hits: number;
  misses: number;
  sets: number;
  errors: number;
  invalidations: number;
  bypasses: number;
  breakerOpen: number;
};

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger(AppCacheService.name);
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly versionStore = new Map<string, number>();
  private readonly strictRedis: boolean;
  private readonly envPrefix: string;
  private readonly keyVersion: string;
  private readonly allowStaleWhileRevalidate: boolean;
  private readonly redisTimeoutMs: number;
  private readonly breakerFailureThreshold: number;
  private readonly breakerResetMs: number;
  private breakerState: 'closed' | 'open' = 'closed';
  private breakerOpenedAt = 0;
  private breakerFailures = 0;
  private readonly stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    errors: 0,
    invalidations: 0,
    bypasses: 0,
    breakerOpen: 0,
  };

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis | null,
    private readonly config: ConfigService,
  ) {
    this.strictRedis =
      (this.config.get<string>('CACHE_STRICT_REDIS') ?? 'false').toLowerCase() === 'true';
    this.envPrefix = (this.config.get<string>('CACHE_ENV_PREFIX') ?? 'prod').trim() || 'prod';
    this.keyVersion = (this.config.get<string>('CACHE_KEY_VERSION') ?? 'v1').trim() || 'v1';
    this.allowStaleWhileRevalidate =
      (this.config.get<string>('CACHE_SWR_ENABLED') ?? 'true').toLowerCase() === 'true';
    this.redisTimeoutMs = Math.max(
      Number(this.config.get<number>('CACHE_REDIS_TIMEOUT_MS') ?? 75),
      10,
    );
    this.breakerFailureThreshold = Math.max(
      Number(this.config.get<number>('CACHE_BREAKER_THRESHOLD') ?? 5),
      1,
    );
    this.breakerResetMs = Math.max(
      Number(this.config.get<number>('CACHE_BREAKER_RESET_MS') ?? 10_000),
      1000,
    );
  }

  async getOrSet<T>(
    scope: string,
    companyKey: string,
    userScope: string,
    keyParts: unknown,
    loader: () => Promise<{ value: T; cacheable: boolean }>,
    ttlMs: number = DEFAULT_CACHE_TTL_MS,
  ): Promise<T> {
    const version = await this.getScopeVersion(scope, companyKey);
    const key = this.buildCacheKey(scope, companyKey, userScope, version, keyParts);
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.stats.hits += 1;
      return cached;
    }
    this.stats.misses += 1;

    if (this.isBreakerOpen()) {
      this.stats.breakerOpen += 1;
      const { value } = await loader();
      return value;
    }

    if (this.redisClient) {
      const lockKey = `${key}:lock`;
      const lockOwner = `${process.pid}-${Date.now()}`;
      const gotLock = await this.tryAcquireLock(lockKey, lockOwner, 30_000);
      if (!gotLock) {
        if (this.allowStaleWhileRevalidate) {
          const stale = await this.get<T>(key);
          if (stale !== null) {
            this.stats.bypasses += 1;
            return stale;
          }
        }
        await this.waitForLockRelease(lockKey, 100);
        const afterWait = await this.get<T>(key);
        if (afterWait !== null) {
          this.stats.hits += 1;
          return afterWait;
        }
      }
    }

    const { value, cacheable } = await loader();
    if (cacheable) {
      await this.set(key, value, ttlMs);
    }
    if (this.redisClient) {
      const lockKey = `${key}:lock`;
      await this.releaseLock(lockKey);
    }
    return value;
  }

  async invalidateScope(scope: string, companyKey: string): Promise<void> {
    await this.bumpScopeVersion(scope, companyKey);
    this.stats.invalidations += 1;
  }

  getStats(): CacheStatsSnapshot {
    return { ...this.stats };
  }

  private buildCacheKey(
    scope: string,
    companyKey: string,
    userScope: string,
    version: number,
    keyParts: unknown,
  ) {
    const payload = JSON.stringify({
      env: this.envPrefix,
      keyVersion: this.keyVersion,
      scope,
      companyKey,
      userScope,
      keyParts: keyParts ?? null,
    });
    const hash = createHash('sha256').update(payload).digest('hex');
    return `cache:${this.envPrefix}:${scope}:${companyKey}:${userScope}:v${version}:${hash}`;
  }

  private async get<T>(key: string): Promise<T | null> {
    if (this.isBreakerOpen()) {
      this.stats.bypasses += 1;
      return null;
    }
    if (this.redisClient) {
      try {
        const value = await this.withRedisTimeout(this.redisClient.get(key));
        if (!value) return null;
        this.recordBreakerSuccess();
        return JSON.parse(value) as T;
      } catch (error) {
        this.stats.errors += 1;
        this.recordBreakerFailure();
        this.logger.warn('Redis cache get failed', {
          key,
          error: error instanceof Error ? error.message : String(error),
        });
        if (this.strictRedis) {
          throw error;
        }
        return null;
      }
    }
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (this.isBreakerOpen()) {
      this.stats.bypasses += 1;
      return;
    }
    if (this.redisClient) {
      try {
        await this.withRedisTimeout(
          this.redisClient.set(key, JSON.stringify(value), 'PX', Math.max(ttlMs, 0)),
        );
        this.stats.sets += 1;
        this.recordBreakerSuccess();
        return;
      } catch (error) {
        this.stats.errors += 1;
        this.recordBreakerFailure();
        this.logger.warn('Redis cache set failed', {
          key,
          error: error instanceof Error ? error.message : String(error),
        });
        if (this.strictRedis) {
          throw error;
        }
      }
    }
    const expiresAt = Date.now() + Math.max(ttlMs, 0);
    this.store.set(key, { value, expiresAt });
    this.stats.sets += 1;
  }

  private async getScopeVersion(scope: string, companyKey: string): Promise<number> {
    if (this.redisClient) {
      try {
        const key = this.buildScopeVersionKey(scope, companyKey);
        const raw = await this.withRedisTimeout(this.redisClient.get(key));
        if (!raw) {
          await this.withRedisTimeout(this.redisClient.set(key, '1'));
          this.recordBreakerSuccess();
          return 1;
        }
        const parsed = Number.parseInt(raw, 10);
        if (Number.isNaN(parsed)) {
          await this.withRedisTimeout(this.redisClient.set(key, '1'));
          this.recordBreakerSuccess();
          return 1;
        }
        this.recordBreakerSuccess();
        return parsed;
      } catch (error) {
        this.stats.errors += 1;
        this.recordBreakerFailure();
        this.logger.warn('Redis cache version read failed', {
          scope,
          error: error instanceof Error ? error.message : String(error),
        });
        if (this.strictRedis) {
          throw error;
        }
      }
    }
    const mapKey = this.buildScopeVersionKey(scope, companyKey);
    const existing = this.versionStore.get(mapKey);
    if (existing != null) return existing;
    this.versionStore.set(mapKey, 1);
    return 1;
  }

  private async bumpScopeVersion(scope: string, companyKey: string): Promise<void> {
    if (this.redisClient) {
      try {
        const key = this.buildScopeVersionKey(scope, companyKey);
        await this.withRedisTimeout(this.redisClient.incr(key));
        this.recordBreakerSuccess();
        return;
      } catch (error) {
        this.stats.errors += 1;
        this.recordBreakerFailure();
        this.logger.warn('Redis cache version bump failed', {
          scope,
          error: error instanceof Error ? error.message : String(error),
        });
        if (this.strictRedis) {
          throw error;
        }
      }
    }
    const mapKey = this.buildScopeVersionKey(scope, companyKey);
    const next = (this.versionStore.get(mapKey) ?? 0) + 1;
    this.versionStore.set(mapKey, next);
  }

  private buildScopeVersionKey(scope: string, companyKey: string): string {
    return `cache:version:${this.envPrefix}:${scope}:${companyKey}`;
  }

  private async withRedisTimeout<T>(promise: Promise<T>): Promise<T> {
    if (!this.redisTimeoutMs) return promise;
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis timeout'));
      }, this.redisTimeoutMs);
      promise
        .then((value) => {
          clearTimeout(timeout);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private isBreakerOpen(): boolean {
    if (this.breakerState === 'open') {
      if (Date.now() - this.breakerOpenedAt > this.breakerResetMs) {
        this.breakerState = 'closed';
        this.breakerFailures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  private recordBreakerFailure(): void {
    this.breakerFailures += 1;
    if (this.breakerFailures >= this.breakerFailureThreshold) {
      this.breakerState = 'open';
      this.breakerOpenedAt = Date.now();
    }
  }

  private recordBreakerSuccess(): void {
    this.breakerFailures = 0;
    if (this.breakerState === 'open') {
      this.breakerState = 'closed';
      this.breakerOpenedAt = 0;
    }
  }

  private async tryAcquireLock(lockKey: string, owner: string, ttlMs: number): Promise<boolean> {
    if (!this.redisClient) return false;
    try {
      const result = await this.withRedisTimeout(
        this.redisClient.set(lockKey, owner, 'PX', ttlMs, 'NX'),
      );
      return result === 'OK';
    } catch {
      this.stats.errors += 1;
      this.recordBreakerFailure();
      return false;
    }
  }

  private async waitForLockRelease(lockKey: string, waitMs: number): Promise<void> {
    if (!this.redisClient) return;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    try {
      const exists = await this.withRedisTimeout(this.redisClient.exists(lockKey));
      if (exists) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    } catch {
      // ignore lock wait errors
    }
  }

  private async releaseLock(lockKey: string): Promise<void> {
    if (!this.redisClient) return;
    try {
      await this.withRedisTimeout(this.redisClient.del(lockKey));
    } catch {
      // ignore
    }
  }
}
