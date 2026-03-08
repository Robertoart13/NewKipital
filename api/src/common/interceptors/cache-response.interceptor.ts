import { Injectable, Logger, CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defer, from, lastValueFrom, tap, Observable } from 'rxjs';

import { CACHE_QUERY_ALLOWLIST, CACHE_USER_SCOPED } from '../constants/cache-keys.constants';
import {
  CACHE_SCOPE_METADATA,
  CACHE_TTL_METADATA,
  DEFAULT_CACHE_TTL_MS,
} from '../constants/cache.constants';
import { AppCacheService } from '../services/app-cache.service';

import type { Response } from 'express';

type AuthUserPayload = {
  userId?: number;
  permissions?: string[];
};

@Injectable()
export class CacheResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheResponseInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly cache: AppCacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const scope =
      this.reflector.get<string>(CACHE_SCOPE_METADATA, context.getHandler()) ??
      this.reflector.get<string>(CACHE_SCOPE_METADATA, context.getClass());

    if (!scope) {
      return next.handle();
    }

    const ttlMs =
      this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) ??
      this.reflector.get<number>(CACHE_TTL_METADATA, context.getClass()) ??
      DEFAULT_CACHE_TTL_MS;

    const request = context.switchToHttp().getRequest<{
      method?: string;
      originalUrl?: string;
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
      user?: AuthUserPayload;
    }>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request?.method?.toUpperCase() !== 'GET') {
      return next.handle().pipe(
        tap(() => {
          const companyKey = this.resolveCompanyKey(request);
          const companyKeysToInvalidate =
            companyKey === 'global' ? ['global'] : [companyKey, 'global'];

          // Invalida tanto el cache por empresa como el global (listados sin filtro).
          for (const key of companyKeysToInvalidate) {
            void this.cache.invalidateScope(scope, key).catch((error) => {
              this.logger.warn('Failed to invalidate cache scope', {
                scope,
                companyKey: key,
                error: error instanceof Error ? error.message : String(error),
              });
            });
          }
        }),
      );
    }

    const companyKey = this.resolveCompanyKey(request);
    const userScope = this.resolveUserScope(scope, request);
    const keyParts = {
      route: request.originalUrl?.split('?')[0] ?? '',
      params: request.params ?? {},
      query: this.normalizeQuery(scope, request.query ?? {}),
    };

    return defer(() =>
      from(
        this.cache.getOrSet(
          scope,
          companyKey,
          userScope,
          keyParts,
          async () => {
            const value = await lastValueFrom(next.handle());
            return {
              value,
              cacheable: this.isCacheableResponse(response),
            };
          },
          ttlMs,
        ),
      ),
    );
  }

  private resolveCompanyKey(request?: {
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
  }): string {
    const query = request?.query ?? {};
    const params = request?.params ?? {};
    const body = request?.body ?? {};
    const candidate =
      query.idEmpresa ??
      query.companyId ??
      query.idCompany ??
      query.empresaId ??
      params.idEmpresa ??
      params.companyId ??
      params.idCompany ??
      params.empresaId ??
      body.idEmpresa ??
      body.companyId ??
      body.idCompany ??
      body.empresaId;

    if (candidate == null) {
      const idEmpresasRaw = query.idEmpresas;
      if (typeof idEmpresasRaw === 'string') {
        const companyIds = idEmpresasRaw
          .split(',')
          .map((value) => Number.parseInt(value.trim(), 10))
          .filter((value) => Number.isFinite(value) && value > 0);
        if (companyIds.length === 1) {
          return `empresa:${companyIds[0]}`;
        }
      }
      if (Array.isArray(idEmpresasRaw)) {
        const companyIds = idEmpresasRaw
          .map((value) => Number.parseInt(String(value).trim(), 10))
          .filter((value) => Number.isFinite(value) && value > 0);
        if (companyIds.length === 1) {
          return `empresa:${companyIds[0]}`;
        }
      }
      return 'global';
    }
    const parsed = Number.parseInt(String(candidate), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 'global';
    return `empresa:${parsed}`;
  }

  private resolveUserScope(scope: string, request?: { user?: AuthUserPayload }): string {
    if (!CACHE_USER_SCOPED.has(scope)) return 'user:shared';
    const userId = request?.user?.userId;
    if (!userId || Number.isNaN(Number(userId))) return 'user:unknown';
    return `user:${userId}`;
  }

  private normalizeQuery(scope: string, query: Record<string, unknown>): Record<string, unknown> {
    const allowlist = CACHE_QUERY_ALLOWLIST[scope];
    if (!allowlist) return {};
    const normalized: Record<string, unknown> = {};
    const entries = Object.entries(query)
      .filter(([key, value]) => allowlist.has(key) && value != null)
      .sort(([a], [b]) => a.localeCompare(b));

    for (const [key, value] of entries) {
      if (Array.isArray(value)) {
        normalized[key] = [...value].map((item) => String(item)).sort();
      } else if (typeof value === 'string') {
        normalized[key] = value.trim();
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  private isCacheableResponse(response?: Response): boolean {
    if (!response) return true;
    const status = response.statusCode ?? 200;
    if (status < 200 || status >= 300) return false;
    const setCookie = response.getHeader('set-cookie');
    if (setCookie) return false;
    const cacheControl = String(response.getHeader('cache-control') ?? '').toLowerCase();
    if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
      return false;
    }
    return true;
  }
}
