/* =============================================================================
   MODULE: departments-admin
   =============================================================================

   Capa de acceso a datos para el módulo administrativo de Departamentos.

   Responsabilidades:
   - Consultar departamentos activos e inactivos
   - Obtener el detalle de un departamento específico
   - Crear departamentos
   - Actualizar departamentos
   - Inactivar y reactivar registros
   - Consultar bitácora de auditoría

   Decisiones de diseño:
   - Todas las solicitudes HTTP se canalizan mediante `httpFetch`
   - Los departamentos son globales (sin empresa) y se asignan a empleados
   - Este módulo es la vista administrativa; el catálogo liviano está en catalogs.ts

   ============================================================================= */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Department List Item
 * ============================================================================
 *
 * Representa un elemento de la lista de departamentos retornado por la API
 * en la vista administrativa.
 *
 * Incluye estado, integración externa y campos de auditoría.
 *
 * ============================================================================
 */
export interface DepartmentListItem {
  /** Identificador único del departamento. */
  id: number;

  /** Nombre del departamento. */
  nombre: string;

  /** Identificador externo para integración con ERP; puede ser nulo. */
  idExterno?: string | null;

  /**
   * Estado del departamento.
   * - 1 = activo
   * - 0 = inactivo
   */
  estado: number;

  /** Fecha de creación asignada por el servidor en formato ISO 8601. */
  fechaCreacion?: string;

  /** Fecha de última modificación asignada por el servidor en formato ISO 8601. */
  fechaModificacion?: string;
}

/**
 * ============================================================================
 * Department Payload
 * ============================================================================
 *
 * Payload utilizado para crear o actualizar un departamento.
 *
 * Excluye campos controlados por el backend:
 * - id
 * - estado
 * - fechas de auditoría
 *
 * ============================================================================
 */
export interface DepartmentPayload {
  /** Nombre del departamento. */
  nombre: string;

  /** Identificador externo para integración con ERP; opcional. */
  idExterno?: string;
}

/**
 * ============================================================================
 * Department Audit Trail Item
 * ============================================================================
 *
 * Representa un evento dentro de la bitácora de auditoría de un departamento.
 *
 * Cada elemento describe:
 * - quién realizó la acción
 * - qué acción se ejecutó
 * - sobre qué entidad ocurrió
 * - qué cambios fueron aplicados
 *
 * ============================================================================
 */
export interface DepartmentAuditTrailItem {
  /** Identificador único del evento de auditoría. */
  id: string;

  /** Módulo que originó el evento. */
  modulo: string;

  /** Acción ejecutada sobre la entidad. */
  accion: string;

  /** Nombre lógico de la entidad afectada. */
  entidad: string;

  /** Identificador de la entidad afectada; puede ser nulo en eventos globales. */
  entidadId: string | null;

  /** ID del usuario actor que ejecutó la acción. */
  actorUserId: number | null;

  /** Nombre del usuario actor. */
  actorNombre: string | null;

  /** Email del usuario actor. */
  actorEmail: string | null;

  /** Resumen textual del evento. */
  descripcion: string;

  /** Fecha de creación del evento en formato ISO 8601. */
  fechaCreacion: string | null;

  /** Metadata libre asociada al evento. */
  metadata: Record<string, unknown> | null;

  /**
   * Lista de cambios realizados.
   * En eventos de creación puede venir vacía.
   */
  cambios: Array<{
    /** Nombre del campo afectado. */
    campo: string;

    /** Valor anterior serializado. */
    antes: string;

    /** Valor posterior serializado. */
    despues: string;
  }>;
}

/* =============================================================================
   FUNCIONES AUXILIARES
   ============================================================================= */

/**
 * ============================================================================
 * Parse Error Message
 * ============================================================================
 *
 * Normaliza el mensaje de error retornado por la API.
 *
 * Soporta respuestas donde `message` puede venir como:
 * - string
 * - string[]
 * - undefined
 *
 * @param res             - Respuesta HTTP fallida.
 * @param fallbackMessage - Mensaje genérico de respaldo.
 *
 * @returns Mensaje final listo para ser lanzado como excepción.
 *
 * ============================================================================
 */
async function parseErrorMessage(res: Response, fallbackMessage: string): Promise<string> {
  const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
  return message || fallbackMessage;
}

