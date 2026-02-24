import { describe, expect, it } from 'vitest';

describe('Project Smoke Imports', () => {
  it('loads API modules', () => {
    const modules = import.meta.glob('../api/*.{ts,tsx}', { eager: true });
    const keys = Object.keys(modules).filter((k) => !k.includes('.test.'));
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(modules[key]).toBeDefined();
    }
  });

  it('loads query modules', () => {
    const modules = import.meta.glob('../queries/**/*.{ts,tsx}', { eager: true });
    const keys = Object.keys(modules).filter((k) => !k.includes('.test.') && !k.endsWith('.d.ts'));
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(modules[key]).toBeDefined();
    }
  });

  it('loads guards and hooks modules', () => {
    const guardModules = import.meta.glob('../guards/**/*.{ts,tsx}', { eager: true });
    const hookModules = import.meta.glob('../hooks/**/*.{ts,tsx}', { eager: true });
    const combined = { ...guardModules, ...hookModules } as Record<string, unknown>;
    const keys = Object.keys(combined).filter((k) => !k.includes('.test.'));
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(combined[key]).toBeDefined();
    }
  });

  it('loads store, components and pages modules', () => {
    const storeModules = import.meta.glob('../store/**/*.{ts,tsx}', { eager: true });
    const componentModules = import.meta.glob('../components/**/*.{ts,tsx}', { eager: true });
    const pageModules = import.meta.glob('../pages/**/*.{ts,tsx}', { eager: true });
    const combined = {
      ...storeModules,
      ...componentModules,
      ...pageModules,
    } as Record<string, unknown>;
    const keys = Object.keys(combined).filter(
      (k) =>
        !k.includes('.test.') &&
        !k.endsWith('/main.tsx') &&
        !k.endsWith('/App.tsx') &&
        !k.endsWith('/index.tsx'),
    );
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(combined[key]).toBeDefined();
    }
  });
});
