/* =============================================================================
   MODULE: personalActions
   =============================================================================

   Capa de acceso a datos para Acciones Personales (ausencias, vacaciones,
   licencias, incapacidades, bonificaciones, horas extra, descuentos,
   retenciones, aumentos).

   Responsabilidades:
   - Listar y filtrar acciones personales
   - Crear acciones (ausencias, vacaciones, licencias, incapacidades, etc.)
   - Avanzar estado e invalidar lineas
   - Aprobar/rechazar acciones
   - Consultar detalle por tipo de accion

   Decisiones de diseno:
   - Todas las solicitudes HTTP se canalizan mediante httpFetch
   - Las acciones tienen flujo de estados por tipo (ausencia, retencion, etc.)
   - idEmpresa se envia en body para endpoints que requieren contexto de empresa

   ========================================================================== */

import { httpFetch } from '../interceptors/httpInterceptor';

import type { PayrollListItem } from './payroll';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Personal Action List Item
 * ============================================================================
 *
 * Elemento de lista de acciones personales retornado por la API.
 *
 * ============================================================================
 */
export interface PersonalActionListItem {
  /** Identificador unico de la accion. */
  id: number;

  /** ID de la empresa. */
  idEmpresa: number;

  /** ID del empleado. */
  idEmpleado: number;

  /** ID de la planilla ligada; nulo si no aplica. */
  idPlanilla?: number | null;

  /** Codigo del tipo de accion. */
  tipoAccion: string;

  /** Origen: RRHH, IMPORT, TIMEWISE; nulo si no aplica. */
  origen?: 'RRHH' | 'IMPORT' | 'TIMEWISE' | string | null;

  /** Descripcion; nula si no aplica. */
  descripcion?: string | null;

  /** Estado de la accion. */
  estado: number;

  /** Fecha efecto (ISO); nula si no aplica. */
  fechaEfecto?: string | null;

  /** Monto; nulo si no aplica. */
  monto?: number | null;

  /** Moneda; nula si no aplica. */
  moneda?: string | null;

  /** Fecha inicio efecto; nula si no aplica. */
  fechaInicioEfecto?: string | null;

  /** Fecha fin efecto; nula si no aplica. */
  fechaFinEfecto?: string | null;

  /** ID del grupo si es parte de un lote; nulo si no. */
  groupId?: string | null;

  /** Resumen periodo pago; nulo si no aplica. */
  periodoPagoResumen?: string | null;

  /** Resumen de movimiento; nulo si no aplica. */
  movimientoResumen?: string | null;

  /** Resumen remuneracion: SI, NO, MIXTA; nulo si no aplica. */
  remuneracionResumen?: 'SI' | 'NO' | 'MIXTA' | null;
}

export interface PersonalActionCreateResult extends PersonalActionListItem {
  /** Total de acciones creadas en lote; opcional. */
  totalCreated?: number;

  /** IDs de acciones creadas en lote; opcional. */
  createdActionIds?: number[];

  /** ID del grupo; opcional. */
  groupId?: string;
}

export interface CreatePersonalActionPayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** ID del empleado. */
  idEmpleado: number;

  /** Codigo del tipo de accion. */
  tipoAccion: string;

  /** Descripcion; opcional. */
  descripcion?: string;

  /** Fecha efecto (ISO); opcional. */
  fechaEfecto?: string;

  /** Monto; opcional. */
  monto?: number;
}

export interface AbsenceMovementCatalogItem {
  /** ID del movimiento. */
  id: number;

  /** ID de la empresa. */
  idEmpresa: number;

  /** Nombre del movimiento. */
  nombre: string;

  /** ID del tipo de accion personal. */
  idTipoAccionPersonal: number;

  /** Descripcion; nula si no aplica. */
  descripcion?: string | null;

  /** 1 = monto fijo, 0 = porcentaje. */
  esMontoFijo: number;

  /** Monto fijo serializado como string decimal. */
  montoFijo: string;

  /** Porcentaje serializado como string decimal. */
  porcentaje: string;

  /** Ayuda de formula; nula si no aplica. */
  formulaAyuda?: string | null;

  /** 0 activo, 1 inactivo. */
  esInactivo: number;
}

export interface AbsenceEmployeeCatalogItem {
  /** ID del empleado. */
  id: number;

  /** ID de la empresa. */
  idEmpresa: number;

