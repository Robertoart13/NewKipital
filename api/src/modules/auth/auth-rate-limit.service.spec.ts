import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  let service: AuthRateLimitService;

  beforeEach(() => {
    // null → sin Redis → usa RateLimiterMemory como fallback
    service = new AuthRateLimitService(null);
  });

  it('should allow first request within limit', async () => {
    await expect(
      service.consume('ip:1.2.3.4', 5, 60_000),
    ).resolves.not.toThrow();
  });

  it('should allow multiple requests below limit', async () => {
    for (let i = 0; i < 4; i++) {
      await expect(
        service.consume('ip:test-below', 5, 60_000),
      ).resolves.not.toThrow();
    }
  });

  it('should throw 429 when limit is exceeded', async () => {
    for (let i = 0; i < 5; i++) {
      await service.consume('ip:block', 5, 60_000);
    }

    await expect(
      service.consume('ip:block', 5, 60_000),
    ).rejects.toThrow(HttpException);

    try {
      await service.consume('ip:block', 5, 60_000);
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  it('should track different keys independently', async () => {
    for (let i = 0; i < 5; i++) {
      await service.consume('key-a-indep', 5, 60_000);
    }
    await expect(
      service.consume('key-b-indep', 5, 60_000),
    ).resolves.not.toThrow();
  });

  it('falls back to RateLimiterMemory when redisClient is null', async () => {
    const memService = new AuthRateLimitService(null);
    await expect(memService.consume('mem:1', 3, 60_000)).resolves.not.toThrow();
    await expect(memService.consume('mem:1', 3, 60_000)).resolves.not.toThrow();
    await expect(memService.consume('mem:1', 3, 60_000)).resolves.not.toThrow();
    await expect(memService.consume('mem:1', 3, 60_000)).rejects.toThrow(
      HttpException,
    );
  });

  it('reuses the same limiter instance for identical limit+window', async () => {
    const spy = jest.spyOn(service as any, 'getLimiter');
    await service.consume('reuse:1', 5, 60_000);
    await service.consume('reuse:2', 5, 60_000);
    // Ambas llamadas con los mismos params → mismo limiter del pool
    expect(spy).toHaveBeenCalledTimes(2);
    const results = spy.mock.results.map((r) => r.value);
    expect(results[0]).toBe(results[1]);
  });
});
