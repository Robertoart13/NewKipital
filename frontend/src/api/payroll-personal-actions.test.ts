import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../interceptors/httpInterceptor', () => ({
  httpFetch: vi.fn(),
}));

import { httpFetch } from '../interceptors/httpInterceptor';
import { fetchPayroll, fetchPayrolls } from './payroll';
import {
  advanceAbsenceState,
  advanceDiscountState,
  advanceRetentionState,
  approvePersonalAction,
  createDiscount,
  createRetention,
  createPersonalAction,
  fetchPersonalAction,
  fetchAbsenceDetail,
  fetchDiscountDetail,
  fetchRetentionDetail,
  fetchPersonalActions,
  invalidateDiscount,
  invalidateRetention,
  invalidateAbsence,
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

  it('fetchPersonalActions should append multiple estado params when array is provided', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    } as any);

    await fetchPersonalActions('11', [1, 2, 3]);

    expect(mockHttpFetch).toHaveBeenCalledWith(
      '/personal-actions?idEmpresa=11&estado=1&estado=2&estado=3',
    );
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

  it('advanceAbsenceState should send company context in body', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 10, estado: 2 }),
    } as any);

    await advanceAbsenceState(10, 1);

    expect(mockHttpFetch).toHaveBeenCalledWith(
      '/personal-actions/ausencias/10/advance',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ idEmpresa: 1 }),
      }),
    );
  });

  it('invalidateAbsence should send company context and motivo', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 10, estado: 7 }),
    } as any);

    await invalidateAbsence(10, 2, 'Motivo QA');

    expect(mockHttpFetch).toHaveBeenCalledWith(
      '/personal-actions/ausencias/10/invalidate',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ idEmpresa: 2, motivo: 'Motivo QA' }),
      }),
    );
  });

  it('invalidateAbsence should surface backend validation arrays (malicious payload rejected)', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        message: ['Linea 1: movimiento invalido', 'Intento bloqueado'],
      }),
    } as any);

    await expect(invalidateAbsence(10, 1, 'DROP TABLE')).rejects.toThrow(
      'Linea 1: movimiento invalido. Intento bloqueado',
    );
  });

  it('fetchAbsenceDetail should fallback to generic message when backend returns non-json error', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    } as any);

    await expect(fetchAbsenceDetail(77)).rejects.toThrow(
      'Error al cargar detalle de ausencia',
    );
  });

  it('retention endpoints should call expected routes', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 99, estado: 2 }),
    } as any);

    await fetchRetentionDetail(99);
    await createRetention({
      idEmpresa: 1,
      idEmpleado: 5,
      observacion: 'qa',
      lines: [
        {
          payrollId: 10,
          fechaEfecto: '2026-03-01',
          movimientoId: 1,
          cantidad: 1,
          monto: 1000,
        },
      ],
    });
    await advanceRetentionState(99);
    await invalidateRetention(99, 'qa');

    expect(mockHttpFetch).toHaveBeenNthCalledWith(
      1,
      '/personal-actions/retenciones/99',
    );
    expect(mockHttpFetch).toHaveBeenNthCalledWith(
      2,
      '/personal-actions/retenciones',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockHttpFetch).toHaveBeenNthCalledWith(
      3,
      '/personal-actions/retenciones/99/advance',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(mockHttpFetch).toHaveBeenNthCalledWith(
      4,
      '/personal-actions/retenciones/99/invalidate',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('discount endpoints should call expected routes', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 88, estado: 2 }),
    } as any);

    await fetchDiscountDetail(88);
    await createDiscount({
      idEmpresa: 1,
      idEmpleado: 5,
      observacion: 'qa',
      lines: [
        {
          payrollId: 10,
          fechaEfecto: '2026-03-01',
          movimientoId: 1,
          cantidad: 1,
          monto: 1000,
        },
      ],
    });
    await advanceDiscountState(88);
    await invalidateDiscount(88, 'qa');

    expect(mockHttpFetch).toHaveBeenNthCalledWith(
      1,
      '/personal-actions/descuentos/88',
    );
    expect(mockHttpFetch).toHaveBeenNthCalledWith(
      2,
      '/personal-actions/descuentos',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockHttpFetch).toHaveBeenNthCalledWith(
      3,
      '/personal-actions/descuentos/88/advance',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(mockHttpFetch).toHaveBeenNthCalledWith(
      4,
      '/personal-actions/descuentos/88/invalidate',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
