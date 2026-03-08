/* =============================================================================
   MODULE: auth
   =============================================================================

   Punto central de cierre de sesion.

   Responsabilidades:
   - POST /auth/logout para invalidar cookie httpOnly
   - dispatch(logout) en Redux
   - clearStorage, setSkipRestore

   Secuencia intencionada: backend primero, luego Redux y storage.

   ========================================================================== */

import { API_URL } from '../config/api';
import { logout } from '../store/slices/authSlice';

import { clearStorage, setSkipRestore } from './storage';

import type { AppDispatch } from '../store/store';

/**
 * ============================================================================
 * performLogout
 * ============================================================================
 *
 * Punto central de cierre de sesion. Invalida cookie, Redux, storage.
 *
 * Secuencia: 1) POST /auth/logout 2) dispatch(logout) 3) clearStorage 4) setSkipRestore.
 *
 * @param dispatch - Dispatcher de Redux.
 *
 * @returns Promesa que resuelve al terminar.
 *
 * ============================================================================
 */
export async function performLogout(dispatch: AppDispatch): Promise<void> {
  try {
    const csrfToken = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('platform_csrf_token='))
      ?.split('=')
      .slice(1)
      .join('=');

    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: csrfToken ? { 'x-csrf-token': decodeURIComponent(csrfToken) } : undefined,
      credentials: 'include',
    });
  } catch {
    // Si el backend no responde, igualmente limpiamos el estado local
  }
  dispatch(logout());
  clearStorage();
  setSkipRestore();
}

