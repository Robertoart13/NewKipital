import type { Permission } from '../store/slices/permissionsSlice';
import { httpFetch } from '../interceptors/httpInterceptor';

export interface SystemPermission {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  modulo: string;
  estado: number;
  fechaCreacion: string;
}

/**
 * Llama a POST /auth/switch-company para obtener permisos reales
 * del usuario en el contexto empresa + app.
 */
export async function fetchPermissionsForCompany(
  companyId: string,
  appCode = 'kpital',
  refreshAuthz = false,
): Promise<{ permissions: Permission[]; roles: string[] }> {
  const res = await httpFetch('/auth/switch-company', {
    method: 'POST',
    body: JSON.stringify({
      companyId: parseInt(companyId, 10),
      appCode,
      refreshAuthz: refreshAuthz ? true : undefined,
    }),
  });

  if (!res.ok) {
    throw new Error('Error al cargar permisos');
  }

  return res.json();
}

/**
 * GET /auth/me?appCode=...
 * Retorna permisos agregados del usuario para la app activa
 * en todas sus empresas asignadas.
 */
export async function fetchPermissionsForApp(
  appCode = 'kpital',
  refreshAuthz = false,
): Promise<{ permissions: Permission[]; roles: string[] }> {
  const qs = new URLSearchParams({ appCode });
  if (refreshAuthz) {
    qs.set('refreshAuthz', 'true');
  }
  const res = await httpFetch(`/auth/me?${qs.toString()}`);
  if (!res.ok) {
    throw new Error('Error al cargar permisos de la aplicacion');
  }
  const data = await res.json();
  return {
    permissions: Array.isArray(data?.permissions) ? data.permissions : [],
    roles: Array.isArray(data?.roles) ? data.roles : [],
  };
}

/**
 * GET /permissions - lista de permisos del sistema.
 * Por defecto incluye activos e inactivos para vista administrativa.
 */
export async function fetchSystemPermissions(filters?: {
  modulo?: string;
  includeInactive?: boolean;
}): Promise<SystemPermission[]> {
  const params = new URLSearchParams();

  if (filters?.modulo) {
    params.set('modulo', filters.modulo);
  }
  if (filters?.includeInactive !== undefined) {
    params.set('includeInactive', String(filters.includeInactive));
  }

  const qs = params.toString();
  const res = await httpFetch(`/permissions${qs ? `?${qs}` : ''}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al cargar permisos del sistema');
  }

  return res.json();
}
