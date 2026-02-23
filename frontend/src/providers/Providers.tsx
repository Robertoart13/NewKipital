import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '../store';
import { queryClient } from '../queries/queryClient';
import { ThemeProvider } from '../contexts/ThemeContext';
import { LocaleProvider } from '../contexts/LocaleContext';
import { AntDConfigProvider } from './AntDConfigProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Providers raíz según directivas KPITAL 360:
 * Redux → TanStack Query → Theme → Locale → AntD → App
 */
export function Providers({ children }: ProvidersProps) {
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
