/* =============================================================================
   GUARD: PrivateGuard
   =============================================================================

   Protege rutas privadas. Cascada:
   1. No autenticado -> Navigate a /auth/login
   2. Sin acceso a app activa -> Result 403
   3. Permisos no cargados -> Spin
   4. OK -> Outlet

   ========================================================================== */

import { Spin, Flex, Result } from 'antd';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAppSelector } from '../store/hooks';

/**
 * ============================================================================
 * PrivateGuard
 * ============================================================================
 *
 * Guard para rutas privadas. Verifica auth, app activa y permisos cargados.
 *
 * ============================================================================
 */
export function PrivateGuard() {
  const location = useLocation();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const enabledApps = useAppSelector((s) => s.auth.user?.enabledApps ?? []);
  const activeApp = useAppSelector((s) => s.activeApp.app);
  const permissionsLoaded = useAppSelector((s) => s.permissions.loaded);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  if (!enabledApps.includes(activeApp)) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '100vh', background: '#f5f7fa' }}>
        <Result
          status="403"
          title="Sin acceso a esta aplicación"
          subTitle={`Su cuenta no tiene habilitado el acceso a ${activeApp.toUpperCase()}. Contacte al administrador.`}
        />
      </Flex>
    );
  }

  if (!permissionsLoaded) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '100vh', background: '#f5f7fa' }}>
        <Spin size="large" description="Cargando permisos..." />
      </Flex>
    );
  }

  return <Outlet />;
}

