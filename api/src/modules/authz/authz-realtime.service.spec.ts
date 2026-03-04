import { AuthzRealtimeService } from './authz-realtime.service';

function createMockResponse() {
  return {
    writableEnded: false,
    write: jest.fn(),
    end: jest.fn(),
  } as any;
}

describe('AuthzRealtimeService', () => {
  it('registers connection and pushes notifications to target users only', () => {
    const service = new AuthzRealtimeService();
    const resUser1 = createMockResponse();
    const resUser2 = createMockResponse();

    const close1 = service.register(1, resUser1);
    service.register(2, resUser2);

    service.notifyUsers([1], {
      type: 'permissions.changed',
      reason: 'role.permission.replace',
      roleId: 5,
      at: new Date().toISOString(),
    });

    const user1Writes = (resUser1.write as jest.Mock).mock.calls.map((args) => String(args[0]));
    const user2Writes = (resUser2.write as jest.Mock).mock.calls.map((args) => String(args[0]));
    expect(user1Writes.some((line) => line.includes('permissions.changed'))).toBe(true);
    expect(user2Writes.some((line) => line.includes('permissions.changed'))).toBe(false);

    close1();
    service.onModuleDestroy();
  });
});
