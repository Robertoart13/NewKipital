import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmployeesService } from './employees.service';
import { Employee, MonedaSalarioEmpleado } from './entities/employee.entity';
import { EmployeeAguinaldoProvision } from './entities/employee-aguinaldo-provision.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { User } from '../auth/entities/user.entity';
import { EmployeeCreationWorkflow } from '../../workflows/employees/employee-creation.workflow';
import { AuthService } from '../auth/auth.service';
import { EmployeeSensitiveDataService } from '../../common/services/employee-sensitive-data.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { PayrollCalendar } from '../payroll/entities/payroll-calendar.entity';
import { PersonalAction } from '../personal-actions/entities/personal-action.entity';
import { EmployeeVacationService } from './services/employee-vacation.service';
import { AuditOutboxService } from '../integration/audit-outbox.service';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let employeeRepo: jest.Mocked<Repository<Employee>>;
  let userCompanyRepo: jest.Mocked<Repository<UserCompany>>;
  let creationWorkflow: jest.Mocked<EmployeeCreationWorkflow>;
  let authService: jest.Mocked<AuthService>;
  let sensitiveDataService: jest.Mocked<EmployeeSensitiveDataService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEmployee: Employee = {
    id: 1,
    idUsuario: null,
    idEmpresa: 1,
    codigo: 'KPid-1-EMP001',
    cedula: 'encrypted-cedula',
    cedulaHash: 'hash-cedula',
    nombre: 'encrypted-nombre',
    apellido1: 'encrypted-apellido',
    apellido2: null,
    genero: null,
    estadoCivil: null,
    cantidadHijos: 0,
    telefono: null,
    direccion: null,
    email: 'encrypted-email',
    emailHash: 'hash-email',
    idDepartamento: null,
    idPuesto: null,
    idSupervisor: null,
    fechaIngreso: new Date('2024-01-01'),
    tipoContrato: null,
    jornada: null,
    idPeriodoPago: null,
    salarioBase: null,
    monedaSalario: MonedaSalarioEmpleado.CRC,
    numeroCcss: null,
    cuentaBanco: null,
    vacacionesAcumuladas: null,
    cesantiaAcumulada: null,
    fechaSalida: null,
    motivoSalida: null,
    estado: 1,
    creadoPor: 1,
    modificadoPor: 1,
    fechaCreacion: new Date(),
    fechaModificacion: new Date(),
    datosEncriptados: 1,
    versionEncriptacion: 'v1',
    fechaEncriptacion: new Date(),
    departamento: null,
    puesto: null,
    periodoPago: null,
    supervisor: null,
  };

  beforeEach(async () => {
    const mockRepository = () => ({
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      query: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
        getOne: jest.fn(),
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
    });

    const mockCreationWorkflow = {
      execute: jest.fn(),
    };

    const mockAuthService = {
      resolvePermissions: jest.fn(),
    };

    const mockSensitiveDataService = {
      hashCedula: jest.fn(),
      hashEmail: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };
    mockSensitiveDataService.decrypt.mockImplementation((value) => value as string);

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
      createQueryRunner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: getRepositoryToken(Employee), useValue: mockRepository() },
        { provide: getRepositoryToken(EmployeeAguinaldoProvision), useValue: mockRepository() },
        { provide: getRepositoryToken(UserCompany), useValue: mockRepository() },
        { provide: getRepositoryToken(User), useValue: mockRepository() },
        { provide: getRepositoryToken(PayrollCalendar), useValue: mockRepository() },
        { provide: getRepositoryToken(PersonalAction), useValue: mockRepository() },
        { provide: EmployeeCreationWorkflow, useValue: mockCreationWorkflow },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EmployeeSensitiveDataService, useValue: mockSensitiveDataService },
        { provide: EmployeeVacationService, useValue: { syncAccountAnchorOnJoinDateChange: jest.fn() } },
        { provide: AuditOutboxService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    employeeRepo = module.get(getRepositoryToken(Employee));
    userCompanyRepo = module.get(getRepositoryToken(UserCompany));
    creationWorkflow = module.get(EmployeeCreationWorkflow);
    authService = module.get(AuthService);
    sensitiveDataService = module.get(EmployeeSensitiveDataService);
    eventEmitter = module.get(EventEmitter2);
    authService.resolvePermissions.mockResolvedValue({
      permissions: [],
      roles: [],
    });
  });

  describe('create', () => {
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

    it('should create employee without digital access', async () => {
      // Arrange
      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      (employeeRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      employeeRepo.findOne.mockResolvedValue(null);
      creationWorkflow.execute.mockResolvedValue({
        success: true,
        data: {
          employee: mockEmployee,
          appsAssigned: [],
        },
      });

      // Act
      const result = await service.create(mockCreateDto, 1);

      // Assert
      expect(result).toHaveProperty('success', true);
      expect(creationWorkflow.execute).toHaveBeenCalledWith(mockCreateDto, 1);
    });

    it('should throw ForbiddenException when creator has no access to company', async () => {
      // Arrange
      userCompanyRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(mockCreateDto, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.create(mockCreateDto, 1)).rejects.toThrow(
        'No tiene acceso a la empresa seleccionada',
      );
    });

    it('should throw ConflictException when codigo already exists', async () => {
      // Arrange
      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      (employeeRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockEmployee),
      });

      // Act & Assert
      await expect(service.create(mockCreateDto, 1)).rejects.toThrow(ConflictException);
      await expect(service.create(mockCreateDto, 1)).rejects.toThrow(
        "Ya existe un empleado con código 'EMP001'",
      );
    });

    it('should throw ConflictException when cedula already exists', async () => {
      // Arrange
      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      (employeeRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      employeeRepo.findOne.mockResolvedValueOnce({ ...mockEmployee, cedulaHash: 'hash-cedula' });

      // Act & Assert
      const execution = service.create(mockCreateDto, 1);
      await expect(execution).rejects.toThrow(ConflictException);
      await expect(execution).rejects.toThrow("Ya existe un empleado con cédula '123456789'");
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      (employeeRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      employeeRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockEmployee, emailHash: 'hash-email' });

      // Act & Assert
      const execution = service.create(mockCreateDto, 1);
      await expect(execution).rejects.toThrow(ConflictException);
      await expect(execution).rejects.toThrow("Ya existe un empleado con email 'john.doe@example.com'");
    });

    it('should create employee with TimeWise access when authorized', async () => {
      // Arrange
      const dtoWithTW: CreateEmployeeDto = {
        ...mockCreateDto,
        crearAccesoTimewise: true,
        idRolTimewise: 5,
      };

      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      (employeeRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      employeeRepo.findOne.mockResolvedValue(null);
      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:assign-timewise-role'],
        roles: [],
      });
      creationWorkflow.execute.mockResolvedValue({
        success: true,
        data: {
          employee: mockEmployee,
          appsAssigned: ['timewise'],
        },
      });

      // Act
      const result = await service.create(dtoWithTW, 1);

      // Assert
      expect(result).toHaveProperty('success', true);
      expect(authService.resolvePermissions).toHaveBeenCalledWith(1, 1, 'timewise');
    });

    it('should throw ForbiddenException when creating TimeWise access without permission', async () => {
      // Arrange
      const dtoWithTW: CreateEmployeeDto = {
        ...mockCreateDto,
        crearAccesoTimewise: true,
        idRolTimewise: 5,
      };

      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      (employeeRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      employeeRepo.findOne.mockResolvedValue(null);
      authService.resolvePermissions.mockResolvedValue({
        permissions: [],
        roles: [],
      });

      // Act & Assert
      await expect(service.create(dtoWithTW, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.create(dtoWithTW, 1)).rejects.toThrow(
        'No tiene permiso para asignar roles de TimeWise',
      );
    });

    it('should create employee with KPITAL access when authorized', async () => {
      // Arrange
      const dtoWithKP: CreateEmployeeDto = {
        ...mockCreateDto,
        crearAccesoKpital: true,
        idRolKpital: 3,
      };

      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      (employeeRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });
      sensitiveDataService.hashCedula.mockReturnValue('hash-cedula');
      sensitiveDataService.hashEmail.mockReturnValue('hash-email');
      employeeRepo.findOne.mockResolvedValue(null);
      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:assign-kpital-role'],
        roles: [],
      });
      creationWorkflow.execute.mockResolvedValue({
        success: true,
        data: {
          employee: mockEmployee,
          appsAssigned: ['kpital'],
        },
      });

      // Act
      const result = await service.create(dtoWithKP, 1);

      // Assert
      expect(result).toHaveProperty('success', true);
      expect(authService.resolvePermissions).toHaveBeenCalledWith(1, 1, 'kpital');
    });

    it('should throw BadRequestException when vacaciones acumuladas is negative', async () => {
      // Arrange
      const dtoWithInvalidVacaciones: CreateEmployeeDto = {
        ...mockCreateDto,
        vacacionesAcumuladas: -5 as any,
      };

      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);

      // Act & Assert
      await expect(service.create(dtoWithInvalidVacaciones, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidVacaciones, 1)).rejects.toThrow(
        'Vacaciones acumuladas debe ser un entero de 0 o mayor',
      );
    });

    it('should throw BadRequestException when fecha ingreso day is greater than 28', async () => {
      const dtoWithInvalidFecha: CreateEmployeeDto = {
        ...mockCreateDto,
        fechaIngreso: '2026-01-31',
      };
      await expect(service.create(dtoWithInvalidFecha, 1)).rejects.toThrow(BadRequestException);
      await expect(service.create(dtoWithInvalidFecha, 1)).rejects.toThrow(
        'Fecha de ingreso debe estar entre el día 1 y 28 del mes.',
      );
    });

    it('should throw BadRequestException when provision aguinaldo has future date', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const dtoWithInvalidProvision: CreateEmployeeDto = {
        ...mockCreateDto,
        provisionesAguinaldo: [
          {
            idEmpresa: 1,
            montoProvisionado: 1000,
            fechaInicioLaboral: futureDate.toISOString(),
          },
        ],
      };

      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);

      // Act & Assert
      await expect(service.create(dtoWithInvalidProvision, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(dtoWithInvalidProvision, 1)).rejects.toThrow(
        'fecha inicio laboral no puede ser futura',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated employees for user with company access', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockEmployee], 1]),
      };

      (employeeRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);
      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view-sensitive'],
        roles: [],
      });
      sensitiveDataService.decrypt.mockImplementation((val) => val);

      // Act
      const result = await service.findAll(1, 1, { page: 1, pageSize: 20 });

      // Assert
      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
        page: 1,
        pageSize: 20,
      });
      expect(result.data).toHaveLength(1);
    });

    it('should throw ForbiddenException when user has no company access', async () => {
      // Arrange
      userCompanyRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findAll(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should return empty result when user has no companies assigned', async () => {
      // Arrange
      userCompanyRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.findAll(1);

      // Assert
      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });
    });

    it('should apply search filter correctly', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      (employeeRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);
      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      sensitiveDataService.hashEmail.mockReturnValue('hash-search');
      sensitiveDataService.hashCedula.mockReturnValue('hash-search');

      // Act
      await service.findAll(1, 1, { search: 'john@example.com' });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('e.codigo LIKE'),
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    it('should return employee by id', async () => {
      // Arrange
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view-sensitive'],
        roles: [],
      });
      sensitiveDataService.decrypt.mockImplementation((val) => val);

      // Act
      const result = await service.findOne(1, 1);

      // Assert
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });

    it('should throw NotFoundException when employee not found', async () => {
      // Arrange
      employeeRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update employee successfully', async () => {
      // Arrange
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view-sensitive'],
        roles: [],
      });
      sensitiveDataService.decrypt.mockImplementation((val) => val);
      sensitiveDataService.encrypt.mockImplementation((val) => `encrypted-${val}`);
      sensitiveDataService.hashEmail.mockReturnValue('hash-new-email');

      const mockDataSource = {
        transaction: jest.fn((callback) => callback({ findOne: employeeRepo.findOne, save: employeeRepo.save })),
      };
      (service as any).dataSource = mockDataSource;

      // Act
      const result = await service.update(1, { nombre: 'Jane' }, 1);

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException when modifier not authenticated', async () => {
      // Arrange
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view-sensitive'],
        roles: [],
      });
      sensitiveDataService.decrypt.mockImplementation((val) => val);

      // Act & Assert
      await expect(service.update(1, { nombre: 'Jane' }, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject editing vacacionesAcumuladas in update payload', async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view-sensitive'],
        roles: [],
      });
      sensitiveDataService.decrypt.mockImplementation((val) => val);

      const mockDataSource = {
        transaction: jest.fn(async (callback) => callback({
          findOne: jest.fn().mockResolvedValue(mockEmployee),
          save: jest.fn().mockResolvedValue(mockEmployee),
        })),
      };
      (service as any).dataSource = mockDataSource;

      await expect(
        service.update(1, { vacacionesAcumuladas: '10' }, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('inactivate', () => {
    it('should inactivate employee', async () => {
      // Arrange
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view-sensitive'],
        roles: [],
      });
      sensitiveDataService.decrypt.mockImplementation((val) => val);
      employeeRepo.save.mockResolvedValue({ ...mockEmployee, estado: 0 });

      // Act
      const result = await service.inactivate(1, 1);

      // Assert
      expect(result.estado).toBe(0);
      expect(employeeRepo.save).toHaveBeenCalled();
    });
  });

  describe('reactivate', () => {
    it('should reactivate employee', async () => {
      // Arrange
      const inactiveEmployee = { ...mockEmployee, estado: 0 };
      employeeRepo.findOne.mockResolvedValue(inactiveEmployee);
      userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1, idEmpresa: 1, estado: 1 } as any);
      authService.resolvePermissions.mockResolvedValue({
        permissions: ['employee:view-sensitive'],
        roles: [],
      });
      sensitiveDataService.decrypt.mockImplementation((val) => val);
      employeeRepo.save.mockResolvedValue({ ...inactiveEmployee, estado: 1 });

      // Act
      const result = await service.reactivate(1, 1);

      // Assert
      expect(result.estado).toBe(1);
      expect(employeeRepo.save).toHaveBeenCalled();
    });
  });
});
