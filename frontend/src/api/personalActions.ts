import { httpFetch } from '../interceptors/httpInterceptor';

export interface PersonalActionListItem {
  id: number;
  idEmpresa: number;
  idEmpleado: number;
  idPlanilla?: number | null;
  tipoAccion: string;
  descripcion?: string | null;
  estado: number;
  fechaEfecto?: string | null;
  monto?: number | null;
}

/**
 * GET /personal-actions?idEmpresa=N - Lista acciones de personal.
 */
export async function fetchPersonalActions(
  companyId: string,
  estado?: number,
): Promise<PersonalActionListItem[]> {
  const qs = new URLSearchParams({ idEmpresa: companyId });
  if (estado != null) qs.set('estado', String(estado));
  const res = await httpFetch(`/personal-actions?${qs}`);
  if (!res.ok) throw new Error('Error al cargar acciones de personal');
  return res.json();
}

/**
 * GET /personal-actions/:id - Detalle acción.
 */
export async function fetchPersonalAction(id: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/${id}`);
  if (!res.ok) throw new Error('Error al cargar acción');
  return res.json();
}
