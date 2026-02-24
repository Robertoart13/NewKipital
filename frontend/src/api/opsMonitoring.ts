import { httpFetch } from '../interceptors/httpInterceptor';

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

export interface QueueListResponse {
  data: QueueJobItem[];
  total: number;
  page: number;
  pageSize: number;
}

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

async function ensureOk<T>(res: Response, defaultError: string): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || defaultError);
  }
  return body.data as T;
}

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

export async function fetchQueuesSummary(): Promise<QueueSummaryResponse> {
  const res = await httpFetch('/ops/queues/summary');
  return ensureOk<QueueSummaryResponse>(res, 'Error al cargar resumen de colas');
}

export async function fetchIdentityQueue(filters?: QueueFilters): Promise<QueueListResponse> {
  const query = buildQuery(filters);
  const res = await httpFetch(`/ops/queues/identity${query ? `?${query}` : ''}`);
  return ensureOk<QueueListResponse>(res, 'Error al cargar cola identidad');
}

export async function fetchEncryptQueue(filters?: QueueFilters): Promise<QueueListResponse> {
  const query = buildQuery(filters);
  const res = await httpFetch(`/ops/queues/encrypt${query ? `?${query}` : ''}`);
  return ensureOk<QueueListResponse>(res, 'Error al cargar cola cifrado');
}

export async function rescanQueues(): Promise<void> {
  const res = await httpFetch('/ops/queues/rescan', { method: 'POST' });
  await ensureOk(res, 'Error al ejecutar re-scan');
}

export async function releaseStuckQueues(): Promise<void> {
  const res = await httpFetch('/ops/queues/release-stuck', { method: 'POST' });
  await ensureOk(res, 'Error al liberar locks vencidos');
}

export async function requeueJob(queue: 'identity' | 'encrypt', id: number): Promise<void> {
  const res = await httpFetch(`/ops/queues/requeue/${id}`, {
    method: 'POST',
    body: JSON.stringify({ queue }),
  });
  await ensureOk(res, 'Error al reencolar job');
}
