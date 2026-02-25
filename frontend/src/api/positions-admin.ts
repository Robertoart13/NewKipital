import { httpFetch } from '../interceptors/httpInterceptor';

export interface PositionListItem {
  id: number;
  nombre: string;
  descripcion?: string | null;
  estado: number;
  fechaCreacion?: string;
  fechaModificacion?: string;
}

export interface PositionPayload {
  nombre: string;
  descripcion?: string;
}

export interface PositionAuditTrailItem {
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

export async function fetchPositionsAdmin(showInactive = false): Promise<PositionListItem[]> {
  const params = new URLSearchParams();
  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }
  const qs = params.toString();
  const res = await httpFetch(`/positions${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar puestos');
  return res.json();
}

export async function fetchPosition(id: number): Promise<PositionListItem> {
  const res = await httpFetch(`/positions/${id}`);
  if (!res.ok) throw new Error('Error al cargar puesto');
  return res.json();
}

export async function createPosition(payload: PositionPayload): Promise<PositionListItem> {
  const res = await httpFetch('/positions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al crear puesto');
  }
  return res.json();
}

export async function updatePosition(id: number, payload: Partial<PositionPayload>): Promise<PositionListItem> {
  const res = await httpFetch(`/positions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al actualizar puesto');
  }
  return res.json();
}

export async function inactivatePosition(id: number): Promise<PositionListItem> {
  const res = await httpFetch(`/positions/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al inactivar puesto');
  return res.json();
}

export async function reactivatePosition(id: number): Promise<PositionListItem> {
  const res = await httpFetch(`/positions/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al reactivar puesto');
  return res.json();
}

export async function fetchPositionAuditTrail(id: number, limit = 200): Promise<PositionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/positions/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al cargar bitacora de puestos');
  }
  return res.json();
}
