import { store } from '../store/store';
import { performLogout } from '../lib/auth';
import { API_URL } from '../config/api';

const REQUEST_TIMEOUT_MS = 15000;
const REFRESH_TIMEOUT_MS = 10000;

/**
 * Interceptor global de HTTP.
 * Usa credentials: 'include' para enviar la cookie httpOnly automáticamente.
 * NO usa Authorization header — el JWT viaja en la cookie.
 * Cualquier response 401 → logout automático + redirige a /auth/login.
 */
export async function httpFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;

  const headers = new Headers(options.headers);
  const isFormDataBody = options.body instanceof FormData;
  if (!headers.has('Content-Type') && !isFormDataBody) {
    headers.set('Content-Type', 'application/json');
  }

  const method = (options.method ?? 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (isMutating) {
    const csrfToken = getCookieValue('platform_csrf_token');
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }
  }

  let response = await fetchWithTimeout(url, {
    ...options,
    headers,
    credentials: 'include',
  }, REQUEST_TIMEOUT_MS);

  const isRefreshCall = url.includes('/auth/refresh');
  if (response.status === 401 && !isRefreshCall) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      response = await fetchWithTimeout(url, {
        ...options,
        headers,
        credentials: 'include',
      }, REQUEST_TIMEOUT_MS);
    }
  }

  if (response.status === 401) {
    const currentPath = window.location.pathname;
    if (currentPath !== '/auth/login' && currentPath !== '/login') {
      await performLogout(store.dispatch);
      window.location.href = `/auth/login?expired=true&from=${encodeURIComponent(currentPath)}`;
    }
  }

  return response;
}

function getCookieValue(name: string): string | null {
  const match = document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

async function tryRefreshSession(): Promise<boolean> {
  const csrfToken = getCookieValue('platform_csrf_token');

  try {
    const response = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
    }, REFRESH_TIMEOUT_MS);

    return response.ok;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}
