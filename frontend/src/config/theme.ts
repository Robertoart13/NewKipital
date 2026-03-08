/* =============================================================================
   MODULE: theme config
   =============================================================================

   Configuracion de tema Ant Design para KPITAL 360.

   Responsabilidades:
   - Tokens de color corporativos
   - Configuracion de componentes (Button, Input, Table)

   ========================================================================== */

import type { ThemeConfig } from 'antd';

/**
 * ============================================================================
 * KPITAL_THEME
 * ============================================================================
 *
 * Colores corporativos y tokens base.
 *
 * ============================================================================
 */
export const KPITAL_THEME: ThemeConfig['token'] = {
  colorPrimary: '#20638d',
  colorSuccess: '#198754',
  colorWarning: '#ffc107',
  colorError: '#dc3545',
  colorInfo: '#20638d',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: '"Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

/**
 * ============================================================================
 * lightTheme
 * ============================================================================
 *
 * Tema light completo para ConfigProvider.
 *
 * ============================================================================
 */
export const lightTheme: ThemeConfig = {
  token: KPITAL_THEME,
  components: {
    Button: {
      controlHeight: 36,
      fontWeight: 500,
    },
    Input: {
      controlHeight: 36,
    },
    Table: {
      headerBg: '#f8f9fa',
      headerColor: '#212529',
    },
  },
};
