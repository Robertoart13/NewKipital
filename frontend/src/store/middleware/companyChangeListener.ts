import type { Middleware } from '@reduxjs/toolkit';
import { logout } from '../slices/authSlice';
import { setActiveCompany, clearActiveCompany } from '../slices/activeCompanySlice';
import { setActiveApp } from '../slices/activeAppSlice';
import { setPermissions, clearPermissions } from '../slices/permissionsSlice';
import { queryClient } from '../../queries/queryClient';
import { fetchPermissionsForApp, fetchPermissionsForCompany } from '../../api/permissions';
import type { RootState } from '../store';

/**
 * Middleware: escucha acciones críticas y orquesta reacciones.
 * - logout → limpia todo (permisos, empresa, app context, cache)
 * - setActiveCompany → recarga permisos reales desde backend, invalida queries
 * - setActiveApp → limpia permisos (se recargan con nuevo contexto), invalida queries
 */
export const companyChangeListener: Middleware = (store) => (next) => (action) => {
  const previousState = store.getState() as RootState;
  const result = next(action);
  const nextState = store.getState() as RootState;

  if (logout.match(action)) {
    store.dispatch(clearPermissions());
    store.dispatch(clearActiveCompany());
    queryClient.clear();
    return result;
  }

  if (setActiveCompany.match(action)) {
    const { payload: company } = action;
    const previousCompanyId = previousState.activeCompany.company?.id ?? null;
    const nextCompanyId = nextState.activeCompany.company?.id ?? null;
    if (previousCompanyId === nextCompanyId) {
      return result;
    }
    const appCode = nextState.activeApp.app;

    if (company === null) {
      fetchPermissionsForApp(appCode)
        .then(({ permissions, roles }) => {
          store.dispatch(setPermissions({
            permissions,
            roles,
            appId: appCode,
          }));
        })
        .catch(() => {
          // Mantener permisos actuales ante errores transitorios
        });
    } else {
      fetchPermissionsForCompany(company.id, appCode)
        .then(({ permissions, roles }) => {
          store.dispatch(setPermissions({
            permissions,
            roles,
            appId: appCode,
            companyId: company.id,
          }));
        })
        .catch(() => {
          // Mantener permisos actuales ante errores transitorios
        });
    }

    queryClient.invalidateQueries();
  }

  if (setActiveApp.match(action)) {
    if (previousState.activeApp.app === nextState.activeApp.app) {
      return result;
    }

    const company = nextState.activeCompany.company;
    const appCode = action.payload;

    if (company?.id) {
      fetchPermissionsForCompany(company.id, appCode)
        .then(({ permissions, roles }) => {
          store.dispatch(setPermissions({
            permissions,
            roles,
            appId: appCode,
            companyId: company.id,
          }));
        })
        .catch(() => {
          // Mantener permisos actuales ante errores transitorios
        });
    } else {
      fetchPermissionsForApp(appCode)
        .then(({ permissions, roles }) => {
          store.dispatch(setPermissions({
            permissions,
            roles,
            appId: appCode,
          }));
        })
        .catch(() => {
          // Mantener permisos actuales ante errores transitorios
        });
    }

    queryClient.invalidateQueries();
  }

  return result;
};
