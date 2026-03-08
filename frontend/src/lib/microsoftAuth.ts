/* =============================================================================
   MODULE: microsoftAuth
   =============================================================================

   Utilidades para OAuth Microsoft.

   Responsabilidades:
   - isMicrosoftOAuthCallbackInProgress: detecta callback (code/error en URL)

   ========================================================================== */

/**
 * ============================================================================
 * isMicrosoftOAuthCallbackInProgress
 * ============================================================================
 *
 * True si estamos en /auth/login con code o error en query (callback OAuth).
 *
 * ============================================================================
 */
export function isMicrosoftOAuthCallbackInProgress(): boolean {
  if (typeof window === 'undefined') return false;

  const isAuthLoginPath = window.location.pathname === '/auth/login';
  if (!isAuthLoginPath) return false;

  const params = new URLSearchParams(window.location.search);
  return params.has('code') || params.has('error');
}
