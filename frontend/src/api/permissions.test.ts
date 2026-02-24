import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../interceptors/httpInterceptor', () => ({
  httpFetch: vi.fn(),
}));

import { httpFetch } from '../interceptors/httpInterceptor';
import { fetchPermissionsForCompany, fetchPermissionsForApp, fetchSystemPermissions } from './permissions';

const mockHttpFetch = vi.mocked(httpFetch);

describe('permissions api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchPermissionsForCompany sends POST to /auth/switch-company', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ permissions: ['a'], roles: ['b'] }) } as any);
    const result = await fetchPermissionsForCompany('5', 'kpital');
    expect(mockHttpFetch).toHaveBeenCalledWith('/auth/switch-company', expect.objectContaining({ method: 'POST' }));
    expect(result.permissions).toEqual(['a']);
  });

  it('fetchPermissionsForCompany throws on error', async () => {
    mockHttpFetch.mockResolvedValue({ ok: false } as any);
    await expect(fetchPermissionsForCompany('1')).rejects.toThrow('Error al cargar permisos');
  });

  it('fetchPermissionsForApp uses appCode param', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ permissions: [], roles: [] }) } as any);
    await fetchPermissionsForApp('timewise');
    const url = mockHttpFetch.mock.calls[0][0] as string;
    expect(url).toContain('appCode=timewise');
  });

  it('fetchPermissionsForApp returns empty arrays for missing data', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) } as any);
    const result = await fetchPermissionsForApp();
    expect(result.permissions).toEqual([]);
    expect(result.roles).toEqual([]);
  });

  it('fetchSystemPermissions builds query params', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([]) } as any);
    await fetchSystemPermissions({ modulo: 'auth', includeInactive: true });
    const url = mockHttpFetch.mock.calls[0][0] as string;
    expect(url).toContain('modulo=auth');
    expect(url).toContain('includeInactive=true');
  });
});
