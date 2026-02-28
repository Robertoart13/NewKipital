import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../interceptors/httpInterceptor', () => ({
  httpFetch: vi.fn(),
}));

import { httpFetch } from '../interceptors/httpInterceptor';
import { fetchPayroll, fetchPayrolls } from './payroll';
import {
  approvePersonalAction,
  createPersonalAction,
  fetchPersonalAction,
  fetchPersonalActions,
  rejectPersonalAction,
} from './personalActions';

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

    await fetchPayrolls('5', true, '2026-01-01', '2026-03-01');

    expect(mockHttpFetch).toHaveBeenCalledWith('/payroll?idEmpresa=5&includeInactive=true&fechaDesde=2026-01-01&fechaHasta=2026-03-01');
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

  it('createPersonalAction should post payload to API', async () => {
    const payload = {
      idEmpresa: 2,
      idEmpleado: 7,
      tipoAccion: 'AUSENCIA',
      descripcion: 'Ausencia aprobada',
      fechaEfecto: '2026-03-01',
      monto: 0,
    };
    mockHttpFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 1, ...payload, estado: 1 }),
    } as any);

    await createPersonalAction(payload);

    expect(mockHttpFetch).toHaveBeenCalledWith(
      '/personal-actions',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('approvePersonalAction and rejectPersonalAction should call action endpoints', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    } as any);

    await approvePersonalAction(12);
    await rejectPersonalAction(12, 'No procede');

    expect(mockHttpFetch).toHaveBeenNthCalledWith(
      1,
      '/personal-actions/12/approve',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(mockHttpFetch).toHaveBeenNthCalledWith(
      2,
      '/personal-actions/12/reject',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
