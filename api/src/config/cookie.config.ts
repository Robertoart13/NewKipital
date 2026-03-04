import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

export const COOKIE_NAME = 'platform_token';
export const REFRESH_COOKIE_NAME = 'platform_refresh_token';
export const CSRF_COOKIE_NAME = 'platform_csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Genera las opciones de cookie para el JWT.
 * Producción: Domain=.kpital360.com, Secure, SameSite=None
 * Desarrollo: Domain=localhost, SameSite=Lax, Secure=false
 */
export function getCookieOptions(config: ConfigService): CookieOptions {
  const isDev = config.get<string>('NODE_ENV') === 'development';

  return {
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? 'lax' : 'none',
    domain: isDev ? undefined : '.kpital360.com',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000, // 8 horas (alineado con JWT_EXPIRATION)
  };
}

export function getRefreshCookieOptions(config: ConfigService): CookieOptions {
  const isDev = config.get<string>('NODE_ENV') === 'development';

  return {
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? 'lax' : 'none',
    domain: isDev ? undefined : '.kpital360.com',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
  };
}

export function getCsrfCookieOptions(config: ConfigService): CookieOptions {
  const isDev = config.get<string>('NODE_ENV') === 'development';

  return {
    httpOnly: false,
    secure: !isDev,
    sameSite: isDev ? 'lax' : 'none',
    domain: isDev ? undefined : '.kpital360.com',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

/**
 * Opciones para limpiar la cookie (logout).
 */
export function getClearCookieOptions(config: ConfigService): CookieOptions {
  const isDev = config.get<string>('NODE_ENV') === 'development';

  return {
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? 'lax' : 'none',
    domain: isDev ? undefined : '.kpital360.com',
    path: '/',
  };
}

export function getClearRefreshCookieOptions(config: ConfigService): CookieOptions {
  const isDev = config.get<string>('NODE_ENV') === 'development';

  return {
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? 'lax' : 'none',
    domain: isDev ? undefined : '.kpital360.com',
    path: '/',
  };
}

export function getClearCsrfCookieOptions(config: ConfigService): CookieOptions {
  const isDev = config.get<string>('NODE_ENV') === 'development';

  return {
    httpOnly: false,
    secure: !isDev,
    sameSite: isDev ? 'lax' : 'none',
    domain: isDev ? undefined : '.kpital360.com',
    path: '/',
  };
}
