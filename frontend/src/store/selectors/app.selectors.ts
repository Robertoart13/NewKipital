import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { PlatformApp } from '../slices/authSlice';

const selectEnabledApps = (state: RootState) => state.auth.user?.enabledApps ?? [];
const selectActiveApp = (state: RootState) => state.activeApp.app;

/** ¿El usuario tiene acceso a la app activa? */
export const hasAccessToActiveApp = createSelector(
  [selectEnabledApps, selectActiveApp],
  (enabledApps, activeApp) => enabledApps.includes(activeApp),
);

/** ¿El usuario tiene acceso a una app específica? */
export const hasAccessToApp = (state: RootState, app: PlatformApp) =>
  (state.auth.user?.enabledApps ?? []).includes(app);

/** Apps disponibles para el usuario actual */
export const getAvailableApps = createSelector(
  [selectEnabledApps],
  (apps) => apps,
);
