import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../interceptors/httpInterceptor', () => ({
  httpFetch: vi.fn(),
}));

import { httpFetch } from '../interceptors/httpInterceptor';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markNotificationAsDeleted,
  markAllNotificationsAsRead,
} from './notifications';

const mockHttpFetch = vi.mocked(httpFetch);

describe('notifications api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchNotifications builds query params', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([{ id: 1 }]) } as any);
    const result = await fetchNotifications({ status: 'unread', appCode: 'kpital', companyId: 2 });
    const url = mockHttpFetch.mock.calls[0][0] as string;
    expect(url).toContain('status=unread');
    expect(url).toContain('appCode=kpital');
    expect(url).toContain('companyId=2');
    expect(result).toHaveLength(1);
  });

  it('fetchNotifications returns empty array for non-array response', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(null) } as any);
    const result = await fetchNotifications();
    expect(result).toEqual([]);
  });

  it('fetchNotifications throws on error response', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ message: 'Unauthorized' }),
    } as any);
    await expect(fetchNotifications()).rejects.toThrow('Unauthorized');
  });

  it('fetchUnreadCount returns number', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ count: 5 }) } as any);
    expect(await fetchUnreadCount()).toBe(5);
  });

  it('fetchUnreadCount returns 0 for invalid response', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) } as any);
    expect(await fetchUnreadCount()).toBe(0);
  });

  it('markNotificationAsRead calls correct endpoint', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) } as any);
    await markNotificationAsRead(42);
    expect(mockHttpFetch).toHaveBeenCalledWith('/notifications/42/read', { method: 'POST' });
  });

  it('markNotificationAsDeleted calls correct endpoint', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) } as any);
    await markNotificationAsDeleted(7);
    expect(mockHttpFetch).toHaveBeenCalledWith('/notifications/7/delete', { method: 'POST' });
  });

  it('markAllNotificationsAsRead calls with params', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) } as any);
    await markAllNotificationsAsRead({ appCode: 'kpital' });
    const url = mockHttpFetch.mock.calls[0][0] as string;
    expect(url).toContain('appCode=kpital');
  });
});