  /** Codigo interno. */
  codigo: string;

  /** Nombre. */
  nombre: string;

  /** Primer apellido. */
  apellido1: string;

  /** Segundo apellido; nulo si no aplica. */
  apellido2?: string | null;

  /** Cedula; nula si no aplica. */
  cedula?: string | null;

  /** Email; nulo si no aplica. */
  email?: string | null;

  /** Jornada; nula si no aplica. */
  jornada?: string | null;

  /** ID periodo pago; nulo si no aplica. */
  idPeriodoPago?: number | null;

  /** Salario base; nulo si no aplica. */
  salarioBase?: number | null;

  /** Moneda salario; nula si no aplica. */
  monedaSalario?: string | null;
}

export interface UpsertAbsenceLinePayload {
  /** ID de la planilla. */
  payrollId: number;

  /** Fecha efecto (ISO). */
  fechaEfecto: string;

  /** ID del movimiento de ausencia. */
  movimientoId: number;

  /** Tipo de ausencia: justificada o no justificada. */
  tipoAusencia: 'JUSTIFICADA' | 'NO_JUSTIFICADA';

  /** Cantidad (dias u horas). */
  cantidad: number;

  /** Monto. */
  monto: number;

  /** Si aplica remuneracion. */
  remuneracion: boolean;

  /** Formula de calculo; opcional. */
  formula?: string;
}

export interface UpsertAbsencePayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** ID del empleado. */
  idEmpleado: number;

  /** Observacion; opcional. */
  observacion?: string;

  /** Lineas de ausencia. */
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
  /** ID de la planilla. */
  payrollId: number;

  /** Fecha efecto (ISO). */
  fechaEfecto: string;

  /** ID del movimiento de licencia. */
  movimientoId: number;

  /** Tipo de licencia. */
  tipoLicencia: LicenseType;

  /** Cantidad (dias). */
  cantidad: number;

  /** Monto. */
  monto: number;

  /** Si aplica remuneracion. */
  remuneracion: boolean;

  /** Formula; opcional. */
  formula?: string;
}

export interface UpsertLicensePayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** ID del empleado. */
  idEmpleado: number;

  /** Observacion; opcional. */
  observacion?: string;

  /** Lineas de licencia. */
  lines: UpsertLicenseLinePayload[];
}

export interface UpsertDisabilityLinePayload {
  /** ID de la planilla. */
  payrollId: number;

  /** Fecha efecto (ISO). */
  fechaEfecto: string;

  /** ID del movimiento de incapacidad. */
  movimientoId: number;

  /** Tipo de incapacidad (CCSS/INS). */
  tipoIncapacidad: DisabilityType;

  /** Institucion: CCSS o INS. */
  tipoInstitucion: DisabilityInstitutionType;

  /** Cantidad (dias). */
  cantidad: number;

  /** Monto. */
  monto: number;

  /** Si aplica remuneracion. */
  remuneracion: boolean;

  /** Monto INS; opcional. */
  montoIns?: number;

  /** Monto patrono; opcional. */
  montoPatrono?: number;

  /** Subsidio CCSS; opcional. */
  subsidioCcss?: number;

  /** Total incapacidad; opcional. */
  totalIncapacidad?: number;

  /** Formula; opcional. */
  formula?: string;
}

export interface UpsertDisabilityPayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** ID del empleado. */
  idEmpleado: number;

  /** Observacion; opcional. */
  observacion?: string;

  /** Lineas de incapacidad. */
  lines: UpsertDisabilityLinePayload[];
}

export interface UpsertBonusLinePayload {
  /** ID de la planilla. */
  payrollId: number;

  /** Fecha efecto (ISO). */
  fechaEfecto: string;

  /** ID del movimiento de bonificacion. */
  movimientoId: number;

  /** Tipo de bonificacion. */
  tipoBonificacion: BonusType;

  /** Cantidad. */
  cantidad: number;

  /** Monto. */
  monto: number;

  /** Si aplica remuneracion. */
  remuneracion: boolean;

  /** Formula; opcional. */
  formula?: string;
}

export interface UpsertBonusPayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** ID del empleado. */
  idEmpleado: number;

  /** Observacion; opcional. */
  observacion?: string;

  /** Lineas de bonificacion. */
  lines: UpsertBonusLinePayload[];
}

