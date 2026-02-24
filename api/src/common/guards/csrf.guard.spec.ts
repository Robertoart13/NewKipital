import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new CsrfGuard(reflector as unknown as Reflector);
  });

  const createContext = (
    method: string,
    cookies: Record<string, string> = {},
    headers: Record<string, string> = {},
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ method, cookies, headers }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  it('should allow GET requests without CSRF', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(createContext('GET'))).toBe(true);
  });

  it('should allow HEAD and OPTIONS without CSRF', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(createContext('HEAD'))).toBe(true);
    expect(guard.canActivate(createContext('OPTIONS'))).toBe(true);
  });

  it('should allow POST when @SkipCsrf is set', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(guard.canActivate(createContext('POST'))).toBe(true);
  });

  it('should allow POST when CSRF cookie and header match', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = createContext(
      'POST',
      { platform_csrf_token: 'abc123' },
      { 'x-csrf-token': 'abc123' },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when CSRF tokens mismatch', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = createContext(
      'POST',
      { platform_csrf_token: 'abc' },
      { 'x-csrf-token': 'xyz' },
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw when CSRF cookie is missing on POST', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = createContext('POST', {}, { 'x-csrf-token': 'abc' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw when CSRF header is missing on DELETE', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = createContext('DELETE', { platform_csrf_token: 'abc' }, {});
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw on PUT without tokens', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    expect(() => guard.canActivate(createContext('PUT'))).toThrow(ForbiddenException);
  });

  it('should throw on PATCH without tokens', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    expect(() => guard.canActivate(createContext('PATCH'))).toThrow(ForbiddenException);
  });
});
