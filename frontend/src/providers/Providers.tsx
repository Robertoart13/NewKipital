import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Provider } from 'react-redux';

import { LocaleProvider } from '../contexts/LocaleContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { bustApiCache } from '../lib/apiCache';
import { queryClient } from '../queries/queryClient';
import { store } from '../store';

import { AntDConfigProvider } from './AntDConfigProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Providers raíz según directivas KPITAL 360:
 * Redux → TanStack Query → Theme → Locale → AntD → App
 */
export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    const refresh = () => {
      bustApiCache();
    };
    refresh();
    const id = window.setInterval(refresh, 6 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider>
            <AntDConfigProvider>{children}</AntDConfigProvider>
          </LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}

