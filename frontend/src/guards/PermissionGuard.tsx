/* =============================================================================
   GUARD: PermissionGuard
   =============================================================================

   Protege rutas/componentes segun permiso requerido.

   Flujo:
   1. No autenticado -> Navigate a /auth/login
   2. Permisos no cargados -> null (loading)
   3. Sin permiso -> Result 403
   4. Con permiso -> children

   ========================================================================== */

import { Result } from 'antd';
import { Navigate, useLocation } from 'react-router-dom';

import { useAppSelector } from '../store/hooks';
import { hasPermission } from '../store/selectors/permissions.selectors';

import type { Permission } from '../store/slices/permissionsSlice';

interface PermissionGuardProps {
  requiredPermission: Permission;
  children: React.ReactNode;
}

/**
 * ============================================================================
 * PermissionGuard
 * ============================================================================
 *
 * Renderiza children solo si el usuario tiene el permiso requerido.
 *
 * @param requiredPermission - Permiso requerido (ej: "employee:view").
 * @param children - Contenido a renderizar si tiene permiso.
 *
 * ============================================================================
 */
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
