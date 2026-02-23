import { Layout } from 'antd';
import { Logo } from './Logo';
import { HeaderActions } from './HeaderActions';
import { MainMenu } from './MainMenu';
import styles from './AppHeader.module.css';

const { Header } = Layout;

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
 * Header de dos niveles según mock:
 * Nivel 1: Logo + nombre | Notificaciones + Avatar
 * Nivel 2: Menú horizontal con iconos y dropdowns
 */
export function AppHeader({
  menuItems,
  iconMap,
  userName = 'Usuario',
}: AppHeaderProps) {
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
