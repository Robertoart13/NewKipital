import { Typography } from 'antd';
import { useAppSelector } from '../../store/hooks';

const { Title, Text } = Typography;

/**
 * Página principal del dashboard.
 * Placeholder — se expandirá con widgets y KPIs.
 */
export function DashboardPage() {
  const userName = useAppSelector((s) => s.auth.user?.name ?? 'Usuario');
  const companiesCount = useAppSelector((s) => s.auth.companies.length);

  return (
    <>
      <Title level={3} style={{ margin: '0 0 8px 0', fontWeight: 700, color: '#262626' }}>
        Dashboard de Recursos Humanos
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24, fontSize: 14 }}>
        Bienvenido, {userName}. Tiene acceso a {companiesCount} empresa(s) en este contexto.
      </Text>
    </>
  );
}
