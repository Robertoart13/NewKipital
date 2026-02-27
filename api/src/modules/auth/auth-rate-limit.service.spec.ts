import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  let service: AuthRateLimitService;

  beforeEach(() => {
    service = new AuthRateLimitService();
  });

  it('should allow first request within limit', () => {
    expect(() => service.consume('ip:1.2.3.4', 5, 60_000)).not.toThrow();
  });

  it('should allow multiple requests below limit', () => {
    for (let i = 0; i < 4; i++) {
      expect(() => service.consume('ip:test', 5, 60_000)).not.toThrow();
    }
  });

  it('should throw 429 when limit is exceeded', () => {
    for (let i = 0; i < 5; i++) {
      service.consume('ip:block', 5, 60_000);
    }
    expect(() => service.consume('ip:block', 5, 60_000)).toThrow(HttpException);
    try {
      service.consume('ip:block', 5, 60_000);
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  it('should reset counter after window expires', () => {
    jest.useFakeTimers();
    for (let i = 0; i < 5; i++) {
      service.consume('ip:expire', 5, 1000);
    }
    jest.advanceTimersByTime(1001);
    expect(() => service.consume('ip:expire', 5, 1000)).not.toThrow();
    jest.useRealTimers();
  });

  it('should track different keys independently', () => {
    for (let i = 0; i < 5; i++) {
      service.consume('key-a', 5, 60_000);
    }
    expect(() => service.consume('key-b', 5, 60_000)).not.toThrow();
  });
});
