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

export interface PersonalActionCreateResult extends PersonalActionListItem {
  totalCreated?: number;
  createdActionIds?: number[];
  groupId?: string;
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

export type LicenseType =
  | 'maternidad'
  | 'paternidad'
  | 'adopcion'
  | 'duelo'
  | 'matrimonio'
  | 'estudios'
  | 'lactancia'
  | 'cuidado_familiar'
  | 'permiso_con_goce'
  | 'permiso_sin_goce'
  | 'citacion_judicial'
  | 'votacion'
  | 'donacion_sangre'
  | 'licencia_sindical'
  | 'licencia_especial_empresa';

export type BonusType =
  | 'ordinaria_salarial'
  | 'extraordinaria_habitual'
  | 'extraordinaria_ocasional'
  | 'no_salarial_reembolso';

export type OvertimeShiftType = '6' | '7' | '8';

export type DisabilityInstitutionType = 'CCSS' | 'INS';

export type DisabilityType =
  | 'enfermedad_comun_ccss'
  | 'enfermedad_mental_ccss'
  | 'covid19_ccss'
  | 'aborto_espontaneo_ccss'
  | 'reposo_postoperatorio_ccss'
  | 'reposo_prenatal_adicional_ccss'
  | 'reposo_postnatal_extendido_ccss'
  | 'cuido_familiar_grave_ccss'
  | 'tratamiento_oncologico_ccss'
  | 'tratamiento_renal_cronico_ccss'
  | 'tratamiento_vih_sida_ccss'
  | 'accidente_trabajo_ins'
  | 'enfermedad_profesional_ins'
  | 'incapacidad_prolongada_ins';

export interface UpsertLicenseLinePayload {
  payrollId: number;
  fechaEfecto: string;
  movimientoId: number;
  tipoLicencia: LicenseType;
  cantidad: number;
  monto: number;
  remuneracion: boolean;
  formula?: string;
}

export interface UpsertLicensePayload {
  idEmpresa: number;
  idEmpleado: number;
  observacion?: string;
  lines: UpsertLicenseLinePayload[];
}

export interface UpsertDisabilityLinePayload {
  payrollId: number;
  fechaEfecto: string;
  movimientoId: number;
  tipoIncapacidad: DisabilityType;
  tipoInstitucion: DisabilityInstitutionType;
  cantidad: number;
  monto: number;
  remuneracion: boolean;
  montoIns?: number;
  montoPatrono?: number;
  subsidioCcss?: number;
  totalIncapacidad?: number;
  formula?: string;
}

export interface UpsertDisabilityPayload {
  idEmpresa: number;
  idEmpleado: number;
  observacion?: string;
  lines: UpsertDisabilityLinePayload[];
}

export interface UpsertBonusLinePayload {
  payrollId: number;
  fechaEfecto: string;
  movimientoId: number;
  tipoBonificacion: BonusType;
  cantidad: number;
  monto: number;
  remuneracion: boolean;
  formula?: string;
}

export interface UpsertBonusPayload {
  idEmpresa: number;
  idEmpleado: number;
  observacion?: string;
  lines: UpsertBonusLinePayload[];
}

export interface UpsertOvertimeLinePayload {
  payrollId: number;
  fechaEfecto: string;
  movimientoId: number;
  fechaInicioHoraExtra: string;
  fechaFinHoraExtra: string;
  tipoJornadaHorasExtras: OvertimeShiftType;
  cantidad: number;
  monto: number;
  remuneracion: boolean;
  formula?: string;
}

export interface UpsertOvertimePayload {
  idEmpresa: number;
  idEmpleado: number;
  observacion?: string;
  lines: UpsertOvertimeLinePayload[];
}

export interface UpsertRetentionLinePayload {
  payrollId: number;
  fechaEfecto: string;
  movimientoId: number;
  cantidad: number;
  monto: number;
  formula?: string;
}

export interface UpsertRetentionPayload {
  idEmpresa: number;
  idEmpleado: number;
  observacion?: string;
  lines: UpsertRetentionLinePayload[];
}

export interface UpsertDiscountLinePayload {
  payrollId: number;
  fechaEfecto: string;
  movimientoId: number;
  cantidad: number;
  monto: number;
  formula?: string;
}

export interface UpsertDiscountPayload {
  idEmpresa: number;
  idEmpleado: number;
  observacion?: string;
  lines: UpsertDiscountLinePayload[];
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

export interface LicenseDetailLine {
  idLinea: number;
  idAccion: number;
  payrollId: number;
  payrollLabel?: string | null;
  payrollEstado?: number | null;
  movimientoId: number;
  movimientoLabel?: string | null;
  movimientoInactivo?: boolean | null;
  tipoLicencia: LicenseType;
  cantidad: number;
  monto: number;
  remuneracion: boolean;
  formula: string;
  orden: number;
  fechaEfecto?: string | null;
}

export interface LicenseDetailItem extends PersonalActionListItem {
  lines: LicenseDetailLine[];
}

export interface DisabilityDetailLine {
  idLinea: number;
  idAccion: number;
  payrollId: number;
  payrollLabel?: string | null;
  payrollEstado?: number | null;
  movimientoId: number;
  movimientoLabel?: string | null;
  movimientoInactivo?: boolean | null;
  tipoIncapacidad: DisabilityType;
  tipoInstitucion: DisabilityInstitutionType;
  cantidad: number;
  monto: number;
  montoIns: number;
  montoPatrono: number;
  subsidioCcss: number;
  totalIncapacidad: number;
  remuneracion: boolean;
  formula: string;
  orden: number;
  fechaEfecto?: string | null;
}

export interface DisabilityDetailItem extends PersonalActionListItem {
  lines: DisabilityDetailLine[];
}

export interface BonusDetailLine {
  idLinea: number;
  idAccion: number;
  payrollId: number;
  payrollLabel?: string | null;
  payrollEstado?: number | null;
  movimientoId: number;
  movimientoLabel?: string | null;
  movimientoInactivo?: boolean | null;
  tipoBonificacion: BonusType;
  cantidad: number;
  monto: number;
  remuneracion: boolean;
  formula: string;
  orden: number;
  fechaEfecto?: string | null;
}

export interface BonusDetailItem extends PersonalActionListItem {
  lines: BonusDetailLine[];
}

export interface OvertimeDetailLine {
  idLinea: number;
  idAccion: number;
  payrollId: number;
  payrollLabel?: string | null;
  payrollEstado?: number | null;
  movimientoId: number;
  movimientoLabel?: string | null;
  movimientoInactivo?: boolean | null;
  fechaInicioHoraExtra: string;
  fechaFinHoraExtra: string;
  tipoJornadaHorasExtras: OvertimeShiftType;
  cantidad: number;
  monto: number;
  remuneracion: boolean;
  formula: string;
  orden: number;
  fechaEfecto?: string | null;
}

export interface OvertimeDetailItem extends PersonalActionListItem {
  lines: OvertimeDetailLine[];
}

export interface RetentionDetailLine {
  idLinea: number;
  idAccion: number;
  payrollId: number;
  payrollLabel?: string | null;
  payrollEstado?: number | null;
  movimientoId: number;
  movimientoLabel?: string | null;
  movimientoInactivo?: boolean | null;
  cantidad: number;
  monto: number;
  remuneracion: boolean;
  formula: string;
  orden: number;
  fechaEfecto?: string | null;
}

export interface RetentionDetailItem extends PersonalActionListItem {
  lines: RetentionDetailLine[];
}

export interface DiscountDetailLine {
  idLinea: number;
  idAccion: number;
  payrollId: number;
  payrollLabel?: string | null;
  payrollEstado?: number | null;
  movimientoId: number;
  movimientoLabel?: string | null;
  movimientoInactivo?: boolean | null;
  cantidad: number;
  monto: number;
  remuneracion: boolean;
  formula: string;
  orden: number;
  fechaEfecto?: string | null;
}

export interface DiscountDetailItem extends PersonalActionListItem {
  lines: DiscountDetailLine[];
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
  estado?: number | number[],
): Promise<PersonalActionListItem[]> {
  const qs = new URLSearchParams({ idEmpresa: companyId });
  if (Array.isArray(estado)) {
    estado.forEach((value) => qs.append('estado', String(value)));
  } else if (estado != null) {
    qs.append('estado', String(estado));
  }
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
): Promise<PersonalActionCreateResult> {
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
  idEmpresa: number,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/ausencias/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa }),
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
  idEmpresa: number,
  motivo?: string,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/ausencias/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa, motivo: motivo ?? '' }),
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

