import { describe, expect, it } from 'vitest';
import reducer, { setActiveCompany, clearActiveCompany } from './activeCompanySlice';

describe('activeCompanySlice', () => {
  const initial = reducer(undefined, { type: '@@INIT' });

  it('should start with null company', () => {
    expect(initial.company).toBeNull();
  });

  it('setActiveCompany should set company', () => {
    const company = { id: '1', name: 'Empresa Test' };
    const state = reducer(initial, setActiveCompany(company));
    expect(state.company).toEqual(company);
  });

  it('setActiveCompany with null should clear', () => {
    const filled = reducer(initial, setActiveCompany({ id: '1', name: 'Test' }));
    const cleared = reducer(filled, setActiveCompany(null));
    expect(cleared.company).toBeNull();
  });

  it('clearActiveCompany should reset to null', () => {
    const filled = reducer(initial, setActiveCompany({ id: '2', name: 'X', paymentFrequency: 'monthly', currency: 'USD' }));
    const cleared = reducer(filled, clearActiveCompany());
    expect(cleared.company).toBeNull();
  });
});
