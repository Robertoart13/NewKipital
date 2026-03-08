/* =============================================================================
   GUARD: PublicGuard
   =============================================================================

   Protege rutas publicas (login, forgot-password).

   Si el usuario ya esta autenticado, redirige al dashboard.
   Excepcion: durante callback de Microsoft OAuth no redirige.

   ========================================================================== */

import { Navigate, Outlet } from 'react-router-dom';

import { isMicrosoftOAuthCallbackInProgress } from '../lib/microsoftAuth';
import { useAppSelector } from '../store/hooks';

/**
 * ============================================================================
 * PublicGuard
 * ============================================================================
 *
 * Para rutas publicas. Si ya autenticado -> Navigate a /dashboard.
 *
 * ============================================================================
 */
export function PublicGuard() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const isMicrosoftPopupCallback = isMicrosoftOAuthCallbackInProgress();

  if (isAuthenticated && !isMicrosoftPopupCallback) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

