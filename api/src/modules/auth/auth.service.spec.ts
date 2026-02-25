import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserApp } from '../access-control/entities/user-app.entity';
import { App } from '../access-control/entities/app.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { Company } from '../companies/entities/company.entity';
import { UserRole } from '../access-control/entities/user-role.entity';
import { UserRoleGlobal } from '../access-control/entities/user-role-global.entity';
import { UserRoleExclusion } from '../access-control/entities/user-role-exclusion.entity';
import { RolePermission } from '../access-control/entities/role-permission.entity';
import { Permission } from '../access-control/entities/permission.entity';
import { UserPermissionOverride } from '../access-control/entities/user-permission-override.entity';
import { UserPermissionGlobalDeny } from '../access-control/entities/user-permission-global-deny.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { AuthzVersionService } from '../authz/authz-version.service';
import { PermissionsCacheService } from '../authz/permissions-cache.service';

jest.mock('bcrypt', () => ({
  ...jest.requireActual('bcrypt'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let userAppRepo: jest.Mocked<Repository<UserApp>>;
  let appRepo: jest.Mocked<Repository<App>>;
  let userCompanyRepo: jest.Mocked<Repository<UserCompany>>;
  let companyRepo: jest.Mocked<Repository<Company>>;
  let userRoleRepo: jest.Mocked<Repository<UserRole>>;
  let userRoleGlobalRepo: jest.Mocked<Repository<UserRoleGlobal>>;
  let rolePermRepo: jest.Mocked<Repository<RolePermission>>;
  let permRepo: jest.Mocked<Repository<Permission>>;
  let refreshSessionRepo: jest.Mocked<Repository<RefreshSession>>;
  const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    nombre: 'Test',
    apellido: 'User',
    passwordHash: 'hashedPassword123',
    avatarUrl: null,
    estado: 1,
    failedAttempts: 0,
    lastFailedAt: null,
    lastSuccessfulLoginAt: null,
    passwordUpdatedAt: new Date(),
    requiresPasswordReset: 0,
    microsoftOid: null,
    microsoftTid: null,
    creadoPor: null,
    modificadoPor: null,
    fechaCreacion: new Date(),
    fechaModificacion: new Date(),
  };

  beforeEach(async () => {
    const mockUsersService = {
      validateForLogin: jest.fn(),
      registerFailedAttempt: jest.fn(),
      registerSuccessfulLogin: jest.fn(),
      findByMicrosoftIdentity: jest.fn(),
      findByEmail: jest.fn(),
      bindMicrosoftIdentity: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };

    const createMockRepository = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      })),
      manager: {
        find: jest.fn(),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(UserApp), useValue: createMockRepository() },
        { provide: getRepositoryToken(App), useValue: createMockRepository() },
        { provide: getRepositoryToken(UserCompany), useValue: createMockRepository() },
        { provide: getRepositoryToken(Company), useValue: createMockRepository() },
        { provide: getRepositoryToken(UserRole), useValue: createMockRepository() },
        { provide: getRepositoryToken(UserRoleGlobal), useValue: createMockRepository() },
        { provide: getRepositoryToken(UserRoleExclusion), useValue: createMockRepository() },
        { provide: getRepositoryToken(RolePermission), useValue: createMockRepository() },
        { provide: getRepositoryToken(Permission), useValue: createMockRepository() },
        { provide: getRepositoryToken(UserPermissionOverride), useValue: createMockRepository() },
        { provide: getRepositoryToken(UserPermissionGlobalDeny), useValue: createMockRepository() },
        { provide: getRepositoryToken(RefreshSession), useValue: createMockRepository() },
        { provide: AuthzVersionService, useValue: { getToken: jest.fn().mockResolvedValue('1-1') } },
        { provide: PermissionsCacheService, useValue: { get: jest.fn(), set: jest.fn(), pruneExpired: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    userAppRepo = module.get(getRepositoryToken(UserApp));
    appRepo = module.get(getRepositoryToken(App));
    userCompanyRepo = module.get(getRepositoryToken(UserCompany));
    companyRepo = module.get(getRepositoryToken(Company));
    userRoleRepo = module.get(getRepositoryToken(UserRole));
    userRoleGlobalRepo = module.get(getRepositoryToken(UserRoleGlobal));
    rolePermRepo = module.get(getRepositoryToken(RolePermission));
    permRepo = module.get(getRepositoryToken(Permission));
    refreshSessionRepo = module.get(getRepositoryToken(RefreshSession));
    mockedBcrypt.compare.mockReset();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      usersService.validateForLogin.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      configService.get.mockReturnValue('30d');
      userAppRepo.find.mockResolvedValue([]);
      userCompanyRepo.find.mockResolvedValue([]);
      refreshSessionRepo.save.mockResolvedValue({} as any);

      // Act
      const result = await service.login('test@example.com', 'password123', '127.0.0.1', 'test-agent');

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('csrfToken');
      expect(result).toHaveProperty('session');
      expect(usersService.registerSuccessfulLogin).toHaveBeenCalledWith(mockUser.id, '127.0.0.1');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      usersService.validateForLogin.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(service.login('invalid@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login('invalid@example.com', 'password')).rejects.toThrow(
        'Credenciales invalidas',
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      usersService.validateForLogin.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(service.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.registerFailedAttempt).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw UnauthorizedException when user has no password hash', async () => {
      // Arrange
      const userWithoutPassword = { ...mockUser, passwordHash: null };
      usersService.validateForLogin.mockResolvedValue(userWithoutPassword);

      // Act & Assert
      await expect(service.login('test@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login('test@example.com', 'password')).rejects.toThrow(
        'Credenciales invalidas',
      );
    });
  });

  describe('buildSession', () => {
    it('should build session with user data and empty apps/companies', async () => {
      // Arrange
      userAppRepo.find.mockResolvedValue([]);
      userCompanyRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.buildSession(mockUser);

      // Assert
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          nombre: mockUser.nombre,
          apellido: mockUser.apellido,
          avatarUrl: mockUser.avatarUrl,
        },
        enabledApps: [],
        companies: [],
        permissions: [],
        roles: [],
      });
    });

    it('should build session with enabled apps', async () => {
      // Arrange
      const mockUserApps = [
        { idUsuario: 1, idApp: 1, estado: 1 },
        { idUsuario: 1, idApp: 2, estado: 1 },
      ];
      const mockApps = [
        { id: 1, codigo: 'kpital', estado: 1 },
        { id: 2, codigo: 'timewise', estado: 1 },
      ];

      userAppRepo.find.mockResolvedValue(mockUserApps as any);
      appRepo.find.mockResolvedValue(mockApps as any);
      userCompanyRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.buildSession(mockUser);

      // Assert
      expect(result.enabledApps).toEqual(['kpital', 'timewise']);
    });

    it('should build session with user companies', async () => {
      // Arrange
      const mockUserCompanies = [
        { idUsuario: 1, idEmpresa: 1, estado: 1 },
        { idUsuario: 1, idEmpresa: 2, estado: 1 },
      ];
      const mockCompanies = [
        { id: 1, nombre: 'Company A', prefijo: 'CA', estado: 1 },
        { id: 2, nombre: 'Company B', prefijo: 'CB', estado: 1 },
      ];

      userAppRepo.find.mockResolvedValue([]);
      userCompanyRepo.find.mockResolvedValue(mockUserCompanies as any);
      companyRepo.find.mockResolvedValue(mockCompanies as any);

      // Act
      const result = await service.buildSession(mockUser);

      // Assert
      expect(result.companies).toEqual([
        { id: 1, nombre: 'Company A', codigo: 'CA' },
        { id: 2, nombre: 'Company B', codigo: 'CB' },
      ]);
    });
  });

  describe('resolvePermissions', () => {
    it('should return empty permissions when app not found', async () => {
      // Arrange
      appRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.resolvePermissions(1, 1, 'invalid-app');

      // Assert
      expect(result).toEqual({ permissions: [], roles: [] });
    });

    it('should return empty permissions when user has no company access', async () => {
      // Arrange
      const mockApp = { id: 1, codigo: 'kpital', estado: 1 };
      appRepo.findOne.mockResolvedValue(mockApp as any);
      userCompanyRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.resolvePermissions(1, 1, 'kpital');

      // Assert
      expect(result).toEqual({ permissions: [], roles: [] });
    });

    it('should resolve permissions from user roles', async () => {
      // Arrange
      const mockApp = { id: 1, codigo: 'kpital', estado: 1 };
      const mockUserCompany = { idUsuario: 1, idEmpresa: 1, estado: 1 };
      const mockUserRoles = [{ idUsuario: 1, idRol: 1, idEmpresa: 1, idApp: 1, estado: 1 }];
      const mockRolePerms = [{ idRol: 1, idPermiso: 1 }];
      const mockPermissions = [{ id: 1, codigo: 'employee:view', estado: 1 }];

      appRepo.findOne.mockResolvedValue(mockApp as any);
      userCompanyRepo.findOne.mockResolvedValue(mockUserCompany as any);
      userRoleRepo.find.mockResolvedValue(mockUserRoles as any);
      userRoleGlobalRepo.find.mockResolvedValue([]);
      rolePermRepo.find.mockResolvedValue(mockRolePerms as any);
      permRepo.find.mockResolvedValue(mockPermissions as any);
      permRepo.manager.find.mockResolvedValue([{ id: 1, codigo: 'EMPLOYEE_VIEWER' }] as any);

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      (userAppRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.resolvePermissions(1, 1, 'kpital');

      // Assert
      expect(result.permissions).toContain('employee:view');
      expect(result.roles).toContain('EMPLOYEE_VIEWER');
    });
  });

  describe('refreshSession', () => {
    it('should refresh session with valid refresh token', async () => {
      // Arrange
      const mockPayload = {
        sub: 1,
        email: 'test@example.com',
        type: 'refresh' as const,
        jti: 'test-jti',
      };
      const mockStoredSession = {
        jti: 'test-jti',
        userId: 1,
        tokenHash: await bcrypt.hash('refresh-token', 10),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      };

      jwtService.verify.mockReturnValue(mockPayload);
      refreshSessionRepo.findOne.mockResolvedValue(mockStoredSession as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      usersService.findByEmail.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('new-access-token');
      refreshSessionRepo.save.mockResolvedValue({} as any);
      userAppRepo.find.mockResolvedValue([]);
      userCompanyRepo.find.mockResolvedValue([]);
      configService.get.mockReturnValue('30d');

      // Act
      const result = await service.refreshSession('refresh-token', '127.0.0.1', 'test-agent');

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('csrfToken');
      expect(result).toHaveProperty('session');
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      // Arrange
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refreshSession('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when stored session not found', async () => {
      // Arrange
      const mockPayload = {
        sub: 1,
        email: 'test@example.com',
        type: 'refresh' as const,
        jti: 'test-jti',
      };

      jwtService.verify.mockReturnValue(mockPayload);
      refreshSessionRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshSession('refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshSession('refresh-token')).rejects.toThrow(
        'Refresh token invalido o revocado',
      );
    });
  });

  describe('loginWithMicrosoftIdentity', () => {
    it('should login user with Microsoft identity', async () => {
      // Arrange
      usersService.findByMicrosoftIdentity.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      configService.get.mockReturnValue('30d');
      userAppRepo.find.mockResolvedValue([]);
      userCompanyRepo.find.mockResolvedValue([]);
      refreshSessionRepo.save.mockResolvedValue({} as any);

      // Act
      const result = await service.loginWithMicrosoftIdentity(
        'microsoft-oid',
        'microsoft-tid',
        '127.0.0.1',
        'test-agent',
      );

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('session');
      expect(usersService.registerSuccessfulLogin).toHaveBeenCalledWith(mockUser.id, '127.0.0.1');
    });

    it('should throw ForbiddenException when Microsoft account not found', async () => {
      // Arrange
      usersService.findByMicrosoftIdentity.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.loginWithMicrosoftIdentity('microsoft-oid', 'microsoft-tid'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.loginWithMicrosoftIdentity('microsoft-oid', 'microsoft-tid'),
      ).rejects.toThrow('Su cuenta Microsoft no esta aprovisionada en KPITAL');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token successfully', async () => {
      // Arrange
      const mockPayload = {
        sub: 1,
        email: 'test@example.com',
        type: 'refresh' as const,
        jti: 'test-jti',
      };

      jwtService.verify.mockReturnValue(mockPayload);
      refreshSessionRepo.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.revokeRefreshToken('refresh-token');

      // Assert
      expect(refreshSessionRepo.update).toHaveBeenCalled();
    });

    it('should handle missing refresh token gracefully', async () => {
      // Act
      await service.revokeRefreshToken(undefined);

      // Assert
      expect(refreshSessionRepo.update).not.toHaveBeenCalled();
    });

    it('should handle invalid token gracefully without throwing', async () => {
      // Arrange
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.revokeRefreshToken('invalid-token')).resolves.not.toThrow();
    });
  });
});
