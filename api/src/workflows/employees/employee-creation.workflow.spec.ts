import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException } from '@nestjs/common';
import { EmployeeCreationWorkflow } from './employee-creation.workflow';
import { Employee } from '../../modules/employees/entities/employee.entity';
import { User } from '../../modules/auth/entities/user.entity';
import { App } from '../../modules/access-control/entities/app.entity';
import { UserApp } from '../../modules/access-control/entities/user-app.entity';
import { UserCompany } from '../../modules/access-control/entities/user-company.entity';
import { UserRole } from '../../modules/access-control/entities/user-role.entity';
import { EmployeeSensitiveDataService } from '../../common/services/employee-sensitive-data.service';
import { CreateEmployeeDto } from '../../modules/employees/dto/create-employee.dto';
import { DOMAIN_EVENTS } from '../../common/events/event-names';

describe('EmployeeCreationWorkflow', () => {
  let workflow: EmployeeCreationWorkflow;
  let dataSource: jest.Mocked<DataSource>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let sensitiveDataService: jest.Mocked<EmployeeSensitiveDataService>;
  let mockQueryRunner: jest.Mocked<QueryRunner>;
  let mockManager: jest.Mocked<EntityManager>;

  const mockCreateDto: CreateEmployeeDto = {
    idEmpresa: 1,
    codigo: 'EMP001',
    cedula: '123456789',
    nombre: 'John',
    apellido1: 'Doe',
    email: 'john.doe@example.com',
    fechaIngreso: '2024-01-01',
    crearAccesoKpital: false,
    crearAccesoTimewise: false,
  };

  beforeEach(async () => {
    mockManager = {
      create: jest.fn((entity, data) => data),
      save: jest.fn((entity, data) => Promise.resolve({ id: 1, ...data })),
      findOne: jest.fn(),
      update: jest.fn(),
    } as any;

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: mockManager,
    } as any;

    const mockDataSource = {
      createQueryRunner: jest.fn(() => mockQueryRunner),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockSensitiveDataService = {
      hashCedula: jest.fn(),
      hashEmail: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeCreationWorkflow,
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: EmployeeSensitiveDataService, useValue: mockSensitiveDataService },
      ],
    }).compile();

    workflow = module.get<EmployeeCreationWorkflow>(EmployeeCreationWorkflow);
    dataSource = module.get(DataSource);
    eventEmitter = module.get(EventEmitter2);
    sensitiveDataService = module.get(EmployeeSensitiveDataService);
  });

  describe('execute', () => {
    it('should create employee without digital access', async () => {
      // Arrange
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      sensitiveDataService.encrypt.mockImplementation((val) => `encrypted-${val}`);
      mockManager.findOne.mockResolvedValue(null);
      mockManager.save.mockImplementation((entity, data) =>
        Promise.resolve({ ...data, id: 1, codigo: 'KPid-1-EMP001' }),
      );

      // Act
      const result = await workflow.execute(mockCreateDto, 1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('employee');
      expect(result.data?.appsAssigned).toEqual([]);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DOMAIN_EVENTS.EMPLOYEE.CREATED,
        expect.any(Object),
      );
    });

    it('should create employee with TimeWise access', async () => {
      // Arrange
      const dtoWithTW: CreateEmployeeDto = {
        ...mockCreateDto,
        crearAccesoTimewise: true,
        idRolTimewise: 5,
        passwordInicial: 'Password123!',
      };

      const mockTimewiseApp = { id: 2, codigo: 'timewise', estado: 1 };

      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      sensitiveDataService.encrypt.mockImplementation((val) => `encrypted-${val}`);
      mockManager.findOne
        .mockResolvedValueOnce(null) // No existing user
        .mockResolvedValueOnce(mockTimewiseApp) // Find TimeWise app
        .mockResolvedValueOnce(mockTimewiseApp); // Find TimeWise app again for role

      mockManager.save.mockImplementation((entity, data) =>
        Promise.resolve({ ...data, id: data.id || 1 }),
      );

      // Act
      const result = await workflow.execute(dtoWithTW, 1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user).toBeDefined();
      expect(result.data?.appsAssigned).toContain('timewise');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should create employee with KPITAL access', async () => {
      // Arrange
      const dtoWithKP: CreateEmployeeDto = {
        ...mockCreateDto,
        crearAccesoKpital: true,
        idRolKpital: 3,
        passwordInicial: 'Password123!',
      };

      const mockKpitalApp = { id: 1, codigo: 'kpital', estado: 1 };

      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      sensitiveDataService.encrypt.mockImplementation((val) => `encrypted-${val}`);
      mockManager.findOne
        .mockResolvedValueOnce(null) // No existing user
        .mockResolvedValueOnce(mockKpitalApp) // Find KPITAL app
        .mockResolvedValueOnce(mockKpitalApp); // Find KPITAL app again for role

      mockManager.save.mockImplementation((entity, data) =>
        Promise.resolve({ ...data, id: data.id || 1 }),
      );

      // Act
      const result = await workflow.execute(dtoWithKP, 1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user).toBeDefined();
      expect(result.data?.appsAssigned).toContain('kpital');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should create employee with both KPITAL and TimeWise access', async () => {
      // Arrange
      const dtoWithBoth: CreateEmployeeDto = {
        ...mockCreateDto,
        crearAccesoKpital: true,
        idRolKpital: 3,
        crearAccesoTimewise: true,
        idRolTimewise: 5,
        passwordInicial: 'Password123!',
      };

      const mockTimewiseApp = { id: 2, codigo: 'timewise', estado: 1 };
      const mockKpitalApp = { id: 1, codigo: 'kpital', estado: 1 };

      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      sensitiveDataService.encrypt.mockImplementation((val) => `encrypted-${val}`);
      mockManager.findOne
        .mockResolvedValueOnce(null) // No existing user
        .mockResolvedValueOnce(mockTimewiseApp) // Find TimeWise app
        .mockResolvedValueOnce(mockKpitalApp) // Find KPITAL app
        .mockResolvedValueOnce(mockTimewiseApp) // Find TimeWise app for role
        .mockResolvedValueOnce(mockKpitalApp); // Find KPITAL app for role

      mockManager.save.mockImplementation((entity, data) =>
        Promise.resolve({ ...data, id: data.id || 1 }),
      );

      // Act
      const result = await workflow.execute(dtoWithBoth, 1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user).toBeDefined();
      expect(result.data?.appsAssigned).toEqual(expect.arrayContaining(['timewise', 'kpital']));
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when user email already exists', async () => {
      // Arrange
      const dtoWithAccess: CreateEmployeeDto = {
        ...mockCreateDto,
        crearAccesoKpital: true,
        idRolKpital: 3,
      };

      const existingUser = { id: 99, email: 'john.doe@example.com' };
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      mockManager.findOne.mockResolvedValue(existingUser);

      // Act
      const result = await workflow.execute(dtoWithAccess, 1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Ya existe un usuario con email');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should generate employee code with KPid prefix', async () => {
      // Arrange
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      sensitiveDataService.encrypt.mockImplementation((val) => `encrypted-${val}`);
      mockManager.findOne.mockResolvedValue(null);

      let savedEmployeeId: number | undefined;
      mockManager.save.mockImplementation((entity, data) => {
        if (entity === Employee) {
          savedEmployeeId = data.id || 42;
          return Promise.resolve({ ...data, id: savedEmployeeId });
        }
        return Promise.resolve({ ...data, id: 1 });
      });

      // Act
      await workflow.execute(mockCreateDto, 1);

      // Assert
      expect(mockManager.update).toHaveBeenCalledWith(
        Employee,
        expect.any(Number),
        expect.objectContaining({
          codigo: expect.stringMatching(/^KPid-\d+-EMP001$/),
        }),
      );
    });

    it('should create provisiones aguinaldo when provided', async () => {
      // Arrange
      const dtoWithProvisiones: CreateEmployeeDto = {
        ...mockCreateDto,
        provisionesAguinaldo: [
          {
            idEmpresa: 1,
            montoProvisionado: 50000,
            fechaInicioLaboral: '2023-01-01',
            registroEmpresa: 'Prev Company',
          },
        ],
      };

      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      sensitiveDataService.encrypt.mockImplementation((val) => `encrypted-${val}`);
      mockManager.findOne.mockResolvedValue(null);
      mockManager.save.mockImplementation((entity, data) =>
        Promise.resolve({ ...data, id: 1 }),
      );

      // Act
      const result = await workflow.execute(dtoWithProvisiones, 1);

      // Assert
      expect(result.success).toBe(true);
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          expect.objectContaining({
            idEmpleado: 1,
            montoProvisionado: expect.any(String),
          }),
        ]),
      );
    });

    it('should rollback transaction on error', async () => {
      // Arrange
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      mockManager.save.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await workflow.execute(mockCreateDto, 1);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should hash password when provided', async () => {
      // Arrange
      const dtoWithPassword: CreateEmployeeDto = {
        ...mockCreateDto,
        crearAccesoKpital: true,
        idRolKpital: 3,
        passwordInicial: 'SuperSecret123!',
      };

      const mockKpitalApp = { id: 1, codigo: 'kpital', estado: 1 };
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      sensitiveDataService.encrypt.mockImplementation((val) => `encrypted-${val}`);
      mockManager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockKpitalApp);

      mockManager.save.mockImplementation((entity, data) =>
        Promise.resolve({ ...data, id: 1 }),
      );

      // Act
      const result = await workflow.execute(dtoWithPassword, 1);

      // Assert
      expect(result.success).toBe(true);
      // Password should be hashed (bcrypt generates a hash)
      expect(mockManager.create).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          passwordHash: expect.any(String),
          requiresPasswordReset: 1,
        }),
      );
    });

    it('should emit EMPLOYEE.CREATED event on success', async () => {
      // Arrange
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      sensitiveDataService.encrypt.mockImplementation((val) => `encrypted-${val}`);
      mockManager.findOne.mockResolvedValue(null);
      mockManager.save.mockImplementation((entity, data) =>
        Promise.resolve({ ...data, id: 1 }),
      );

      // Act
      await workflow.execute(mockCreateDto, 1);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DOMAIN_EVENTS.EMPLOYEE.CREATED,
        expect.objectContaining({
          eventName: DOMAIN_EVENTS.EMPLOYEE.CREATED,
          occurredAt: expect.any(Date),
          payload: expect.objectContaining({
            employeeId: expect.any(String),
            companyId: expect.any(String),
          }),
        }),
      );
    });

    it('should handle missing apps gracefully', async () => {
      // Arrange
      const dtoWithAccess: CreateEmployeeDto = {
        ...mockCreateDto,
        crearAccesoTimewise: true,
        idRolTimewise: 5,
      };

      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      sensitiveDataService.encrypt.mockImplementation((val) => `encrypted-${val}`);
      mockManager.findOne
        .mockResolvedValueOnce(null) // No existing user
        .mockResolvedValueOnce(null); // App not found

      mockManager.save.mockImplementation((entity, data) =>
        Promise.resolve({ ...data, id: 1 }),
      );

      // Act
      const result = await workflow.execute(dtoWithAccess, 1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.appsAssigned).toEqual([]);
    });

    it('should always release query runner', async () => {
      // Arrange
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      mockManager.findOne.mockRejectedValue(new Error('Critical error'));

      // Act
      await workflow.execute(mockCreateDto, 1);

      // Assert
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
