/* =============================================================================
   COMPONENT: MainMenu
   =============================================================================

   Menu horizontal data-driven con soporte para submenus y grupos.

   Responsabilidades:
   - Renderizar menu horizontal desde items
   - Soporte para submenus y grupos
   - Navegacion via react-router
   - Resaltar item activo segun pathname

   Nota: No contiene logica de permisos; items vienen filtrados del selector.

   ========================================================================== */

import { Menu } from 'antd';
import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import type { MenuProps } from 'antd';

export interface MenuItemConfig {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  children?: MenuItemConfig[];
  isGroup?: boolean;
}

interface MainMenuProps {
  items: MenuItemConfig[];
  iconMap: Record<string, React.ReactNode>;
  className?: string;
}

/**
 * ============================================================================
 * MainMenu
 * ============================================================================
 *
 * Menu horizontal data-driven con submenus. Items vienen del selector (permisos).
 *
 * @param items - Configuracion del menu.
 * @param iconMap - Mapa id -> icono.
 * @param className - Clase CSS opcional.
 *
 * ============================================================================
 */
export function MainMenu({ items, iconMap, className }: MainMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = useMemo(() => {
    const buildMenuItems = (list: MenuItemConfig[], addDividers = false): MenuProps['items'] => {
      const result: MenuProps['items'] = [];

      list.forEach((item, index) => {
        const icon = item.icon ?? iconMap[item.id];
        const hasChildren = item.children && item.children.length > 0;

        if (addDividers && index > 0) {
          result!.push({ type: 'divider' });
        }

        if (hasChildren && item.isGroup) {
          result!.push({
            type: 'group' as const,
            key: item.id,
            label: item.label,
            children: buildMenuItems(item.children!, true),
          });
        } else if (hasChildren) {
          result!.push({
            key: item.id,
            icon,
            label: item.label,
            children: buildMenuItems(item.children!, true),
          });
        } else {
          result!.push({
            key: item.path,
            icon,
            label: item.label,
            onClick: () => navigate(item.path),
          });
        }
      });

      return result;
    };

    return buildMenuItems(items, false);
  }, [items, iconMap, navigate]);

  const selectedKey = useMemo(() => {
    const flattenItems = (list: MenuItemConfig[]): MenuItemConfig[] =>
      list.flatMap((i) => (i.children?.length ? [i, ...flattenItems(i.children)] : [i]));

    const match = flattenItems(items).find((m) => location.pathname === m.path);
    return match?.path ?? match?.id ?? undefined;
  }, [items, location.pathname]);

  return (
    <Menu mode="horizontal" selectedKeys={selectedKey ? [selectedKey] : []} items={menuItems} className={className} />
  );
}

