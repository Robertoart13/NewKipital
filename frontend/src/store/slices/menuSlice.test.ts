import { describe, expect, it } from 'vitest';
import reducer, { setMenuConfig } from './menuSlice';

describe('menuSlice', () => {
  const initial = reducer(undefined, { type: '@@INIT' });

  it('should have initial menu config with items', () => {
    expect(initial.config.length).toBeGreaterThan(0);
  });

  it('initial config should include personal-actions', () => {
    const pa = initial.config.find((i: any) => i.id === 'personal-actions');
    expect(pa).toBeDefined();
    expect(pa?.children?.length).toBeGreaterThan(0);
  });

  it('initial config should include configuration', () => {
    const cfg = initial.config.find((i: any) => i.id === 'configuration');
    expect(cfg).toBeDefined();
  });

  it('setMenuConfig should replace items', () => {
    const newItems = [{ id: 'test', label: 'Test', path: '/test' }];
    const state = reducer(initial, setMenuConfig(newItems as any));
    expect(state.config).toEqual(newItems);
  });

  it('items with requiredPermission should have valid permission strings', () => {
    function checkPerms(items: any[]) {
      for (const item of items) {
        if (item.requiredPermission) {
          expect(typeof item.requiredPermission).toBe('string');
          expect(item.requiredPermission.length).toBeGreaterThan(0);
        }
        if (item.children) checkPerms(item.children);
      }
    }
    checkPerms(initial.config);
  });
});