export interface UpsertOvertimeLinePayload {
  /** ID de la planilla. */
  payrollId: number;

  /** Fecha efecto (ISO). */
  fechaEfecto: string;

  /** ID del movimiento de horas extra. */
  movimientoId: number;

  /** Fecha inicio hora extra (ISO). */
  fechaInicioHoraExtra: string;

  /** Fecha fin hora extra (ISO). */
  fechaFinHoraExtra: string;

  /** Tipo jornada: 6, 7 u 8 horas. */
  tipoJornadaHorasExtras: OvertimeShiftType;

  /** Cantidad (horas). */
  cantidad: number;

  /** Monto. */
  monto: number;

  /** Si aplica remuneracion. */
  remuneracion: boolean;

  /** Formula; opcional. */
  formula?: string;
}

export interface UpsertOvertimePayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** ID del empleado. */
  idEmpleado: number;

  /** Observacion; opcional. */
  observacion?: string;

  /** Lineas de horas extra. */
  lines: UpsertOvertimeLinePayload[];
}

export interface UpsertRetentionLinePayload {
  /** ID de la planilla. */
  payrollId: number;

  /** Fecha efecto (ISO). */
  fechaEfecto: string;

  /** ID del movimiento de retencion. */
  movimientoId: number;

  /** Cantidad. */
  cantidad: number;

  /** Monto. */
  monto: number;

  /** Formula; opcional. */
  formula?: string;
}

export interface UpsertRetentionPayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** ID del empleado. */
  idEmpleado: number;

  /** Observacion; opcional. */
  observacion?: string;

  /** Lineas de retencion. */
  lines: UpsertRetentionLinePayload[];
}

export interface UpsertDiscountLinePayload {
  /** ID de la planilla. */
  payrollId: number;

  /** Fecha efecto (ISO). */
  fechaEfecto: string;

  /** ID del movimiento de descuento. */
  movimientoId: number;

  /** Cantidad. */
  cantidad: number;

  /** Monto. */
  monto: number;

  /** Formula; opcional. */
  formula?: string;
}

export interface UpsertDiscountPayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** ID del empleado. */
  idEmpleado: number;

  /** Observacion; opcional. */
  observacion?: string;

  /** Lineas de descuento. */
  lines: UpsertDiscountLinePayload[];
}

export type IncreaseCalculationMethod = 'MONTO' | 'PORCENTAJE';

export interface UpsertIncreaseLinePayload {
  /** ID de la planilla. */
  payrollId: number;

  /** Fecha efecto (ISO). */
  fechaEfecto: string;

  /** ID del movimiento de aumento. */
  movimientoId: number;

  /** Metodo de calculo: MONTO o PORCENTAJE. */
  metodoCalculo: IncreaseCalculationMethod;

  /** Monto del aumento. */
  monto: number;

  /** Porcentaje del aumento. */
  porcentaje: number;

  /** Salario actual; opcional. */
  salarioActual?: number;

  /** Nuevo salario calculado; opcional. */
  nuevoSalario?: number;

  /** Formula; opcional. */
  formula?: string;
}

export interface UpsertIncreasePayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** ID del empleado. */
  idEmpleado: number;

  /** Observacion; opcional. */
  observacion?: string;

  /** Linea unica de aumento. */
  line: UpsertIncreaseLinePayload;
}

export interface UpsertVacationDatePayload {
  /** Fecha de vacacion (ISO). */
  fecha: string;
}

export interface UpsertVacationPayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** ID del empleado. */
  idEmpleado: number;

  /** ID del movimiento de vacaciones. */
  movimientoId: number;

  /** Observacion; opcional. */
  observacion?: string;

  /** Fechas de vacacion a registrar. */
  fechas: UpsertVacationDatePayload[];
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

export interface VacationDetailDateItem {
  idFecha: number;
  idAccion: number;
  payrollId: number;
  payrollLabel?: string | null;
  payrollEstado?: number | null;
  movimientoId: number;
  movimientoLabel?: string | null;
  movimientoInactivo?: boolean | null;
  fechaVacacion?: string | null;
  orden: number;
}

export interface VacationDetailItem extends PersonalActionListItem {
  fechas: VacationDetailDateItem[];
}

export interface VacationAvailability {
  saldoReal: number;
  reservado: number;
  disponible: number;
}

