/* =============================================================================
   MODULE: payrollMovements
   =============================================================================

   Capa de acceso a datos para el modulo de Movimientos de Nomina.

   Responsabilidades:
   - Consultar movimientos de nomina con filtros por empresa y estado
   - Obtener el detalle de un movimiento especifico
   - Crear y actualizar movimientos
   - Inactivar y reactivar movimientos (soft-delete)
   - Consultar catalogos auxiliares: articulos, tipos de accion, clases, proyectos
   - Consultar la bitacora de auditoria por movimiento

   Decisiones de diseno:
   - `idEmpresas` (array) tiene prioridad sobre `idEmpresa` singular para filtros multi-empresa
   - El error de validacion en create/update se parsea inline (sin helper) por consistencia
     con el patron original del modulo
   - Los catalogos auxiliares exponen `includeInactive` para alimentar selectores en modo edicion

   ============================================================================= */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Payroll Movement List Item
 * ============================================================================
 *
 * Representa un movimiento de nomina en la lista administrativa.
 *
 * Un movimiento es una regla de calculo que aplica un articulo de nomina
 * a empleados de una empresa bajo condiciones especificas (monto fijo o porcentaje).
 *
 * ============================================================================
 */
export interface PayrollMovementListItem {
  /** Identificador unico del movimiento. */
  id: number;

  /** ID de la empresa a la que pertenece el movimiento. */
  idEmpresa: number;

  /** Nombre descriptivo del movimiento. */
  nombre: string;

  /** ID del articulo de nomina asociado. */
  idArticuloNomina: number;

  /** ID del tipo de accion personal al que aplica. */
  idTipoAccionPersonal: number;

  /** ID de la clase contable; puede ser nulo si no aplica clasificacion. */
  idClase: number | null;

  /** ID del proyecto asociado; puede ser nulo si no se segmenta por proyecto. */
  idProyecto: number | null;

  /** Descripcion adicional del movimiento; puede ser nula. */
  descripcion?: string | null;

  /**
   * Indica si el calculo usa monto fijo.
   * - 1 = usa `montoFijo`
   * - 0 = usa `porcentaje`
   */
  esMontoFijo: number;

  /** Monto fijo del movimiento serializado como string decimal. */
  montoFijo: string;

  /** Porcentaje del movimiento serializado como string decimal. */
  porcentaje: string;

  /** Texto de ayuda para la formula de calculo; puede ser nulo. */
  formulaAyuda?: string | null;

  /**
   * Estado de actividad del movimiento.
   * - 0 = activo
   * - 1 = inactivo (soft-delete)
   */
  esInactivo: number;

  /** Fecha de creacion asignada por el servidor en formato ISO 8601. */
  fechaCreacion?: string;

  /** Fecha de ultima modificacion en formato ISO 8601. */
  fechaModificacion?: string;
}

/**
 * ============================================================================
 * Payroll Movement Payload
 * ============================================================================
 *
 * Payload para crear o actualizar un movimiento de nomina.
 *
 * Excluye campos controlados por el backend:
 * - id
 * - esInactivo
 * - fechas de auditoria
 *
 * ============================================================================
 */
export interface PayrollMovementPayload {
  /** ID de la empresa destino del movimiento. */
  idEmpresa: number;

  /** Nombre del movimiento. */
  nombre: string;

  /** ID del articulo de nomina a aplicar. */
  idArticuloNomina: number;

  /** ID del tipo de accion personal al que aplica el movimiento. */
  idTipoAccionPersonal: number;

  /** ID de la clase; opcional. */
  idClase?: number | null;

  /** ID del proyecto; opcional. */
  idProyecto?: number | null;

  /** Descripcion adicional; opcional. */
  descripcion?: string;

  /**
   * Modo de calculo del monto.
   * - 1 = monto fijo
   * - 0 = porcentaje
   */
  esMontoFijo: number;

  /** Monto fijo como string decimal. */
  montoFijo: string;

  /** Porcentaje como string decimal. */
  porcentaje: string;

  /** Texto de ayuda para la formula; opcional. */
  formulaAyuda?: string;
}

