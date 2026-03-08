/* =============================================================================
   MODULE: opsMonitoring
   =============================================================================

   Capa de acceso a datos para monitoreo operativo de colas (identity, encrypt).

   Responsabilidades:
   - Consultar resumen de colas
   - Listar jobs de cola con filtros
   - Re-escanear colas
   - Liberar jobs bloqueados
   - Reencolar jobs individuales

   Decisiones de diseno:
   - Todas las solicitudes HTTP se canalizan mediante httpFetch
   - Respuestas envueltas en { success, data }; este modulo extrae data
   - Funciones auxiliares ensureOk y buildQuery centralizan logica comun

   ========================================================================== */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Queue Summary Response
 * ============================================================================
 *
 * Resumen agregado de las colas de procesamiento (identity, encrypt).
 *
 * Incluye metricas de volumen, rendimiento, errores y estado.
 *
 * ============================================================================
 */
export interface QueueSummaryResponse {
  identity: Record<string, number>;
  encrypt: Record<string, number>;
  activosSinUsuario: number;
  activosNoCifrados: number;
  plaintextDetected: number;
  oldestPendingAgeMinutes: number;
  throughputJobsPerMin5: number;
  throughputJobsPerMin15: number;
  errorsLast15m: number;
  stuckProcessing: number;
  lastUpdatedAt: string;
}

/**
 * ============================================================================
 * Queue Job Item
 * ============================================================================
 *
 * Representa un job individual en la cola con su estado y metadatos.
 *
 * ============================================================================
 */
export interface QueueJobItem {
  idQueue: number;
  idEmpleado: number;
  estado: string;
  attempts: number;
  nextRetryAt: string | null;
  lockedBy: string | null;
  lockedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  diagnostico: string;
}

/**
 * ============================================================================
 * Queue List Response
 * ============================================================================
 *
 * Respuesta paginada de la lista de jobs de una cola.
 *
 * ============================================================================
 */
export interface QueueListResponse {
  data: QueueJobItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * ============================================================================
 * Queue Filters
 * ============================================================================
 *
 * Filtros opcionales para listar jobs de cola.
 *
 * ============================================================================
 */
export interface QueueFilters {
  estado?: string;
  idEmpleado?: number;
  attemptsMin?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  pageSize?: number;
  lockedOnly?: 0 | 1;
  stuckOnly?: 0 | 1;
  includeDone?: 0 | 1;
}

/* =============================================================================
   FUNCIONES AUXILIARES
   ============================================================================= */

/**
 * Verifica respuesta ok y extrae data; lanza Error con mensaje de backend si falla.
 */
async function ensureOk<T>(res: Response, defaultError: string): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || defaultError);
  }
  return body.data as T;
}

/** Construye query string a partir de filtros opcionales. */
function buildQuery(filters?: QueueFilters): string {
  const params = new URLSearchParams();
  if (!filters) return '';
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.idEmpleado) params.set('idEmpleado', String(filters.idEmpleado));
  if (filters.attemptsMin != null) params.set('attemptsMin', String(filters.attemptsMin));
  if (filters.fechaDesde) params.set('fechaDesde', filters.fechaDesde);
  if (filters.fechaHasta) params.set('fechaHasta', filters.fechaHasta);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.lockedOnly != null) params.set('lockedOnly', String(filters.lockedOnly));
  if (filters.stuckOnly != null) params.set('stuckOnly', String(filters.stuckOnly));
  if (filters.includeDone != null) params.set('includeDone', String(filters.includeDone));
  return params.toString();
}

/* =============================================================================
   API: OPERACIONES
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Queues Summary
 * ============================================================================
 *
 * Obtiene el resumen agregado de las colas identity y encrypt.
 *
 * @returns Resumen con metricas de estado y rendimiento.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchQueuesSummary(): Promise<QueueSummaryResponse> {
  const res = await httpFetch('/ops/queues/summary');
  return ensureOk<QueueSummaryResponse>(res, 'Error al cargar resumen de colas');
}

/**
 * ============================================================================
 * Fetch Identity Queue
 * ============================================================================
 *
 * Lista jobs de la cola de identidad con paginacion y filtros.
 *
 * @param filters - Filtros opcionales (estado, empleado, fechas, etc.).
 *
 * @returns Lista paginada de jobs.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchIdentityQueue(filters?: QueueFilters): Promise<QueueListResponse> {
  const query = buildQuery(filters);
  const res = await httpFetch(`/ops/queues/identity${query ? `?${query}` : ''}`);
  return ensureOk<QueueListResponse>(res, 'Error al cargar cola identidad');
}

/**
 * ============================================================================
 * Fetch Encrypt Queue
 * ============================================================================
 *
 * Lista jobs de la cola de cifrado con paginacion y filtros.
 *
 * @param filters - Filtros opcionales.
 *
 * @returns Lista paginada de jobs.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchEncryptQueue(filters?: QueueFilters): Promise<QueueListResponse> {
  const query = buildQuery(filters);
  const res = await httpFetch(`/ops/queues/encrypt${query ? `?${query}` : ''}`);
  return ensureOk<QueueListResponse>(res, 'Error al cargar cola cifrado');
}

/**
 * ============================================================================
 * Rescan Queues
 * ============================================================================
 *
 * Dispara un re-scan de las colas para detectar nuevos jobs pendientes.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function rescanQueues(): Promise<void> {
  const res = await httpFetch('/ops/queues/rescan', { method: 'POST' });
  await ensureOk(res, 'Error al ejecutar re-scan');
}

/**
 * ============================================================================
 * Release Stuck Queues
 * ============================================================================
 *
 * Libera locks vencidos en jobs que quedaron bloqueados.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function releaseStuckQueues(): Promise<void> {
  const res = await httpFetch('/ops/queues/release-stuck', { method: 'POST' });
  await ensureOk(res, 'Error al liberar locks vencidos');
}

/**
 * ============================================================================
 * Requeue Job
 * ============================================================================
 *
 * Reencola un job especifico para reprocesamiento.
 *
 * @param queue - Tipo de cola: identity o encrypt.
 * @param id - Identificador del job en la cola.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function requeueJob(queue: 'identity' | 'encrypt', id: number): Promise<void> {
  const res = await httpFetch(`/ops/queues/requeue/${id}`, {
    method: 'POST',
    body: JSON.stringify({ queue }),
  });
  await ensureOk(res, 'Error al reencolar job');
}