export interface VacationHolidayItem {
  id: number;
  nombre: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface VacationBookedDateItem {
  fecha: string;
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

export interface OvertimeBulkPreviewRowPayload {
  rowNumber: number;
  nombreCompleto?: string;
  codigoEmpleado: string;
  movimientoId?: number;
  tipoJornadaHorasExtras?: OvertimeShiftType;
  cantidadHoras: number;
  fechaInicioHoraExtra: string;
  fechaFinHoraExtra?: string;
}

export interface OvertimeBulkTemplateEmployeeItem {
  idEmpleado: number;
  codigoEmpleado: string;
  nombreCompleto: string;
  periodoPago: number | null;
  monedaSalario: string;
}

export interface OvertimeBulkTemplateMovementItem {
  id: number;
  nombre: string;
  porcentaje: number;
  esMontoFijo: number;
  montoFijo: number;
}

export interface OvertimeBulkTemplateDataResponse {
  payroll: {
    id: number;
    nombrePlanilla: string;
    estado: number;
    fechaInicioPeriodo: string;
    fechaFinPeriodo: string;
    idPeriodoPago: number;
    moneda: string;
  };
  empleados: OvertimeBulkTemplateEmployeeItem[];
  movimientos: OvertimeBulkTemplateMovementItem[];
  tiposJornada: Array<{ id: OvertimeShiftType; nombre: string }>;
}

export interface OvertimeBulkPreviewPayload {
  idEmpresa: number;
  payrollId: number;
  fileName: string;
  fileHashSha256: string;
  rows: OvertimeBulkPreviewRowPayload[];
}

export interface OvertimeBulkPreviewResponse {
  uploadPublicId: string;
  resumen: {
    total: number;
    validas: number;
    noProcesables: number;
    errorBloqueante: number;
    estadoPreview: 'PREVIEW_OK' | 'PREVIEW_WITH_WARNINGS';
    mensaje: string;
  };
  filas: Array<{
    rowNumber: number;
    codigoEmpleado: string;
    nombreCompleto: string | null;
    movimientoId: number | null;
    movimientoNombre: string | null;
    tipoJornada: OvertimeShiftType | null;
    cantidadHoras: number | null;
    fechaInicioHoraExtra: string | null;
    fechaFinHoraExtra: string | null;
    salarioBase: number | null;
    montoCalculado: number | null;
    formulaCalculada: string | null;
    estadoLinea: 'VALIDA' | 'NO_PROCESABLE' | 'ERROR_BLOQUEANTE' | 'PROCESADA';
    mensajeLinea: string;
  }>;
}

export interface OvertimeBulkCommitPayload {
  uploadPublicId: string;
  idEmpresa: number;
  payrollId: number;
  observacion?: string;
}

export interface OvertimeBulkCommitResponse {
  uploadPublicId: string;
  payroll: {
    id: number;
    nombrePlanilla: string;
  };
  createdActions: number;
  createdActionIds: number[];
  message: string;
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

export interface IncreaseDetailLine {
  idLinea: number;
  idAccion: number;
  payrollId: number;
  payrollLabel?: string | null;
  payrollEstado?: number | null;
  movimientoId: number;
  movimientoLabel?: string | null;
  movimientoInactivo?: boolean | null;
  metodoCalculo: IncreaseCalculationMethod;
  monto: number;
  porcentaje: number;
  salarioActual: number;
  nuevoSalario: number;
  formula: string;
  orden: number;
  fechaEfecto?: string | null;
}

export interface IncreaseDetailItem extends PersonalActionListItem {
  line: IncreaseDetailLine | null;
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
    const body = (await res.json()) as { message?: string | string[] };
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
export async function approvePersonalAction(
  id: number,
  options?: { payrollId?: number },
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payrollId: options?.payrollId }),
  });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al aprobar accion de personal'));
  return res.json();
}

/**
 * PATCH /personal-actions/:id/associate-to-payroll - Asociar una accion aprobada a planilla.
 */
