import { createSlice } from '@reduxjs/toolkit';
import type { PlatformApp } from './authSlice';

export interface ActiveAppState {
  app: PlatformApp;
}

const initialState: ActiveAppState = {
  app: 'kpital',
};

/**
 * Aplicación activa en la plataforma.
 * Cambiar de app NO es un nuevo login — es un cambio de contexto.
 * El token sigue vigente; solo cambian permisos y menú.
 */
const activeAppSlice = createSlice({
  name: 'activeApp',
  initialState,
  reducers: {
    setActiveApp: (state, action: { payload: PlatformApp }) => {
      state.app = action.payload;
    },
  },
});

export const { setActiveApp } = activeAppSlice.actions;
export default activeAppSlice.reducer;
