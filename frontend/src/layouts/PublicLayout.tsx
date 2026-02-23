import { Layout } from 'antd';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout para rutas públicas (login, forgot password, etc.).
 * No tiene header, no tiene menú, no consume Redux.
 * Es el "lobby" — limpio y aislado del dashboard.
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
