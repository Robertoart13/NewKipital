/* =============================================================================
   HOOK: useSessionRestore
   =============================================================================

   Restaura sesion al cargar la app desde cookie httpOnly.

   Responsabilidades:
   - Llamar GET /auth/me si no hay sesion
   - Actualizar Redux (credentials, permissions, activeApp)
   - Marcar sessionLoaded si falla o no hay sesion

   ========================================================================== */

import { useEffect } from 'react';

import { httpFetch } from '../interceptors/httpInterceptor';
import { isMicrosoftOAuthCallbackInProgress } from '../lib/microsoftAuth';
import { STORAGE_KEYS, getStoredActiveApp, consumeSkipRestore, getMicrosoftAvatar } from '../lib/storage';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setActiveApp } from '../store/slices/activeAppSlice';
import { setActiveCompany } from '../store/slices/activeCompanySlice';
import { setCredentials, setSessionLoaded } from '../store/slices/authSlice';
import { setPermissions } from '../store/slices/permissionsSlice';

/**
 * ============================================================================
 * useSessionRestore
 * ============================================================================
 *
 * Intenta restaurar sesion desde cookie. Actualiza Redux con user, companies, permissions.
 *
 * ============================================================================
 */
export function useSessionRestore() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) return;
    if (isMicrosoftOAuthCallbackInProgress()) {
      dispatch(setSessionLoaded());
      return;
    }

    const restore = async () => {
      if (consumeSkipRestore()) {
        dispatch(setSessionLoaded());
        return;
      }
      const storedApp = getStoredActiveApp() || 'kpital';
      // Intentar restaurar sesión; si no hay ACTIVE_APP guardamos 'kpital' por defecto tras éxito
      try {
        const params = new URLSearchParams();
        if (storedApp) params.set('appCode', storedApp);

        const res = await httpFetch(`/auth/me?${params.toString()}`);
        if (!res.ok) {
          dispatch(setSessionLoaded());
          return;
        }

        const data = await res.json();
        if (!data.authenticated) {
          dispatch(setSessionLoaded());
          return;
        }

        dispatch(
          setCredentials({
            user: {
              ...data.user,
              avatarUrl: data.user?.avatarUrl ?? getMicrosoftAvatar(),
            },
            companies: data.companies ?? [],
          }),
        );

        if (storedApp === 'kpital' || storedApp === 'timewise') {
          dispatch(setActiveApp(storedApp));
          if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_APP)) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_APP, storedApp);
          }
        }

        dispatch(setActiveCompany(null));
        localStorage.removeItem(STORAGE_KEYS.COMPANY_ID);

        dispatch(
          setPermissions({
            permissions: Array.isArray(data.permissions) ? data.permissions : [],
            roles: Array.isArray(data.roles) ? data.roles : [],
            appId: storedApp === 'kpital' || storedApp === 'timewise' ? storedApp : 'kpital',
          }),
        );
      } catch {
        dispatch(setSessionLoaded());
      }
    };

    restore();
  }, [dispatch, isAuthenticated]);
}

