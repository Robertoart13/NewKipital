/* =============================================================================
   MODULE: classes
   =============================================================================

   Capa de acceso a datos para el módulo de Clases.

   Responsabilidades:
   - Consultar clases activas e inactivas
   - Obtener el detalle de una clase específica
   - Crear clases
   - Actualizar clases
   - Inactivar y reactivar registros
   - Consultar bitácora de auditoría

   Decisiones de diseño:
   - Todas las solicitudes HTTP se canalizan mediante `httpFetch`
   - La autenticación y manejo de tokens se delegan al interceptor
   - Las Clases son globales (no tienen empresa) y se usan como dimensión
     de clasificación en Movimientos de Nómina

   ============================================================================= */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Class List Item
 * ============================================================================
 *
 * Representa un elemento de la lista de clases retornado por la API.
 *
 * Incluye:
 * - datos funcionales del registro
 * - integración con sistemas externos
 * - estado lógico
 * - campos de auditoría gestionados por el servidor
 *
 * ============================================================================
 */
export interface ClassListItem {
  /** Identificador único de la clase. */
  id: number;

  /** Nombre descriptivo de la clase. */
  nombre: string;

  /** Descripción ampliada de la clase; puede ser nula. */
  descripcion?: string | null;

  /** Código interno de la clase. */
  codigo: string;

  /** Identificador externo para integración con ERP u otros sistemas; puede ser nulo. */
  idExterno?: string | null;

  /**
   * Estado lógico del registro.
   * - 0 = activa
   * - 1 = inactiva
   */
  esInactivo: number;

  /** Fecha de creación asignada por el servidor en formato ISO 8601. */
  fechaCreacion?: string;

  /** Fecha de última modificación asignada por el servidor en formato ISO 8601. */
  fechaModificacion?: string;
}

/**
 * ============================================================================
 * Class Payload
 * ============================================================================
 *
 * Payload utilizado para crear o actualizar una clase.
 *
 * Excluye campos controlados por el backend:
 * - id
 * - esInactivo
 * - fechas de auditoría
 *
 * ============================================================================
 */
export interface ClassPayload {
  /** Nombre de la clase. */
  nombre: string;

  /** Descripción ampliada opcional. */
  descripcion?: string;

  /** Código interno de la clase. */
  codigo: string;

  /** Identificador externo para integración con ERP. */
  idExterno?: string;
}

/**
 * ============================================================================
 * Class Audit Trail Item
 * ============================================================================
 *
 * Representa un evento dentro de la bitácora de auditoría de una clase.
 *
 * Cada elemento describe:
 * - quién realizó la acción
 * - qué acción se ejecutó
 * - sobre qué entidad ocurrió
 * - qué cambios fueron aplicados
 *
 * ============================================================================
 */
export interface ClassAuditTrailItem {
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
 * Este comportamiento es común en NestJS y class-validator,
 * por lo que se centraliza aquí para evitar repetición.
 *
 * @param res - Respuesta HTTP fallida.
 * @param fallbackMessage - Mensaje genérico de respaldo.
 *
 * @returns Mensaje final listo para ser lanzado como excepción.
 *
 * ============================================================================
 */
async function parseErrorMessage(res: Response, fallbackMessage: string): Promise<string> {
  /** Intenta parsear el body de error como JSON. */
  const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;

  /** Unifica errores de validación múltiples en una sola cadena legible. */
  const message = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;

  return message || fallbackMessage;
}

/* =============================================================================
   API: OPERACIONES CRUD
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Classes
 * ============================================================================
 *
 * Obtiene la lista de clases con filtro opcional por estado.
 *
 * @param showInactive - Si es `true`, retorna únicamente registros inactivos.
 *                       Por defecto retorna los activos.
 *
 * @returns Lista de clases.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchClasses(showInactive = false): Promise<ClassListItem[]> {
  /** Inicializa el contenedor de query params. */
  const params = new URLSearchParams();

  /** Solo aplica el filtro si se solicita explícitamente ver inactivas. */
  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }

  const qs = params.toString();
  const res = await httpFetch(`/classes${qs ? `?${qs}` : ''}`);

  if (!res.ok) throw new Error('Error al cargar clases');

  return res.json();
}

