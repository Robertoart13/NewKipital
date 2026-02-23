import { App as AntdApp, ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import enUS from 'antd/locale/en_US';
import { theme } from 'antd';
import { useTheme } from '../contexts/ThemeContext';
import { useLocale } from '../contexts/LocaleContext';
import { lightTheme } from '../config/theme';

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