export async function associatePersonalActionToPayroll(
  id: number,
  payrollId: number,
): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/${id}/associate-to-payroll`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idPlanilla: payrollId, idCalendarioNomina: payrollId }),
  });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al asociar accion a planilla'));
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
 * PATCH /personal-actions/:id/reactivate - Reactivar accion invalidada.
 */
export async function reactivatePersonalAction(id: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/${id}/reactivate`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al reactivar accion de personal'));
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
export async function fetchAbsenceEmployeesCatalog(companyId: number): Promise<AbsenceEmployeeCatalogItem[]> {
  const qs = new URLSearchParams({ idEmpresa: String(companyId) });
  const res = await httpFetch(`/personal-actions/absence-employees?${qs.toString()}`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar empleados de ausencias'));
  return res.json();
}

/**
 * GET /personal-actions/absence-payrolls?idEmpresa=N&idEmpleado=M
 * Catalogo de planillas elegibles para Ausencias (operativas y vigentes).
 */
export async function fetchAbsencePayrollsCatalog(companyId: number, employeeId: number): Promise<PayrollListItem[]> {
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
export async function fetchAbsenceDetail(id: number): Promise<AbsenceDetailItem> {
  const res = await httpFetch(`/personal-actions/ausencias/${id}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar detalle de ausencia'));
  }
  return res.json();
}

/**
 * POST /personal-actions/ausencias
 * Crea una ausencia con encabezado + lineas.
 */
export async function createAbsence(payload: UpsertAbsencePayload): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/ausencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al crear la ausencia'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/ausencias/:id
 * Actualiza una ausencia en borrador con sus lineas.
 */
export async function updateAbsence(id: number, payload: UpsertAbsencePayload): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/ausencias/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al actualizar la ausencia'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/ausencias/:id/advance
 * Avanza la ausencia al siguiente estado operativo.
 */
export async function advanceAbsenceState(id: number, idEmpresa: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/ausencias/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idEmpresa }),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al avanzar estado de la ausencia'));
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
    throw new Error(await extractApiErrorMessage(res, 'Error al invalidar la ausencia'));
  }
  return res.json();
}

/**
 * GET /personal-actions/ausencias/:id/audit-trail
 * Bitacora de la ausencia.
 */
export async function fetchAbsenceAuditTrail(id: number, limit = 200): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/ausencias/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar bitacora de ausencia'));
  }
  return res.json();
}

/**
 * GET /personal-actions/licencias/:id
 * Detalle completo de licencia para edicion (incluye lineas).
 */
export async function fetchLicenseDetail(id: number): Promise<LicenseDetailItem> {
  const res = await httpFetch(`/personal-actions/licencias/${id}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar detalle de licencia'));
  }
  return res.json();
}

/**
 * POST /personal-actions/licencias
 * Crea una licencia con encabezado + lineas.
 */
export async function createLicense(payload: UpsertLicensePayload): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/licencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al crear la licencia'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/licencias/:id
 * Actualiza una licencia en borrador/pendiente con sus lineas.
 */
export async function updateLicense(id: number, payload: UpsertLicensePayload): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/licencias/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al actualizar la licencia'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/licencias/:id/advance
 * Avanza la licencia al siguiente estado operativo.
 */
export async function advanceLicenseState(id: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/licencias/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al avanzar estado de la licencia'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/licencias/:id/invalidate
 * Invalida una licencia sin eliminar trazabilidad.
 */
export async function invalidateLicense(id: number, motivo?: string): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/licencias/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al invalidar la licencia'));
  }
  return res.json();
}

/**
 * GET /personal-actions/licencias/:id/audit-trail
 * Bitacora de la licencia.
 */
export async function fetchLicenseAuditTrail(id: number, limit = 200): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/licencias/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar bitacora de licencia'));
  }
  return res.json();
}

/**
 * GET /personal-actions/incapacidades/:id
 * Detalle completo de incapacidad para edicion (incluye lineas).
 */