/**
 * ============================================================================
 * Payroll Movement Audit Trail Item
 * ============================================================================
 *
 * Representa un evento de la bitacora de auditoria de un movimiento de nomina.
 *
 * ============================================================================
 */
export interface PayrollMovementAuditTrailItem {
  /** Identificador unico del evento de auditoria. */
  id: string;

  /** Modulo que origino el evento. */
  modulo: string;

  /** Accion ejecutada (CREATE, UPDATE, INACTIVATE, REACTIVATE). */
  accion: string;

  /** Entidad afectada. */
  entidad: string;

  /** ID de la entidad afectada; puede ser nulo en eventos globales. */
  entidadId: string | null;

  /** ID del usuario que ejecuto la accion. */
  actorUserId: number | null;

  /** Nombre del usuario actor. */
  actorNombre: string | null;

  /** Email del usuario actor. */
  actorEmail: string | null;

  /** Resumen textual del evento. */
  descripcion: string;

  /** Fecha del evento en formato ISO 8601. */
  fechaCreacion: string | null;

  /** Metadata libre adicional del evento. */
  metadata: Record<string, unknown> | null;

  /** Lista de campos modificados con valores antes y despues. */
  cambios: Array<{ campo: string; antes: string; despues: string }>;
}

/* =============================================================================
   INTERFACES DE CATALOGOS AUXILIARES
   ============================================================================= */

/**
 * ============================================================================
 * Payroll Movement Article Option
 * ============================================================================
 *
 * Opcion de articulo de nomina disponible para asignar a un movimiento.
 * Expone empresa y estado para filtrar en selectores.
 *
 * ============================================================================
 */
export interface PayrollMovementArticleOption {
  /** Identificador unico del articulo. */
  id: number;

  /** ID de la empresa a la que pertenece el articulo. */
  idEmpresa: number;

  /** Nombre del articulo. */
  nombre: string;

  /** ID del tipo de accion personal al que esta ligado el articulo. */
  idTipoAccionPersonal: number;

  /**
   * Estado del articulo.
   * - 0 = activo
   * - 1 = inactivo
   */
  esInactivo: number;
}

/**
 * ============================================================================
 * Payroll Movement Action Type Option
 * ============================================================================
 *
 * Opcion de tipo de accion personal para asignar a un movimiento.
 *
 * ============================================================================
 */
export interface PayrollMovementActionTypeOption {
  /** Identificador unico del tipo de accion. */
  id: number;

  /** Codigo corto del tipo de accion (ej: "BONIFICACION"). */
  codigo: string;

  /** Nombre legible del tipo de accion. */
  nombre: string;

  /**
   * Estado del tipo de accion.
   * - 1 = activo
   * - 0 = inactivo
   */
  estado: number;
}

/**
 * ============================================================================
 * Payroll Movement Class Option
 * ============================================================================
 *
 * Opcion de clase contable para segmentacion de movimientos.
 *
 * ============================================================================
 */
export interface PayrollMovementClassOption {
  /** Identificador unico de la clase. */
  id: number;

  /** Nombre de la clase. */
  nombre: string;

  /**
   * Estado de la clase.
   * - 0 = activa
   * - 1 = inactiva
   */
  esInactivo: number;
}

/**
 * ============================================================================
 * Payroll Movement Project Option
 * ============================================================================
 *
 * Opcion de proyecto para segmentacion por centro de costo.
 *
 * ============================================================================
 */
export interface PayrollMovementProjectOption {
  /** Identificador unico del proyecto. */
  id: number;

  /** ID de la empresa propietaria del proyecto. */
  idEmpresa: number;

  /** Nombre del proyecto. */
  nombre: string;

  /**
   * Estado del proyecto.
   * - 0 = activo
   * - 1 = inactivo
   */
  esInactivo: number;
}

