import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Typography, Space, Button, Spin, Flex } from 'antd';
import { BankOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setActiveCompany } from '../store/slices/activeCompanySlice';
import { setPermissions } from '../store/slices/permissionsSlice';
import { STORAGE_KEYS } from '../lib/storage';
import { performLogout } from '../lib/auth';
import { fetchPermissionsForCompany } from '../api/permissions';
import type { UserCompanyInfo } from '../store/slices/authSlice';

const { Title, Text } = Typography;

/**
 * Pantalla intermedia de selecciÃ³n de empresa.
 * Se muestra DESPUÃ‰S del login pero ANTES del dashboard.
 * Las empresas vienen del backend (almacenadas en Redux en login o /me).
 */
export function CompanySelectionPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const activeApp = useAppSelector((s) => s.activeApp.app);
  const companies = useAppSelector((s) => s.auth.companies);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (company: UserCompanyInfo) => {
    setLoading(true);
    const cid = String(company.id);

    localStorage.setItem(STORAGE_KEYS.COMPANY_ID, cid);
    dispatch(setActiveCompany({
      id: cid,
      name: company.nombre,
      code: company.codigo ?? undefined,
    }));

    try {
      const { permissions, roles } = await fetchPermissionsForCompany(cid, activeApp);
      dispatch(setPermissions({
        permissions,
        roles,
        appId: activeApp,
        companyId: cid,
      }));
    } catch {
      // Si falla, el PrivateGuard manejarÃ¡ la falta de permisos
    }

    setLoading(false);
    navigate('/dashboard', { replace: true });
  };

  const handleLogout = async () => {
    await performLogout(dispatch);
    navigate('/auth/login', { replace: true });
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '100vh' }}>
        <Spin size="large" description="Cargando permisos..." />
      </Flex>
    );
  }

  return (
    <Card
      style={{
        width: 520,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        borderRadius: 12,
      }}
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
        <img
          src="/assets/images/global/LogoLarge.png"
          alt="KPITAL 360"
          style={{ height: 48, margin: '0 auto' }}
        />
        <div>
          <Title level={4} style={{ margin: 0, color: '#262626' }}>Seleccionar Empresa</Title>
          <Text type="secondary">ElegÃ­ la empresa con la que vas a trabajar</Text>
        </div>
      </Space>

      <List
        style={{ marginTop: 24 }}
        dataSource={companies}
        locale={{ emptyText: 'No tiene empresas asignadas. Contacte al administrador.' }}
        renderItem={(company) => (
          <List.Item
            style={{ cursor: 'pointer', borderRadius: 8, padding: '12px 16px' }}
            onClick={() => handleSelect(company)}
          >
            <List.Item.Meta
              avatar={<BankOutlined style={{ fontSize: 24, color: '#20638d' }} />}
              title={company.nombre}
              description={company.codigo || `Empresa #${company.id}`}
            />
          </List.Item>
        )}
      />

      <Button
        type="text"
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        style={{ marginTop: 16, color: '#8c8c8c' }}
        block
      >
        Cerrar sesiÃ³n
      </Button>
    </Card>
  );
}

