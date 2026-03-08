/* =============================================================================
   LAYOUT: PublicLayout
   =============================================================================

   Layout para rutas publicas (login, forgot password).

   Responsabilidades:
   - Contenedor centrado y limpio
   - Sin header, sin menu
   - No consume Redux

   ========================================================================== */

import { Layout } from 'antd';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * ============================================================================
 * PublicLayout
 * ============================================================================
 *
 * Layout para rutas publicas. Lobby limpio y aislado del dashboard.
 *
 * @param children - Contenido a renderizar.
 *
 * ============================================================================
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Layout>
  );
}

