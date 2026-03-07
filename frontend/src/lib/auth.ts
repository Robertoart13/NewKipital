import { API_URL } from '../config/api';
import { logout } from '../store/slices/authSlice';

import { clearStorage, setSkipRestore } from './storage';

import type { AppDispatch } from '../store/store';

/**
 * Punto central y único de cierre de sesión en toda la aplicación.
 *
 * Garantiza que el logout sea siempre consistente sin importar desde dónde se invoque
 * (botón de logout, expiración de sesión, redirección de OAuth, etc.).
 *
 * La secuencia de pasos es deliberada:
 * 1. Llama al backend para invalidar la cookie httpOnly que porta el JWT.
 *    Sin este paso, el navegador seguiría enviando credenciales válidas en
 *    peticiones futuras aunque el estado de Redux esté limpio.
 * 2. Despacha la acción `logout` de Redux, cuyo middleware encadenado limpia
 *    permisos, empresa activa y el caché de React Query.
 * 3. Borra del localStorage los datos de contexto de sesión (companyId, activeApp).
 * 4. Activa el flag `skipRestore` para que el arranque de la app no intente
 *    recuperar la sesión con GET /me (lo que generaría un 401 en consola).
 *
 * El bloque try/catch alrededor de la llamada al backend es intencionado:
 * si el servidor no responde (por ejemplo, en un entorno offline), el cliente
 * debe quedar igualmente en estado limpio para no exponer datos del usuario anterior.
 *
 * @param dispatch - Dispatcher de Redux proveniente del store global de la aplicación.
 * @returns Promesa que resuelve cuando la sesión ha sido completamente destruida en cliente.
 *
 * @example
 * // En un componente o thunk:
 * await performLogout(dispatch);
 * navigate('/auth/login');
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

