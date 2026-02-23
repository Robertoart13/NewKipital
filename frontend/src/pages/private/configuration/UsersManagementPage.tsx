import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  App as AntdApp,
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Drawer,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  fetchConfigPermissions,
  fetchRolePermissions,
  fetchApps,
  fetchRolesForUsers,
  fetchUserCompanies,
  fetchUserRolesSummary,
  fetchUsers,
  replaceUserCompanies,
  replaceUserGlobalRoles,
  replaceUserGlobalPermissionDenials,
  type SystemApp,
  type SystemPermission,
  type SystemRole,
  type SystemUser,
  type UserRolesSummary,
} from '../../../api/securityConfig';
import { useCompanies } from '../../../queries/companies/useCompanies';

const { Text } = Typography;

function getInitials(nombre: string, apellido: string): string {
  const n = nombre?.trim().charAt(0) ?? '';
  const a = apellido?.trim().charAt(0) ?? '';
  return `${n}${a}`.toUpperCase() || '?';
}

export function UsersManagementPage() {
  const { message } = AntdApp.useApp();
  const location = useLocation();
  const { data: companiesData } = useCompanies(false);

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [apps, setApps] = useState<SystemApp[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [, setPermissions] = useState<SystemPermission[]>([]);
  const [userCompanyIds, setUserCompanyIds] = useState<number[]>([]);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [selectedApp, setSelectedApp] = useState<SystemApp | null>(null);
  const [, setRolesSummary] = useState<UserRolesSummary | null>(null);
  const [globalRoleIds, setGlobalRoleIds] = useState<number[]>([]);
  const [globalPermissionDeny, setGlobalPermissionDeny] = useState<string[]>([]);
  const [drawerNavTab, setDrawerNavTab] = useState<string>('empresas');
  const [excepcionRoleId, setExcepcionRoleId] = useState<number | null>(null);
  const [roleExcepcionPermissions, setRoleExcepcionPermissions] = useState<SystemPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, appsData, rolesData, permsData] = await Promise.all([
        fetchUsers(false),
        fetchApps(),
        fetchRolesForUsers(false),
        fetchConfigPermissions({ includeInactive: false }),
      ]);
      setUsers(usersData.filter((u) => u.estado === 1));
      setApps(appsData.filter((a) => a.estado === 1));
      setRoles(rolesData.filter((r) => r.estado === 1));
      setPermissions((permsData ?? []).filter((p) => p.estado === 1));
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  const loadUserCompanies = useCallback(async () => {
    if (!selectedUser) {
      setUserCompanyIds([]);
      return;
    }
    try {
      const assignments = await fetchUserCompanies(selectedUser.id);
      setUserCompanyIds(
        assignments.filter((a) => a.estado === 1).map((a) => a.idEmpresa),
      );
    } catch {
      setUserCompanyIds([]);
    }
  }, [selectedUser]);

  useEffect(() => {
    void loadUserCompanies();
  }, [loadUserCompanies]);

  const loadRolesSummary = useCallback(async () => {
    if (!selectedUser || !selectedApp) {
      setRolesSummary(null);
      setGlobalRoleIds([]);
      setGlobalPermissionDeny([]);
      return;
    }
    try {
      const summary = await fetchUserRolesSummary(selectedUser.id, selectedApp.codigo);
      setRolesSummary(summary);
      setGlobalRoleIds(summary.globalRoleIds);
      setGlobalPermissionDeny(summary.globalPermissionDeny ?? []);
    } catch {
      setRolesSummary(null);
    }
  }, [selectedUser, selectedApp]);

  useEffect(() => {
    void loadRolesSummary();
  }, [loadRolesSummary]);

  const filteredUsers = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return users;
    return users.filter(
      (u) =>
        `${u.nombre} ${u.apellido}`.toLowerCase().includes(t) ||
        (u.email ?? '').toLowerCase().includes(t),
    );
  }, [users, search]);

  const appOptions = useMemo(
    () =>
      apps.map((a) => ({ value: a.id, label: `${a.nombre} (${a.codigo})` })),
    [apps],
  );

  const saveUserCompanies = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await replaceUserCompanies(selectedUser.id, userCompanyIds);
      message.success('Empresas guardadas. El usuario solo podrá ver y trabajar en las empresas marcadas.');
      void loadUserCompanies();
      void loadRolesSummary();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const saveGlobalRoles = async () => {
    if (!selectedUser || !selectedApp) return;
    try {
      setSaving(true);
      await replaceUserGlobalRoles(selectedUser.id, {
        appCode: selectedApp.codigo,
        roleIds: globalRoleIds,
      });
      message.success('Roles globales guardados.');
      void loadRolesSummary();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const saveGlobalPermissionDenials = async () => {
    if (!selectedUser || !selectedApp) return;
    try {
      setSaving(true);
      await replaceUserGlobalPermissionDenials(selectedUser.id, {
        appCode: selectedApp.codigo,
        deny: globalPermissionDeny,
      });
      message.success('Denegaciones globales guardadas. El usuario no tendrá esos permisos en ninguna empresa.');
      void loadRolesSummary();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const openConfigDrawer = (user: SystemUser) => {
    setSelectedUser(user);
    setSelectedApp(null);
    setRolesSummary(null);
    setDrawerNavTab('empresas');
    setExcepcionRoleId(null);
    setRoleExcepcionPermissions([]);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (!excepcionRoleId) {
      setRoleExcepcionPermissions([]);
      return;
    }
    let cancelled = false;
    fetchRolePermissions(excepcionRoleId)
      .then((perms) => {
        if (!cancelled) setRoleExcepcionPermissions(perms ?? []);
      })
      .catch(() => {
        if (!cancelled) setRoleExcepcionPermissions([]);
      });
    return () => { cancelled = true; };
  }, [excepcionRoleId]);

  const activeTab = location.pathname.includes('/users')
    ? 'users'
    : location.pathname.includes('/permissions')
      ? 'permissions'
      : 'roles';

  const tabBase = {
    padding: '8px 16px',
    borderRadius: 6,
    textDecoration: 'none',
    fontSize: 14,
  };

  const columns: ColumnsType<SystemUser> = [
    {
      title: 'Usuario',
      key: 'usuario',
      render: (_, user) => (
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#374151' }} icon={<UserOutlined />}>
            {getInitials(user.nombre, user.apellido)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{`${user.nombre} ${user.apellido}`}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{user.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 100,
      render: (v: number) =>
        v === 1 ? <Tag color="success">Activo</Tag> : <Tag>Inactivo</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 140,
      render: (_, user) => (
        <Button
          type="link"
          size="small"
          icon={<SettingOutlined />}
          onClick={(e) => { e.stopPropagation(); openConfigDrawer(user); }}
        >
          Configurar
        </Button>
      ),
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/configuration" style={{ color: '#6b7280', display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined style={{ fontSize: 18 }} />
          </Link>
          <div>
            <Text strong style={{ fontSize: 18, color: '#111827', display: 'block' }}>
              Usuarios
            </Text>
            <Text type="secondary" style={{ fontSize: 12, color: '#6b7280' }}>
              Miembros ({filteredUsers.length})
            </Text>
          </div>
          <div style={{ display: 'flex', marginLeft: 24, gap: 2 }}>
            <Link to="/configuration/roles" style={{ ...tabBase, color: activeTab === 'roles' ? '#111827' : '#6b7280', fontWeight: activeTab === 'roles' ? 600 : 400, backgroundColor: activeTab === 'roles' ? '#f3f4f6' : 'transparent' }}>Roles</Link>
            <Link to="/configuration/users" style={{ ...tabBase, color: activeTab === 'users' ? '#111827' : '#6b7280', fontWeight: activeTab === 'users' ? 600 : 400, backgroundColor: activeTab === 'users' ? '#f3f4f6' : 'transparent' }}>Usuarios</Link>
            <Link to="/configuration/permissions" style={{ ...tabBase, color: activeTab === 'permissions' ? '#111827' : '#6b7280', fontWeight: activeTab === 'permissions' ? 600 : 400, backgroundColor: activeTab === 'permissions' ? '#f3f4f6' : 'transparent' }}>Permisos</Link>
          </div>
        </div>
      </div>

      <Card styles={{ body: { padding: 24 } }} style={{ borderRadius: 6, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <Input.Search allowClear placeholder="Buscar por nombre o email" style={{ width: 280 }} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Table<SystemUser>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredUsers}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} usuario(s)` }}
          size="middle"
          onRow={(record) => ({ onClick: () => openConfigDrawer(record), style: { cursor: 'pointer' } })}
        />
      </Card>

      <Drawer
        title={
          selectedUser ? (
            <Space>
              <Avatar size="small" style={{ backgroundColor: '#374151' }}>
                {getInitials(selectedUser.nombre, selectedUser.apellido)}
              </Avatar>
              <span>{`${selectedUser.nombre} ${selectedUser.apellido}`}</span>
            </Space>
          ) : (
            'Configurar roles y permisos'
          )
        }
        size={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        footer={null}
      >
        {selectedUser && (
          <Space orientation="vertical" style={{ width: '100%' }} size={16}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 200 }}>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Aplicación</Text>
                <Tooltip title="KPITAL 360: planillas y RRHH. TimeWise: asistencia. Cada aplicación tiene su propio catálogo.">
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                    Contexto para roles y permisos <InfoCircleOutlined style={{ marginLeft: 2 }} />
                  </Text>
                </Tooltip>
                <Select
                  placeholder="Seleccione aplicación"
                  value={selectedApp?.id}
                  options={appOptions}
                  onChange={(val) => setSelectedApp(apps.find((a) => a.id === val) ?? null)}
                  style={{ width: '100%' }}
                  optionFilterProp="label"
                />
              </div>
            </div>

            <Tabs
              activeKey={drawerNavTab}
              onChange={setDrawerNavTab}
              type="line"
              size="middle"
              style={{ marginTop: 8 }}
              items={[
                {
                  key: 'empresas',
                  label: <span style={{ fontWeight: 500 }}>Empresas</span>,
                  children: (
                    <div style={{ paddingTop: 16 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
                        Solo las empresas marcadas. Si está desmarcada, el usuario no ve nada de ella.
                      </Text>
                      <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                        <Checkbox.Group
                          value={userCompanyIds}
                          onChange={(v) => setUserCompanyIds(v as number[])}
                          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                        >
                          {(companiesData ?? []).map((c) => (
                            <Checkbox key={c.id} value={c.id}>
                              {c.nombre}
                              {c.prefijo && <Text type="secondary" style={{ marginLeft: 6 }}>({c.prefijo})</Text>}
                            </Checkbox>
                          ))}
                        </Checkbox.Group>
                        {(!companiesData || companiesData.length === 0) && <Text type="secondary">No hay empresas.</Text>}
                      </div>
                      <Button type="primary" size="small" loading={saving} onClick={() => void saveUserCompanies()} style={{ marginTop: 10 }}>
                        Guardar empresas
                      </Button>
                    </div>
                  ),
                },
                {
                  key: 'roles',
                  label: <span style={{ fontWeight: 500 }}>Roles</span>,
                  children: selectedApp ? (
                    <div style={{ paddingTop: 16 }}>
                      {userCompanyIds.length === 0 && (
                        <Alert
                          type="warning"
                          showIcon
                          message="Sin empresas asignadas los roles no tienen efecto"
                          description="Los roles globales solo aplican si el usuario tiene al menos una empresa asignada en la pestaña Empresas. Guarde las empresas primero."
                          style={{ marginBottom: 16 }}
                        />
                      )}
                      <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>Roles globales</Text>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
                        Se aplican automáticamente en todas las empresas del usuario.
                      </Text>
                      <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                        <Checkbox.Group
                          value={globalRoleIds}
                          onChange={(v) => setGlobalRoleIds(v as number[])}
                          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                        >
                          {roles.map((r) => (
                            <Checkbox key={r.id} value={r.id}>
                              {r.nombre} <Text type="secondary">({r.codigo})</Text>
                            </Checkbox>
                          ))}
                        </Checkbox.Group>
                      </div>
                      <Button type="primary" size="small" loading={saving} onClick={() => void saveGlobalRoles()} style={{ marginTop: 10 }}>
                        Guardar roles globales
                      </Button>
                    </div>
                  ) : (
                    <div style={{ paddingTop: 16 }}>
                      <Text type="secondary">Seleccione una aplicación para configurar roles.</Text>
                    </div>
                  ),
                },
                {
                  key: 'excepciones',
                  label: <span style={{ fontWeight: 500 }}>Excepciones</span>,
                  children: selectedApp ? (
                    <div style={{ paddingTop: 16 }}>
                      {userCompanyIds.length === 0 && (
                        <Alert
                          type="warning"
                          showIcon
                          message="Sin empresas asignadas las excepciones no tienen efecto"
                          description="Asigne al menos una empresa en la pestaña Empresas para que los roles y permisos apliquen al refrescar el perfil."
                          style={{ marginBottom: 16 }}
                        />
                      )}
                      <div
                        style={{
                          padding: 12,
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: 8,
                          fontSize: 13,
                          color: '#991b1b',
                          lineHeight: 1.5,
                          marginBottom: 16,
                        }}
                      >
                        <Text strong style={{ color: '#991b1b', display: 'block', marginBottom: 4 }}>Denegar permisos globalmente</Text>
                        Los permisos marcados NO se aplicarán en ninguna empresa. Seleccione un rol para ver sus permisos y revocar los que no debe tener el usuario.
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Rol</Text>
                        <Select
                          placeholder="Seleccione rol"
                          value={excepcionRoleId}
                          onChange={setExcepcionRoleId}
                          options={roles.map((r) => ({ label: `${r.nombre} (${r.codigo})`, value: r.id }))}
                          style={{ width: '100%' }}
                          allowClear
                        />
                      </div>
                      {excepcionRoleId && (
                        <div>
                          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                            Permisos del rol a denegar
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                            Marque los que el usuario NO debe tener en ninguna empresa.
                          </Text>
                          <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #fecaca', borderRadius: 8, padding: 12, background: '#fef2f2' }}>
                            <Checkbox.Group
                              value={globalPermissionDeny}
                              onChange={(v) => setGlobalPermissionDeny(v as string[])}
                              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                            >
                              {roleExcepcionPermissions.length > 0
                                ? roleExcepcionPermissions.map((p) => (
                                    <Checkbox key={p.id} value={p.codigo}>
                                      <Text code style={{ fontSize: 12 }}>{p.codigo}</Text>
                                      <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>— {p.nombre}</Text>
                                    </Checkbox>
                                  ))
                                : <Text type="secondary" style={{ fontSize: 12 }}>Cargando permisos del rol…</Text>}
                            </Checkbox.Group>
                          </div>
                          <Button type="default" size="small" loading={saving} onClick={() => void saveGlobalPermissionDenials()} style={{ marginTop: 8 }}>
                            Guardar denegaciones globales
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ paddingTop: 16 }}>
                      <Text type="secondary">Seleccione una aplicación para configurar excepciones.</Text>
                    </div>
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Drawer>

    </div>
  );
}