/* =============================================================================
   API: OPERACIONES CRUD
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Payroll Movements
 * ============================================================================
 *
 * Obtiene la lista de movimientos de nomina con filtros opcionales por empresa
 * y estado de actividad.
 *
 * Prioridad de filtro de empresa:
 * 1. `idEmpresas` (array) — toma precedencia para vistas multi-empresa
 * 2. `idEmpresa` (singular) — usado en contextos de empresa unica
 *
 * @param idEmpresa    - ID de empresa individual (usado si `idEmpresas` esta vacio).
 * @param showInactive - Si es `true`, retorna solo registros inactivos.
 * @param idEmpresas   - IDs de empresas para filtro multi-empresa.
 *
 * @returns Lista de movimientos de nomina.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPayrollMovements(
  idEmpresa?: number,
  showInactive = false,
  idEmpresas?: number[],
): Promise<PayrollMovementListItem[]> {
  const params = new URLSearchParams();

  /** El filtro multi-empresa tiene prioridad sobre el filtro singular. */
  if (idEmpresas && idEmpresas.length > 0) {
    params.set('idEmpresas', idEmpresas.join(','));
  } else if (idEmpresa) {
    params.set('idEmpresa', String(idEmpresa));
  }

  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }

  const qs = params.toString();
  const res = await httpFetch(`/payroll-movements${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar movimientos de nomina');
  return res.json();
}

/**
 * ============================================================================
 * Fetch Payroll Movement
 * ============================================================================
 *
 * Obtiene el detalle completo de un movimiento de nomina por su identificador.
 *
 * @param id - Identificador del movimiento.
 *
 * @returns Objeto con el detalle del movimiento.
 *
 * @throws {Error} Si el movimiento no existe o la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPayrollMovement(id: number): Promise<PayrollMovementListItem> {
  const res = await httpFetch(`/payroll-movements/${id}`);
  if (!res.ok) throw new Error('Error al cargar movimiento de nomina');
  return res.json();
}

/**
 * ============================================================================
 * Create Payroll Movement
 * ============================================================================
 *
 * Crea un nuevo movimiento de nomina.
 *
 * @param payload - Datos del nuevo movimiento.
 *
 * @returns El movimiento creado por el servidor.
 *
 * @throws {Error} Si ocurre un error de validacion o una falla general.
 *
 * ============================================================================
 */
export async function createPayrollMovement(payload: PayrollMovementPayload): Promise<PayrollMovementListItem> {
  const res = await httpFetch('/payroll-movements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al crear movimiento de nomina');
  }
  return res.json();
}

/**
 * ============================================================================
 * Update Payroll Movement
 * ============================================================================
 *
 * Actualiza parcialmente un movimiento de nomina existente.
 *
 * @param id      - Identificador del movimiento a actualizar.
 * @param payload - Campos a modificar.
 *
 * @returns El movimiento actualizado.
 *
 * @throws {Error} Si ocurre un error de validacion o una falla general.
 *
 * ============================================================================
 */
export async function updatePayrollMovement(
  id: number,
  payload: Partial<PayrollMovementPayload>,
): Promise<PayrollMovementListItem> {
  const res = await httpFetch(`/payroll-movements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al actualizar movimiento de nomina');
  }
  return res.json();
}

/* =============================================================================
   API: GESTION DE ESTADO
   ============================================================================= */

/**
 * ============================================================================
 * Inactivate Payroll Movement
 * ============================================================================
 *
 * Inactiva un movimiento de nomina mediante soft-delete.
 *
 * @param id - Identificador del movimiento a inactivar.
 *
 * @returns El movimiento marcado como inactivo.
 *
 * @throws {Error} Si la operacion falla.
 *
 * ============================================================================
 */
