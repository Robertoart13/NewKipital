/* =============================================================================
   MODULE: payroll
   =============================================================================

   Capa de acceso a datos para el modulo de Planillas (calendario nomina).

   Responsabilidades:
   - Listar planillas por empresa
   - Crear, actualizar, procesar, verificar y aplicar planillas
   - Inactivar planillas
   - Consultar snapshot y bitacora de auditoria
   - Simular y ejecutar traslados interempresas

   Decisiones de diseno:
   - Todas las solicitudes HTTP se canalizan mediante httpFetch
   - Mensajes de error del backend se extraen via extractApiErrorMessage
   - Estado 503 mapeado a mensaje amigable de desconexion temporal

   ========================================================================== */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Payroll List Item
 * ============================================================================
 *
 * Elemento de lista de planillas retornado por la API.
 *
 * ============================================================================
 */
export interface PayrollListItem {
  /** Identificador unico de la planilla. */
  id: number;

  /** ID de la empresa propietaria. */
  idEmpresa: number;

  /** ID del periodo de pago. */
  idPeriodoPago: number;

  /** ID del tipo de planilla; nulo si no aplica. */
  idTipoPlanilla?: number | null;

  /** Nombre descriptivo de la planilla; nulo si no aplica. */
  nombrePlanilla?: string | null;

  /** Codigo del tipo de planilla; opcional. */
  tipoPlanilla?: string;

  /** Fecha inicio del periodo (ISO). */
  fechaInicioPeriodo: string;

  /** Fecha fin del periodo (ISO). */
  fechaFinPeriodo: string;

  /** Fecha de corte; nula si no aplica. */
  fechaCorte?: string | null;

  /** Fecha inicio ventana de pago (ISO). */
  fechaInicioPago: string;

  /** Fecha fin ventana de pago (ISO). */
  fechaFinPago: string;

  /** Fecha programada de pago; nula si no aplica. */
  fechaPagoProgramada?: string | null;

  /** Codigo moneda (ej: CRC, USD); opcional. */
  moneda?: string;

  /** Estado: borrador, verificada, aplicada, etc. */
  estado: number;

  /** Indica si requiere recalculo (0 o 1); opcional. */
  requiresRecalculation?: number;

  /** Fecha de aplicacion contable; nula si no aplicada. */
  fechaAplicacion?: string | null;
}

/**
 * ============================================================================
 * Create Payroll Payload
 * ============================================================================
 *
 * Payload para crear una planilla.
 *
 * ============================================================================
 */
export interface CreatePayrollPayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** ID del periodo de pago. */
  idPeriodoPago: number;

  /** ID del tipo de planilla; opcional. */
  idTipoPlanilla?: number;

  /** Nombre descriptivo; opcional. */
  nombrePlanilla?: string;

  /** Codigo tipo planilla; opcional. */
  tipoPlanilla?: string;

  /** Fecha inicio periodo (ISO). */
  periodoInicio: string;

  /** Fecha fin periodo (ISO). */
  periodoFin: string;

  /** Fecha de corte; opcional. */
  fechaCorte?: string;

  /** Fecha inicio ventana de pago (ISO). */
  fechaInicioPago: string;

  /** Fecha fin ventana de pago (ISO). */
  fechaFinPago: string;

  /** Fecha programada de pago; opcional. */
  fechaPagoProgramada?: string;

  /** Moneda CRC o USD; opcional. */
  moneda?: 'CRC' | 'USD';

  /** Descripcion del evento; opcional. */
  descripcionEvento?: string;

  /** Color de etiqueta en UI; opcional. */
  etiquetaColor?: string;
}

export type UpdatePayrollPayload = Partial<CreatePayrollPayload>;

/**
 * ============================================================================
 * Payroll Snapshot Summary
 * ============================================================================
 *
 * Resumen del snapshot de una planilla con totales.
 *
 * ============================================================================
 */
export interface PayrollSnapshotSummary {
  /** ID de la planilla. */
  idNomina: number;

  /** Cantidad de empleados incluidos. */
  empleados: number;

  /** Cantidad de inputs/registros. */
  inputs: number;

