import { httpFetch } from '../interceptors/httpInterceptor';
import { API_URL } from '../config/api';

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
  logoUrl?: string;
  logoPath?: string | null;
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

export interface CompanyLogoTempPayload {
  tempFileName: string;
  tempPath: string;
  size: number;
  mimeType: string;
}

export interface CompanyLogoCommitPayload {
  logoFileName: string;
  logoPath: string;
  logoUrl: string;
}

export interface CompanyAuditTrailItem {
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

/**
 * GET /companies - Lista empresas.
 * - showInactive=false: solo activas
 * - showInactive=true: solo inactivas (para no traer todo al inicio)
 */
export async function fetchCompanies(showInactive = false): Promise<CompanyListItem[]> {
  const params = new URLSearchParams();
  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }
  const qs = params.toString();
  const res = await httpFetch(`/companies${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar empresas');
  return res.json();
}

export async function fetchAllCompaniesForHistory(): Promise<CompanyListItem[]> {
  const params = new URLSearchParams();
  params.set('includeInactive', 'true');
  params.set('all', 'true');
  const res = await httpFetch(`/companies?${params.toString()}`);
  if (!res.ok) throw new Error('Error al cargar empresas de historial');
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
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message ?? 'Error al inactivar empresa';
    const e = new Error(msg) as Error & { response?: { code?: string; planillas?: { id: number }[] } };
    e.response = body;
    throw e;
  }
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

export function getCompanyLogoUrl(companyId: number, bustCache = false): string {
  const suffix = bustCache ? `?t=${Date.now()}` : '';
  return `${API_URL}/companies/${companyId}/logo${suffix}`;
}

export async function uploadCompanyLogoTemp(file: File): Promise<CompanyLogoTempPayload> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await httpFetch('/companies/logo/temp', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al subir logo temporal');
  }
  return res.json();
}

export async function commitCompanyLogo(companyId: number, tempFileName: string): Promise<CompanyLogoCommitPayload> {
  const res = await httpFetch(`/companies/${companyId}/logo/commit`, {
    method: 'POST',
    body: JSON.stringify({ tempFileName }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al confirmar logo');
  }
  return res.json();
}

export async function fetchCompanyLogoBlobUrl(companyId: number): Promise<string> {
  const res = await httpFetch(`/companies/${companyId}/logo`);
  if (!res.ok) {
    throw new Error('Error al cargar logo de empresa');
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function fetchCompanyAuditTrail(companyId: number, limit = 200): Promise<CompanyAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/companies/${companyId}/audit-trail?${qs}`);
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al cargar bitacora de empresa');
  }
  return res.json();
}