/**
 * GET /personal-actions/licencias/:id
 * Detalle completo de licencia para edicion (incluye lineas).
 */
export async function fetchLicenseDetail(
  id: number,
): Promise<LicenseDetailItem> {
  const res = await httpFetch(`/personal-actions/licencias/${id}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar detalle de licencia'),
    );
  }
  return res.json();
}

/**
 * POST /personal-actions/licencias
 * Crea una licencia con encabezado + lineas.
 */
export async function createLicense(
  payload: UpsertLicensePayload,
): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/licencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al crear la licencia'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/licencias/:id
 * Actualiza una licencia en borrador/pendiente con sus lineas.
 */
export async function updateLicense(
  id: number,
  payload: UpsertLicensePayload,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/licencias/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al actualizar la licencia'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/licencias/:id/advance
 * Avanza la licencia al siguiente estado operativo.
 */
export async function advanceLicenseState(
  id: number,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/licencias/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al avanzar estado de la licencia'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/licencias/:id/invalidate
 * Invalida una licencia sin eliminar trazabilidad.
 */
export async function invalidateLicense(
  id: number,
  motivo?: string,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/licencias/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al invalidar la licencia'),
    );
  }
  return res.json();
}

/**
 * GET /personal-actions/licencias/:id/audit-trail
 * Bitacora de la licencia.
 */
export async function fetchLicenseAuditTrail(
  id: number,
  limit = 200,
): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/licencias/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar bitacora de licencia'),
    );
  }
  return res.json();
}

/**
 * GET /personal-actions/incapacidades/:id
 * Detalle completo de incapacidad para edicion (incluye lineas).
 */
export async function fetchDisabilityDetail(
  id: number,
): Promise<DisabilityDetailItem> {
  const res = await httpFetch(`/personal-actions/incapacidades/${id}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar detalle de incapacidad'),
    );
  }
  return res.json();
}

