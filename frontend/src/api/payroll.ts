import { httpFetch } from '../interceptors/httpInterceptor';

export interface PayrollListItem {
  id: number;
  idEmpresa: number;
  idPeriodoPago: number;
  idTipoPlanilla?: number | null;
  nombrePlanilla?: string | null;
  tipoPlanilla?: string;
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;
  fechaCorte?: string | null;
  fechaInicioPago: string;
  fechaFinPago: string;
  fechaPagoProgramada?: string | null;
  moneda?: string;
  estado: number;
  fechaAplicacion?: string | null;
}

export interface CreatePayrollPayload {
  idEmpresa: number;
  idPeriodoPago: number;
  idTipoPlanilla?: number;
  nombrePlanilla?: string;
  tipoPlanilla?: string;
  periodoInicio: string;
  periodoFin: string;
  fechaCorte?: string;
  fechaInicioPago: string;
  fechaFinPago: string;
  fechaPagoProgramada?: string;
  moneda?: 'CRC' | 'USD';
  descripcionEvento?: string;
  etiquetaColor?: string;
}

export type UpdatePayrollPayload = Partial<CreatePayrollPayload>;

export interface PayrollSnapshotSummary {
  idNomina: number;
  empleados: number;
  inputs: number;
  accionesLigadas: number;
  totalBruto: string;
  totalDeducciones: string;
  totalNeto: string;
}

export interface PayrollAuditTrailItem {
  id: string;
  modulo: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  actorUserId: number | null;
  actorNombre: string | null;
  actorEmail: string | null;
  descripcion: string;
  fechaCreacion: string | null;
  metadata: Record<string, unknown> | null;
  cambios: Array<{ campo: string; antes: string; despues: string }>;
}

async function extractApiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json() as { message?: string | string[] };
    if (Array.isArray(body?.message)) {
      return body.message.join('. ');
    }
    if (typeof body?.message === 'string' && body.message.trim()) {
      return body.message;
    }
  } catch {
    // no-op
  }

  if (res.status === 503) {
    return 'No se pudo completar la accion por una desconexion temporal. Intente nuevamente en unos segundos.';
  }

  return fallback;
}

/**
 * GET /payroll?idEmpresa=N - Lista planillas (calendario nómina).
 */
export async function fetchPayrolls(
  companyId: string,
  includeInactive = false,
  fechaDesde?: string,
  fechaHasta?: string,
  inactiveOnly = false,
): Promise<PayrollListItem[]> {
  const qs = new URLSearchParams({
    idEmpresa: companyId,
    ...(includeInactive && { includeInactive: 'true' }),
    ...(fechaDesde ? { fechaDesde } : {}),
    ...(fechaHasta ? { fechaHasta } : {}),
    ...(inactiveOnly ? { inactiveOnly: 'true' } : {}),
  });
  const res = await httpFetch(`/payroll?${qs}`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar planillas'));
  return res.json();
}

/**
 * GET /payroll/:id - Detalle planilla.
 */
export async function fetchPayroll(id: number): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar planilla'));
  return res.json();
}

export async function createPayroll(payload: CreatePayrollPayload): Promise<PayrollListItem> {
  const res = await httpFetch('/payroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al crear planilla'));
  return res.json();
}

export async function updatePayroll(id: number, payload: UpdatePayrollPayload): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al actualizar planilla'));
  return res.json();
}

export async function processPayroll(id: number): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}/process`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al procesar planilla'));
  return res.json();
}

export async function verifyPayroll(id: number): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}/verify`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al verificar planilla'));
  return res.json();
}

export async function applyPayroll(id: number, version?: number): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}/apply`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(version == null ? {} : { version }),
  });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al aplicar planilla'));
  return res.json();
}

export async function inactivatePayroll(id: number): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'No se pudo inactivar la planilla. Intente nuevamente.'));
  return res.json();
}

export async function fetchPayrollSnapshotSummary(id: number): Promise<PayrollSnapshotSummary> {
  const res = await httpFetch(`/payroll/${id}/snapshot-summary`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar resumen de snapshot'));
  return res.json();
}

export async function fetchPayrollAuditTrail(id: number, limit = 200): Promise<PayrollAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/payroll/${id}/audit-trail?${qs}`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar bitacora de planilla'));
  return res.json();
}
