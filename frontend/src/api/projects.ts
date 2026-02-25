import { httpFetch } from '../interceptors/httpInterceptor';

export interface ProjectListItem {
  id: number;
  idEmpresa: number;
  nombre: string;
  descripcion?: string | null;
  codigo: string;
  idExterno?: string | null;
  esInactivo: number;
  fechaCreacion?: string;
  fechaModificacion?: string;
}

export interface ProjectPayload {
  idEmpresa: number;
  nombre: string;
  descripcion?: string;
  codigo: string;
  idExterno?: string;
}

export interface ProjectAuditTrailItem {
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

export async function fetchProjects(idEmpresa?: number, showInactive = false): Promise<ProjectListItem[]> {
  const params = new URLSearchParams();
  if (idEmpresa) {
    params.set('idEmpresa', String(idEmpresa));
  }
  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }
  const qs = params.toString();
  const res = await httpFetch(`/projects${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar proyectos');
  return res.json();
}

export async function fetchProject(id: number): Promise<ProjectListItem> {
  const res = await httpFetch(`/projects/${id}`);
  if (!res.ok) throw new Error('Error al cargar proyecto');
  return res.json();
}

export async function createProject(payload: ProjectPayload): Promise<ProjectListItem> {
  const res = await httpFetch('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al crear proyecto');
  }
  return res.json();
}

export async function updateProject(id: number, payload: Partial<ProjectPayload>): Promise<ProjectListItem> {
  const res = await httpFetch(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al actualizar proyecto');
  }
  return res.json();
}

export async function inactivateProject(id: number): Promise<ProjectListItem> {
  const res = await httpFetch(`/projects/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al inactivar proyecto');
  return res.json();
}

export async function reactivateProject(id: number): Promise<ProjectListItem> {
  const res = await httpFetch(`/projects/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al reactivar proyecto');
  return res.json();
}

export async function fetchProjectAuditTrail(id: number, limit = 200): Promise<ProjectAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/projects/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al cargar bitacora de proyectos');
  }
  return res.json();
}
