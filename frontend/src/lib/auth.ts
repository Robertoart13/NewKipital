import type { AppDispatch } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { clearStorage, setSkipRestore } from './storage';
import { API_URL } from '../config/api';

/**
 * Logout orquestado — UN solo punto de ejecución.
 * 1. Llama al backend para limpiar la cookie httpOnly
 * 2. Dispatch logout (middleware limpia permisos, empresa, queryClient)
 * 3. Limpiar storage persistido (companyId + activeApp)
 *
 * La cookie httpOnly solo puede ser limpiada por el backend (Set-Cookie con maxAge=0).
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
