import { AuthAuditService } from './auth-audit.service';
import { DomainEventsService } from '../integration/domain-events.service';

describe('AuthAuditService', () => {
  let service: AuthAuditService;
  let domainEvents: { record: jest.Mock };

  beforeEach(() => {
    domainEvents = { record: jest.fn().mockResolvedValue(undefined) };
    service = new AuthAuditService(
      domainEvents as unknown as DomainEventsService,
    );
  });

  it('should record a successful auth event', async () => {
    await service.record({
      event: 'login',
      userId: 1,
      email: 'test@example.com',
      ip: '127.0.0.1',
      outcome: 'success',
    });

    expect(domainEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'auth',
        aggregateId: '1',
        eventName: 'login',
        payload: expect.objectContaining({
          outcome: 'success',
          email: 'test@example.com',
        }),
      }),
    );
  });

  it('should record a failed auth event with reason', async () => {
    await service.record({
      event: 'login_failed',
      email: 'bad@example.com',
      outcome: 'failed',
      reason: 'invalid password',
    });

    expect(domainEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'login_failed',
        payload: expect.objectContaining({
          outcome: 'failed',
          reason: 'invalid password',
        }),
      }),
    );
  });

  it('should use "anonymous" as aggregateId when no userId or email', async () => {
    await service.record({ event: 'unknown_attempt', outcome: 'failed' });

    expect(domainEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({ aggregateId: 'anonymous' }),
    );
  });

  it('should pass metadata to domain event payload', async () => {
    await service.record({
      event: 'mfa_challenge',
      userId: 5,
      outcome: 'success',
      metadata: { method: 'totp' },
    });

    expect(domainEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ method: 'totp' }),
      }),
    );
  });
});