export async function fetchDisabilityDetail(id: number): Promise<DisabilityDetailItem> {
  const res = await httpFetch(`/personal-actions/incapacidades/${id}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar detalle de incapacidad'));
  }
  return res.json();
}

/**
 * POST /personal-actions/incapacidades
 * Crea una incapacidad con encabezado + lineas.
 */
export async function createDisability(payload: UpsertDisabilityPayload): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/incapacidades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al crear la incapacidad'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/incapacidades/:id
 * Actualiza una incapacidad en borrador/pendiente con sus lineas.
 */
export async function updateDisability(id: number, payload: UpsertDisabilityPayload): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/incapacidades/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al actualizar la incapacidad'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/incapacidades/:id/advance
 * Avanza la incapacidad al siguiente estado operativo.
 */
export async function advanceDisabilityState(id: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/incapacidades/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al avanzar estado de la incapacidad'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/incapacidades/:id/invalidate
 * Invalida una incapacidad sin eliminar trazabilidad.
 */
export async function invalidateDisability(id: number, motivo?: string): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/incapacidades/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al invalidar la incapacidad'));
  }
  return res.json();
}

/**
 * GET /personal-actions/incapacidades/:id/audit-trail
 * Bitacora de la incapacidad.
 */
export async function fetchDisabilityAuditTrail(id: number, limit = 200): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/incapacidades/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar bitacora de incapacidad'));
  }
  return res.json();
}

/**
 * GET /personal-actions/bonificaciones/:id
 * Detalle completo de bonificacion para edicion (incluye lineas).
 */
export async function fetchBonusDetail(id: number): Promise<BonusDetailItem> {
  const res = await httpFetch(`/personal-actions/bonificaciones/${id}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar detalle de bonificacion'));
  }
  return res.json();
}

/**
 * POST /personal-actions/bonificaciones
 * Crea una bonificacion con encabezado + lineas.
 */
export async function createBonus(payload: UpsertBonusPayload): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/bonificaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al crear la bonificacion'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/bonificaciones/:id
 * Actualiza una bonificacion en borrador/pendiente con sus lineas.
 */
export async function updateBonus(id: number, payload: UpsertBonusPayload): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/bonificaciones/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al actualizar la bonificacion'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/bonificaciones/:id/advance
 * Avanza la bonificacion al siguiente estado operativo.
 */
export async function advanceBonusState(id: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/bonificaciones/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al avanzar estado de la bonificacion'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/bonificaciones/:id/invalidate
 * Invalida una bonificacion sin eliminar trazabilidad.
 */
export async function invalidateBonus(id: number, motivo?: string): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/bonificaciones/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al invalidar la bonificacion'));
  }
  return res.json();
}

/**
 * GET /personal-actions/bonificaciones/:id/audit-trail
 * Bitacora de la bonificacion.
 */
export async function fetchBonusAuditTrail(id: number, limit = 200): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/bonificaciones/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar bitacora de bonificacion'));
  }
  return res.json();
}

/**
 * GET /personal-actions/horas-extras/:id
 * Detalle completo de horas extra para edicion (incluye lineas).
 */
export async function fetchOvertimeDetail(id: number): Promise<OvertimeDetailItem> {
  const res = await httpFetch(`/personal-actions/horas-extras/${id}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar detalle de horas extra'));
  }
  return res.json();
}

/**
 * POST /personal-actions/horas-extras
 * Crea una accion de horas extra con encabezado + lineas.
 */
export async function createOvertime(payload: UpsertOvertimePayload): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/horas-extras', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al crear horas extra'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/horas-extras/:id
 * Actualiza una accion de horas extra en borrador/pendiente con sus lineas.
 */
export async function updateOvertime(id: number, payload: UpsertOvertimePayload): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/horas-extras/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al actualizar horas extra'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/horas-extras/:id/advance
 * Avanza la accion de horas extra al siguiente estado operativo.
 */
export async function advanceOvertimeState(id: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/horas-extras/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al avanzar estado de horas extra'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/horas-extras/:id/invalidate
 * Invalida una accion de horas extra sin eliminar trazabilidad.
 */
export async function invalidateOvertime(id: number, motivo?: string): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/horas-extras/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al invalidar horas extra'));
  }
  return res.json();
}

/**
 * GET /personal-actions/horas-extras/:id/audit-trail
 * Bitacora de horas extra.
 */
export async function fetchOvertimeAuditTrail(id: number, limit = 200): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/horas-extras/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar bitacora de horas extra'));
  }
  return res.json();
}

export async function fetchOvertimeBulkTemplateData(
  idEmpresa: number,
  payrollId: number,
): Promise<OvertimeBulkTemplateDataResponse> {
  const qs = new URLSearchParams({
    idEmpresa: String(idEmpresa),
    payrollId: String(payrollId),
  });
  const res = await httpFetch(`/personal-actions/horas-extras/carga-masiva/template-data?${qs.toString()}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar datos de plantilla de carga masiva'));
  }
  return res.json();
}

