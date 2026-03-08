/* =============================================================================
   COMPONENT: AppHeader
   =============================================================================

   Header de dos niveles: Logo + acciones | Menu horizontal.

   Responsabilidades:
   - Nivel 1: Logo + HeaderActions (notificaciones, avatar, switch app)
   - Nivel 2: MainMenu (menu horizontal data-driven)

   ========================================================================== */

import { Layout } from 'antd';

import styles from './AppHeader.module.css';
import { HeaderActions } from './HeaderActions';
import { Logo } from './Logo';
import { MainMenu } from './MainMenu';

const { Header } = Layout;

/**
 * ============================================================================
 * MenuItemForHeader
 * ============================================================================
 *
 * Item de menu para el header. Soporta hijos para submenus.
 *
 * ============================================================================
 */
export interface MenuItemForHeader {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  children?: MenuItemForHeader[];
}

interface AppHeaderProps {
  menuItems: MenuItemForHeader[];
  iconMap: Record<string, React.ReactNode>;
  userName?: string;
}

/**
 * ============================================================================
 * AppHeader
 * ============================================================================
 *
 * Header de dos niveles: Nivel 1 = Logo + acciones; Nivel 2 = Menu horizontal.
 *
 * @param menuItems - Items del menu con iconos.
 * @param iconMap - Mapa id -> icono para el menu.
 * @param userName - Nombre del usuario (default: "Usuario").
 *
 * ============================================================================
 */
export function AppHeader({ menuItems, iconMap, userName = 'Usuario' }: AppHeaderProps) {
  return (
    <Header className={styles.header} style={{ padding: 0, height: 'auto', lineHeight: 'normal' }}>
      <div className={styles.level1}>
        <Logo />
        <HeaderActions userName={userName} />
      </div>
      <div className={styles.level2}>
        <MainMenu items={menuItems} iconMap={iconMap} className={styles.menu} />
      </div>
    </Header>
  );
}

