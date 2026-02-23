import { createSlice } from '@reduxjs/toolkit';
import type { PlatformApp } from './authSlice';

export type Permission = string;

export interface PermissionsState {
  appId: PlatformApp | null;
  companyId: string | null;
  permissions: Permission[];
  roles: string[];
  loaded: boolean;
}

/**
 * Permisos siempre scoped por User + App + Company + Role.
 * Al cambiar app o empresa → se recargan desde backend.
 * NUNCA hardcoded — siempre del backend.
 */
const initialState: PermissionsState = {
  appId: null,
  companyId: null,
  permissions: [],
  roles: [],
  loaded: false,
};

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    setPermissions: (state, action: {
      payload: {
        permissions: Permission[];
        roles: string[];
        appId?: PlatformApp;
        companyId?: string;
      }
    }) => {
      state.permissions = action.payload.permissions;
      state.roles = action.payload.roles;
      if (action.payload.appId) state.appId = action.payload.appId;
      if (action.payload.companyId) state.companyId = action.payload.companyId;
      state.loaded = true;
    },
    clearPermissions: (state) => {
      state.permissions = [];
      state.roles = [];
      state.appId = null;
      state.companyId = null;
      state.loaded = false;
    },
  },
});

export const { setPermissions, clearPermissions } = permissionsSlice.actions;
export default permissionsSlice.reducer;
