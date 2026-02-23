import { Spin, Flex } from 'antd';
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
      <Flex align="center" justify="center" style={{ minHeight: '100vh', background: '#f5f7fa' }}>
        <Spin size="large" description="Verificando sesión..." />
      </Flex>
    );
  }

  return <AppRouter />;
}

export default App;
