import { App as AntdApp, ConfigProvider } from 'antd';
import { theme } from 'antd';
import enUS from 'antd/locale/en_US';
import esES from 'antd/locale/es_ES';

import { lightTheme } from '../config/theme';
import { useLocale } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';

const { darkAlgorithm } = theme;

const antdLocales = {
  es: esES,
  en: enUS,
} as const;

interface AntDConfigProviderProps {
  children: React.ReactNode;
}

/**
 * ConfigProvider de Ant Design integrado con Theme y Locale de KPITAL.
 * Aplica colores corporativos y sincroniza tema claro/oscuro e idioma.
 */
export function AntDConfigProvider({ children }: AntDConfigProviderProps) {
  const { theme: appTheme } = useTheme();
  const { locale: appLocale } = useLocale();

  const themeConfig = {
    ...lightTheme,
    algorithm: appTheme === 'dark' ? darkAlgorithm : undefined,
  };

  return (
    <ConfigProvider theme={themeConfig} locale={antdLocales[appLocale]}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