/* =============================================================================
   API: OPERACIONES CRUD
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Departments Admin
 * ============================================================================
 *
 * Obtiene la lista de departamentos para la vista administrativa,
 * con filtro opcional por estado.
 *
 * @param showInactive - Si es `true`, retorna únicamente registros inactivos.
 *                       Por defecto retorna los activos.
 *
 * @returns Lista de departamentos.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchDepartmentsAdmin(showInactive = false): Promise<DepartmentListItem[]> {
  const params = new URLSearchParams();

  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }

  const qs = params.toString();
  const res = await httpFetch(`/departments${qs ? `?${qs}` : ''}`);

  if (!res.ok) throw new Error('Error al cargar departamentos');

  return res.json();
}

/**
 * ============================================================================
 * Fetch Department
 * ============================================================================
 *
 * Obtiene el detalle completo de un departamento por su identificador.
 *
 * @param id - Identificador único del departamento.
 *
 * @returns Objeto con el detalle del departamento.
 *
 * @throws {Error} Si el departamento no existe o la petición falla.
 *
 * ============================================================================
 */
export async function fetchDepartment(id: number): Promise<DepartmentListItem> {
  const res = await httpFetch(`/departments/${id}`);

  if (!res.ok) throw new Error('Error al cargar departamento');

  return res.json();
}

/**
 * ============================================================================
 * Create Department
 * ============================================================================
 *
 * Crea un nuevo departamento en el sistema.
 *
 * @param payload - Datos del nuevo departamento.
 *
 * @returns El departamento creado por el servidor.
 *
 * @throws {Error} Si ocurre un error de validación o una falla general.
 *
 * ============================================================================
 */
export async function createDepartment(payload: DepartmentPayload): Promise<DepartmentListItem> {
  const res = await httpFetch('/departments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al crear departamento');
    throw new Error(message);
  }

  return res.json();
}

/**
 * ============================================================================
 * Update Department
 * ============================================================================
 *
 * Actualiza parcialmente un departamento existente.
 *
 * @param id      - Identificador del departamento a actualizar.
 * @param payload - Campos a modificar.
 *
 * @returns El departamento actualizado.
 *
 * @throws {Error} Si ocurre un error de validación o una falla general.
 *
 * ============================================================================
 */
export async function updateDepartment(id: number, payload: Partial<DepartmentPayload>): Promise<DepartmentListItem> {
  const res = await httpFetch(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al actualizar departamento');
    throw new Error(message);
  }

  return res.json();
}

/* =============================================================================
   API: GESTIÓN DE ESTADO
   ============================================================================= */

/**
 * ============================================================================
 * Inactivate Department
 * ============================================================================
 *
 * Inactiva un departamento mediante soft-delete.
 *
 * No elimina el registro físicamente para preservar la integridad
 * de los empleados asignados al departamento.
 *
 * @param id - Identificador del departamento a inactivar.
 *
 * @returns El departamento marcado como inactivo.
 *
 * @throws {Error} Si la operación falla.
 *
 * ============================================================================
 */
export async function inactivateDepartment(id: number): Promise<DepartmentListItem> {
  const res = await httpFetch(`/departments/${id}/inactivate`, { method: 'PATCH' });

  if (!res.ok) throw new Error('Error al inactivar departamento');

  return res.json();
}

/**
 * ============================================================================
 * Reactivate Department
 * ============================================================================
 *
 * Reactiva un departamento previamente inactivado.
 *
 * @param id - Identificador del departamento a reactivar.
 *
 * @returns El departamento reactivado.
 *
 * @throws {Error} Si la operación falla.
 *
 * ============================================================================
 */
export async function reactivateDepartment(id: number): Promise<DepartmentListItem> {
  const res = await httpFetch(`/departments/${id}/reactivate`, { method: 'PATCH' });

  if (!res.ok) throw new Error('Error al reactivar departamento');

  return res.json();
}

/* =============================================================================
   API: AUDITORÍA
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Department Audit Trail
 * ============================================================================
 *
 * Obtiene el historial de auditoría de un departamento específico.
 *
 * @param id    - Identificador del departamento.
 * @param limit - Número máximo de eventos a retornar. Por defecto `200`.
 *
 * @returns Lista de eventos de auditoría.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchDepartmentAuditTrail(id: number, limit = 200): Promise<DepartmentAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });

  const res = await httpFetch(`/departments/${id}/audit-trail?${qs}`);

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al cargar bitacora de departamentos');
    throw new Error(message);
  }

  return res.json();
}