export async function previewOvertimeBulkUpload(
  payload: OvertimeBulkPreviewPayload,
): Promise<OvertimeBulkPreviewResponse> {
  const res = await httpFetch('/personal-actions/horas-extras/carga-masiva/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al generar preview de carga masiva'));
  }
  return res.json();
}

export async function commitOvertimeBulkUpload(
  payload: OvertimeBulkCommitPayload,
): Promise<OvertimeBulkCommitResponse> {
  const res = await httpFetch('/personal-actions/horas-extras/carga-masiva/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al confirmar carga masiva'));
  }
  return res.json();
}

/**
 * GET /personal-actions/retenciones/:id
 * Detalle completo de retencion para edicion (incluye lineas).
 */
export async function fetchRetentionDetail(id: number): Promise<RetentionDetailItem> {
  const res = await httpFetch(`/personal-actions/retenciones/${id}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar detalle de retencion'));
  }
  return res.json();
}

/**
 * POST /personal-actions/retenciones
 * Crea una accion de retencion con encabezado + lineas.
 */
export async function createRetention(payload: UpsertRetentionPayload): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/retenciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al crear retencion'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/retenciones/:id
 * Actualiza una accion de retencion en borrador/pendiente con sus lineas.
 */
export async function updateRetention(id: number, payload: UpsertRetentionPayload): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/retenciones/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al actualizar retencion'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/retenciones/:id/advance
 * Avanza la accion de retencion al siguiente estado operativo.
 */
export async function advanceRetentionState(id: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/retenciones/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al avanzar estado de retencion'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/retenciones/:id/invalidate
 * Invalida una accion de retencion sin eliminar trazabilidad.
 */
export async function invalidateRetention(id: number, motivo?: string): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/retenciones/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al invalidar retencion'));
  }
  return res.json();
}

/**
 * GET /personal-actions/retenciones/:id/audit-trail
 * Bitacora de retencion.
 */
export async function fetchRetentionAuditTrail(id: number, limit = 200): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/retenciones/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar bitacora de retencion'));
  }
  return res.json();
}

/**
 * GET /personal-actions/descuentos/:id
 * Detalle completo de descuento para edicion (incluye lineas).
 */
export async function fetchDiscountDetail(id: number): Promise<DiscountDetailItem> {
  const res = await httpFetch(`/personal-actions/descuentos/${id}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar detalle de descuento'));
  }
  return res.json();
}

/**
 * POST /personal-actions/descuentos
 * Crea una accion de descuento con encabezado + lineas.
 */
export async function createDiscount(payload: UpsertDiscountPayload): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/descuentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al crear descuento'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/descuentos/:id
 * Actualiza una accion de descuento en borrador/pendiente con sus lineas.
 */
export async function updateDiscount(id: number, payload: UpsertDiscountPayload): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/descuentos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al actualizar descuento'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/descuentos/:id/advance
 * Avanza la accion de descuento al siguiente estado operativo.
 */
export async function advanceDiscountState(id: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/descuentos/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al avanzar estado de descuento'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/descuentos/:id/invalidate
 * Invalida una accion de descuento sin eliminar trazabilidad.
 */
export async function invalidateDiscount(id: number, motivo?: string): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/descuentos/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al invalidar descuento'));
  }
  return res.json();
}

/**
 * GET /personal-actions/descuentos/:id/audit-trail
 * Bitacora de descuento.
 */
export async function fetchDiscountAuditTrail(id: number, limit = 200): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/descuentos/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar bitacora de descuento'));
  }
  return res.json();
}

/**
 * GET /personal-actions/vacaciones/:id
 * Detalle completo de vacaciones para edicion (incluye fechas).
 */
export async function fetchVacationDetail(id: number): Promise<VacationDetailItem> {
  const res = await httpFetch(`/personal-actions/vacaciones/${id}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar detalle de vacaciones'));
  }
  return res.json();
}

/**
 * GET /personal-actions/vacaciones/availability
 * Saldo real, reservado y disponible de vacaciones.
 */
export async function fetchVacationAvailability(idEmpresa: number, idEmpleado: number): Promise<VacationAvailability> {
  const qs = new URLSearchParams({
    idEmpresa: String(idEmpresa),
    idEmpleado: String(idEmpleado),
  });
  const res = await httpFetch(`/personal-actions/vacaciones/availability?${qs}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar saldo de vacaciones'));
  }
  return res.json();
}

