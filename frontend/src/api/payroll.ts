import { httpFetch } from '../interceptors/httpInterceptor';

export interface PayrollListItem {
  id: number;
  idEmpresa: number;
  idPeriodoPago: number;
  tipoPlanilla?: string;
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;
  fechaInicioPago: string;
  fechaFinPago: string;
  moneda?: string;
  estado: number;
  fechaAplicacion?: string | null;
}

/**
 * GET /payroll?idEmpresa=N - Lista planillas (calendario nómina).
 */
export async function fetchPayrolls(
  companyId: string,
  includeInactive = false,
): Promise<PayrollListItem[]> {
  const qs = new URLSearchParams({
    idEmpresa: companyId,
    ...(includeInactive && { includeInactive: 'true' }),
  });
  const res = await httpFetch(`/payroll?${qs}`);
  if (!res.ok) throw new Error('Error al cargar planillas');
  return res.json();
}

/**
 * GET /payroll/:id - Detalle planilla.
 */
export async function fetchPayroll(id: number): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}`);
  if (!res.ok) throw new Error('Error al cargar planilla');
  return res.json();
}
