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
  moneda?: string | null;
  fechaInicioEfecto?: string | null;
  fechaFinEfecto?: string | null;
  groupId?: string | null;
}

export interface CreatePersonalActionPayload {
  idEmpresa: number;
  idEmpleado: number;
  tipoAccion: string;
  descripcion?: string;
  fechaEfecto?: string;
  monto?: number;
}

export interface AbsenceMovementCatalogItem {
  id: number;
  idEmpresa: number;
  nombre: string;
  idTipoAccionPersonal: number;
  descripcion?: string | null;
  formulaAyuda?: string | null;
  esInactivo: number;
}

export interface AbsenceEmployeeCatalogItem {
  id: number;
  idEmpresa: number;
  codigo: string;
  nombre: string;
  apellido1: string;
  apellido2?: string | null;
  idPeriodoPago?: number | null;
  monedaSalario?: string | null;
}

async function extractApiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json() as { message?: string | string[] };
    if (Array.isArray(body?.message)) return body.message.join('. ');
    if (typeof body?.message === 'string' && body.message.trim()) return body.message;
  } catch {
    // no-op
  }
  return fallback;
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
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar acciones de personal'));
  return res.json();
}

/**
 * GET /personal-actions/:id - Detalle accion.
 */
export async function fetchPersonalAction(id: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/${id}`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar accion'));
  return res.json();
}

/**
 * POST /personal-actions - Crear accion.
 */
export async function createPersonalAction(payload: CreatePersonalActionPayload): Promise<PersonalActionListItem> {
  const res = await httpFetch('/personal-actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al crear accion de personal'));
  return res.json();
}

/**
 * PATCH /personal-actions/:id/approve - Aprobar accion pendiente.
 */
export async function approvePersonalAction(id: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al aprobar accion de personal'));
  return res.json();
}

/**
 * PATCH /personal-actions/:id/reject - Rechazar accion pendiente.
 */
export async function rejectPersonalAction(id: number, motivo?: string): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/${id}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al rechazar accion de personal'));
  return res.json();
}

/**
 * GET /personal-actions/absence-movements?idEmpresa=N
 * Catalogo de movimientos para Ausencias sin depender de payroll-movement:view.
 */
export async function fetchAbsenceMovementsCatalog(
  companyId: number,
  idTipoAccionPersonal: number,
): Promise<AbsenceMovementCatalogItem[]> {
  const qs = new URLSearchParams({
    idEmpresa: String(companyId),
    idTipoAccionPersonal: String(idTipoAccionPersonal),
  });
  const res = await httpFetch(`/personal-actions/absence-movements?${qs.toString()}`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar movimientos de ausencias'));
  return res.json();
}

/**
 * GET /personal-actions/absence-employees?idEmpresa=N
 * Catalogo de empleados para Ausencias sin depender de employee:view.
 */
export async function fetchAbsenceEmployeesCatalog(
  companyId: number,
): Promise<AbsenceEmployeeCatalogItem[]> {
  const qs = new URLSearchParams({ idEmpresa: String(companyId) });
  const res = await httpFetch(`/personal-actions/absence-employees?${qs.toString()}`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar empleados de ausencias'));
  return res.json();
}
