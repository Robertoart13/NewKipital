import { describe, expect, it } from 'vitest';
import reducer, { setPermissions, clearPermissions } from './permissionsSlice';

describe('permissionsSlice', () => {
  const initial = reducer(undefined, { type: '@@INIT' });

  it('should have correct initial state', () => {
    expect(initial.permissions).toEqual([]);
    expect(initial.roles).toEqual([]);
    expect(initial.loaded).toBe(false);
    expect(initial.appId).toBeNull();
    expect(initial.companyId).toBeNull();
  });

  it('setPermissions should set permissions, roles and loaded', () => {
    const state = reducer(
      initial,
      setPermissions({
        permissions: ['employee:view', 'employee:create'],
        roles: ['ADMIN'],
        appId: 'kpital' as any,
        companyId: '1',
      }),
    );
    expect(state.permissions).toEqual(['employee:view', 'employee:create']);
    expect(state.roles).toEqual(['ADMIN']);
    expect(state.loaded).toBe(true);
    expect(state.appId).toBe('kpital');
    expect(state.companyId).toBe('1');
  });

  it('clearPermissions should reset to initial', () => {
    const filled = reducer(
      initial,
      setPermissions({ permissions: ['x'], roles: ['y'], appId: 'kpital' as any, companyId: '5' }),
    );
    const cleared = reducer(filled, clearPermissions());
    expect(cleared.permissions).toEqual([]);
    expect(cleared.roles).toEqual([]);
    expect(cleared.loaded).toBe(false);
    expect(cleared.appId).toBeNull();
    expect(cleared.companyId).toBeNull();
  });

  it('setPermissions without appId/companyId should not overwrite existing', () => {
    const filled = reducer(
      initial,
      setPermissions({ permissions: ['a'], roles: ['b'], appId: 'kpital' as any, companyId: '1' }),
    );
    const updated = reducer(filled, setPermissions({ permissions: ['c'], roles: ['d'] }));
    expect(updated.permissions).toEqual(['c']);
    expect(updated.appId).toBe('kpital');
    expect(updated.companyId).toBe('1');
  });
});
