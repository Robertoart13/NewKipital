import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { MenuItem } from '../slices/menuSlice';

const selectMenuConfig = (state: RootState) => state.menu.config;
const selectPermissions = (state: RootState) => state.permissions.permissions;

/**
 * Filtra ítems de menú según permisos del usuario.
 * Regla: si un ítem tiene requiredPermission, el usuario debe tenerlo para verlo.
 * Si no tiene requiredPermission, se muestra siempre.
 */
const filterMenuByPermissions = (items: MenuItem[], permissions: string[]): MenuItem[] => {
  return items
    .map((item) => {
      if (!item.requiredPermission) return item;
      return permissions.includes(item.requiredPermission) ? item : null;
    })
    .filter((item): item is MenuItem => item !== null)
    .map((item) => {
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuByPermissions(item.children, permissions);
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter((item) => {
      if (!item.children) return true;
      if (item.children.length > 0) return true;
      return Boolean(item.path && item.path !== '#');
    });
};

/**
 * Selector derivado: menú visible según permisos.
 * El componente NavBar usa este selector — nunca computa en el componente.
 */
export const getVisibleMenuItems = createSelector(
  [selectMenuConfig, selectPermissions],
  (config, permissions) => filterMenuByPermissions(config, permissions)
);
