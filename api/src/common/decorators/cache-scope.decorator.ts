import { SetMetadata } from '@nestjs/common';
import {
  CACHE_SCOPE_METADATA,
  CACHE_TTL_METADATA,
} from '../constants/cache.constants';

export const CacheScope = (scope: string) =>
  SetMetadata(CACHE_SCOPE_METADATA, scope);

export const CacheTtl = (ttlMs: number) =>
  SetMetadata(CACHE_TTL_METADATA, ttlMs);
