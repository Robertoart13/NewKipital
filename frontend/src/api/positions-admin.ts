/* =============================================================================
   MODULE: positions-admin
   =============================================================================

   Capa de acceso a datos para el modulo administrativo de Puestos de Trabajo.

   Responsabilidades:
   - Consultar puestos activos e inactivos
   - Obtener el detalle de un puesto especifico
   - Crear puestos
   - Actualizar puestos
   - Inactivar y reactivar registros (soft-delete)
   - Consultar la bitacora de auditoria

   Decisiones de diseno:
   - Los puestos son globales (sin empresa) y se asignan directamente a empleados
   - El campo `estado` sigue la convencion 1=activo / 0=inactivo del backend
   - Este modulo es la vista administrativa; el catalogo liviano esta en catalogs.ts

   ============================================================================= */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Position List Item
 * ============================================================================
 *
 * Representa un puesto de trabajo en la lista administrativa.
 *
 * Incluye estado, descripcion opcional y campos de auditoria de fechas.
 *
 * ============================================================================
 */
export interface PositionListItem {
  /** Identificador unico del puesto. */
  id: number;

  /** Nombre del puesto (ej: "Desarrollador Senior", "Analista Financiero"). */
  nombre: string;

  /** Descripcion adicional del puesto; puede ser nula. */
  descripcion?: string | null;

  /**
   * Estado del puesto.
   * - 1 = activo
   * - 0 = inactivo
   */
  estado: number;

  /** Fecha de creacion asignada por el servidor en formato ISO 8601. */
  fechaCreacion?: string;

  /** Fecha de ultima modificacion en formato ISO 8601. */
  fechaModificacion?: string;
}

/**
 * ============================================================================
 * Position Payload
 * ============================================================================
 *
 * Payload para crear o actualizar un puesto de trabajo.
 *
 * Excluye campos controlados por el backend:
 * - id
 * - estado
 * - fechas de auditoria
 *
 * ============================================================================
 */
export interface PositionPayload {
  /** Nombre del puesto. */
  nombre: string;

  /** Descripcion adicional; opcional. */
  descripcion?: string;
}

/**
 * ============================================================================
 * Position Audit Trail Item
 * ============================================================================
 *
 * Representa un evento de la bitacora de auditoria de un puesto de trabajo.
 *
 * ============================================================================
 */
export interface PositionAuditTrailItem {
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
   API: OPERACIONES CRUD
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Positions Admin
 * ============================================================================
 *
 * Obtiene la lista de puestos de trabajo para la vista administrativa,
 * con filtro opcional por estado.
 *
 * @param showInactive - Si es `true`, retorna unicamente registros inactivos.
 *                       Por defecto retorna los activos.
 *
 * @returns Lista de puestos de trabajo.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
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

/**
 * ============================================================================
 * Fetch Position
 * ============================================================================
 *
 * Obtiene el detalle completo de un puesto por su identificador.
 *
 * @param id - Identificador unico del puesto.
 *
 * @returns Objeto con el detalle del puesto.
 *
 * @throws {Error} Si el puesto no existe o la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPosition(id: number): Promise<PositionListItem> {
  const res = await httpFetch(`/positions/${id}`);
  if (!res.ok) throw new Error('Error al cargar puesto');
  return res.json();
}

/**
 * ============================================================================
 * Create Position
 * ============================================================================
 *
 * Crea un nuevo puesto de trabajo en el sistema.
 *
 * @param payload - Datos del nuevo puesto.
 *
 * @returns El puesto creado con su `id` asignado por el servidor.
 *
 * @throws {Error} Si ocurre un error de validacion o una falla general.
 *
 * ============================================================================
 */
export async function createPosition(payload: PositionPayload): Promise<PositionListItem> {
  const res = await httpFetch('/positions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al crear puesto');
  }
  return res.json();
}

/**
 * ============================================================================
 * Update Position
 * ============================================================================
 *
 * Actualiza parcialmente un puesto de trabajo existente.
 *
 * @param id      - Identificador del puesto a actualizar.
 * @param payload - Campos a modificar.
 *
 * @returns El puesto actualizado.
 *
 * @throws {Error} Si ocurre un error de validacion o una falla general.
 *
 * ============================================================================
 */
export async function updatePosition(id: number, payload: Partial<PositionPayload>): Promise<PositionListItem> {
  const res = await httpFetch(`/positions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al actualizar puesto');
  }
  return res.json();
}

/* =============================================================================
   API: GESTION DE ESTADO
   ============================================================================= */

/**
 * ============================================================================
 * Inactivate Position
 * ============================================================================
 *
 * Inactiva un puesto de trabajo mediante soft-delete.
 *
 * No elimina el registro fisicamente para preservar la integridad
 * de los empleados asignados al puesto.
 *
 * @param id - Identificador del puesto a inactivar.
 *
 * @returns El puesto marcado como inactivo.
 *
 * @throws {Error} Si la operacion falla.
 *
 * ============================================================================
 */
export async function inactivatePosition(id: number): Promise<PositionListItem> {
  const res = await httpFetch(`/positions/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al inactivar puesto');
  return res.json();
}

/**
 * ============================================================================
 * Reactivate Position
 * ============================================================================
 *
 * Reactiva un puesto de trabajo previamente inactivado.
 *
 * @param id - Identificador del puesto a reactivar.
 *
 * @returns El puesto reactivado.
 *
 * @throws {Error} Si la operacion falla.
 *
 * ============================================================================
 */
export async function reactivatePosition(id: number): Promise<PositionListItem> {
  const res = await httpFetch(`/positions/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al reactivar puesto');
  return res.json();
}

/* =============================================================================
   API: AUDITORIA
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Position Audit Trail
 * ============================================================================
 *
 * Obtiene el historial de auditoria de un puesto de trabajo especifico.
 *
 * @param id    - Identificador del puesto.
 * @param limit - Numero maximo de eventos a retornar. Por defecto `200`.
 *
 * @returns Lista de eventos de auditoria.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPositionAuditTrail(id: number, limit = 200): Promise<PositionAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/positions/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al cargar bitacora de puestos');
  }
  return res.json();
}
