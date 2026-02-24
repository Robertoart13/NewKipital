import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../interceptors/httpInterceptor', () => ({
  httpFetch: vi.fn(),
}));

import { httpFetch } from '../interceptors/httpInterceptor';
import { fetchPermissionsCatalogMode, fetchConfigPermissions, createConfigPermission, fetchRoles, fetchUsers, fetchApps, fetchUserAuditTrail, createRole } from './securityConfig';

const mockHttpFetch = vi.mocked(httpFetch);

function okJson<T>(data: T) {
  return { ok: true, json: vi.fn().mockResolvedValue(data) } as any;
}

describe('securityConfig api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchPermissionsCatalogMode returns mode', async () => {
    mockHttpFetch.mockResolvedValue(okJson({ mode: 'migration' }));
    const mode = await fetchPermissionsCatalogMode();
    expect(mode).toBe('migration');
  });

  it('fetchConfigPermissions builds query params', async () => {
    mockHttpFetch.mockResolvedValue(okJson([]));
    await fetchConfigPermissions({ modulo: 'auth', includeInactive: true });
    const url = mockHttpFetch.mock.calls[0][0] as string;
    expect(url).toContain('modulo=auth');
  });

  it('createConfigPermission sends POST', async () => {
    mockHttpFetch.mockResolvedValue(okJson({ id: 1, codigo: 'test', nombre: 'Test', modulo: 'test' }));
    await createConfigPermission({ codigo: 'test', nombre: 'Test', modulo: 'test' });
    expect(mockHttpFetch).toHaveBeenCalledWith('/config/permissions', expect.objectContaining({ method: 'POST' }));
  });

  it('fetchRoles includes includeInactive param', async () => {
    mockHttpFetch.mockResolvedValue(okJson([]));
    await fetchRoles(true, 'kpital');
    const url = mockHttpFetch.mock.calls[0][0] as string;
    expect(url).toContain('includeInactive=true');
    expect(url).toContain('appCode=kpital');
  });

  it('fetchUsers includes configView param', async () => {
    mockHttpFetch.mockResolvedValue(okJson([]));
    await fetchUsers(false, true);
    const url = mockHttpFetch.mock.calls[0][0] as string;
    expect(url).toContain('configView=true');
  });

  it('fetchApps calls /apps', async () => {
    mockHttpFetch.mockResolvedValue(okJson([]));
    await fetchApps();
    expect(mockHttpFetch).toHaveBeenCalledWith('/apps');
  });

  it('createRole sends POST with appCode', async () => {
    mockHttpFetch.mockResolvedValue(okJson({ id: 1 }));
    await createRole({ codigo: 'TEST', nombre: 'Test', appCode: 'kpital' });
    expect(mockHttpFetch).toHaveBeenCalledWith('/config/roles', expect.objectContaining({ method: 'POST' }));
  });

  it('fetchUserAuditTrail uses limit param', async () => {
    mockHttpFetch.mockResolvedValue(okJson([]));
    await fetchUserAuditTrail(1, 50);
    const url = mockHttpFetch.mock.calls[0][0] as string;
    expect(url).toContain('limit=50');
  });

  it('throws on error response with backend message', async () => {
    mockHttpFetch.mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({ message: 'Forbidden' }) } as any);
    await expect(fetchApps()).rejects.toThrow('Forbidden');
  });

  it('throws with array message concatenated', async () => {
    mockHttpFetch.mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({ message: ['Error 1', 'Error 2'] }) } as any);
    await expect(fetchRoles()).rejects.toThrow('Error 1, Error 2');
  });
});
