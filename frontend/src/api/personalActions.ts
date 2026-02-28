import { httpFetch } from '../interceptors/httpInterceptor';
import type { PayrollListItem } from './payroll';

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
  periodoPagoResumen?: string | null;
  movimientoResumen?: string | null;
  remuneracionResumen?: 'SI' | 'NO' | 'MIXTA' | null;
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
  esMontoFijo: number;
  montoFijo: string;
  porcentaje: string;
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
  cedula?: string | null;
  email?: string | null;
  jornada?: string | null;
  idPeriodoPago?: number | null;
  salarioBase?: number | null;
  monedaSalario?: string | null;
}

export interface UpsertAbsenceLinePayload {
  payrollId: number;
  fechaEfecto: string;
  movimientoId: number;
  tipoAusencia: 'JUSTIFICADA' | 'NO_JUSTIFICADA';
  cantidad: number;
  monto: number;
  remuneracion: boolean;
  formula?: string;
}

export interface UpsertAbsencePayload {
  idEmpresa: number;
  idEmpleado: number;
  observacion?: string;
  lines: UpsertAbsenceLinePayload[];
}

export interface AbsenceDetailLine {
  idLinea: number;
  idAccion: number;
  payrollId: number;
  payrollLabel?: string | null;
  payrollEstado?: number | null;
  movimientoId: number;
  movimientoLabel?: string | null;
  movimientoInactivo?: boolean | null;
  tipoAusencia: 'JUSTIFICADA' | 'NO_JUSTIFICADA';
  cantidad: number;
  monto: number;
  remuneracion: boolean;
  formula: string;
  orden: number;
  fechaEfecto?: string | null;
}

export interface AbsenceDetailItem extends PersonalActionListItem {
  lines: AbsenceDetailLine[];
}

export interface PersonalActionAuditTrailItem {
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

/**
 * GET /personal-actions/absence-payrolls?idEmpresa=N&idEmpleado=M
 * Catalogo de planillas elegibles para Ausencias (operativas y vigentes).
 */
export async function fetchAbsencePayrollsCatalog(
  companyId: number,
  employeeId: number,
): Promise<PayrollListItem[]> {
  const qs = new URLSearchParams({
    idEmpresa: String(companyId),
    idEmpleado: String(employeeId),
  });
  const res = await httpFetch(`/personal-actions/absence-payrolls?${qs.toString()}`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar planillas elegibles de ausencias'));
  return res.json();
}

/**
 * GET /personal-actions/ausencias/:id
 * Detalle completo de ausencia para edicion (incluye lineas).
 */
export async function fetchAbsenceDetail(
  id: number,
): Promise<AbsenceDetailItem> {
  const res = await httpFetch(`/personal-actions/ausencias/${id}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar detalle de ausencia'),
    );
  }
  return res.json();
}

/**
 * POST /personal-actions/ausencias
 * Crea una ausencia con encabezado + lineas.
 */
export async function createAbsence(
  payload: UpsertAbsencePayload,
): Promise<PersonalActionListItem> {
  const res = await httpFetch('/personal-actions/ausencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al crear la ausencia'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/ausencias/:id
 * Actualiza una ausencia en borrador con sus lineas.
 */
export async function updateAbsence(
  id: number,
  payload: UpsertAbsencePayload,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/ausencias/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al actualizar la ausencia'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/ausencias/:id/advance
 * Avanza la ausencia al siguiente estado operativo.
 */
export async function advanceAbsenceState(
  id: number,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/ausencias/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al avanzar estado de la ausencia'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/ausencias/:id/invalidate
 * Invalida una ausencia sin eliminar trazabilidad.
 */
export async function invalidateAbsence(
  id: number,
  motivo?: string,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/ausencias/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al invalidar la ausencia'),
    );
  }
  return res.json();
}

/**
 * GET /personal-actions/ausencias/:id/audit-trail
 * Bitacora de la ausencia.
 */
export async function fetchAbsenceAuditTrail(
  id: number,
  limit = 200,
): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/ausencias/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar bitacora de ausencia'),
    );
  }
  return res.json();
}
