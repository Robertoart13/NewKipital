import { httpFetch } from '../interceptors/httpInterceptor';

export interface PayrollMovementListItem {
  id: number;
  idEmpresa: number;
  nombre: string;
  idArticuloNomina: number;
  idTipoAccionPersonal: number;
  idClase: number | null;
  idProyecto: number | null;
  descripcion?: string | null;
  esMontoFijo: number;
  montoFijo: string;
  porcentaje: string;
  formulaAyuda?: string | null;
  esInactivo: number;
  fechaCreacion?: string;
  fechaModificacion?: string;
}

export interface PayrollMovementPayload {
  idEmpresa: number;
  nombre: string;
  idArticuloNomina: number;
  idTipoAccionPersonal: number;
  idClase?: number | null;
  idProyecto?: number | null;
  descripcion?: string;
  esMontoFijo: number;
  montoFijo: string;
  porcentaje: string;
  formulaAyuda?: string;
}

export interface PayrollMovementAuditTrailItem {
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

export interface PayrollMovementArticleOption {
  id: number;
  idEmpresa: number;
  nombre: string;
  idTipoAccionPersonal: number;
  esInactivo: number;
}

export interface PayrollMovementActionTypeOption {
  id: number;
  codigo: string;
  nombre: string;
  estado: number;
}

export interface PayrollMovementClassOption {
  id: number;
  nombre: string;
  esInactivo: number;
}

export interface PayrollMovementProjectOption {
  id: number;
  idEmpresa: number;
  nombre: string;
  esInactivo: number;
}

export async function fetchPayrollMovements(
  idEmpresa?: number,
  showInactive = false,
  idEmpresas?: number[],
): Promise<PayrollMovementListItem[]> {
  const params = new URLSearchParams();
  if (idEmpresas && idEmpresas.length > 0) {
    params.set('idEmpresas', idEmpresas.join(','));
  } else if (idEmpresa) {
    params.set('idEmpresa', String(idEmpresa));
  }
  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }
  const qs = params.toString();
  const res = await httpFetch(`/payroll-movements${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar movimientos de nomina');
  return res.json();
}

export async function fetchPayrollMovement(id: number): Promise<PayrollMovementListItem> {
  const res = await httpFetch(`/payroll-movements/${id}`);
  if (!res.ok) throw new Error('Error al cargar movimiento de nomina');
  return res.json();
}

export async function createPayrollMovement(payload: PayrollMovementPayload): Promise<PayrollMovementListItem> {
  const res = await httpFetch('/payroll-movements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al crear movimiento de nomina');
  }
  return res.json();
}

export async function updatePayrollMovement(
  id: number,
  payload: Partial<PayrollMovementPayload>,
): Promise<PayrollMovementListItem> {
  const res = await httpFetch(`/payroll-movements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al actualizar movimiento de nomina');
  }
  return res.json();
}

export async function inactivatePayrollMovement(id: number): Promise<PayrollMovementListItem> {
  const res = await httpFetch(`/payroll-movements/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al inactivar movimiento de nomina');
  return res.json();
}

export async function reactivatePayrollMovement(id: number): Promise<PayrollMovementListItem> {
  const res = await httpFetch(`/payroll-movements/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al reactivar movimiento de nomina');
  return res.json();
}

export async function fetchPayrollMovementArticles(
  idEmpresa: number,
  includeInactive = false,
): Promise<PayrollMovementArticleOption[]> {
  const params = new URLSearchParams({ idEmpresa: String(idEmpresa) });
  if (includeInactive) {
    params.set('includeInactive', 'true');
  }
  const res = await httpFetch(`/payroll-movements/articles?${params.toString()}`);
  if (!res.ok) throw new Error('Error al cargar articulos de nomina');
  return res.json();
}

export async function fetchPayrollMovementPersonalActionTypes(
  includeInactive = false,
): Promise<PayrollMovementActionTypeOption[]> {
  const params = new URLSearchParams();
  if (includeInactive) {
    params.set('includeInactive', 'true');
  }
  const qs = params.toString();
  const res = await httpFetch(`/payroll-movements/personal-action-types${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar tipos de accion personal');
  return res.json();
}

export async function fetchPayrollMovementClasses(
  includeInactive = false,
): Promise<PayrollMovementClassOption[]> {
  const params = new URLSearchParams();
  if (includeInactive) {
    params.set('includeInactive', 'true');
  }
  const qs = params.toString();
  const res = await httpFetch(`/payroll-movements/classes${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar clases');
  return res.json();
}

export async function fetchPayrollMovementProjects(
  idEmpresa: number,
  includeInactive = false,
): Promise<PayrollMovementProjectOption[]> {
  const params = new URLSearchParams({ idEmpresa: String(idEmpresa) });
  if (includeInactive) {
    params.set('includeInactive', 'true');
  }
  const res = await httpFetch(`/payroll-movements/projects?${params.toString()}`);
  if (!res.ok) throw new Error('Error al cargar proyectos');
  return res.json();
}

export async function fetchPayrollMovementAuditTrail(
  id: number,
  limit = 200,
): Promise<PayrollMovementAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/payroll-movements/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al cargar bitacora de movimientos de nomina');
  }
  return res.json();
}

