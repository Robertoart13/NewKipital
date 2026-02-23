import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { isMicrosoftOAuthCallbackInProgress } from '../lib/microsoftAuth';

/**
 * Guard para rutas públicas (login, forgot-password).
 * Si el usuario YA está autenticado → redirigir al dashboard.
 * No tiene sentido que un usuario logueado vea el login.
 */
export function PublicGuard() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const isMicrosoftPopupCallback = isMicrosoftOAuthCallbackInProgress();

  if (isAuthenticated && !isMicrosoftPopupCallback) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
