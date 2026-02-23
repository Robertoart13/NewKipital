import { Layout } from 'antd';
import { AppHeader } from '../components/ui/AppHeader';
import { menuIconMap } from '../config/menuIcons';
import { useAppSelector } from '../store/hooks';
import { getVisibleMenuItems } from '../store/selectors/menu.selectors';

const { Content } = Layout;

interface PrivateLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout para rutas privadas (dashboard, módulos).
 * Header fijo con menú dinámico + área de contenido.
 * Solo se renderiza cuando auth + permisos + empresa están listos.
 */
export function PrivateLayout({ children }: PrivateLayoutProps) {
  const menuItems = useAppSelector(getVisibleMenuItems);
  const userName = useAppSelector((s) => s.auth.user?.name ?? 'Usuario');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader
        menuItems={menuItems}
        iconMap={menuIconMap}
        userName={userName}
      />
      <Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto' }}>
        {children}
      </Content>
    </Layout>
  );
}
