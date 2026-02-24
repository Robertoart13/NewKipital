import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../interceptors/httpInterceptor', () => ({
  httpFetch: vi.fn(),
}));

import { httpFetch } from '../interceptors/httpInterceptor';
import {
  fetchEmployees,
  fetchEmployee,
  createEmployee,
  updateEmployee,
  inactivateEmployee,
  reactivateEmployee,
  fetchSupervisors,
} from './employees';

const mockHttpFetch = vi.mocked(httpFetch);

function okJson<T>(data: T) {
  return { ok: true, json: vi.fn().mockResolvedValue(data) } as any;
}

describe('employees api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchEmployees builds query params correctly', async () => {
    mockHttpFetch.mockResolvedValue(okJson({ data: [], total: 0, page: 1, pageSize: 20 }));
    await fetchEmployees('3', { page: 2, search: 'test', includeInactive: true });
    const url = mockHttpFetch.mock.calls[0][0] as string;
    expect(url).toContain('idEmpresa=3');
    expect(url).toContain('page=2');
    expect(url).toContain('search=test');
    expect(url).toContain('includeInactive=true');
  });

  it('fetchEmployees throws on error response', async () => {
    mockHttpFetch.mockResolvedValue({ ok: false } as any);
    await expect(fetchEmployees()).rejects.toThrow('Error al cargar empleados');
  });

  it('fetchEmployee calls correct endpoint', async () => {
    mockHttpFetch.mockResolvedValue(okJson({ id: 5 }));
    const result = await fetchEmployee(5);
    expect(mockHttpFetch).toHaveBeenCalledWith('/employees/5');
    expect(result.id).toBe(5);
  });

  it('createEmployee sends POST with payload', async () => {
    const payload = { idEmpresa: 1, codigo: 'E01', cedula: '123', nombre: 'Test', apellido1: 'A', email: 'a@b.com', fechaIngreso: '2026-01-01' };
    mockHttpFetch.mockResolvedValue(okJson({ success: true, data: { employee: payload, appsAssigned: [] } }));
    await createEmployee(payload);
    expect(mockHttpFetch).toHaveBeenCalledWith('/employees', expect.objectContaining({ method: 'POST' }));
  });

  it('createEmployee throws on error with backend message', async () => {
    mockHttpFetch.mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({ message: 'Cedula duplicada' }) } as any);
    await expect(createEmployee({} as any)).rejects.toThrow('Cedula duplicada');
  });

  it('updateEmployee sends PUT', async () => {
    mockHttpFetch.mockResolvedValue(okJson({ id: 1 }));
    await updateEmployee(1, { nombre: 'Updated' });
    expect(mockHttpFetch).toHaveBeenCalledWith('/employees/1', expect.objectContaining({ method: 'PUT' }));
  });

  it('inactivateEmployee sends PATCH with motivo', async () => {
    mockHttpFetch.mockResolvedValue(okJson({ id: 1 }));
    await inactivateEmployee(1, 'Renuncia');
    expect(mockHttpFetch).toHaveBeenCalledWith('/employees/1/inactivate', expect.objectContaining({ method: 'PATCH' }));
  });

  it('reactivateEmployee sends PATCH', async () => {
    mockHttpFetch.mockResolvedValue(okJson({ id: 1 }));
    await reactivateEmployee(1);
    expect(mockHttpFetch).toHaveBeenCalledWith('/employees/1/reactivate', expect.objectContaining({ method: 'PATCH' }));
  });

  it('fetchSupervisors returns empty array on error', async () => {
    mockHttpFetch.mockResolvedValue({ ok: false } as any);
    const result = await fetchSupervisors('1');
    expect(result).toEqual([]);
  });
});
