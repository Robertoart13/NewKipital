import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PayrollCalendar } from '../payroll/entities/payroll-calendar.entity';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let companyRepo: jest.Mocked<Repository<Company>>;
  let payrollCalendarRepo: jest.Mocked<Repository<PayrollCalendar>>;
  let auditOutbox: jest.Mocked<AuditOutboxService>;

  const mockCompany: Company = {
    id: 1,
    nombre: 'Test Company',
    nombreLegal: 'Test Company Legal S.A.',
    cedula: '3101234567',
    actividadEconomica: 'Software Development',
    prefijo: 'TC',
    idExterno: 'EXT001',
    direccionExacta: '100 metros norte',
    telefono: '22223333',
    email: 'info@testcompany.com',
    codigoPostal: '10101',
    estado: 1,
    fechaInactivacion: null,
    creadoPor: 1,
    modificadoPor: 1,
    fechaCreacion: new Date(),
    fechaModificacion: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      query: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
      manager: {
        transaction: jest.fn(),
        query: jest.fn(),
        findOne: jest.fn(),
        getRepository: jest.fn(),
      },
    };

    const mockAuditOutbox = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: getRepositoryToken(Company), useValue: mockRepository },
        {
          provide: getRepositoryToken(PayrollCalendar),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        { provide: AuditOutboxService, useValue: mockAuditOutbox },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    companyRepo = module.get(getRepositoryToken(Company));
    payrollCalendarRepo = module.get(getRepositoryToken(PayrollCalendar));
    auditOutbox = module.get(AuditOutboxService);
  });

  describe('create', () => {
    const mockCreateDto: CreateCompanyDto = {
      nombre: 'New Company',
      nombreLegal: 'New Company Legal S.A.',
      cedula: '3109876543',
      prefijo: 'NC',
      actividadEconomica: 'Consulting',
      direccionExacta: '200 metros sur',
      telefono: '88889999',
      email: 'info@newcompany.com',
      codigoPostal: '20202',
    };

    it('should create company successfully', async () => {
      // Arrange
      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockReturnValue(mockCompany),
          save: jest.fn().mockResolvedValue(mockCompany),
        }),
        query: jest.fn().mockResolvedValue([]),
      };

      (companyRepo.manager.transaction as jest.Mock).mockImplementation(
        async (callback) => callback(mockManager),
      );

      // Mock file system operations (logo directory creation)
      jest.spyOn(service as any, 'mapCompanyWithLogo').mockResolvedValue({
        ...mockCompany,
        logoUrl: '/api/companies/1/logo',
        logoPath: null,
      });

      // Act
      const result = await service.create(mockCreateDto, 1);

      // Assert
      expect(result).toHaveProperty('id', 1);
      expect(auditOutbox.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          modulo: 'companies',
          accion: 'create',
          entidad: 'company',
        }),
      );
    });

    it('should throw ConflictException when cedula already exists', async () => {
      // Arrange
      const existingCompany = { ...mockCompany, cedula: mockCreateDto.cedula };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(existingCompany),
        }),
      };

      (companyRepo.manager.transaction as jest.Mock).mockImplementation(
        async (callback) => callback(mockManager),
      );

      // Act & Assert
      await expect(service.create(mockCreateDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(mockCreateDto, 1)).rejects.toThrow(
        'Ya existe una empresa con esa cedula',
      );
    });

    it('should throw ConflictException when prefijo already exists', async () => {
      // Arrange
      const existingCompany = {
        ...mockCompany,
        prefijo: mockCreateDto.prefijo,
      };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(existingCompany),
        }),
      };

      (companyRepo.manager.transaction as jest.Mock).mockImplementation(
        async (callback) => callback(mockManager),
      );

      // Act & Assert
      await expect(service.create(mockCreateDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(mockCreateDto, 1)).rejects.toThrow(
        'Ya existe una empresa con ese prefijo',
      );
    });

    it('should auto-assign company to master users', async () => {
      // Arrange
      const mockMasterUsers = [{ id: 5 }, { id: 10 }];
      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockReturnValue(mockCompany),
          save: jest.fn().mockResolvedValue(mockCompany),
        }),
        query: jest
          .fn()
          .mockResolvedValueOnce(mockMasterUsers)
          .mockResolvedValue([]),
      };

      (companyRepo.manager.transaction as jest.Mock).mockImplementation(
        async (callback) => callback(mockManager),
      );

      jest.spyOn(service as any, 'mapCompanyWithLogo').mockResolvedValue({
        ...mockCompany,
        logoUrl: '/api/companies/1/logo',
        logoPath: null,
      });

      // Act
      await service.create(mockCreateDto, 1);

      // Assert
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sys_usuario_empresa'),
        expect.any(Array),
      );
    });
  });

  describe('findAll', () => {
    it('should return all active companies for user', async () => {
      // Arrange
      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCompany]),
      };

      (companyRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );
      jest.spyOn(service as any, 'mapCompanyWithLogo').mockResolvedValue({
        ...mockCompany,
        logoUrl: '/api/companies/1/logo',
        logoPath: null,
      });

      // Act
      const result = await service.findAll(false, 1);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('logoUrl');
    });

    it('should return inactive companies when requested', async () => {
      // Arrange
      const inactiveCompany = { ...mockCompany, estado: 0 };
      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([inactiveCompany]),
      };

      (companyRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );
      jest.spyOn(service as any, 'mapCompanyWithLogo').mockResolvedValue({
        ...inactiveCompany,
        logoUrl: '/api/companies/1/logo',
        logoPath: null,
      });

      // Act
      const result = await service.findAll(false, 1, true);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].estado).toBe(0);
    });

    it('should return all companies when includeAll is true', async () => {
      // Arrange
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCompany]),
      };

      (companyRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );
      jest.spyOn(service as any, 'mapCompanyWithLogo').mockResolvedValue({
        ...mockCompany,
        logoUrl: '/api/companies/1/logo',
        logoPath: null,
      });

      // Act
      const result = await service.findAll(false, 1, false, true);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.innerJoin).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return company by id', async () => {
      // Arrange
      companyRepo.query.mockResolvedValue([{ id: 1 }]);
      companyRepo.findOne.mockResolvedValue(mockCompany);
      jest.spyOn(service as any, 'mapCompanyWithLogo').mockResolvedValue({
        ...mockCompany,
        logoUrl: '/api/companies/1/logo',
        logoPath: null,
      });

      // Act
      const result = await service.findOne(1, 1);

      // Assert
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('logoUrl');
    });

    it('should throw NotFoundException when company not found', async () => {
      // Arrange
      companyRepo.query.mockResolvedValue([{ id: 1 }]);
      companyRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user has no access to company', async () => {
      // Arrange
      companyRepo.query.mockResolvedValue([]);

      // Act & Assert
      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'No tiene acceso a esta empresa',
      );
    });
  });

  describe('update', () => {
    const mockUpdateDto: UpdateCompanyDto = {
      nombre: 'Updated Company',
      telefono: '99998888',
    };

    it('should update company successfully', async () => {
      // Arrange
      companyRepo.query.mockResolvedValue([{ id: 1 }]);
      companyRepo.findOne.mockResolvedValue(mockCompany);
      companyRepo.save.mockResolvedValue({ ...mockCompany, ...mockUpdateDto });
      jest.spyOn(service as any, 'mapCompanyWithLogo').mockResolvedValue({
        ...mockCompany,
        ...mockUpdateDto,
        logoUrl: '/api/companies/1/logo',
        logoPath: null,
      });

      // Act
      const result = await service.update(1, mockUpdateDto, 1);

      // Assert
      expect(result.nombre).toBe('Updated Company');
      expect(auditOutbox.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'update',
          entidad: 'company',
        }),
      );
    });

    it('should throw ConflictException when updating to existing prefijo', async () => {
      // Arrange
      companyRepo.query.mockResolvedValue([{ id: 1 }]);
      companyRepo.findOne
        .mockResolvedValueOnce(mockCompany)
        .mockResolvedValueOnce({ ...mockCompany, id: 2, prefijo: 'NEW' });

      // Act & Assert
      const execution = service.update(1, { prefijo: 'NEW' }, 1);
      await expect(execution).rejects.toThrow(ConflictException);
      await expect(execution).rejects.toThrow(
        'Ya existe una empresa con ese prefijo',
      );
    });

    it('should throw ConflictException when updating to existing cedula', async () => {
      // Arrange
      companyRepo.query.mockResolvedValue([{ id: 1 }]);
      companyRepo.findOne
        .mockResolvedValueOnce(mockCompany)
        .mockResolvedValueOnce({ ...mockCompany, id: 2, cedula: '3109999999' });

      // Act & Assert
      const execution = service.update(1, { cedula: '3109999999' }, 1);
      await expect(execution).rejects.toThrow(ConflictException);
      await expect(execution).rejects.toThrow(
        'Ya existe una empresa con esa cedula',
      );
    });
  });

  describe('inactivate', () => {
    it('should inactivate company successfully', async () => {
      // Arrange
      companyRepo.query.mockResolvedValue([{ id: 1 }]);
      companyRepo.findOne.mockResolvedValue(mockCompany);
      companyRepo.save.mockResolvedValue({
        ...mockCompany,
        estado: 0,
        fechaInactivacion: new Date(),
      });
      jest.spyOn(service as any, 'mapCompanyWithLogo').mockResolvedValue({
        ...mockCompany,
        estado: 0,
        logoUrl: '/api/companies/1/logo',
        logoPath: null,
      });

      // Act
      const result = await service.inactivate(1, 1);

      // Assert
      expect(result.estado).toBe(0);
      expect(result).toHaveProperty('fechaInactivacion');
      expect(auditOutbox.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'inactivate',
          entidad: 'company',
        }),
      );
    });

    it('should throw NotFoundException when company not found', async () => {
      // Arrange
      companyRepo.query.mockResolvedValue([{ id: 1 }]);
      companyRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.inactivate(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when company has active payroll runs', async () => {
      // Arrange
      companyRepo.query.mockResolvedValue([{ id: 1 }]);
      companyRepo.findOne.mockResolvedValue(mockCompany);
      payrollCalendarRepo.find.mockResolvedValue([
        {
          id: 10,
          idEmpresa: 1,
          estado: 1,
          esInactivo: 0,
          fechaInicioPeriodo: new Date('2026-02-01'),
          fechaFinPeriodo: new Date('2026-02-15'),
          tipoPlanilla: 'Regular',
        } as unknown as PayrollCalendar,
      ]);

      // Act
      const execution = service.inactivate(1, 1);

      // Assert
      await expect(execution).rejects.toThrow(ConflictException);
      await expect(execution).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'PLANILLAS_ACTIVAS',
        }),
      });
      expect(companyRepo.save).not.toHaveBeenCalled();
      expect(auditOutbox.publish).not.toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'inactivate' }),
      );
    });
  });

  describe('reactivate', () => {
    it('should reactivate company successfully', async () => {
      // Arrange
      const inactiveCompany = {
        ...mockCompany,
        estado: 0,
        fechaInactivacion: new Date(),
      };
      companyRepo.query.mockResolvedValue([{ id: 1 }]);
      companyRepo.findOne.mockResolvedValue(inactiveCompany);
      companyRepo.save.mockResolvedValue({
        ...inactiveCompany,
        estado: 1,
        fechaInactivacion: null,
      });
      jest.spyOn(service as any, 'mapCompanyWithLogo').mockResolvedValue({
        ...mockCompany,
        estado: 1,
        logoUrl: '/api/companies/1/logo',
        logoPath: null,
      });

      // Act
      const result = await service.reactivate(1, 1);

      // Assert
      expect(result.estado).toBe(1);
      expect(auditOutbox.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'reactivate',
          entidad: 'company',
        }),
      );
    });
  });

  describe('registerTempLogo', () => {
    it('should register temp logo successfully', async () => {
      // Arrange
      const mockFile = {
        filename: 'logo.png',
        path: '/tmp/logo.png',
        size: 1024,
        mimetype: 'image/png',
      };

      jest
        .spyOn(service as any, 'ensureLogoDirectories')
        .mockResolvedValue(undefined);

      // Act
      const result = await service.registerTempLogo(mockFile);

      // Assert
      expect(result).toHaveProperty('tempFileName', 'logo.png');
      expect(result).toHaveProperty('tempPath');
      expect(result).toHaveProperty('size', 1024);
      expect(result).toHaveProperty('mimeType', 'image/png');
    });

    it('should throw BadRequestException for invalid file extension', async () => {
      // Arrange
      const mockFile = {
        filename: 'logo.exe',
        path: '/tmp/logo.exe',
        size: 1024,
        mimetype: 'application/x-msdownload',
      };

      jest
        .spyOn(service as any, 'ensureLogoDirectories')
        .mockResolvedValue(undefined);
      const mockUnlink = jest.fn().mockResolvedValue(undefined);
      jest.mock('node:fs/promises', () => ({
        unlink: mockUnlink,
      }));

      // Act & Assert
      await expect(service.registerTempLogo(mockFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.registerTempLogo(mockFile)).rejects.toThrow(
        'Formato de imagen no permitido',
      );
    });
  });

  describe('getAuditTrail', () => {
    it('should return audit trail for company', async () => {
      // Arrange
      const mockAuditRows = [
        {
          id: '1',
          modulo: 'companies',
          accion: 'update',
          entidad: 'company',
          entidadId: '1',
          actorUserId: 1,
          actorNombre: 'Admin User',
          actorEmail: 'admin@example.com',
          descripcion: 'Company updated',
          fechaCreacion: new Date().toISOString(),
          metadata: {},
          payloadBefore: { nombre: 'Old Name' },
          payloadAfter: { nombre: 'New Name' },
        },
      ];

      companyRepo.query
        .mockResolvedValueOnce([{ id: 1 }])
        .mockResolvedValueOnce(mockAuditRows);
      companyRepo.findOne.mockResolvedValue(mockCompany);

      // Act
      const result = await service.getAuditTrail(1, 1, 50);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('accion', 'update');
      expect(result[0]).toHaveProperty('cambios');
    });

    it('should throw NotFoundException when company not found', async () => {
      // Arrange
      companyRepo.query.mockResolvedValue([{ id: 1 }]);
      companyRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getAuditTrail(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should limit audit trail results', async () => {
      // Arrange
      companyRepo.query
        .mockResolvedValueOnce([{ id: 1 }])
        .mockResolvedValueOnce([]);
      companyRepo.findOne.mockResolvedValue(mockCompany);

      // Act
      await service.getAuditTrail(1, 1, 1000);

      // Assert
      expect(companyRepo.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['1', 1, 500]), // Max limit is 500
      );
    });
  });
});
