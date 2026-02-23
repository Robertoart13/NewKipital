import { Result } from 'antd';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { hasPermission } from '../store/selectors/permissions.selectors';
import type { Permission } from '../store/slices/permissionsSlice';

interface PermissionGuardProps {
  requiredPermission: Permission;
  children: React.ReactNode;
}

export function PermissionGuard({ requiredPermission, children }: PermissionGuardProps) {
  const location = useLocation();
  const permissionsLoaded = useAppSelector((state) => state.permissions.loaded);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const allowed = useAppSelector((state) => hasPermission(state, requiredPermission));

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  if (!permissionsLoaded) {
    return null;
  }

  if (!allowed) {
    return (
      <Result
        status="403"
        title="Acceso denegado"
        subTitle={`No tiene el permiso requerido para: ${requiredPermission}`}
      />
    );
  }

  return <>{children}</>;
}
