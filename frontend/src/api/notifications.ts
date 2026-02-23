import { httpFetch } from '../interceptors/httpInterceptor';

export interface NotificationItem {
  id: number;
  idNotificacion: number;
  tipo: string;
  titulo: string;
  mensaje: string | null;
  payload: Record<string, unknown> | null;
  estado: 'UNREAD' | 'READ' | 'DELETED';
  fechaEntregada: string;
  fechaLeida: string | null;
  fechaCreacion: string;
}

async function ensureOk(res: Response): Promise<void> {
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = data?.message ?? (Array.isArray(data?.message) ? data.message.join(', ') : 'Error');
    throw new Error(typeof msg === 'string' ? msg : 'Error en notificaciones');
  }
}

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
  await ensureOk(res);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchUnreadCount(params?: { appCode?: string; companyId?: number }): Promise<number> {
  const search = new URLSearchParams();
  if (params?.appCode) search.set('appCode', params.appCode);
  if (params?.companyId != null) search.set('companyId', String(params.companyId));
  const qs = search.toString();
  const res = await httpFetch(`/notifications/unread-count${qs ? `?${qs}` : ''}`);
  const data = await res.json();
  return typeof data?.count === 'number' ? data.count : 0;
}

export async function markNotificationAsRead(id: number): Promise<void> {
  const res = await httpFetch(`/notifications/${id}/read`, { method: 'POST' });
  await ensureOk(res);
}

export async function markNotificationAsDeleted(id: number): Promise<void> {
  const res = await httpFetch(`/notifications/${id}/delete`, { method: 'POST' });
  await ensureOk(res);
}

export async function markAllNotificationsAsRead(params?: { appCode?: string; companyId?: number }): Promise<void> {
  const search = new URLSearchParams();
  if (params?.appCode) search.set('appCode', params.appCode);
  if (params?.companyId != null) search.set('companyId', String(params.companyId));
  const qs = search.toString();
  const res = await httpFetch(`/notifications/read-all${qs ? `?${qs}` : ''}`, { method: 'POST' });
  await ensureOk(res);
}