/**
 * ============================================================================
 * Fetch Class
 * ============================================================================
 *
 * Obtiene el detalle completo de una clase por su identificador.
 *
 * @param id - Identificador único de la clase.
 *
 * @returns Objeto con el detalle de la clase.
 *
 * @throws {Error} Si la clase no existe o la petición falla.
 *
 * ============================================================================
 */
export async function fetchClass(id: number): Promise<ClassListItem> {
  const res = await httpFetch(`/classes/${id}`);

  if (!res.ok) throw new Error('Error al cargar clase');

  return res.json();
}

/**
 * ============================================================================
 * Create Class
 * ============================================================================
 *
 * Crea una nueva clase en el sistema.
 *
 * El backend puede devolver errores de validación con formato `string[]`,
 * por lo que se normaliza el mensaje antes de lanzar la excepción.
 *
 * @param payload - Datos requeridos para crear la clase.
 *
 * @returns La clase creada por el servidor.
 *
 * @throws {Error} Si ocurre un error de validación o una falla general.
 *
 * ============================================================================
 */
export async function createClass(payload: ClassPayload): Promise<ClassListItem> {
  const res = await httpFetch('/classes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al crear clase');
    throw new Error(message);
  }

  return res.json();
}

/**
 * ============================================================================
 * Update Class
 * ============================================================================
 *
 * Actualiza parcialmente una clase existente.
 *
 * Se utiliza `Partial<ClassPayload>` para permitir actualizaciones
 * parciales sin obligar al consumidor a reenviar la estructura completa.
 *
 * @param id      - Identificador de la clase a actualizar.
 * @param payload - Campos a modificar.
 *
 * @returns La clase actualizada.
 *
 * @throws {Error} Si ocurre un error de validación o una falla general.
 *
 * ============================================================================
 */
export async function updateClass(id: number, payload: Partial<ClassPayload>): Promise<ClassListItem> {
  const res = await httpFetch(`/classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al actualizar clase');
    throw new Error(message);
  }

  return res.json();
}

/* =============================================================================
   API: GESTIÓN DE ESTADO
   ============================================================================= */

/**
 * ============================================================================
 * Inactivate Class
 * ============================================================================
 *
 * Inactiva una clase mediante soft-delete.
 *
 * Esta operación no elimina físicamente el registro, sino que marca
 * `esInactivo = 1` para preservar integridad referencial.
 *
 * @param id - Identificador de la clase a inactivar.
 *
 * @returns La clase marcada como inactiva.
 *
 * @throws {Error} Si la operación falla.
 *
 * ============================================================================
 */
export async function inactivateClass(id: number): Promise<ClassListItem> {
  const res = await httpFetch(`/classes/${id}/inactivate`, { method: 'PATCH' });

  if (!res.ok) throw new Error('Error al inactivar clase');

  return res.json();
}

/**
 * ============================================================================
 * Reactivate Class
 * ============================================================================
 *
 * Reactiva una clase previamente inactivada.
 *
 * Revierte `esInactivo` a `0`, haciendo visible nuevamente el registro.
 *
 * @param id - Identificador de la clase a reactivar.
 *
 * @returns La clase reactivada.
 *
 * @throws {Error} Si la operación falla.
 *
 * ============================================================================
 */
export async function reactivateClass(id: number): Promise<ClassListItem> {
  const res = await httpFetch(`/classes/${id}/reactivate`, { method: 'PATCH' });

  if (!res.ok) throw new Error('Error al reactivar clase');

  return res.json();
}

/* =============================================================================
   API: AUDITORÍA
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Class Audit Trail
 * ============================================================================
 *
 * Obtiene el historial de auditoría de una clase específica.
 *
 * @param id    - Identificador de la clase.
 * @param limit - Número máximo de eventos a retornar. Por defecto `200`.
 *
 * @returns Lista de eventos de auditoría.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchClassAuditTrail(id: number, limit = 200): Promise<ClassAuditTrailItem[]> {
  /** Construye el query string con el límite solicitado. */
  const qs = new URLSearchParams({ limit: String(limit) });

  const res = await httpFetch(`/classes/${id}/audit-trail?${qs}`);

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al cargar bitacora de clases');
    throw new Error(message);
  }

  return res.json();
}
