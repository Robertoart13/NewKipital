/* =============================================================================
   CONTEXT: ThemeContext
   =============================================================================

   Contexto para tema (light/dark) con toggle.

   Responsabilidades:
   - Proveer theme y toggleTheme a hijos
   - useTheme debe usarse dentro de ThemeProvider

   ========================================================================== */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

/**
 * ============================================================================
 * ThemeProvider
 * ============================================================================
 *
 * Provee theme y toggleTheme a la arbol de componentes.
 *
 * ============================================================================
 */
export function ThemeProvider({ children, defaultTheme = 'light' }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

/**
 * Hook para acceder al contexto de tema.
 *
 * @throws {Error} Si se usa fuera de ThemeProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return ctx;
}
