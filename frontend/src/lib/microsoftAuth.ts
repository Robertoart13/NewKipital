export function isMicrosoftOAuthCallbackInProgress(): boolean {
  if (typeof window === 'undefined') return false;

  const isAuthLoginPath = window.location.pathname === '/auth/login';
  if (!isAuthLoginPath) return false;

  const params = new URLSearchParams(window.location.search);
  return params.has('code') || params.has('error');
}

