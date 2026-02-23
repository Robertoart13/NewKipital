import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spin, Flex, Result } from 'antd';
import { useAppSelector } from '../store/hooks';

/**
 * Guard para rutas privadas. Cascada enterprise:
 *
 * 1. ¿Autenticado?  → No → /auth/login (guarda URL intentada)
 * 2. ¿Tiene acceso a la app activa? → No → Pantalla de acceso denegado
 * 3. ¿Permisos cargados? → No → Loading
 * 4. Todo OK → Renderizar ruta
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
