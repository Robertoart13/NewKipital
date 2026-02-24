import { Spin, Flex } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { AppRouter } from './router/AppRouter';
import { useSessionRestore } from './hooks/useSessionRestore';
import { useAppSelector } from './store/hooks';
import { isMicrosoftOAuthCallbackInProgress } from './lib/microsoftAuth';

/**
 * Componente raíz.
 * Restaura sesión desde cookie httpOnly al cargar.
 * Muestra spinner mientras verifica autenticación.
 */
function App() {
  useSessionRestore();
  const sessionLoading = useAppSelector((s) => s.auth.sessionLoading);
  const isMicrosoftPopupCallback = isMicrosoftOAuthCallbackInProgress();

  if (sessionLoading && !isMicrosoftPopupCallback) {
    return (
      <Flex
        align="center"
        justify="center"
        vertical
        gap={24}
        style={{
          minHeight: '100vh',
          background: '#f5f7fa',
        }}
      >
        <SafetyCertificateOutlined
          style={{ fontSize: 40, color: '#20638d', opacity: 0.85 }}
          aria-hidden
        />
        <Spin size="large" />
        <Flex vertical align="center" gap={6}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#1f2937' }}>
            Restableciendo sesión segura
          </span>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Protección activa de la información corporativa.
          </span>
        </Flex>
      </Flex>
    );
  }

  return <AppRouter />;
}

export default App;
