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
  const result = next(action);

  if (logout.match(action)) {
    store.dispatch(clearPermissions());
    store.dispatch(clearActiveCompany());
    queryClient.clear();
    return result;
  }

  if (setActiveCompany.match(action)) {
    const { payload: company } = action;
    const state = store.getState() as RootState;
    const appCode = state.activeApp.app;

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
          store.dispatch(setPermissions({
            permissions: [],
            roles: [],
            appId: appCode,
          }));
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
          store.dispatch(setPermissions({
            permissions: [],
            roles: [],
            appId: appCode,
            companyId: company.id,
          }));
        });
    }

    queryClient.invalidateQueries();
  }

  if (setActiveApp.match(action)) {
    const state = store.getState() as RootState;
    const company = state.activeCompany.company;
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
          store.dispatch(setPermissions({
            permissions: [],
            roles: [],
            appId: appCode,
            companyId: company.id,
          }));
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
          store.dispatch(setPermissions({
            permissions: [],
            roles: [],
            appId: appCode,
          }));
        });
    }

    queryClient.invalidateQueries();
  }

  return result;
};
