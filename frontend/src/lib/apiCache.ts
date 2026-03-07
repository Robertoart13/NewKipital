const CACHE_BUSTER_KEY = 'kpital_api_cache_buster';

export function bustApiCache(): number {
  const token = Date.now();
  (window as Window & { [CACHE_BUSTER_KEY]?: number })[CACHE_BUSTER_KEY] = token;
  return token;
}

export function getApiCacheBuster(): number | undefined {
  return (window as Window & { [CACHE_BUSTER_KEY]?: number })[CACHE_BUSTER_KEY];
}
