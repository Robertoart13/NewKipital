import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../interceptors/httpInterceptor', () => ({
  httpFetch: vi.fn(),
}));

import { httpFetch } from '../interceptors/httpInterceptor';
import { fetchQueuesSummary, fetchIdentityQueue, rescanQueues, releaseStuckQueues, requeueJob } from './opsMonitoring';

const mockHttpFetch = vi.mocked(httpFetch);

function okJson<T>(data: T) {
  return { ok: true, json: vi.fn().mockResolvedValue({ success: true, data }) } as any;
}

describe('opsMonitoring api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchQueuesSummary calls /ops/queues/summary', async () => {
    mockHttpFetch.mockResolvedValue(okJson({ identity: {}, encrypt: {} }));
    await fetchQueuesSummary();
    expect(mockHttpFetch).toHaveBeenCalledWith('/ops/queues/summary');
  });

  it('fetchIdentityQueue builds query params', async () => {
    mockHttpFetch.mockResolvedValue(okJson({ data: [], total: 0 }));
    await fetchIdentityQueue({ estado: 'PENDING', page: 1 });
    const url = mockHttpFetch.mock.calls[0][0] as string;
    expect(url).toContain('estado=PENDING');
    expect(url).toContain('page=1');
  });

  it('rescanQueues sends POST', async () => {
    mockHttpFetch.mockResolvedValue(okJson(null));
    await rescanQueues();
    expect(mockHttpFetch).toHaveBeenCalledWith('/ops/queues/rescan', { method: 'POST' });
  });

  it('releaseStuckQueues sends POST', async () => {
    mockHttpFetch.mockResolvedValue(okJson(null));
    await releaseStuckQueues();
    expect(mockHttpFetch).toHaveBeenCalledWith('/ops/queues/release-stuck', { method: 'POST' });
  });

  it('requeueJob sends POST with queue type', async () => {
    mockHttpFetch.mockResolvedValue(okJson(null));
    await requeueJob('identity', 5);
    expect(mockHttpFetch).toHaveBeenCalledWith('/ops/queues/requeue/5', expect.objectContaining({ method: 'POST' }));
  });

  it('fetchQueuesSummary throws on error response', async () => {
    mockHttpFetch.mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({}) } as any);
    await expect(fetchQueuesSummary()).rejects.toThrow();
  });
});
