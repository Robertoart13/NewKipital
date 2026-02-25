import { httpFetch } from '../interceptors/httpInterceptor';

export interface ClassListItem {
  id: number;
  nombre: string;
  descripcion?: string | null;
  codigo: string;
  idExterno?: string | null;
  esInactivo: number;
  fechaCreacion?: string;
  fechaModificacion?: string;
}

export interface ClassPayload {
  nombre: string;
  descripcion?: string;
  codigo: string;
  idExterno?: string;
}

export interface ClassAuditTrailItem {
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

export async function fetchClasses(showInactive = false): Promise<ClassListItem[]> {
  const params = new URLSearchParams();
  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }
  const qs = params.toString();
  const res = await httpFetch(`/classes${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar clases');
  return res.json();
}

export async function fetchClass(id: number): Promise<ClassListItem> {
  const res = await httpFetch(`/classes/${id}`);
  if (!res.ok) throw new Error('Error al cargar clase');
  return res.json();
}

export async function createClass(payload: ClassPayload): Promise<ClassListItem> {
  const res = await httpFetch('/classes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al crear clase');
  }
  return res.json();
}

export async function updateClass(id: number, payload: Partial<ClassPayload>): Promise<ClassListItem> {
  const res = await httpFetch(`/classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al actualizar clase');
  }
  return res.json();
}

export async function inactivateClass(id: number): Promise<ClassListItem> {
  const res = await httpFetch(`/classes/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al inactivar clase');
  return res.json();
}

export async function reactivateClass(id: number): Promise<ClassListItem> {
  const res = await httpFetch(`/classes/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al reactivar clase');
  return res.json();
}

export async function fetchClassAuditTrail(id: number, limit = 200): Promise<ClassAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/classes/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al cargar bitacora de clases');
  }
  return res.json();
}
