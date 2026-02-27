import { useEffect, useRef } from 'react';
import { fetchPermissionsForApp, fetchPermissionsForCompany } from '../api/permissions';
import { httpFetch } from '../interceptors/httpInterceptor';
import { API_URL } from '../config/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setPermissions } from '../store/slices/permissionsSlice';

const MIN_REFRESH_GAP_MS = 1000;
const FOCUS_REFRESH_INTERVAL_MS = 60_000;
const AUTHZ_TOKEN_POLL_INTERVAL_MS = 2500;

/**
 * Sincroniza permisos en tiempo real usando SSE.
 * - Escucha eventos permissions.changed emitidos por backend.
 * - Refresca permisos sin recargar la pagina.
 * - Ejecuta refresh adicional al recuperar foco/visibilidad.
 */
export function usePermissionsRealtimeSync() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const activeApp = useAppSelector((state) => state.activeApp.app);
  const activeCompanyId = useAppSelector((state) => state.activeCompany.company?.id);

  const lastRefreshAtRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const lastAuthzTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshPermissions = async (forceBypassCache = true) => {
      const now = Date.now();
      if (refreshInFlightRef.current) return;
      if (now - lastRefreshAtRef.current < MIN_REFRESH_GAP_MS) return;

      refreshInFlightRef.current = true;
      try {
        if (activeCompanyId) {
          const resolved = await fetchPermissionsForCompany(activeCompanyId, activeApp, forceBypassCache);
          dispatch(setPermissions({
            permissions: resolved.permissions,
            roles: resolved.roles,
            appId: activeApp,
            companyId: activeCompanyId,
          }));
        } else {
          const resolved = await fetchPermissionsForApp(activeApp, forceBypassCache);
          dispatch(setPermissions({
            permissions: resolved.permissions,
            roles: resolved.roles,
            appId: activeApp,
          }));
        }
        lastRefreshAtRef.current = Date.now();
      } catch {
        // Evita ruido en UI ante reconexiones/transitorios.
      } finally {
        refreshInFlightRef.current = false;
      }
    };

    const eventSource = new EventSource(`${API_URL}/auth/permissions-stream`, { withCredentials: true });

    eventSource.addEventListener('permissions.changed', () => {
      void refreshPermissions(true);
    });

    const pollAuthzToken = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await httpFetch('/auth/authz-token');
        if (!res.ok) return;
        const data = await res.json().catch(() => null) as { token?: string } | null;
        const nextToken = data?.token?.trim();
        if (!nextToken) return;
        if (!lastAuthzTokenRef.current) {
          lastAuthzTokenRef.current = nextToken;
          return;
        }
        if (lastAuthzTokenRef.current !== nextToken) {
          lastAuthzTokenRef.current = nextToken;
          await refreshPermissions(true);
        }
      } catch {
        // Sin ruido en consola por polling.
      }
    };
    const tokenPollTimer = window.setInterval(() => {
      void pollAuthzToken();
    }, AUTHZ_TOKEN_POLL_INTERVAL_MS);

    const handleVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastRefreshAtRef.current < FOCUS_REFRESH_INTERVAL_MS) return;
      void refreshPermissions(true);
    };

    window.addEventListener('focus', handleVisible);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      window.removeEventListener('focus', handleVisible);
      document.removeEventListener('visibilitychange', handleVisible);
      window.clearInterval(tokenPollTimer);
      eventSource.close();
    };
  }, [activeApp, activeCompanyId, dispatch, isAuthenticated]);
}
