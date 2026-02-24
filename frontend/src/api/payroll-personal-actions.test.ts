import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../interceptors/httpInterceptor', () => ({
  httpFetch: vi.fn(),
}));

import { httpFetch } from '../interceptors/httpInterceptor';
import { fetchPayroll, fetchPayrolls } from './payroll';
import { fetchPersonalAction, fetchPersonalActions } from './personalActions';

const mockHttpFetch = vi.mocked(httpFetch);

describe('payroll and personal actions api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchPayrolls should build query string with includeInactive', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    } as any);

    await fetchPayrolls('5', true);

    expect(mockHttpFetch).toHaveBeenCalledWith('/payroll?idEmpresa=5&includeInactive=true');
  });

  it('fetchPayroll should throw when backend response is not ok', async () => {
    mockHttpFetch.mockResolvedValue({ ok: false } as any);

    await expect(fetchPayroll(12)).rejects.toThrow('Error al cargar planilla');
  });

  it('fetchPersonalActions should include estado when provided', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    } as any);

    await fetchPersonalActions('11', 1);
    await fetchPersonalActions('11');

    expect(mockHttpFetch).toHaveBeenNthCalledWith(1, '/personal-actions?idEmpresa=11&estado=1');
    expect(mockHttpFetch).toHaveBeenNthCalledWith(2, '/personal-actions?idEmpresa=11');
  });

  it('fetchPersonalAction should return payload for ok responses', async () => {
    const payload = {
      id: 20,
      idEmpresa: 4,
      idEmpleado: 9,
      tipoAccion: 'AUMENTO',
      estado: 1,
    };
    mockHttpFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(payload),
    } as any);

    await expect(fetchPersonalAction(20)).resolves.toEqual(payload);
  });
});
