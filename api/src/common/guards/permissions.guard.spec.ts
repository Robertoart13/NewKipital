import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { AuthService } from '../../modules/auth/auth.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockAuthService = {
      resolvePermissions: jest.fn(),
      resolvePermissionsAcrossCompanies: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get(Reflector);
    authService = module.get(AuthService);
  });

  const createMockExecutionContext = (
    user: any,
    query: Record<string, unknown> = {},
    body: Record<string, unknown> = {},
    headers: Record<string, unknown> = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          query,
          body,
          headers,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow access when no permissions are required', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext({ userId: 1 });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow access when required permissions array is empty', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext({ userId: 1 });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(['employee:view']);
      const context = createMockExecutionContext(undefined);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Sesion no valida');
    });

    it('should allow access with valid permissions and companyId', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['employee:view'])
        .mockReturnValueOnce(false);

      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view', 'employee:create'],
        roles: ['EMPLOYEE_VIEWER'],
      });

      const context = createMockExecutionContext(
        { userId: 1 },
        { companyId: '123' },
        {},
        { 'x-app-code': 'kpital' },
      );

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(authService.resolvePermissions).toHaveBeenCalledWith(1, 123, 'kpital', { bypassCache: false });
    });

    it('should throw ForbiddenException when user lacks required permissions', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['employee:view', 'employee:delete'])
        .mockReturnValueOnce(false);

      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view'],
        roles: ['EMPLOYEE_VIEWER'],
      });

      const context = createMockExecutionContext(
        { userId: 1 },
        { companyId: '123' },
      );

      // Act & Assert
      const execution = guard.canActivate(context);
      await expect(execution).rejects.toThrow(ForbiddenException);
      await expect(execution).rejects.toThrow(
        'Permisos insuficientes. Requiere: employee:view, employee:delete',
      );
    });

    it('should resolve permissions across companies when no companyId provided', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['employee:view'])
        .mockReturnValueOnce(true);

      authService.resolvePermissionsAcrossCompanies.mockResolvedValue({
        permissions: ['employee:view'],
        roles: ['EMPLOYEE_VIEWER'],
      });

      const context = createMockExecutionContext(
        { userId: 1 },
        {},
        {},
        { 'x-app-code': 'kpital' },
      );

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(authService.resolvePermissionsAcrossCompanies).not.toHaveBeenCalled();
    });

    it('should extract companyId from idEmpresa query param', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['employee:view'])
        .mockReturnValueOnce(false);

      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view'],
        roles: ['EMPLOYEE_VIEWER'],
      });

      const context = createMockExecutionContext(
        { userId: 1 },
        { idEmpresa: '456' },
      );

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(authService.resolvePermissions).toHaveBeenCalledWith(1, 456, 'kpital', { bypassCache: false });
    });

    it('should extract companyId from body', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['employee:create'])
        .mockReturnValueOnce(false);

      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:create'],
        roles: ['EMPLOYEE_MANAGER'],
      });

      const context = createMockExecutionContext(
        { userId: 1 },
        {},
        { idEmpresa: 789 },
      );

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(authService.resolvePermissions).toHaveBeenCalledWith(1, 789, 'kpital', { bypassCache: false });
    });

    it('should support legacy company:manage permission for granular permissions', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['company:create', 'company:update'])
        .mockReturnValueOnce(false);

      authService.resolvePermissions.mockResolvedValue({
        permissions: ['company:manage'], // Legacy permission that covers all company:* actions
        roles: ['COMPANY_ADMIN'],
      });

      const context = createMockExecutionContext(
        { userId: 1 },
        { companyId: '123' },
      );

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should use default appCode "kpital" when not provided', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['employee:view'])
        .mockReturnValueOnce(false);

      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view'],
        roles: ['EMPLOYEE_VIEWER'],
      });

      const context = createMockExecutionContext(
        { userId: 1 },
        { companyId: '123' },
      );

      // Act
      await guard.canActivate(context);

      // Assert
      expect(authService.resolvePermissions).toHaveBeenCalledWith(1, 123, 'kpital', { bypassCache: false });
    });

    it('should extract appCode from query parameter', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['employee:view'])
        .mockReturnValueOnce(false);

      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view'],
        roles: ['EMPLOYEE_VIEWER'],
      });

      const context = createMockExecutionContext(
        { userId: 1 },
        { companyId: '123', appCode: 'timewise' },
      );

      // Act
      await guard.canActivate(context);

      // Assert
      expect(authService.resolvePermissions).toHaveBeenCalledWith(1, 123, 'timewise', { bypassCache: false });
    });

    it('should extract appCode from body', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['employee:view'])
        .mockReturnValueOnce(false);

      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view'],
        roles: ['EMPLOYEE_VIEWER'],
      });

      const context = createMockExecutionContext(
        { userId: 1 },
        { companyId: '123' },
        { appCode: 'timewise' },
      );

      // Act
      await guard.canActivate(context);

      // Assert
      expect(authService.resolvePermissions).toHaveBeenCalledWith(1, 123, 'timewise', { bypassCache: false });
    });

    it('should extract appCode from headers', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['employee:view'])
        .mockReturnValueOnce(false);

      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view'],
        roles: ['EMPLOYEE_VIEWER'],
      });

      const context = createMockExecutionContext(
        { userId: 1 },
        { companyId: '123' },
        {},
        { 'x-app-code': 'timewise' },
      );

      // Act
      await guard.canActivate(context);

      // Assert
      expect(authService.resolvePermissions).toHaveBeenCalledWith(1, 123, 'timewise', { bypassCache: false });
    });

    it('should normalize appCode to lowercase', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['employee:view'])
        .mockReturnValueOnce(false);

      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view'],
        roles: ['EMPLOYEE_VIEWER'],
      });

      const context = createMockExecutionContext(
        { userId: 1 },
        { companyId: '123', appCode: 'TIMEWISE' },
      );

      // Act
      await guard.canActivate(context);

      // Assert
      expect(authService.resolvePermissions).toHaveBeenCalledWith(1, 123, 'timewise', { bypassCache: false });
    });

    it('should inject resolved permissions and roles into request.user', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['employee:view'])
        .mockReturnValueOnce(false);

      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view', 'employee:create'],
        roles: ['EMPLOYEE_VIEWER', 'EMPLOYEE_MANAGER'],
      });

      const mockRequest = {
        user: { userId: 1 },
        query: { companyId: '123' },
        body: {},
        headers: {},
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockRequest.user).toEqual({
        userId: 1,
        permissions: ['employee:view', 'employee:create'],
        roles: ['EMPLOYEE_VIEWER', 'EMPLOYEE_MANAGER'],
      });
    });

    it('should handle invalid companyId gracefully', async () => {
      // Arrange
      reflector.getAllAndOverride
        .mockReturnValueOnce(['employee:view'])
        .mockReturnValueOnce(true);

      authService.resolvePermissionsAcrossCompanies.mockResolvedValue({
        permissions: ['employee:view'],
        roles: ['EMPLOYEE_VIEWER'],
      });

      const context = createMockExecutionContext(
        { userId: 1 },
        { companyId: 'invalid' },
      );

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(authService.resolvePermissionsAcrossCompanies).not.toHaveBeenCalled();
    });
  });
});