/**
 * POST /personal-actions/incapacidades
 * Crea una incapacidad con encabezado + lineas.
 */
export async function createDisability(
  payload: UpsertDisabilityPayload,
): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/incapacidades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al crear la incapacidad'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/incapacidades/:id
 * Actualiza una incapacidad en borrador/pendiente con sus lineas.
 */
export async function updateDisability(
  id: number,
  payload: UpsertDisabilityPayload,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/incapacidades/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al actualizar la incapacidad'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/incapacidades/:id/advance
 * Avanza la incapacidad al siguiente estado operativo.
 */
export async function advanceDisabilityState(
  id: number,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/incapacidades/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al avanzar estado de la incapacidad'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/incapacidades/:id/invalidate
 * Invalida una incapacidad sin eliminar trazabilidad.
 */
export async function invalidateDisability(
  id: number,
  motivo?: string,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/incapacidades/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al invalidar la incapacidad'),
    );
  }
  return res.json();
}

/**
 * GET /personal-actions/incapacidades/:id/audit-trail
 * Bitacora de la incapacidad.
 */
export async function fetchDisabilityAuditTrail(
  id: number,
  limit = 200,
): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/incapacidades/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar bitacora de incapacidad'),
    );
  }
  return res.json();
}

/**
 * GET /personal-actions/bonificaciones/:id
 * Detalle completo de bonificacion para edicion (incluye lineas).
 */
export async function fetchBonusDetail(
  id: number,
): Promise<BonusDetailItem> {
  const res = await httpFetch(`/personal-actions/bonificaciones/${id}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar detalle de bonificacion'),
    );
  }
  return res.json();
}

/**
 * POST /personal-actions/bonificaciones
 * Crea una bonificacion con encabezado + lineas.
 */
export async function createBonus(
  payload: UpsertBonusPayload,
): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/bonificaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al crear la bonificacion'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/bonificaciones/:id
 * Actualiza una bonificacion en borrador/pendiente con sus lineas.
 */
export async function updateBonus(
  id: number,
  payload: UpsertBonusPayload,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/bonificaciones/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al actualizar la bonificacion'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/bonificaciones/:id/advance
 * Avanza la bonificacion al siguiente estado operativo.
 */
export async function advanceBonusState(
  id: number,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/bonificaciones/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al avanzar estado de la bonificacion'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/bonificaciones/:id/invalidate
 * Invalida una bonificacion sin eliminar trazabilidad.
 */
export async function invalidateBonus(
  id: number,
  motivo?: string,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/bonificaciones/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al invalidar la bonificacion'),
    );
  }
  return res.json();
}

/**
 * GET /personal-actions/bonificaciones/:id/audit-trail
 * Bitacora de la bonificacion.
 */
export async function fetchBonusAuditTrail(
  id: number,
  limit = 200,
): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/bonificaciones/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar bitacora de bonificacion'),
    );
  }
  return res.json();
}

/**
 * GET /personal-actions/horas-extras/:id
 * Detalle completo de horas extra para edicion (incluye lineas).
 */
export async function fetchOvertimeDetail(
  id: number,
): Promise<OvertimeDetailItem> {
  const res = await httpFetch(`/personal-actions/horas-extras/${id}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar detalle de horas extra'),
    );
  }
  return res.json();
}

