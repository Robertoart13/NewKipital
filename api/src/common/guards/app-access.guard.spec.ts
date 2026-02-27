import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppAccessGuard } from './app-access.guard';

describe('AppAccessGuard', () => {
  let guard: AppAccessGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new AppAccessGuard(reflector as unknown as Reflector);
  });

  const createContext = (user: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  it('should allow access when no @RequireApp is set', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(createContext({ enabledApps: [] }))).toBe(true);
  });

  it('should allow access when user has the required app', () => {
    reflector.getAllAndOverride.mockReturnValue('kpital');
    expect(
      guard.canActivate(createContext({ enabledApps: ['kpital', 'timewise'] })),
    ).toBe(true);
  });

  it('should throw ForbiddenException when user lacks the required app', () => {
    reflector.getAllAndOverride.mockReturnValue('kpital');
    expect(() =>
      guard.canActivate(createContext({ enabledApps: ['timewise'] })),
    ).toThrow(ForbiddenException);
  });

  it('should throw when user object is missing', () => {
    reflector.getAllAndOverride.mockReturnValue('kpital');
    expect(() => guard.canActivate(createContext(null))).toThrow(
      ForbiddenException,
    );
  });

  it('should throw when enabledApps is missing', () => {
    reflector.getAllAndOverride.mockReturnValue('timewise');
    expect(() => guard.canActivate(createContext({ userId: 1 }))).toThrow(
      ForbiddenException,
    );
  });
});
