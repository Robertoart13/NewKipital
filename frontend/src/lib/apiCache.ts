/* =============================================================================
   MODULE: apiCache
   =============================================================================

   Cache buster para peticiones GET del API.

   Responsabilidades:
   - bustApiCache: genera nuevo token y lo almacena en window
   - getApiCacheBuster: devuelve token actual

   Usado por httpInterceptor para invalidar cache de GET.

   ========================================================================== */

const CACHE_BUSTER_KEY = 'kpital_api_cache_buster';

/**
 * ============================================================================
 * bustApiCache
 * ============================================================================
 *
 * Genera nuevo token de cache buster. Siguientes GET incluyen ?cb=token.
 *
 * @returns Token generado.
 *
 * ============================================================================
 */
export function bustApiCache(): number {
  const token = Date.now();
  (window as Window & { [CACHE_BUSTER_KEY]?: number })[CACHE_BUSTER_KEY] = token;
  return token;
}

/**
 * ============================================================================
 * getApiCacheBuster
 * ============================================================================
 *
 * Devuelve token de cache buster actual o undefined.
 *
 * ============================================================================
 */
export function getApiCacheBuster(): number | undefined {
  return (window as Window & { [CACHE_BUSTER_KEY]?: number })[CACHE_BUSTER_KEY];
}
