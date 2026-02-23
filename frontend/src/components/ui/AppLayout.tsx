import { Layout } from 'antd';
import { AppHeader } from './AppHeader';
import { menuIconMap } from '../../config/menuIcons';
import type { MenuItem } from '../../store/slices/menuSlice';

const { Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
  menuItems: MenuItem[];
  userName?: string;
}

/**
 * Layout base: header fijo + content.
 * Header de dos niveles según mock. Menú data-driven desde Redux.
 * Sin sidebar — toda la navegación es por el menú horizontal superior.
 */
export function AppLayout({
  children,
  menuItems,
  userName = 'Usuario',
}: AppLayoutProps) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader
        menuItems={menuItems}
        iconMap={menuIconMap}
        userName={userName}
      />
      <Content style={{ padding: 24, background: '#f5f5f5' }}>{children}</Content>
    </Layout>
  );
}
