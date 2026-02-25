import { httpFetch } from '../interceptors/httpInterceptor';

export interface DepartmentListItem {
  id: number;
  nombre: string;
  idExterno?: string | null;
  estado: number;
  fechaCreacion?: string;
  fechaModificacion?: string;
}

export interface DepartmentPayload {
  nombre: string;
  idExterno?: string;
}

export interface DepartmentAuditTrailItem {
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

export async function fetchDepartmentsAdmin(showInactive = false): Promise<DepartmentListItem[]> {
  const params = new URLSearchParams();
  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }
  const qs = params.toString();
  const res = await httpFetch(`/departments${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar departamentos');
  return res.json();
}

export async function fetchDepartment(id: number): Promise<DepartmentListItem> {
  const res = await httpFetch(`/departments/${id}`);
  if (!res.ok) throw new Error('Error al cargar departamento');
  return res.json();
}

export async function createDepartment(payload: DepartmentPayload): Promise<DepartmentListItem> {
  const res = await httpFetch('/departments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al crear departamento');
  }
  return res.json();
}

export async function updateDepartment(id: number, payload: Partial<DepartmentPayload>): Promise<DepartmentListItem> {
  const res = await httpFetch(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al actualizar departamento');
  }
  return res.json();
}

export async function inactivateDepartment(id: number): Promise<DepartmentListItem> {
  const res = await httpFetch(`/departments/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al inactivar departamento');
  return res.json();
}

export async function reactivateDepartment(id: number): Promise<DepartmentListItem> {
  const res = await httpFetch(`/departments/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al reactivar departamento');
  return res.json();
}

export async function fetchDepartmentAuditTrail(id: number, limit = 200): Promise<DepartmentAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/departments/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al cargar bitacora de departamentos');
  }
  return res.json();
}
