import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../interceptors/httpInterceptor', () => ({
  httpFetch: vi.fn(),
}));

describe('permissions api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('fetchPermissionsForCompany sends POST to /auth/switch-company', async () => {
    const { httpFetch } = await import('../interceptors/httpInterceptor');
    const mockHttpFetch = vi.mocked(httpFetch);
    const { fetchPermissionsForCompany } = await import('./permissions');

    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ permissions: ['a'], roles: ['b'] }) } as any);
    const result = await fetchPermissionsForCompany('5', 'kpital');
    expect(mockHttpFetch).toHaveBeenCalledWith('/auth/switch-company', expect.objectContaining({ method: 'POST' }));
    expect(result.permissions).toEqual(['a']);
  });

  it('fetchPermissionsForCompany throws on error', async () => {
    const { httpFetch } = await import('../interceptors/httpInterceptor');
    const mockHttpFetch = vi.mocked(httpFetch);
    const { fetchPermissionsForCompany } = await import('./permissions');

    mockHttpFetch.mockResolvedValue({ ok: false } as any);
    await expect(fetchPermissionsForCompany('1')).rejects.toThrow('Error al cargar permisos');
  });

  it('fetchPermissionsForApp uses appCode param', async () => {
    const { httpFetch } = await import('../interceptors/httpInterceptor');
    const mockHttpFetch = vi.mocked(httpFetch);
    const { fetchPermissionsForApp } = await import('./permissions');

    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ permissions: [], roles: [] }) } as any);
    await fetchPermissionsForApp('timewise');
    const url = mockHttpFetch.mock.calls[0][0] as string;
    expect(url).toContain('appCode=timewise');
  });

  it('fetchPermissionsForApp returns empty arrays for missing data', async () => {
    const { httpFetch } = await import('../interceptors/httpInterceptor');
    const mockHttpFetch = vi.mocked(httpFetch);
    const { fetchPermissionsForApp } = await import('./permissions');

    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) } as any);
    const result = await fetchPermissionsForApp();
    expect(result.permissions).toEqual([]);
    expect(result.roles).toEqual([]);
  });

  it('fetchSystemPermissions builds query params', async () => {
    const { httpFetch } = await import('../interceptors/httpInterceptor');
    const mockHttpFetch = vi.mocked(httpFetch);
    const { fetchSystemPermissions } = await import('./permissions');

    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([]) } as any);
    await fetchSystemPermissions({ modulo: 'auth', includeInactive: true });
    const url = mockHttpFetch.mock.calls[0][0] as string;
    expect(url).toContain('modulo=auth');
    expect(url).toContain('includeInactive=true');
  });
});
