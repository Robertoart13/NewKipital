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
  /** Conteos por estado en la cola de identidad. */
  identity: Record<string, number>;

  /** Conteos por estado en la cola de cifrado. */
  encrypt: Record<string, number>;

  /** Cantidad de activos sin usuario asociado. */
  activosSinUsuario: number;

  /** Cantidad de activos no cifrados. */
  activosNoCifrados: number;

  /** Cantidad de plaintext detectados. */
  plaintextDetected: number;

  /** Edad en minutos del job pendiente mas antiguo. */
  oldestPendingAgeMinutes: number;

  /** Throughput en jobs por minuto (ventana 5 min). */
  throughputJobsPerMin5: number;

  /** Throughput en jobs por minuto (ventana 15 min). */
  throughputJobsPerMin15: number;

  /** Errores en los ultimos 15 minutos. */
  errorsLast15m: number;

  /** Jobs atascados en procesamiento. */
  stuckProcessing: number;

  /** Fecha ISO de ultima actualizacion. */
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
  /** Identificador del job en la cola. */
  idQueue: number;

  /** ID del empleado asociado. */
  idEmpleado: number;

  /** Estado actual del job (ej: PENDING, PROCESSING). */
  estado: string;

  /** Numero de intentos realizados. */
  attempts: number;

  /** Fecha ISO del proximo reintento; nula si no aplica. */
  nextRetryAt: string | null;

  /** Identificador del worker que tiene el lock; nulo si no hay lock. */
  lockedBy: string | null;

  /** Fecha ISO en que se adquirio el lock; nula si no hay lock. */
  lockedAt: string | null;

  /** Ultimo mensaje de error; nulo si no hubo error. */
  lastError: string | null;

  /** Fecha ISO de creacion. */
  createdAt: string;

  /** Fecha ISO de ultima actualizacion. */
  updatedAt: string;

  /** Texto de diagnostico opcional. */
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
  /** Lista de jobs en la pagina actual. */
  data: QueueJobItem[];

  /** Total de registros que coinciden con los filtros. */
  total: number;

  /** Pagina actual (base 1). */
  page: number;

  /** Cantidad de items por pagina. */
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
  /** Filtro por estado del job. */
  estado?: string;

  /** Filtro por ID de empleado. */
  idEmpleado?: number;

  /** Minimo de intentos. */
  attemptsMin?: number;

  /** Fecha desde (formato ISO). */
  fechaDesde?: string;

  /** Fecha hasta (formato ISO). */
  fechaHasta?: string;

  /** Pagina solicitada. */
  page?: number;

  /** Tamanio de pagina. */
  pageSize?: number;

  /** Solo jobs con lock (0 o 1). */
  lockedOnly?: 0 | 1;

  /** Solo jobs atascados (0 o 1). */
  stuckOnly?: 0 | 1;

  /** Incluir jobs finalizados (0 o 1). */
  includeDone?: 0 | 1;
}

/* =============================================================================
   FUNCIONES AUXILIARES
   ============================================================================= */

/**
 * ============================================================================
 * Ensure Ok
 * ============================================================================
 *
 * Verifica que la respuesta HTTP sea ok y extrae el campo data.
 * Lanza Error con mensaje del backend si falla.
 *
 * @param res - Respuesta HTTP.
 * @param defaultError - Mensaje de respaldo si el backend no envia message.
 *
 * @returns data del body JSON.
 *
 * @throws {Error} Si res.ok es false o body.success es false.
 *
 * ============================================================================
 */
async function ensureOk<T>(res: Response, defaultError: string): Promise<T> {
  /** Intenta parsear el body como JSON. */
  const body = await res.json().catch(() => ({}));

  /** Valida que la respuesta sea exitosa. */
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || defaultError);
  }

  /** Retorna el campo data tipado. */
  return body.data as T;
}

/**
 * ============================================================================
 * Build Query
 * ============================================================================
 *
 * Construye query string a partir de filtros opcionales.
 *
 * @param filters - Filtros opcionales para la cola.
 *
 * @returns Query string o cadena vacia si no hay filtros.
 *
 * ============================================================================
 */
function buildQuery(filters?: QueueFilters): string {
  /** Inicializa el contenedor de params. */
  const params = new URLSearchParams();

  /** Si no hay filtros, retorna cadena vacia. */
  if (!filters) return '';

  /** Aplica cada filtro presente al contenedor. */
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

  /** Serializa y retorna. */
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
  /** Ejecuta la solicitud al endpoint de resumen. */
  const res = await httpFetch('/ops/queues/summary');

  /** Valida y extrae data; lanza si falla. */
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
  /** Construye el query string a partir de filtros. */
  const query = buildQuery(filters);

  /** Ejecuta la solicitud al endpoint de cola identity. */
  const res = await httpFetch(`/ops/queues/identity${query ? `?${query}` : ''}`);

  /** Valida y extrae data. */
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
  /** Construye el query string. */
  const query = buildQuery(filters);

  /** Ejecuta la solicitud al endpoint de cola encrypt. */
  const res = await httpFetch(`/ops/queues/encrypt${query ? `?${query}` : ''}`);

  /** Valida y extrae data. */
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
  /** Ejecuta POST al endpoint de rescan. */
  const res = await httpFetch('/ops/queues/rescan', { method: 'POST' });

  /** Valida respuesta; no retorna data util. */
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
  /** Ejecuta POST al endpoint de liberacion. */
  const res = await httpFetch('/ops/queues/release-stuck', { method: 'POST' });

  /** Valida respuesta. */
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
  /** Ejecuta POST con body indicando la cola. */
  const res = await httpFetch(`/ops/queues/requeue/${id}`, {
    method: 'POST',
    body: JSON.stringify({ queue }),
  });

  /** Valida respuesta. */
  await ensureOk(res, 'Error al reencolar job');
}
