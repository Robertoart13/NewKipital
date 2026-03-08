/* =============================================================================
   CONTEXT: LocaleContext
   =============================================================================

   Contexto para locale (es/en) con setter.

   Responsabilidades:
   - Proveer locale y setLocale a hijos
   - useLocale debe usarse dentro de LocaleProvider

   ========================================================================== */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Locale = 'es' | 'en';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

/**
 * ============================================================================
 * LocaleProvider
 * ============================================================================
 *
 * Provee locale y setLocale a la arbol de componentes.
 *
 * ============================================================================
 */
export function LocaleProvider({ children, defaultLocale = 'es' }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

/**
 * Hook para acceder al contexto de locale.
 *
 * @throws {Error} Si se usa fuera de LocaleProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale debe usarse dentro de LocaleProvider');
  }
  return ctx;
}
