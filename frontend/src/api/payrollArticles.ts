import { httpFetch } from '../interceptors/httpInterceptor';

export interface PayrollArticleListItem {
  id: number;
  idEmpresa: number;
  nombre: string;
  descripcion?: string | null;
  idTipoAccionPersonal: number;
  idTipoArticuloNomina: number;
  idCuentaGasto: number;
  idCuentaPasivo?: number | null;
  esInactivo: number;
  fechaCreacion?: string;
  fechaModificacion?: string;
}

export interface PayrollArticlePayload {
  idEmpresa: number;
  nombre: string;
  descripcion?: string;
  idTipoAccionPersonal: number;
  idTipoArticuloNomina: number;
  idCuentaGasto: number;
  idCuentaPasivo?: number | null;
}

export interface PayrollArticleType {
  id: number;
  nombre: string;
  descripcion?: string | null;
  esInactivo: number;
}

export interface PersonalActionType {
  id: number;
  codigo: string;
  nombre: string;
  estado: number;
}

export interface AccountingAccountOption {
  id: number;
  idEmpresa: number;
  nombre: string;
  codigo: string;
  idTipoErp: number;
  esInactivo: number;
}

export interface PayrollArticleAuditTrailItem {
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

export async function fetchPayrollArticles(
  idEmpresa?: number,
  showInactive = false,
  idEmpresas?: number[],
): Promise<PayrollArticleListItem[]> {
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
  const res = await httpFetch(`/payroll-articles${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar articulos de nomina');
  return res.json();
}

export async function fetchPayrollArticle(id: number): Promise<PayrollArticleListItem> {
  const res = await httpFetch(`/payroll-articles/${id}`);
  if (!res.ok) throw new Error('Error al cargar articulo de nomina');
  return res.json();
}

export async function createPayrollArticle(payload: PayrollArticlePayload): Promise<PayrollArticleListItem> {
  const res = await httpFetch('/payroll-articles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al crear articulo de nomina');
  }
  return res.json();
}

export async function updatePayrollArticle(id: number, payload: Partial<PayrollArticlePayload>): Promise<PayrollArticleListItem> {
  const res = await httpFetch(`/payroll-articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al actualizar articulo de nomina');
  }
  return res.json();
}

export async function inactivatePayrollArticle(id: number): Promise<PayrollArticleListItem> {
  const res = await httpFetch(`/payroll-articles/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al inactivar articulo de nomina');
  return res.json();
}

export async function reactivatePayrollArticle(id: number): Promise<PayrollArticleListItem> {
  const res = await httpFetch(`/payroll-articles/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al reactivar articulo de nomina');
  return res.json();
}

export async function fetchPayrollArticleTypes(): Promise<PayrollArticleType[]> {
  const res = await httpFetch('/payroll-articles/types');
  if (!res.ok) throw new Error('Error al cargar tipos de articulo de nomina');
  return res.json();
}

export async function fetchPersonalActionTypes(): Promise<PersonalActionType[]> {
  const res = await httpFetch('/payroll-articles/personal-action-types');
  if (!res.ok) throw new Error('Error al cargar tipos de accion personal');
  return res.json();
}

export async function fetchPayrollArticleAccounts(
  idEmpresa: number,
  idsReferencia: number[],
  includeInactive = false,
): Promise<AccountingAccountOption[]> {
  const params = new URLSearchParams({ idEmpresa: String(idEmpresa) });
  if (idsReferencia.length > 0) {
    params.set('idsReferencia', idsReferencia.join(','));
  }
  if (includeInactive) {
    params.set('includeInactive', 'true');
  }
  const res = await httpFetch(`/payroll-articles/accounts?${params.toString()}`);
  if (!res.ok) throw new Error('Error al cargar cuentas contables');
  return res.json();
}

export async function fetchPayrollArticleAuditTrail(id: number, limit = 200): Promise<PayrollArticleAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/payroll-articles/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al cargar bitacora de articulos de nomina');
  }
  return res.json();
}
