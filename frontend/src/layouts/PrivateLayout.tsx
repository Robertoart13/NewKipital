/* =============================================================================
   LAYOUT: PrivateLayout
   =============================================================================

   Layout para rutas privadas (dashboard, modulos).

   Responsabilidades:
   - Header con menu dinamico
   - Area de contenido
   - Menu derivado de permisos via getVisibleMenuItems

   ========================================================================== */

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
 * ============================================================================
 * PrivateLayout
 * ============================================================================
 *
 * Layout para rutas privadas. Header + contenido. Requiere auth y permisos.
 *
 * @param children - Contenido de la pagina.
 *
 * ============================================================================
 */
export function PrivateLayout({ children }: PrivateLayoutProps) {
  const menuItems = useAppSelector(getVisibleMenuItems);
  const userName = useAppSelector((s) => s.auth.user?.name ?? 'Usuario');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader menuItems={menuItems} iconMap={menuIconMap} userName={userName} />
      <Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto' }}>{children}</Content>
    </Layout>
  );
}

