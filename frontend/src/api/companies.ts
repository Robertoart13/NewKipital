import { httpFetch } from '../interceptors/httpInterceptor';

export interface CompanyListItem {
  id: number;
  nombre: string;
  nombreLegal?: string;
  cedula?: string;
  actividadEconomica?: string | null;
  prefijo?: string | null;
  idExterno?: string | null;
  direccionExacta?: string | null;
  telefono?: string | null;
  email?: string | null;
  codigoPostal?: string | null;
  fechaInactivacion?: string | null;
  estado?: number;
}

export interface CompanyPayload {
  nombre: string;
  nombreLegal: string;
  cedula: string;
  actividadEconomica?: string;
  prefijo: string;
  idExterno?: string;
  direccionExacta?: string;
  telefono?: string;
  email?: string;
  codigoPostal?: string;
}

/**
 * GET /companies - Lista empresas (activas por defecto).
 */
export async function fetchCompanies(includeInactive = false): Promise<CompanyListItem[]> {
  const qs = includeInactive ? '?includeInactive=true' : '';
  const res = await httpFetch(`/companies${qs}`);
  if (!res.ok) throw new Error('Error al cargar empresas');
  return res.json();
}

/**
 * GET /companies/:id - Detalle de empresa.
 */
export async function fetchCompany(id: number): Promise<CompanyListItem> {
  const res = await httpFetch(`/companies/${id}`);
  if (!res.ok) throw new Error('Error al cargar empresa');
  return res.json();
}

/**
 * POST /companies - Crea empresa.
 */
export async function createCompany(payload: CompanyPayload): Promise<CompanyListItem> {
  const res = await httpFetch('/companies', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error?.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al crear empresa');
  }
  return res.json();
}

/**
 * PUT /companies/:id - Edita empresa.
 */
export async function updateCompany(id: number, payload: Partial<CompanyPayload>): Promise<CompanyListItem> {
  const res = await httpFetch(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error?.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al actualizar empresa');
  }
  return res.json();
}

/**
 * PATCH /companies/:id/inactivate - Inactivación lógica.
 */
export async function inactivateCompany(id: number): Promise<CompanyListItem> {
  const res = await httpFetch(`/companies/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al inactivar empresa');
  return res.json();
}

/**
 * PATCH /companies/:id/reactivate - Reactivación lógica.
 */
export async function reactivateCompany(id: number): Promise<CompanyListItem> {
  const res = await httpFetch(`/companies/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al reactivar empresa');
  return res.json();
}
