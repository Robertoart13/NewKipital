/* =============================================================================
   MODULE: notifications
   =============================================================================

   Capa de acceso a datos para el módulo de Notificaciones.

   Responsabilidades:
   - Consultar notificaciones del usuario con filtros opcionales
   - Obtener el contador de notificaciones no leídas
   - Marcar notificaciones individuales como leídas o eliminadas
   - Marcar todas las notificaciones como leídas

   Decisiones de diseño:
   - Todas las solicitudes HTTP se canalizan mediante `httpFetch`
   - `ensureOk` centraliza la validación y extracción del mensaje de error
   - `fetchUnreadCount` no lanza error porque el contador es no crítico;
     retorna 0 si la respuesta no es válida

   ============================================================================= */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Notification Item
 * ============================================================================
 *
 * Representa una notificación entregada al usuario.
 *
 * Incluye:
 * - identificadores del inbox y de la notificación base
 * - tipo, título y mensaje
 * - payload estructurado para navegación o acciones
 * - estado del ciclo de vida de la notificación
 *
 * ============================================================================
 */
export interface NotificationItem {
  /** Identificador único del inbox item del usuario. */
  id: number;

  /** Identificador de la notificación base en el sistema. */
  idNotificacion: number;

  /** Tipo de notificación (ej: "PLANILLA", "ACCION_PERSONAL"). */
  tipo: string;

  /** Título visible de la notificación. */
  titulo: string;

  /** Mensaje descriptivo; puede ser nulo. */
  mensaje: string | null;

  /** Payload estructurado adicional para acciones o navegación; puede ser nulo. */
  payload: Record<string, unknown> | null;

  /**
   * Estado del ciclo de vida de la notificación para este usuario.
   * - UNREAD  = no leída
   * - READ    = leída
   * - DELETED = eliminada del inbox
   */
  estado: 'UNREAD' | 'READ' | 'DELETED';

  /** Fecha en que fue entregada al usuario en formato ISO 8601. */
  fechaEntregada: string;

  /** Fecha en que fue leída; nula si aún no fue leída. */
  fechaLeida: string | null;

  /** Fecha de creación de la notificación base en formato ISO 8601. */
  fechaCreacion: string;
}

/* =============================================================================
   FUNCIONES AUXILIARES
   ============================================================================= */

/**
 * ============================================================================
 * Ensure Ok
 * ============================================================================
 *
 * Valida que la respuesta HTTP sea exitosa.
 *
 * Si falla, intenta extraer el mensaje de error del body antes de lanzar
 * la excepción. Se centraliza aquí para evitar repetición en cada endpoint.
 *
 * @param res          - Respuesta HTTP a validar.
 * @param defaultError - Mensaje de respaldo si el body no contiene mensaje.
 *
 * @throws {Error} Si el status HTTP no es exitoso.
 *
 * ============================================================================
 */
async function ensureOk(res: Response, defaultError: string): Promise<void> {
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.message ?? (Array.isArray(data?.message) ? data.message.join(', ') : defaultError);
    throw new Error(typeof msg === 'string' ? msg : defaultError);
  }
}

/* =============================================================================
   API: CONSULTAS
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Notifications
 * ============================================================================
 *
 * Obtiene las notificaciones del usuario autenticado con filtros opcionales.
 *
 * Los filtros de `appCode` y `companyId` permiten segmentar las notificaciones
 * por contexto de aplicación y empresa activa.
 *
 * @param params.status    - 'unread' para solo no leídas; 'all' para todas.
 * @param params.appCode   - Código de la aplicación activa.
 * @param params.companyId - ID de la empresa activa.
 *
 * @returns Lista de notificaciones del usuario.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchNotifications(params?: {
  status?: 'unread' | 'all';
  appCode?: string;
  companyId?: number;
}): Promise<NotificationItem[]> {
  const search = new URLSearchParams();

  if (params?.status) search.set('status', params.status);
  if (params?.appCode) search.set('appCode', params.appCode);
  if (params?.companyId != null) search.set('companyId', String(params.companyId));

  const qs = search.toString();
  const res = await httpFetch(`/notifications${qs ? `?${qs}` : ''}`);

  await ensureOk(res, 'Error al cargar notificaciones');

  const data = await res.json();

  /** Garantiza que siempre se retorne un arreglo aunque el backend devuelva otro tipo. */
  return Array.isArray(data) ? data : [];
}

/**
 * ============================================================================
 * Fetch Unread Count
 * ============================================================================
 *
 * Obtiene el número de notificaciones no leídas del usuario.
 *
 * Esta función no lanza error intencionalmente ya que el contador es
 * un dato de baja criticidad y no debe bloquear la UI si falla.
 * Retorna 0 ante cualquier falla o respuesta inesperada.
 *
 * @param params.appCode   - Código de la aplicación activa.
 * @param params.companyId - ID de la empresa activa.
 *
 * @returns Número de notificaciones no leídas o 0 si falla.
 *
 * ============================================================================
 */
export async function fetchUnreadCount(params?: { appCode?: string; companyId?: number }): Promise<number> {
  const search = new URLSearchParams();

  if (params?.appCode) search.set('appCode', params.appCode);
  if (params?.companyId != null) search.set('companyId', String(params.companyId));

  const qs = search.toString();
  const res = await httpFetch(`/notifications/unread-count${qs ? `?${qs}` : ''}`);

  const data = await res.json();

  /** Retorna 0 si el campo `count` no está presente o no es número. */
  return typeof data?.count === 'number' ? data.count : 0;
}

/* =============================================================================
   API: GESTIÓN DE ESTADO
   ============================================================================= */

/**
 * ============================================================================
 * Mark Notification As Read
 * ============================================================================
 *
 * Marca una notificación específica como leída.
 *
 * @param id - Identificador del inbox item a marcar como leído.
 *
 * @throws {Error} Si la operación falla.
 *
 * ============================================================================
 */
export async function markNotificationAsRead(id: number): Promise<void> {
  const res = await httpFetch(`/notifications/${id}/read`, { method: 'POST' });
  await ensureOk(res, 'Error al marcar notificación como leída');
}

/**
 * ============================================================================
 * Mark Notification As Deleted
 * ============================================================================
 *
 * Elimina lógicamente una notificación del inbox del usuario.
 *
 * No elimina la notificación base del sistema, solo la marca como
 * eliminada en el inbox del usuario.
 *
 * @param id - Identificador del inbox item a eliminar.
 *
 * @throws {Error} Si la operación falla.
 *
 * ============================================================================
 */
export async function markNotificationAsDeleted(id: number): Promise<void> {
  const res = await httpFetch(`/notifications/${id}/delete`, { method: 'POST' });
  await ensureOk(res, 'Error al eliminar notificación');
}

/**
 * ============================================================================
 * Mark All Notifications As Read
 * ============================================================================
 *
 * Marca todas las notificaciones del usuario como leídas en el contexto
 * de la aplicación y empresa activa.
 *
 * @param params.appCode   - Código de la aplicación activa.
 * @param params.companyId - ID de la empresa activa.
 *
 * @throws {Error} Si la operación falla.
 *
 * ============================================================================
 */
export async function markAllNotificationsAsRead(params?: { appCode?: string; companyId?: number }): Promise<void> {
  const search = new URLSearchParams();

  if (params?.appCode) search.set('appCode', params.appCode);
  if (params?.companyId != null) search.set('companyId', String(params.companyId));

  const qs = search.toString();
  const res = await httpFetch(`/notifications/read-all${qs ? `?${qs}` : ''}`, { method: 'POST' });

  await ensureOk(res, 'Error al marcar todas las notificaciones como leídas');
}
