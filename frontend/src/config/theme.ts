import type { ThemeConfig } from 'antd';

/**
 * Colores corporativos KPITAL 360.
 * Paleta profesional para ERP empresarial.
 */
export const KPITAL_THEME: ThemeConfig['token'] = {
  colorPrimary: '#0d6efd',
  colorSuccess: '#198754',
  colorWarning: '#ffc107',
  colorError: '#dc3545',
  colorInfo: '#0dcaf0',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: '"Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

/**
 * Tema light completo para ConfigProvider.
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

