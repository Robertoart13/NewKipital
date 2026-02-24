import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../interceptors/httpInterceptor', () => ({
  httpFetch: vi.fn(),
}));

import { httpFetch } from '../interceptors/httpInterceptor';
import { fetchDepartments, fetchPositions, fetchPayPeriods } from './catalogs';

const mockHttpFetch = vi.mocked(httpFetch);

describe('catalogs api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchDepartments calls /catalogs/departments', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([{ id: 1, nombre: 'IT' }]) } as any);
    const result = await fetchDepartments();
    expect(mockHttpFetch).toHaveBeenCalledWith('/catalogs/departments');
    expect(result[0].nombre).toBe('IT');
  });

  it('fetchDepartments throws on error', async () => {
    mockHttpFetch.mockResolvedValue({ ok: false } as any);
    await expect(fetchDepartments()).rejects.toThrow('Error al cargar departamentos');
  });

  it('fetchPositions calls /catalogs/positions', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([]) } as any);
    await fetchPositions();
    expect(mockHttpFetch).toHaveBeenCalledWith('/catalogs/positions');
  });

  it('fetchPayPeriods calls /catalogs/pay-periods', async () => {
    mockHttpFetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([{ id: 1, nombre: 'Quincenal', dias: 15 }]) } as any);
    const result = await fetchPayPeriods();
    expect(result[0].dias).toBe(15);
  });

  it('fetchPayPeriods throws on error', async () => {
    mockHttpFetch.mockResolvedValue({ ok: false } as any);
    await expect(fetchPayPeriods()).rejects.toThrow('Error al cargar periodos de pago');
  });
});
