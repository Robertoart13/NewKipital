import { httpFetch } from '../interceptors/httpInterceptor';

export interface CompanyListItem {
  id: number;
  nombre: string;
  cedula?: string;
  prefijo?: string | null;
  estado?: number;
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
