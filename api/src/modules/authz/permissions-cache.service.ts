import { Injectable } from '@nestjs/common';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

@Injectable()
export class PermissionsCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    const expiresAt = Date.now() + Math.max(ttlMs, 0);
    this.store.set(key, { value, expiresAt });
  }

  clear(): void {
    this.store.clear();
  }

  pruneExpired(limit = 2000): void {
    if (this.store.size === 0) return;
    let scanned = 0;
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (scanned >= limit) break;
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
      scanned += 1;
    }
  }
}