/**
 * GET /personal-actions/vacaciones/holidays
 * Lista de feriados de planilla para bloquear fechas.
 */
export async function fetchVacationHolidays(idEmpresa?: number): Promise<VacationHolidayItem[]> {
  const qs = idEmpresa ? `?idEmpresa=${idEmpresa}` : '';
  const res = await httpFetch(`/personal-actions/vacaciones/holidays${qs}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar feriados de planilla'));
  }
  return res.json();
}

/**
 * GET /personal-actions/aumentos/:id/audit-trail
 * Bitacora de aumento.
 */
export async function fetchIncreaseAuditTrail(id: number, limit = 200): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/aumentos/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar bitacora de aumento'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/aumentos/:id/invalidate
 * Invalida un aumento sin eliminar trazabilidad.
 */
export async function invalidateIncrease(id: number, motivo?: string): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/aumentos/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al invalidar aumento'));
  }
  return res.json();
}
/**
 * PATCH /personal-actions/aumentos/:id/advance
 * Avanza el aumento al siguiente estado operativo.
 */
export async function advanceIncreaseState(id: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/aumentos/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al avanzar estado de aumento'));
  }
  return res.json();
}
/**
 * PATCH /personal-actions/aumentos/:id
 * Actualiza un aumento en borrador/pendiente.
 */
export async function updateIncrease(id: number, payload: UpsertIncreasePayload): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/aumentos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al actualizar aumento'));
  }
  return res.json();
}
/**
 * POST /personal-actions/aumentos
 * Crea una accion de aumento.
 */
export async function createIncrease(payload: UpsertIncreasePayload): Promise<PersonalActionListItem> {
  const res = await httpFetch('/personal-actions/aumentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al crear aumento'));
  }
  return res.json();
}
/**
 * GET /personal-actions/aumentos/:id
 * Detalle completo de aumento para edicion.
 */
export async function fetchIncreaseDetail(id: number): Promise<IncreaseDetailItem> {
  const res = await httpFetch(`/personal-actions/aumentos/${id}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar detalle de aumento'));
  }
  return res.json();
}
/**
 * GET /personal-actions/vacaciones/booked-dates
 * Fechas ya registradas en otras acciones de vacaciones.
 */
export async function fetchVacationBookedDates(
  idEmpresa: number,
  idEmpleado: number,
  excludeActionId?: number,
): Promise<VacationBookedDateItem[]> {
  const qs = new URLSearchParams({
    idEmpresa: String(idEmpresa),
    idEmpleado: String(idEmpleado),
  });
  if (excludeActionId != null) {
    qs.append('excludeActionId', String(excludeActionId));
  }
  const res = await httpFetch(`/personal-actions/vacaciones/booked-dates?${qs.toString()}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar fechas reservadas'));
  }
  return res.json();
}

/**
 * POST /personal-actions/vacaciones
 * Crea una accion de vacaciones con fechas seleccionadas.
 */
export async function createVacation(payload: UpsertVacationPayload): Promise<PersonalActionCreateResult> {
  const res = await httpFetch('/personal-actions/vacaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al crear vacaciones'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/vacaciones/:id
 * Actualiza una accion de vacaciones en borrador/pendiente.
 */
export async function updateVacation(id: number, payload: UpsertVacationPayload): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/vacaciones/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al actualizar vacaciones'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/vacaciones/:id/advance
 * Avanza la accion de vacaciones al siguiente estado operativo.
 */
export async function advanceVacationState(id: number): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/vacaciones/${id}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al avanzar estado de vacaciones'));
  }
  return res.json();
}

/**
 * PATCH /personal-actions/vacaciones/:id/invalidate
 * Invalida una accion de vacaciones sin eliminar trazabilidad.
 */
export async function invalidateVacation(id: number, motivo?: string): Promise<PersonalActionListItem> {
  const res = await httpFetch(`/personal-actions/vacaciones/${id}/invalidate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: motivo ?? '' }),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al invalidar vacaciones'));
  }
  return res.json();
}

/**
 * GET /personal-actions/vacaciones/:id/audit-trail
 * Bitacora de vacaciones.
 */
export async function fetchVacationAuditTrail(id: number, limit = 200): Promise<PersonalActionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/personal-actions/vacaciones/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al cargar bitacora de vacaciones'));
  }
  return res.json();
}