export async function inactivatePayrollMovement(id: number): Promise<PayrollMovementListItem> {
  const res = await httpFetch(`/payroll-movements/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al inactivar movimiento de nomina');
  return res.json();
}

/**
 * ============================================================================
 * Reactivate Payroll Movement
 * ============================================================================
 *
 * Reactiva un movimiento de nomina previamente inactivado.
 *
 * @param id - Identificador del movimiento a reactivar.
 *
 * @returns El movimiento reactivado.
 *
 * @throws {Error} Si la operacion falla.
 *
 * ============================================================================
 */
export async function reactivatePayrollMovement(id: number): Promise<PayrollMovementListItem> {
  const res = await httpFetch(`/payroll-movements/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al reactivar movimiento de nomina');
  return res.json();
}

/* =============================================================================
   API: CATALOGOS AUXILIARES
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Payroll Movement Articles
 * ============================================================================
 *
 * Obtiene los articulos de nomina disponibles para asignar a movimientos
 * de una empresa especifica.
 *
 * @param idEmpresa      - ID de la empresa para filtrar articulos.
 * @param includeInactive - Si es `true`, incluye articulos inactivos.
 *
 * @returns Lista de opciones de articulos de nomina.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPayrollMovementArticles(
  idEmpresa: number,
  includeInactive = false,
): Promise<PayrollMovementArticleOption[]> {
  const params = new URLSearchParams({ idEmpresa: String(idEmpresa) });
  if (includeInactive) {
    params.set('includeInactive', 'true');
  }
  const res = await httpFetch(`/payroll-movements/articles?${params.toString()}`);
  if (!res.ok) throw new Error('Error al cargar articulos de nomina');
  return res.json();
}

/**
 * ============================================================================
 * Fetch Payroll Movement Personal Action Types
 * ============================================================================
 *
 * Obtiene los tipos de accion personal disponibles para asignar a movimientos.
 *
 * Son globales (sin empresa), por lo que no reciben `idEmpresa`.
 *
 * @param includeInactive - Si es `true`, incluye tipos inactivos.
 *
 * @returns Lista de opciones de tipos de accion personal.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPayrollMovementPersonalActionTypes(
  includeInactive = false,
): Promise<PayrollMovementActionTypeOption[]> {
  const params = new URLSearchParams();
  if (includeInactive) {
    params.set('includeInactive', 'true');
  }
  const qs = params.toString();
  const res = await httpFetch(`/payroll-movements/personal-action-types${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar tipos de accion personal');
  return res.json();
}

/**
 * ============================================================================
 * Fetch Payroll Movement Classes
 * ============================================================================
 *
 * Obtiene las clases contables disponibles para segmentar movimientos.
 *
 * Son globales (sin empresa), por lo que no reciben `idEmpresa`.
 *
 * @param includeInactive - Si es `true`, incluye clases inactivas.
 *
 * @returns Lista de opciones de clases.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPayrollMovementClasses(includeInactive = false): Promise<PayrollMovementClassOption[]> {
  const params = new URLSearchParams();
  if (includeInactive) {
    params.set('includeInactive', 'true');
  }
  const qs = params.toString();
  const res = await httpFetch(`/payroll-movements/classes${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar clases');
  return res.json();
}

/**
 * ============================================================================
 * Fetch Payroll Movement Projects
 * ============================================================================
 *
 * Obtiene los proyectos disponibles para segmentar movimientos por centro de costo
 * dentro de una empresa especifica.
 *
 * @param idEmpresa      - ID de la empresa para filtrar proyectos.
 * @param includeInactive - Si es `true`, incluye proyectos inactivos.
 *
 * @returns Lista de opciones de proyectos.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPayrollMovementProjects(
  idEmpresa: number,
  includeInactive = false,
): Promise<PayrollMovementProjectOption[]> {
  const params = new URLSearchParams({ idEmpresa: String(idEmpresa) });
  if (includeInactive) {
    params.set('includeInactive', 'true');
  }
  const res = await httpFetch(`/payroll-movements/projects?${params.toString()}`);
  if (!res.ok) throw new Error('Error al cargar proyectos');
  return res.json();
}

/* =============================================================================
   API: AUDITORIA
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Payroll Movement Audit Trail
 * ============================================================================
 *
 * Obtiene el historial de auditoria de un movimiento de nomina.
 *
 * @param id    - Identificador del movimiento.
 * @param limit - Maximo de eventos a retornar. Por defecto `200`.
 *
 * @returns Lista de eventos de auditoria.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPayrollMovementAuditTrail(
  id: number,
  limit = 200,
): Promise<PayrollMovementAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/payroll-movements/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al cargar bitacora de movimientos de nomina');
  }
  return res.json();
}
