import { describe, expect, it } from 'vitest';

describe('Project Smoke Imports', () => {
  it('loads API modules', () => {
    const modules = import.meta.glob(['../api/*.{ts,tsx}', '!../api/*.{test,spec}.{ts,tsx}'], {
      eager: true,
    });
    const keys = Object.keys(modules);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(modules[key]).toBeDefined();
    }
  });

  it('loads query modules', () => {
    const modules = import.meta.glob(
      ['../queries/**/*.{ts,tsx}', '!../queries/**/*.{test,spec}.{ts,tsx}'],
      { eager: true },
    );
    const keys = Object.keys(modules).filter((k) => !k.endsWith('.d.ts'));
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(modules[key]).toBeDefined();
    }
  });

  it('loads guards and hooks modules', () => {
    const guardModules = import.meta.glob(
      ['../guards/**/*.{ts,tsx}', '!../guards/**/*.{test,spec}.{ts,tsx}'],
      { eager: true },
    );
    const hookModules = import.meta.glob(
      ['../hooks/**/*.{ts,tsx}', '!../hooks/**/*.{test,spec}.{ts,tsx}'],
      { eager: true },
    );
    const combined = { ...guardModules, ...hookModules } as Record<string, unknown>;
    const keys = Object.keys(combined);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(combined[key]).toBeDefined();
    }
  });

  it('loads store, components and pages modules', () => {
    const storeModules = import.meta.glob(
      ['../store/**/*.{ts,tsx}', '!../store/**/*.{test,spec}.{ts,tsx}'],
      { eager: true },
    );
    const componentModules = import.meta.glob(
      ['../components/**/*.{ts,tsx}', '!../components/**/*.{test,spec}.{ts,tsx}'],
      { eager: true },
    );
    const pageModules = import.meta.glob(
      ['../pages/**/*.{ts,tsx}', '!../pages/**/*.{test,spec}.{ts,tsx}'],
      { eager: true },
    );
    const combined = {
      ...storeModules,
      ...componentModules,
      ...pageModules,
    } as Record<string, unknown>;
    const keys = Object.keys(combined).filter(
      (k) => !k.endsWith('/main.tsx') && !k.endsWith('/App.tsx') && !k.endsWith('/index.tsx'),
    );
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(combined[key]).toBeDefined();
    }
  });
});
