/**
 * Claves de localStorage.
 * El token JWT NO se guarda aquí — viaja en cookie httpOnly.
 * Solo se persisten: companyId y activeApp (contexto de sesión).
 * Permisos NUNCA se cachean — siempre del backend.
 */
export const STORAGE_KEYS = {
  COMPANY_ID: 'platform_company_id',
  ACTIVE_APP: 'platform_active_app',
  /** Flag temporal: evita llamar /me tras logout voluntario (evita 401 en consola) */
  SKIP_RESTORE: 'platform_skip_restore',
  MICROSOFT_ACCESS_TOKEN: 'platform_ms_access_token',
  MICROSOFT_TOKEN_EXPIRES_AT: 'platform_ms_token_expires_at',
  MICROSOFT_AVATAR_URL: 'platform_ms_avatar_url',
} as const;

export function getStoredCompanyId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.COMPANY_ID);
}

export function getStoredActiveApp(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_APP);
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.COMPANY_ID);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_APP);
  clearMicrosoftSession();
  clearMicrosoftAvatar();
}

const SKIP_RESTORE_TTL_MS = 3000;

export function setSkipRestore(): void {
  sessionStorage.setItem(STORAGE_KEYS.SKIP_RESTORE, String(Date.now()));
}

/** Devuelve true si debemos omitir /me (p.ej. tras logout). No elimina el flag de inmediato para cubrir React Strict Mode. */
export function shouldSkipRestore(): boolean {
  const v = sessionStorage.getItem(STORAGE_KEYS.SKIP_RESTORE);
  if (!v) return false;
  const ts = parseInt(v, 10);
  if (Date.now() - ts > SKIP_RESTORE_TTL_MS) {
    sessionStorage.removeItem(STORAGE_KEYS.SKIP_RESTORE);
    return false;
  }
  return true;
}

export function clearSkipRestore(): void {
  sessionStorage.removeItem(STORAGE_KEYS.SKIP_RESTORE);
}

export function setMicrosoftSession(accessToken: string, expiresInSeconds = 3600): void {
  sessionStorage.setItem(STORAGE_KEYS.MICROSOFT_ACCESS_TOKEN, accessToken);
  sessionStorage.setItem(
    STORAGE_KEYS.MICROSOFT_TOKEN_EXPIRES_AT,
    String(Date.now() + (expiresInSeconds * 1000)),
  );
}

export function getMicrosoftAccessToken(): string | null {
  const token = sessionStorage.getItem(STORAGE_KEYS.MICROSOFT_ACCESS_TOKEN);
  const expiresAtRaw = sessionStorage.getItem(STORAGE_KEYS.MICROSOFT_TOKEN_EXPIRES_AT);
  if (!token || !expiresAtRaw) return null;

  const expiresAt = parseInt(expiresAtRaw, 10);
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    clearMicrosoftSession();
    return null;
  }

  return token;
}

export function clearMicrosoftSession(): void {
  sessionStorage.removeItem(STORAGE_KEYS.MICROSOFT_ACCESS_TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.MICROSOFT_TOKEN_EXPIRES_AT);
}

export function setMicrosoftAvatar(url: string): void {
  sessionStorage.setItem(STORAGE_KEYS.MICROSOFT_AVATAR_URL, url);
}

export function getMicrosoftAvatar(): string | null {
  return sessionStorage.getItem(STORAGE_KEYS.MICROSOFT_AVATAR_URL);
}

export function clearMicrosoftAvatar(): void {
  sessionStorage.removeItem(STORAGE_KEYS.MICROSOFT_AVATAR_URL);
}

/** @deprecated Usar shouldSkipRestore. Alias para compatibilidad. */
export const consumeSkipRestore = shouldSkipRestore;
