import { AuditOutboxService } from './audit-outbox.service';
import { DomainEventsService } from './domain-events.service';

describe('AuditOutboxService', () => {
  let service: AuditOutboxService;
  let domainEvents: { record: jest.Mock };

  beforeEach(() => {
    domainEvents = { record: jest.fn().mockResolvedValue(undefined) };
    service = new AuditOutboxService(domainEvents as unknown as DomainEventsService);
  });

  it('should publish audit event with normalized modulo and accion', () => {
    service.publish({
      modulo: '  Companies  ',
      accion: '  CREATE  ',
      entidad: 'Company',
      entidadId: 5,
      actorUserId: 1,
      descripcion: 'Empresa creada',
    });

    expect(domainEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'audit',
        aggregateId: '5',
        eventName: 'audit.companies.create',
        payload: expect.objectContaining({
          modulo: 'companies',
          accion: 'create',
          entidad: 'company',
        }),
      }),
    );
  });

  it('should use "na" as aggregateId when entidadId is null', () => {
    service.publish({
      modulo: 'auth',
      accion: 'login',
      entidad: 'session',
      descripcion: 'Login exitoso',
    });

    expect(domainEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({ aggregateId: 'na' }),
    );
  });

  it('should include payloadBefore and payloadAfter when provided', () => {
    service.publish({
      modulo: 'employees',
      accion: 'update',
      entidad: 'employee',
      entidadId: 10,
      descripcion: 'Actualizado',
      payloadBefore: { nombre: 'Old' },
      payloadAfter: { nombre: 'New' },
    });

    expect(domainEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          payloadBefore: { nombre: 'Old' },
          payloadAfter: { nombre: 'New' },
        }),
      }),
    );
  });

  it('should not throw if domainEvents.record fails', async () => {
    domainEvents.record.mockRejectedValueOnce(new Error('DB down'));
    expect(() =>
      service.publish({
        modulo: 'test',
        accion: 'fail',
        entidad: 'x',
        descripcion: 'should not throw',
      }),
    ).not.toThrow();
  });
});