  /** Cantidad de acciones personales ligadas. */
  accionesLigadas: number;

  /** Si incluye cargas sociales. */
  hasSocialCharges: boolean;

  /** Total bruto serializado como string decimal. */
  totalBruto: string;

  /** Total deducciones serializado. */
  totalDeducciones: string;

  /** Total neto serializado. */
  totalNeto: string;

  /** Total devengado serializado. */
  totalDevengado: string;

  /** Total cargas sociales serializado. */
  totalCargasSociales: string;

  /** Total impuesto renta serializado. */
  totalImpuestoRenta: string;
}

/**
 * ============================================================================
 * Payroll Audit Trail Item
 * ============================================================================
 *
 * Elemento del historial de auditoria de una planilla.
 *
 * ============================================================================
 */
export interface PayrollAuditTrailItem {
  /** ID del evento de auditoria. */
  id: string;

  /** Modulo que origino el evento. */
  modulo: string;

  /** Accion ejecutada. */
  accion: string;

  /** Entidad afectada. */
  entidad: string;

  /** ID de la entidad; nulo en eventos globales. */
  entidadId: string | null;

  /** ID del usuario actor; nulo si no aplica. */
  actorUserId: number | null;

  /** Nombre del actor; nulo si no aplica. */
  actorNombre: string | null;

  /** Email del actor; nulo si no aplica. */
  actorEmail: string | null;

  /** Descripcion textual del evento. */
  descripcion: string;

  /** Fecha del evento (ISO); nula si no aplica. */
  fechaCreacion: string | null;

  /** Metadata libre; nula si no aplica. */
  metadata: Record<string, unknown> | null;

  /** Lista de cambios realizados. */
  cambios: Array<{ campo: string; antes: string; despues: string }>;
}

/**
 * Motivo de bloqueo de traslado interempresas.
 */
export interface IntercompanyTransferBlockingReason {
  /** Codigo del motivo. */
  code: string;

  /** Mensaje legible. */
  message: string;

  /** Metadata adicional; opcional. */
  metadata?: Record<string, unknown>;
}

/**
 * Plan de accion para traslado interempresas.
 */
export interface IntercompanyTransferActionPlan {
  /** ID de la accion personal. */
  idAccion: number;

  /** Tipo de accion. */
  tipoAccion: string;

  /** Estado de la accion. */
  estado: number;

  /** Fecha efecto; nula si no aplica. */
  fechaEfecto?: string | null;

  /** Fecha inicio efecto; nula si no aplica. */
  fechaInicioEfecto?: string | null;

  /** Fecha fin efecto; nula si no aplica. */
  fechaFinEfecto?: string | null;

  /** ID calendario origen; nulo si no aplica. */
  idCalendarioOrigen?: number | null;

  /** Si la accion debe trasladarse. */
  shouldMove: boolean;

  /** Si requiere particion. */
  requiresSplit: boolean;

  /** Si cruza la fecha de traslado. */
  crossesTransfer: boolean;

  /** Si ya esta asignada a una planilla destino. */
  assignedToPayroll: boolean;

  /** Asignaciones a calendarios; opcional. */
  calendarAssignments?: Array<{
    date: string;
    calendarId: number;
    calendarName: string | null;
  }>;
}

/**
 * ============================================================================
 * Intercompany Transfer Simulation Result
 * ============================================================================
 *
 * Resultado de simular un traslado interempresas por empleado.
 *
 * ============================================================================
 */
export interface IntercompanyTransferSimulationResult {
  /** ID del empleado. */
  employeeId: number;

  /** ID empresa origen. */
  fromCompanyId: number;

  /** ID empresa destino. */
  toCompanyId: number;

  /** Fecha efectiva del traslado (ISO). */
  effectiveDate: string;

  /** Si el empleado es elegible para traslado. */
  eligible: boolean;

  /** ID del traslado si existe; nulo si no. */
  transferId: number | null;

  /** Razones de bloqueo si no elegible. */
  blockingReasons: IntercompanyTransferBlockingReason[];

