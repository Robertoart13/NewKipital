import { createSlice } from '@reduxjs/toolkit';

export type PaymentFrequency = 'monthly' | 'biweekly' | 'weekly' | 'custom';

export interface Company {
  id: string;
  name: string;
  code?: string;
  /** Frecuencia de pago configurada para la empresa */
  paymentFrequency?: PaymentFrequency;
  /** Moneda (ej: USD, PEN) */
  currency?: string;
}

export interface ActiveCompanyState {
  company: Company | null;
}

const initialState: ActiveCompanyState = {
  company: null,
};

const activeCompanySlice = createSlice({
  name: 'activeCompany',
  initialState,
  reducers: {
    setActiveCompany: (state, action: { payload: Company | null }) => {
      state.company = action.payload;
    },
    clearActiveCompany: (state) => {
      state.company = null;
    },
  },
});

export const { setActiveCompany, clearActiveCompany } = activeCompanySlice.actions;
export default activeCompanySlice.reducer;
