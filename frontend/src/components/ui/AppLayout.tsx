/* =============================================================================
   COMPONENT: AppLayout
   =============================================================================

   Layout base de la aplicacion: header fijo de dos niveles + contenido.

   Responsabilidades:
   - Renderizar estructura Layout (antd)
   - Componer AppHeader con menu data-driven desde Redux
   - No incluye sidebar; toda la navegacion es por menu horizontal

   Decisiones de diseno:
   - menuItems provienen del selector de Redux (derivados de permisos)
   - userName se muestra en el header; default "Usuario"

   ========================================================================== */

import { Layout } from 'antd';

import { menuIconMap } from '../../config/menuIcons';

import { AppHeader } from './AppHeader';

import type { MenuItem } from '../../store/slices/menuSlice';

const { Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
  menuItems: MenuItem[];
  userName?: string;
}

/**
 * ============================================================================
 * AppLayout
 * ============================================================================
 *
 * Layout principal: header de dos niveles + area de contenido.
 *
 * @param children - Contenido principal (paginas).
 * @param menuItems - Items del menu (del selector Redux).
 * @param userName - Nombre del usuario (default: "Usuario").
 *
 * ============================================================================
 */
export function AppLayout({ children, menuItems, userName = 'Usuario' }: AppLayoutProps) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader menuItems={menuItems} iconMap={menuIconMap} userName={userName} />
      <Content style={{ padding: 24, background: '#f5f5f5' }}>{children}</Content>
    </Layout>
  );
}

