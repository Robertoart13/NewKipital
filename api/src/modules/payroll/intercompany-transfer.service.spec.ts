import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { UserCompany } from '../access-control/entities/user-company.entity';
import { Employee } from '../employees/entities/employee.entity';
import { AuditOutboxService } from '../integration/audit-outbox.service';
import { PersonalAction } from '../personal-actions/entities/personal-action.entity';

import { EmployeeTransfer } from './entities/employee-transfer.entity';
import { PayrollCalendar } from './entities/payroll-calendar.entity';
import { IntercompanyTransferService } from './intercompany-transfer.service';

import type { SimulateIntercompanyTransferDto } from './dto/simulate-intercompany-transfer.dto';
import type { TestingModule } from '@nestjs/testing';
import type { Repository } from 'typeorm';

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

describe('IntercompanyTransferService', () => {
  let service: IntercompanyTransferService;
  let employeeRepo: jest.Mocked<Repository<Employee>>;
  let userCompanyRepo: jest.Mocked<Repository<UserCompany>>;
  let transferRepo: jest.Mocked<Repository<EmployeeTransfer>>;
  let personalActionRepo: jest.Mocked<Repository<PersonalAction>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntercompanyTransferService,
        { provide: getRepositoryToken(UserCompany), useValue: mockRepository() },
        { provide: getRepositoryToken(Employee), useValue: mockRepository() },
        { provide: getRepositoryToken(PersonalAction), useValue: mockRepository() },
        { provide: getRepositoryToken(PayrollCalendar), useValue: mockRepository() },
        { provide: getRepositoryToken(EmployeeTransfer), useValue: mockRepository() },
        {
          provide: DataSource,
          useValue: { query: jest.fn().mockResolvedValue([{ total: 0 }]), transaction: jest.fn() },
        },
        { provide: AuditOutboxService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get(IntercompanyTransferService);
    employeeRepo = module.get(getRepositoryToken(Employee));
    userCompanyRepo = module.get(getRepositoryToken(UserCompany));
    transferRepo = module.get(getRepositoryToken(EmployeeTransfer));
    personalActionRepo = module.get(getRepositoryToken(PersonalAction));
  });

  it('should block when employee is inactive', async () => {
    employeeRepo.findOne.mockResolvedValue({
      id: 10,
      idEmpresa: 1,
      estado: 0,
      idPeriodoPago: 1,
      monedaSalario: 'CRC',
    } as Employee);
    personalActionRepo.find.mockResolvedValue([]);
    userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1 } as UserCompany);
    jest
      .spyOn(
        service as unknown as { findCalendarsForRange: () => Promise<PayrollCalendar[]> },
        'findCalendarsForRange',
      )
      .mockResolvedValue([]);
    jest
      .spyOn(
        service as unknown as { findBlockingPayrolls: () => Promise<unknown[]> },
        'findBlockingPayrolls',
      )
      .mockResolvedValue([]);
    jest
      .spyOn(
        service as unknown as {
          collectLineDatesByAction: () => Promise<Map<number, Array<Date | null>>>;
        },
        'collectLineDatesByAction',
      )
      .mockResolvedValue(new Map());

    const dto: SimulateIntercompanyTransferDto = {
      idEmpresaDestino: 2,
      fechaEfectiva: '2026-04-01',
      empleados: [{ idEmpleado: 10 }],
    };
    const result = await service.simulate(dto, 1);

    expect(result[0].eligible).toBe(false);
    expect(result[0].blockingReasons.some((r) => r.code === 'EMPLEADO_INACTIVO')).toBe(true);
  });

  it('should create simulation when eligible', async () => {
    employeeRepo.findOne.mockResolvedValue({
      id: 10,
      idEmpresa: 1,
      estado: 1,
      idPeriodoPago: 1,
      monedaSalario: 'CRC',
    } as Employee);
    personalActionRepo.find.mockResolvedValue([]);
    userCompanyRepo.findOne.mockResolvedValue({ idUsuario: 1 } as UserCompany);
    transferRepo.create.mockImplementation((data) => data as EmployeeTransfer);
    transferRepo.save.mockResolvedValue({ id: 99 } as EmployeeTransfer);
    jest
      .spyOn(
        service as unknown as {
          findCalendarsForRange: () => Promise<PayrollCalendar[]>;
        },
        'findCalendarsForRange',
      )
      .mockResolvedValue([
        {
          id: 1,
          idEmpresa: 2,
          fechaInicioPeriodo: new Date(2026, 3, 1, 12, 0, 0, 0),
          fechaFinPeriodo: new Date(2026, 3, 15, 12, 0, 0, 0),
        } as PayrollCalendar,
      ]);
    jest
      .spyOn(
        service as unknown as { findBlockingPayrolls: () => Promise<unknown[]> },
        'findBlockingPayrolls',
      )
      .mockResolvedValue([]);
    jest
      .spyOn(
        service as unknown as {
          collectLineDatesByAction: () => Promise<Map<number, Array<Date | null>>>;
        },
        'collectLineDatesByAction',
      )
      .mockResolvedValue(new Map());

    const dto: SimulateIntercompanyTransferDto = {
      idEmpresaDestino: 2,
      fechaEfectiva: '2026-04-01',
      empleados: [{ idEmpleado: 10 }],
      motivo: 'Traslado aprobado',
    };
    const result = await service.simulate(dto, 1);

    expect(result[0].eligible).toBe(true);
    expect(result[0].transferId).toBe(99);
  });
});
