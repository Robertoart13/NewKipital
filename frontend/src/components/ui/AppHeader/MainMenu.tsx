import { useMemo } from 'react';
import { Menu } from 'antd';
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
 * Menú horizontal data-driven con soporte para submenús.
 * Recibe items del selector (derivados de permisos). No contiene lógica de permisos.
 */
export function MainMenu({ items, iconMap, className }: MainMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();

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

  const menuItems = useMemo(() => buildMenuItems(items, false), [items, iconMap]);

  const flattenItems = (list: MenuItemConfig[]): MenuItemConfig[] =>
    list.flatMap((i) =>
      i.children?.length ? [i, ...flattenItems(i.children)] : [i]
    );

  const selectedKey = useMemo(() => {
    const match = flattenItems(items).find((m) => location.pathname === m.path);
    return match?.path ?? match?.id ?? undefined;
  }, [items, location.pathname]);

  return (
    <Menu
      mode="horizontal"
      selectedKeys={selectedKey ? [selectedKey] : []}
      items={menuItems}
      className={className}
    />
  );
}
