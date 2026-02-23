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
  Flex,
  Input,
  Select,
  Skeleton,
  Space,
  Spin,
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
  WarningOutlined,
} from '@ant-design/icons';
import {
  fetchConfigPermissions,
  fetchRolePermissions,
  fetchApps,
  fetchRolesForUsers,
  fetchUserApps,
  assignUserApp,
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
import {
  canAssignCompanies,
  canAssignApps,
  canAssignRoles,
  canDenyPermissions,
  canViewConfigRoles,
  canViewConfigUsers,
  canViewConfigPermissions,
} from '../../../store/selectors/permissions.selectors';
import { useAppSelector } from '../../../store/hooks';
import styles from './UsersManagementPage.module.css';

const { Text } = Typography;

function NoPermissionMessage({ message, required, variant = 'warning' }: { message: string; required: string; variant?: 'warning' | 'danger' }) {
  const isDanger = variant === 'danger';
  const color = isDanger ? '#b91c1c' : '#b45309';
  const bg = isDanger ? '#fef2f2' : 'transparent';
  const border = isDanger ? '1px solid #fecaca' : 'none';
  return (
    <div style={{ fontSize: 12, color, marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 6, padding: isDanger ? 8 : 0, background: bg, borderRadius: 6, border }}>
      <WarningOutlined style={{ marginTop: 1, flexShrink: 0 }} />
      <span>
        {message} <Text type="secondary" style={{ fontSize: 11 }}>({required})</Text>
      </span>
    </div>
  );
}

function getInitials(nombre: string, apellido: string): string {
  const n = nombre?.trim().charAt(0) ?? '';
  const a = apellido?.trim().charAt(0) ?? '';
  return `${n}${a}`.toUpperCase() || '?';
}

export function UsersManagementPage() {
  const { message } = AntdApp.useApp();
  const location = useLocation();
  const { data: companiesData } = useCompanies(false);
  const canAssignCompaniesPerm = useAppSelector(canAssignCompanies);
  const canAssignAppsPerm = useAppSelector(canAssignApps);
  const canAssignRolesPerm = useAppSelector(canAssignRoles);
  const canDenyPermissionsPerm = useAppSelector(canDenyPermissions);
  const canViewConfigRolesPerm = useAppSelector(canViewConfigRoles);
  const canViewConfigUsersPerm = useAppSelector(canViewConfigUsers);
  const canViewConfigPermissionsPerm = useAppSelector(canViewConfigPermissions);

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [apps, setApps] = useState<SystemApp[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [, setPermissions] = useState<SystemPermission[]>([]);
  const [userAppIds, setUserAppIds] = useState<number[]>([]);
  const [rolesForSelectedApp, setRolesForSelectedApp] = useState<SystemRole[]>([]);
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
  const [loadingUserApps, setLoadingUserApps] = useState(false);
  const [loadingRolesForApp, setLoadingRolesForApp] = useState(false);
  const [loadingRolesSummary, setLoadingRolesSummary] = useState(false);
  const [savingApps, setSavingApps] = useState(false);
  const [appsToAssign, setAppsToAssign] = useState<number[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [exceptionSearch, setExceptionSearch] = useState('');

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, appsData, rolesData, permsData] = await Promise.all([
        fetchUsers(false, true),
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

  const loadUserApps = useCallback(async () => {
    if (!selectedUser) {
      setUserAppIds([]);
      setLoadingUserApps(false);
      return;
    }
    setLoadingUserApps(true);
    try {
      const userApps = await fetchUserApps(selectedUser.id);
      setUserAppIds(userApps.map((a) => a.idApp));
    } catch {
      setUserAppIds([]);
    } finally {
      setLoadingUserApps(false);
    }
  }, [selectedUser]);

  const loadRolesForSelectedApp = useCallback(async () => {
    if (!selectedApp) {
      setRolesForSelectedApp([]);
      setLoadingRolesForApp(false);
      return;
    }
    setLoadingRolesForApp(true);
    try {
      const data = await fetchRolesForUsers(false, selectedApp.codigo);
      setRolesForSelectedApp(data.filter((r) => r.estado === 1));
    } catch {
      setRolesForSelectedApp([]);
    } finally {
      setLoadingRolesForApp(false);
    }
  }, [selectedApp]);

  useEffect(() => {
    void loadUserCompanies();
  }, [loadUserCompanies]);

  useEffect(() => {
    void loadUserApps();
  }, [loadUserApps]);

  useEffect(() => {
    void loadRolesForSelectedApp();
  }, [loadRolesForSelectedApp]);

  useEffect(() => {
    if (!selectedUser || selectedApp !== null) return;
    if (userAppIds.length === 0) return;
    const first = apps.find((a) => userAppIds.includes(a.id));
    if (first) setSelectedApp(first);
  }, [selectedUser, selectedApp, userAppIds, apps]);

  const loadRolesSummary = useCallback(async () => {
    if (!selectedUser || !selectedApp) {
      setRolesSummary(null);
      setGlobalRoleIds([]);
      setGlobalPermissionDeny([]);
      setLoadingRolesSummary(false);
      return;
    }
    setLoadingRolesSummary(true);
    try {
      const summary = await fetchUserRolesSummary(selectedUser.id, selectedApp.codigo);
      setRolesSummary(summary);
      setGlobalRoleIds(summary.globalRoleIds);
      setGlobalPermissionDeny(summary.globalPermissionDeny ?? []);
    } catch {
      setRolesSummary(null);
    } finally {
      setLoadingRolesSummary(false);
    }
  }, [selectedUser, selectedApp]);

  useEffect(() => {
    void loadRolesSummary();
  }, [loadRolesSummary]);

  useEffect(() => {
    if (excepcionRoleId && !globalRoleIds.includes(excepcionRoleId)) {
      setExcepcionRoleId(null);
    }
  }, [excepcionRoleId, globalRoleIds]);

  const filteredUsers = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return users;
    return users.filter(
      (u) =>
        `${u.nombre} ${u.apellido}`.toLowerCase().includes(t) ||
        (u.email ?? '').toLowerCase().includes(t),
    );
  }, [users, search]);

  const filteredCompanies = useMemo(() => {
    const list = companiesData ?? [];
    const t = companySearch.trim().toLowerCase();
    if (!t) return list;
    return list.filter(
      (c) =>
        (c.nombre ?? '').toLowerCase().includes(t) ||
        (c.prefijo ?? '').toLowerCase().includes(t),
    );
  }, [companiesData, companySearch]);

  const filteredRolesForApp = useMemo(() => {
    const t = roleSearch.trim().toLowerCase();
    if (!t) return rolesForSelectedApp;
    return rolesForSelectedApp.filter(
      (r) =>
        (r.nombre ?? '').toLowerCase().includes(t) ||
        (r.codigo ?? '').toLowerCase().includes(t),
    );
  }, [rolesForSelectedApp, roleSearch]);

  const filteredExceptionPermissions = useMemo(() => {
    const t = exceptionSearch.trim().toLowerCase();
    if (!t) return roleExcepcionPermissions;
    return roleExcepcionPermissions.filter(
      (p) =>
        (p.codigo ?? '').toLowerCase().includes(t) ||
        (p.nombre ?? '').toLowerCase().includes(t),
    );
  }, [roleExcepcionPermissions, exceptionSearch]);

  const appOptions = useMemo(
    () =>
      apps
        .filter((a) => userAppIds.includes(a.id))
        .map((a) => ({ value: a.id, label: `${a.nombre} (${a.codigo})` })),
    [apps, userAppIds],
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
      await loadRolesSummary();
      setDrawerNavTab('excepciones');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const saveUserApps = async () => {
    if (!selectedUser || appsToAssign.length === 0) return;
    try {
      setSavingApps(true);
      for (const idApp of appsToAssign) {
        await assignUserApp(selectedUser.id, idApp);
      }
      message.success('Aplicaciones asignadas correctamente.');
      setAppsToAssign([]);
      void loadUserApps();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al asignar aplicaciones');
    } finally {
      setSavingApps(false);
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
    setAppsToAssign([]);
    setDrawerOpen(true);
  };

  const appsAvailableToAssign = useMemo(
    () => apps.filter((a) => !userAppIds.includes(a.id)),
    [apps, userAppIds],
  );

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
            {canViewConfigRolesPerm && <Link to="/configuration/roles" style={{ ...tabBase, color: activeTab === 'roles' ? '#111827' : '#6b7280', fontWeight: activeTab === 'roles' ? 600 : 400, backgroundColor: activeTab === 'roles' ? '#f3f4f6' : 'transparent' }}>Roles</Link>}
            {canViewConfigUsersPerm && <Link to="/configuration/users" style={{ ...tabBase, color: activeTab === 'users' ? '#111827' : '#6b7280', fontWeight: activeTab === 'users' ? 600 : 400, backgroundColor: activeTab === 'users' ? '#f3f4f6' : 'transparent' }}>Usuarios</Link>}
            {canViewConfigPermissionsPerm && <Link to="/configuration/permissions" style={{ ...tabBase, color: activeTab === 'permissions' ? '#111827' : '#6b7280', fontWeight: activeTab === 'permissions' ? 600 : 400, backgroundColor: activeTab === 'permissions' ? '#f3f4f6' : 'transparent' }}>Permisos</Link>}
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
        title="Configuración de usuario"
        size={720}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setCompanySearch(''); setRoleSearch(''); setExceptionSearch(''); }}
        footer={null}
        styles={{ body: { padding: 20, background: '#f8fafc' } }}
      >
        {selectedUser && (
          <>
            <div className={styles.userCard}>
              <Avatar className={styles.userCardAvatar} size={48}>
                {getInitials(selectedUser.nombre, selectedUser.apellido)}
              </Avatar>
              <span className={styles.userCardName}>{`${selectedUser.nombre} ${selectedUser.apellido}`}</span>
            </div>

            <Card className={styles.sectionCard} bordered={false}>
              <div className={styles.sectionCardBody}>
                <p className={styles.sectionTitle}>Aplicación</p>
                <Tooltip title="KPITAL 360: planillas y RRHH. TimeWise: asistencia. Cada aplicación tiene su propio catálogo.">
                  <p className={styles.sectionDescription}>
                    Contexto para roles y permisos <InfoCircleOutlined style={{ marginLeft: 4 }} />
                  </p>
                </Tooltip>
                {loadingUserApps ? (
                  <Flex align="center" gap={8} style={{ padding: '12px 0' }}>
                    <Spin size="small" />
                    <Text type="secondary" style={{ fontSize: 12 }}>Cargando aplicaciones…</Text>
                  </Flex>
                ) : userAppIds.length === 0 ? (
                  <div>
                    <Alert
                      type="info"
                      showIcon
                      message="Sin aplicaciones asignadas"
                      description={canAssignAppsPerm
                        ? 'Este usuario no tiene acceso a ninguna aplicación. Seleccione las que desea asignar y guarde.'
                        : 'Sin permiso. Requiere: config:users:assign-apps'}
                      style={{ marginBottom: 12 }}
                    />
                    {canAssignAppsPerm && (
                      <>
                        <div className={styles.listBox}>
                          <Checkbox.Group
                            value={appsToAssign}
                            onChange={(v) => setAppsToAssign(v as number[])}
                            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                          >
                            {apps.map((a) => (
                              <Checkbox key={a.id} value={a.id}>
                                {a.nombre} <Text type="secondary">({a.codigo})</Text>
                              </Checkbox>
                            ))}
                          </Checkbox.Group>
                          {apps.length === 0 && <span className={styles.emptyHint}>No hay aplicaciones disponibles.</span>}
                        </div>
                        <Button type="primary" size="small" loading={savingApps} disabled={appsToAssign.length === 0} onClick={() => void saveUserApps()} className={styles.actionButton}>
                          Asignar aplicaciones
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    <Select
                      placeholder="Seleccione aplicación"
                      value={selectedApp?.id}
                      options={appOptions}
                      onChange={(val) => setSelectedApp(apps.find((a) => a.id === val) ?? null)}
                      style={{ width: '100%' }}
                      optionFilterProp="label"
                    />
                    {appsAvailableToAssign.length > 0 && (canAssignAppsPerm ? (
                      <div className={styles.addAppsBox}>
                        <p className={styles.addAppsBoxTitle}>Agregar más aplicaciones</p>
                        <Checkbox.Group
                          value={appsToAssign}
                          onChange={(v) => setAppsToAssign(v as number[])}
                          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                        >
                          {appsAvailableToAssign.map((a) => (
                            <Checkbox key={a.id} value={a.id}>
                              {a.nombre} <Text type="secondary">({a.codigo})</Text>
                            </Checkbox>
                          ))}
                        </Checkbox.Group>
                        <Button type="default" size="small" loading={savingApps} disabled={appsToAssign.length === 0} onClick={() => void saveUserApps()} style={{ marginTop: 10 }}>
                          Asignar seleccionadas
                        </Button>
                      </div>
                    ) : (
                      <NoPermissionMessage message="Sin permiso para agregar aplicaciones." required="config:users:assign-apps" variant="danger" />
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <div className={styles.tabsWrapper}>
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
                    <div>
                      {!canAssignCompaniesPerm && (
                        <NoPermissionMessage message="Sin permiso para asignar empresas." required="config:users:assign-companies" variant="danger" />
                      )}
                      <p className={styles.sectionDescription}>
                        Solo las empresas marcadas. Si está desmarcada, el usuario no ve nada de ella.
                      </p>
                      <Input
                        placeholder="Buscar por nombre o prefijo de empresa"
                        allowClear
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className={styles.searchInput}
                      />
                      <div className={styles.listBox}>
                        <Checkbox.Group
                          value={userCompanyIds}
                          onChange={(v) => canAssignCompaniesPerm && setUserCompanyIds(v as number[])}
                          disabled={!canAssignCompaniesPerm}
                          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                        >
                          {filteredCompanies.map((c) => (
                            <Checkbox key={c.id} value={c.id}>
                              {c.nombre}
                              {c.prefijo && <Text type="secondary" style={{ marginLeft: 6 }}>({c.prefijo})</Text>}
                            </Checkbox>
                          ))}
                        </Checkbox.Group>
                        {(!companiesData || companiesData.length === 0) && <span className={styles.emptyHint}>No hay empresas.</span>}
                        {companiesData && companiesData.length > 0 && filteredCompanies.length === 0 && (
                          <span className={styles.emptyHint}>Ninguna empresa coincide con la búsqueda.</span>
                        )}
                      </div>
                      <Button type="primary" size="small" loading={saving} disabled={!canAssignCompaniesPerm} onClick={() => void saveUserCompanies()} className={styles.actionButton}>
                        Guardar empresas
                      </Button>
                    </div>
                  ),
                },
                {
                  key: 'roles',
                  label: <span style={{ fontWeight: 500 }}>Roles</span>,
                  children: selectedApp ? (
                    <div>
                      {!canAssignRolesPerm && (
                        <NoPermissionMessage message="Sin permiso para asignar roles." required="config:users:assign-roles" variant="danger" />
                      )}
                      {userCompanyIds.length === 0 && (
                        <Alert
                          type="warning"
                          showIcon
                          message="Sin empresas asignadas los roles no tienen efecto"
                          description="Los roles globales solo aplican si el usuario tiene al menos una empresa asignada en la pestaña Empresas. Guarde las empresas primero."
                          style={{ marginBottom: 16 }}
                        />
                      )}
                      <p className={styles.sectionTitle}>Roles globales</p>
                      <p className={styles.sectionDescription}>
                        Se aplican automáticamente en todas las empresas del usuario.
                      </p>
                      {loadingRolesForApp ? (
                        <div style={{ maxHeight: 200, padding: 16 }}>
                          <Skeleton active paragraph={{ rows: 6 }} />
                        </div>
                      ) : (
                        <>
                          <Input
                            placeholder="Buscar por nombre o código de rol"
                            allowClear
                            value={roleSearch}
                            onChange={(e) => setRoleSearch(e.target.value)}
                            className={styles.searchInput}
                          />
                          <div className={styles.listBox}>
                            <Checkbox.Group
                              value={globalRoleIds}
                              onChange={(v) => canAssignRolesPerm && setGlobalRoleIds(v as number[])}
                              disabled={!canAssignRolesPerm}
                              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                            >
                              {filteredRolesForApp.map((r) => (
                                <Checkbox key={r.id} value={r.id}>
                                  {r.nombre} <Text type="secondary">({r.codigo})</Text>
                                </Checkbox>
                              ))}
                            </Checkbox.Group>
                            {rolesForSelectedApp.length > 0 && filteredRolesForApp.length === 0 && (
                              <span className={styles.emptyHint}>Ningún rol coincide con la búsqueda.</span>
                            )}
                          </div>
                          <Button type="primary" size="small" loading={saving} disabled={!canAssignRolesPerm} onClick={() => void saveGlobalRoles()} className={styles.actionButton}>
                            Guardar roles globales
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Text type="secondary">Seleccione una aplicación para configurar roles.</Text>
                    </div>
                  ),
                },
                {
                  key: 'excepciones',
                  label: <span style={{ fontWeight: 500 }}>Excepciones</span>,
                  children: selectedApp ? (
                    <div style={{ paddingTop: 16 }}>
                      {!canDenyPermissionsPerm && (
                        <NoPermissionMessage message="Sin permiso para denegar permisos." required="config:users:deny-permissions" variant="danger" />
                      )}
                      {userCompanyIds.length === 0 && (
                        <Alert
                          type="warning"
                          showIcon
                          message="Sin empresas asignadas las excepciones no tienen efecto"
                          description="Asigne al menos una empresa en la pestaña Empresas para que los roles y permisos apliquen al refrescar el perfil."
                          style={{ marginBottom: 16 }}
                        />
                      )}
                      <div className={styles.exceptionBanner}>
                        <Text strong style={{ color: '#991b1b', fontSize: 12 }}>Denegar permisos globalmente.</Text>
                        {' '}
                        Los permisos marcados NO se aplicarán en ninguna empresa. Seleccione un rol para ver sus permisos y revocar los que no debe tener el usuario.
                      </div>
                      {loadingRolesSummary ? (
                        <div style={{ padding: '8px 0' }}>
                          <Skeleton active paragraph={{ rows: 4 }} />
                        </div>
                      ) : (
                        <>
                      <div style={{ marginBottom: 12 }}>
                        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Rol</Text>
                        <Select
                          placeholder="Seleccione rol"
                          value={excepcionRoleId}
                          onChange={setExcepcionRoleId}
                          disabled={!canDenyPermissionsPerm}
                          options={rolesForSelectedApp
                            .filter((r) => globalRoleIds.includes(r.id))
                            .map((r) => ({ label: `${r.nombre} (${r.codigo})`, value: r.id }))}
                          style={{ width: '100%' }}
                          allowClear
                        />
                      </div>
                      {excepcionRoleId && (
                        <div>
                          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                            Permisos del rol a denegar
                          </Text>
                          <p className={styles.sectionDescription}>
                            Marque los que el usuario NO debe tener en ninguna empresa.
                          </p>
                          <Input
                            placeholder="Buscar por código o nombre de permiso"
                            allowClear
                            value={exceptionSearch}
                            onChange={(e) => setExceptionSearch(e.target.value)}
                            className={styles.searchInput}
                          />
                          <div className={styles.exceptionListBox}>
                            <Checkbox.Group
                              value={globalPermissionDeny}
                              onChange={(v) => canDenyPermissionsPerm && setGlobalPermissionDeny(v as string[])}
                              disabled={!canDenyPermissionsPerm}
                              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                            >
                              {roleExcepcionPermissions.length === 0
                                ? <span className={styles.emptyHint}>Cargando permisos del rol…</span>
                                : filteredExceptionPermissions.map((p) => (
                                    <Checkbox key={p.id} value={p.codigo}>
                                      <Text code style={{ fontSize: 12 }}>{p.codigo}</Text>
                                      <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>— {p.nombre}</Text>
                                    </Checkbox>
                                  ))}
                              {roleExcepcionPermissions.length > 0 && filteredExceptionPermissions.length === 0 && (
                                <span className={styles.emptyHint}>Ningún permiso coincide con la búsqueda.</span>
                              )}
                            </Checkbox.Group>
                          </div>
                          <Button type="default" size="small" loading={saving} disabled={!canDenyPermissionsPerm} onClick={() => void saveGlobalPermissionDenials()} className={styles.actionButton} style={{ marginTop: 8 }}>
                            Guardar denegaciones globales
                          </Button>
                        </div>
                      )}
                        </>
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
            </div>
          </>
        )}
      </Drawer>

    </div>
  );
}
