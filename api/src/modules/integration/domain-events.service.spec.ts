import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainEventsService } from './domain-events.service';
import { DomainEventEntity } from './entities/domain-event.entity';

describe('DomainEventsService', () => {
  let service: DomainEventsService;
  let repository: jest.Mocked<Repository<DomainEventEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainEventsService,
        {
          provide: getRepositoryToken(DomainEventEntity),
          useValue: {
            create: jest.fn((x) => x),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(DomainEventsService);
    repository = module.get(getRepositoryToken(DomainEventEntity));
  });

  it('record should create and save event with generated idempotency key', async () => {
    repository.save.mockResolvedValue({} as any);
    const occurredAt = new Date('2026-02-24T11:00:00Z');

    await service.record({
      aggregateType: 'employee',
      aggregateId: '10',
      eventName: 'employee.created',
      payload: { ok: true },
      occurredAt,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'employee',
        aggregateId: '10',
        eventName: 'employee.created',
        payload: { ok: true },
        createdBy: null,
        status: 'pending',
        idempotencyKey: `employee.created:10:${occurredAt.getTime()}`,
      }),
    );
    expect(repository.save).toHaveBeenCalled();
  });

  it('record should use provided idempotency key and createdBy', async () => {
    repository.save.mockResolvedValue({} as any);

    await service.record({
      aggregateType: 'payroll',
      aggregateId: '20',
      eventName: 'payroll.applied',
      payload: { id: 20 },
      createdBy: 99,
      idempotencyKey: 'custom-key',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: 99,
        idempotencyKey: 'custom-key',
      }),
    );
  });

  it('record should swallow repository duplicate errors and log warning', async () => {
    const warnSpy = jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation();
    repository.save.mockRejectedValue(new Error('duplicate key'));

    await expect(
      service.record({
        aggregateType: 'employee',
        aggregateId: '10',
        eventName: 'employee.updated',
        payload: {},
        idempotencyKey: 'dup-key',
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('dup-key'));
    warnSpy.mockRestore();
  });
});