  /** Acciones a trasladar. */
  actionsToMove: IntercompanyTransferActionPlan[];

  /** Cantidad de acciones ignoradas. */
  actionsIgnored: number;

  /** Provision de aguinaldo si aplica; opcional. */
  aguinaldoProvision?: {
    totalBruto: number;
    montoProvisionado: number;
  };

  /** Balance de vacaciones si aplica; opcional. */
  vacationBalance?: {
    balance: number;
    movedDays: number;
    accountId: number | null;
  };
}

/**
 * Payload para simular traslado interempresas.
 */
export interface IntercompanyTransferSimulationPayload {
  /** ID de la empresa destino. */
  idEmpresaDestino: number;

  /** Fecha efectiva del traslado (ISO). */
  fechaEfectiva: string;

  /** Lista de empleados a simular. */
  empleados: Array<{ idEmpleado: number }>;

  /** Motivo opcional. */
  motivo?: string;
}

/**
 * Payload para ejecutar traslados interempresas.
 */
export interface IntercompanyTransferExecutionPayload {
  /** IDs de traslados a ejecutar. */
  transferIds: number[];
}

/**
 * Resultado de ejecucion de un traslado.
 */
export interface IntercompanyTransferExecutionResult {
  /** ID del traslado. */
  transferId: number;

  /** Estado: EXECUTED o FAILED. */
  status: 'EXECUTED' | 'FAILED';

  /** Mensaje descriptivo. */
  message: string;
}

/* =============================================================================
   FUNCIONES AUXILIARES
   ============================================================================= */

/**
 * Extrae mensaje de error del body JSON o devuelve fallback.
 * Mapea 503 a mensaje amigable de desconexion temporal.
 */
async function extractApiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body?.message)) {
      return body.message.join('. ');
    }
    if (typeof body?.message === 'string' && body.message.trim()) {
      return body.message;
    }
  } catch {
    // no-op
  }

  if (res.status === 503) {
    return 'No se pudo completar la accion por una desconexion temporal. Intente nuevamente en unos segundos.';
  }

  return fallback;
}