/**
 * POST /personal-actions/horas-extras
 * Crea una accion de horas extra con encabezado + lineas.
 */
export async function createOvertime(
  payload: UpsertOvertimePayload,
): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/horas-extras', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al crear horas extra'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/horas-extras/:id
 * Actualiza una accion de horas extra en borrador/pendiente con sus lineas.
 */
export async function updateOvertime(
  id: number,
  payload: UpsertOvertimePayload,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/horas-extras/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al actualizar horas extra'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/horas-extras/:id/advance
 * Avanza la accion de horas extra al siguiente estado operativo.
 */
export async function advanceOvertimeState(
  id: number,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/horas-extras/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al avanzar estado de horas extra'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/horas-extras/:id/invalidate
 * Invalida una accion de horas extra sin eliminar trazabilidad.
 */
export async function invalidateOvertime(
  id: number,
  motivo?: string,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/horas-extras/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al invalidar horas extra'),
    );
  }
  return res.json();
}

/**
 * GET /personal-actions/horas-extras/:id/audit-trail
 * Bitacora de horas extra.
 */
export async function fetchOvertimeAuditTrail(
  id: number,
  limit = 200,
): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/horas-extras/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar bitacora de horas extra'),
    );
  }
  return res.json();
}

/**
 * GET /personal-actions/retenciones/:id
 * Detalle completo de retencion para edicion (incluye lineas).
 */
export async function fetchRetentionDetail(
  id: number,
): Promise<RetentionDetailItem> {
  const res = await httpFetch(`/personal-actions/retenciones/${id}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar detalle de retencion'),
    );
  }
  return res.json();
}

/**
 * POST /personal-actions/retenciones
 * Crea una accion de retencion con encabezado + lineas.
 */
export async function createRetention(
  payload: UpsertRetentionPayload,
): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/retenciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al crear retencion'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/retenciones/:id
 * Actualiza una accion de retencion en borrador/pendiente con sus lineas.
 */
export async function updateRetention(
  id: number,
  payload: UpsertRetentionPayload,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/retenciones/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al actualizar retencion'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/retenciones/:id/advance
 * Avanza la accion de retencion al siguiente estado operativo.
 */
export async function advanceRetentionState(
  id: number,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/retenciones/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al avanzar estado de retencion'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/retenciones/:id/invalidate
 * Invalida una accion de retencion sin eliminar trazabilidad.
 */
export async function invalidateRetention(
  id: number,
  motivo?: string,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/retenciones/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al invalidar retencion'),
    );
  }
  return res.json();
}

/**
 * GET /personal-actions/retenciones/:id/audit-trail
 * Bitacora de retencion.
 */
export async function fetchRetentionAuditTrail(
  id: number,
  limit = 200,
): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/retenciones/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar bitacora de retencion'),
    );
  }
  return res.json();
}

/**
 * GET /personal-actions/descuentos/:id
 * Detalle completo de descuento para edicion (incluye lineas).
 */
export async function fetchDiscountDetail(
  id: number,
): Promise<DiscountDetailItem> {
  const res = await httpFetch(`/personal-actions/descuentos/${id}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar detalle de descuento'),
    );
  }
  return res.json();
}

/**
 * POST /personal-actions/descuentos
 * Crea una accion de descuento con encabezado + lineas.
 */
export async function createDiscount(
  payload: UpsertDiscountPayload,
): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/descuentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al crear descuento'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/descuentos/:id
 * Actualiza una accion de descuento en borrador/pendiente con sus lineas.
 */
export async function updateDiscount(
  id: number,
  payload: UpsertDiscountPayload,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/descuentos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al actualizar descuento'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/descuentos/:id/advance
 * Avanza la accion de descuento al siguiente estado operativo.
 */
export async function advanceDiscountState(
  id: number,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/descuentos/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al avanzar estado de descuento'),
    );
  }
  return res.json();
}

/**
 * PATCH /personal-actions/descuentos/:id/invalidate
 * Invalida una accion de descuento sin eliminar trazabilidad.
 */
export async function invalidateDiscount(
  id: number,
  motivo?: string,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/descuentos/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al invalidar descuento'),
    );
  }
  return res.json();
}

/**
 * GET /personal-actions/descuentos/:id/audit-trail
 * Bitacora de descuento.
 */
export async function fetchDiscountAuditTrail(
  id: number,
  limit = 200,
): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/descuentos/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(
      await extractApiErrorMessage(res, 'Error al cargar bitacora de descuento'),
    );
  }
  return res.json();
}
