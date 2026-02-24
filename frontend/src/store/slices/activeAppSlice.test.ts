import { describe, expect, it } from 'vitest';
import reducer, { setActiveApp } from './activeAppSlice';

describe('activeAppSlice', () => {
  const initial = reducer(undefined, { type: '@@INIT' });

  it('should default to kpital', () => {
    expect(initial.app).toBe('kpital');
  });

  it('setActiveApp should update the app', () => {
    const state = reducer(initial, setActiveApp('timewise' as any));
    expect(state.app).toBe('timewise');
  });

  it('setActiveApp should allow switching back', () => {
    let state = reducer(initial, setActiveApp('timewise' as any));
    state = reducer(state, setActiveApp('kpital' as any));
    expect(state.app).toBe('kpital');
  });
});