/* =============================================================================
   API: OPERACIONES CRUD
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Payrolls
 * ============================================================================
 *
 * Lista planillas de una empresa con filtros opcionales.
 *
 * @param companyId - ID de la empresa.
 * @param includeInactive - Incluir planillas inactivas.
 * @param fechaDesde - Fecha desde (filtro).
 * @param fechaHasta - Fecha hasta (filtro).
 * @param inactiveOnly - Solo planillas inactivas.
 *
 * @returns Lista de planillas.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPayrolls(
  companyId: string,
  includeInactive = false,
  fechaDesde?: string,
  fechaHasta?: string,
  inactiveOnly = false,
): Promise<PayrollListItem[]> {
  const qs = new URLSearchParams({
    idEmpresa: companyId,
    ...(includeInactive && { includeInactive: 'true' }),
    ...(fechaDesde ? { fechaDesde } : {}),
    ...(fechaHasta ? { fechaHasta } : {}),
    ...(inactiveOnly ? { inactiveOnly: 'true' } : {}),
  });
  const res = await httpFetch(`/payroll?${qs}`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar planillas'));
  return res.json();
}

/**
 * ============================================================================
 * Fetch Payroll
 * ============================================================================
 *
 * Obtiene el detalle de una planilla.
 *
 * @param id - ID de la planilla.
 *
 * @returns Planilla.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPayroll(id: number): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar planilla'));
  return res.json();
}

/**
 * ============================================================================
 * Create Payroll
 * ============================================================================
 *
 * Crea una nueva planilla.
 *
 * @param payload - Datos de la planilla.
 *
 * @returns Planilla creada.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function createPayroll(payload: CreatePayrollPayload): Promise<PayrollListItem> {
  const res = await httpFetch('/payroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al crear planilla'));
  return res.json();
}

/**
 * ============================================================================
 * Update Payroll
 * ============================================================================
 *
 * Actualiza una planilla existente.
 *
 * @param id - ID de la planilla.
 * @param payload - Campos a actualizar.
 *
 * @returns Planilla actualizada.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function updatePayroll(id: number, payload: UpdatePayrollPayload): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al actualizar planilla'));
  return res.json();
}

/**
 * ============================================================================
 * Process Payroll
 * ============================================================================
 *
 * Procesa una planilla (calcula inputs).
 *
 * @param id - ID de la planilla.
 *
 * @returns Planilla procesada.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function processPayroll(id: number): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}/process`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al procesar planilla'));
  return res.json();
}

/**
 * ============================================================================
 * Verify Payroll
 * ============================================================================
 *
 * Verifica una planilla antes de aplicar.
 *
 * @param id - ID de la planilla.
 *
 * @returns Planilla verificada.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function verifyPayroll(id: number): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}/verify`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al verificar planilla'));
  return res.json();
}

/**
 * ============================================================================
 * Apply Payroll
 * ============================================================================
 *
 * Aplica una planilla (version opcional).
 *
 * @param id - ID de la planilla.
 * @param version - Version especifica (opcional).
 *
 * @returns Planilla aplicada.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function applyPayroll(id: number, version?: number): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}/apply`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(version == null ? {} : { version }),
  });
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al aplicar planilla'));
  return res.json();
}

/**
 * ============================================================================
 * Inactivate Payroll
 * ============================================================================
 *
 * Inactiva una planilla.
 *
 * @param id - ID de la planilla.
 *
 * @returns Planilla inactivada.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function inactivatePayroll(id: number): Promise<PayrollListItem> {
  const res = await httpFetch(`/payroll/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok)
    throw new Error(await extractApiErrorMessage(res, 'No se pudo inactivar la planilla. Intente nuevamente.'));
  return res.json();
}

/* =============================================================================
   API: AUDITORIA Y SNAPSHOT
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Payroll Snapshot Summary
 * ============================================================================
 *
 * Obtiene el resumen del snapshot de una planilla.
 *
 * @param id - ID de la planilla.
 *
 * @returns Resumen con totales.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPayrollSnapshotSummary(id: number): Promise<PayrollSnapshotSummary> {
  const res = await httpFetch(`/payroll/${id}/snapshot-summary`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar resumen de snapshot'));
  return res.json();
}

/**
 * ============================================================================
 * Fetch Payroll Audit Trail
 * ============================================================================
 *
 * Obtiene el historial de auditoria de una planilla.
 *
 * @param id - ID de la planilla.
 * @param limit - Limite de registros (default 200).
 *
 * @returns Lista de eventos de auditoria.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPayrollAuditTrail(id: number, limit = 200): Promise<PayrollAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/payroll/${id}/audit-trail?${qs}`);
  if (!res.ok) throw new Error(await extractApiErrorMessage(res, 'Error al cargar bitacora de planilla'));
  return res.json();
}

/* =============================================================================
   API: TRASLADO INTEREMPRESAS
   ============================================================================= */

/**
 * ============================================================================
 * Simulate Intercompany Transfer
 * ============================================================================
 *
 * Simula un traslado de empleados entre empresas.
 *
 * @param payload - Empresa destino, fecha efectiva, lista de empleados.
 *
 * @returns Resultado de simulacion por empleado.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function simulateIntercompanyTransfer(
  payload: IntercompanyTransferSimulationPayload,
): Promise<IntercompanyTransferSimulationResult[]> {
  const res = await httpFetch('/payroll/intercompany-transfer/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al simular traslado interempresas'));
  }
  return res.json();
}

/**
 * ============================================================================
 * Execute Intercompany Transfer
 * ============================================================================
 *
 * Ejecuta los traslados previamente simulados.
 *
 * @param payload - Lista de IDs de traslado a ejecutar.
 *
 * @returns Resultado de ejecucion por traslado.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function executeIntercompanyTransfer(
  payload: IntercompanyTransferExecutionPayload,
): Promise<IntercompanyTransferExecutionResult[]> {
  const res = await httpFetch('/payroll/intercompany-transfer/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await extractApiErrorMessage(res, 'Error al ejecutar traslado interempresas'));
  }
  return res.json();
}
