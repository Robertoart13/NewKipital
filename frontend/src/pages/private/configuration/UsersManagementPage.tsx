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
  Popconfirm,
  Select,
  Skeleton,
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
  MailOutlined,
  SettingOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  fetchRolePermissions,
  fetchApps,
  fetchCompaniesForUserConfig,
  fetchRolesForUsers,
  fetchUserApps,
  assignUserApp,
  fetchUserCompanies,
  fetchUserAuditTrail,
  fetchUserRolesSummary,
  fetchUsers,
  inactivateUser,
  reactivateUser,
  blockUser,
  replaceUserCompanies,
  replaceUserGlobalRoles,
  replaceUserGlobalPermissionDenials,
  type SystemApp,
  type SystemPermission,
  type SystemRole,
  type SystemUser,
  type UserAuditTrailItem,
  type UserRolesSummary,
} from '../../../api/securityConfig';
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
import { formatDateTime12h } from '../../../lib/formatDate';
import styles from './UsersManagementPage.module.css';

const { Text } = Typography;

/** Mapea modulo+accion técnicos a etiquetas legibles para la bitácora (inspirado en NetSuite). */
function getAuditActionLabel(modulo: string | undefined, accion: string | undefined): string {
  const m = (modulo ?? '').toLowerCase();
  const a = (accion ?? '').toLowerCase();
  const key = `${m}:${a}`;
  const map: Record<string, string> = {
    'user_assignments:assign_app': 'Asignación de aplicación',
    'user_assignments:revoke_app': 'Revocación de aplicación',
    'user_assignments:assign_company': 'Asignación de empresa',
    'user_assignments:revoke_company': 'Revocación de empresa',
    'user_assignments:replace_companies': 'Cambio de empresas',
    'user_assignments:replace_context_roles': 'Cambio de roles por empresa',
    'user_assignments:replace_global_roles': 'Cambio de roles globales',
    'user_assignments:replace_role_exclusions': 'Cambio de exclusiones de rol',
    'user_assignments:replace_global_permission_denials': 'Cambio de permisos denegados',
    'user_assignments:replace_permission_overrides': 'Cambio de excepciones de permisos',
    'users:create': 'Creación de usuario',
    'users:update': 'Actualización de usuario',
    'users:inactivate': 'Desactivación de usuario',
    'users:reactivate': 'Reactivación de usuario',
    'users:block': 'Bloqueo de usuario',
  };
  return map[key] || `${m || '—'} / ${a || '—'}`;
}

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
  const canAssignCompaniesPerm = useAppSelector(canAssignCompanies);
  const canAssignAppsPerm = useAppSelector(canAssignApps);
  const canAssignRolesPerm = useAppSelector(canAssignRoles);
  const canDenyPermissionsPerm = useAppSelector(canDenyPermissions);
  const canViewConfigRolesPerm = useAppSelector(canViewConfigRoles);
  const canViewConfigUsersPerm = useAppSelector(canViewConfigUsers);
  const canViewConfigPermissionsPerm = useAppSelector(canViewConfigPermissions);
  const authUserId = useAppSelector((state) => Number(state.auth.user?.id ?? 0));

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [apps, setApps] = useState<SystemApp[]>([]);
  const [companiesData, setCompaniesData] = useState<{ id: number; nombre: string; prefijo?: string | null }[]>([]);
  const [, setRoles] = useState<SystemRole[]>([]);
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
  const [auditTrail, setAuditTrail] = useState<UserAuditTrailItem[]>([]);
  const [loadingAuditTrail, setLoadingAuditTrail] = useState(false);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersDataResult, appsDataResult, rolesDataResult, companiesCatalogResult] = await Promise.allSettled([
        fetchUsers(false, true),
        fetchApps(),
        fetchRolesForUsers(false),
        fetchCompaniesForUserConfig(),
      ]);

      if (usersDataResult.status === 'fulfilled') {
        setUsers(usersDataResult.value.filter((u) => u.estado === 1));
      } else {
        setUsers([]);
        message.error(usersDataResult.reason instanceof Error ? usersDataResult.reason.message : 'Error al cargar usuarios');
      }

      if (appsDataResult.status === 'fulfilled') {
        setApps(appsDataResult.value.filter((a) => a.estado === 1));
      } else {
        setApps([]);
      }

      if (rolesDataResult.status === 'fulfilled') {
        setRoles(rolesDataResult.value.filter((r) => r.estado === 1));
      } else {
        setRoles([]);
      }

      if (companiesCatalogResult.status === 'fulfilled') {
        setCompaniesData(companiesCatalogResult.value ?? []);
      } else {
        setCompaniesData([]);
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [message]);

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

  const loadUserAuditTrail = useCallback(async () => {
    if (!selectedUser) {
      setAuditTrail([]);
      setLoadingAuditTrail(false);
      return;
    }
    setLoadingAuditTrail(true);
    try {
      const rows = await fetchUserAuditTrail(selectedUser.id, 200);
      setAuditTrail(rows ?? []);
    } catch {
      setAuditTrail([]);
    } finally {
      setLoadingAuditTrail(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (!drawerOpen || drawerNavTab !== 'bitacora') return;
    void loadUserAuditTrail();
  }, [drawerOpen, drawerNavTab, loadUserAuditTrail]);

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

  const applyUserStateChange = async (userId: number, action: 'inactivate' | 'reactivate' | 'block') => {
    try {
      setSaving(true);
      if (action === 'inactivate') {
        await inactivateUser(userId);
        message.success('Usuario inactivado. Ya no podrá iniciar sesión.');
      } else if (action === 'reactivate') {
        await reactivateUser(userId);
        message.success('Usuario reactivado.');
      } else {
        await blockUser(userId);
        message.success('Usuario bloqueado.');
      }
      await loadBaseData();
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, estado: action === 'reactivate' ? 1 : 0 } : prev));
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Error al actualizar estado de usuario');
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
    setAuditTrail([]);
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

  const columns: ColumnsType<SystemUser> = [
    {
      title: 'Usuario',
      key: 'usuario',
      render: (_, user) => (
        <div className={styles.userCell}>
          <Avatar className={styles.userCellAvatar} icon={<UserOutlined />}>
            {getInitials(user.nombre, user.apellido)}
          </Avatar>
          <div>
            <div className={styles.userCellName}>{`${user.nombre} ${user.apellido}`}</div>
            {user.email && <div className={styles.userCellEmail}>{user.email}</div>}
          </div>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (v: number) =>
        v === 1 ? <Tag className={styles.tagActivo}>Activo</Tag> : <Tag className={styles.tagInactivo}>Inactivo</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, user) => (
        <Button
          type="link"
          size="small"
          className={styles.linkConfigurar}
          icon={<SettingOutlined />}
          onClick={(e) => { e.stopPropagation(); openConfigDrawer(user); }}
        >
          Configurar
        </Button>
      ),
    },
  ];

  const auditColumns: ColumnsType<UserAuditTrailItem> = useMemo(
    () => [
      {
        title: 'Fecha y hora',
        dataIndex: 'fechaCreacion',
        key: 'fechaCreacion',
        width: 150,
        render: (value: string | null) => formatDateTime12h(value),
      },
      {
        title: 'Quien lo hizo',
        key: 'actor',
        width: 190,
        render: (_, row) => {
          const actorLabel = row.actorNombre?.trim() || row.actorEmail?.trim() || (row.actorUserId ? `Usuario ID ${row.actorUserId}` : 'Sistema');
          return (
            <div>
              <div style={{ fontWeight: 600, color: '#3d4f5c' }}>{actorLabel}</div>
              {row.actorEmail && <div style={{ color: '#8c8c8c', fontSize: 12 }}>{row.actorEmail}</div>}
            </div>
          );
        },
      },
      {
        title: 'Tipo de acción',
        key: 'accion',
        width: 200,
        render: (_, row) => (
          <span style={{ fontWeight: 500, color: '#3d4f5c' }}>
            {getAuditActionLabel(row.modulo ?? undefined, row.accion ?? undefined)}
          </span>
        ),
      },
      {
        title: 'Detalle del cambio',
        dataIndex: 'descripcion',
        key: 'descripcion',
        render: (value: string) => (
          <Tooltip title={value}>
            <div className={styles.auditDetailCell}>{value}</div>
          </Tooltip>
        ),
      },
    ],
    [],
  );

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link to="/configuration" className={styles.pageBackLink}>
            <ArrowLeftOutlined style={{ fontSize: 18 }} />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Usuarios</h1>
            <p className={styles.pageSubtitle}>Miembros ({filteredUsers.length})</p>
          </div>
          <div className={styles.pageTabs}>
            {canViewConfigRolesPerm && (
              <Link
                to="/configuration/roles"
                className={`${styles.pageTab} ${activeTab === 'roles' ? styles.pageTabActive : ''}`}
              >
                Roles
              </Link>
            )}
            {canViewConfigUsersPerm && (
              <Link
                to="/configuration/users"
                className={`${styles.pageTab} ${activeTab === 'users' ? styles.pageTabActive : ''}`}
              >
                Usuarios
              </Link>
            )}
            {canViewConfigPermissionsPerm && (
              <Link
                to="/configuration/permissions"
                className={`${styles.pageTab} ${activeTab === 'permissions' ? styles.pageTabActive : ''}`}
              >
                Permisos
              </Link>
            )}
          </div>
        </div>
      </div>

      <Card className={styles.mainCard} styles={{ body: { padding: 0 } }}>
        <div className={styles.mainCardBody}>
          <div className={styles.searchBar}>
            <Input.Search
              allowClear
              placeholder="Buscar por nombre o email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Table<SystemUser>
            className={styles.usersTable}
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredUsers}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (t) => `${t} usuario(s)`,
            }}
            size="middle"
            onRow={(record) => ({ onClick: () => openConfigDrawer(record) })}
          />
        </div>
      </Card>

      <Drawer
        className={styles.drawer}
        title={
          <div className={styles.drawerTitleRow}>
            <span className={styles.drawerTitle}>Configuración de usuario</span>
            {selectedUser && <span className={styles.drawerBadge}>ID #{selectedUser.id}</span>}
          </div>
        }
        size={720}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setCompanySearch(''); setRoleSearch(''); setExceptionSearch(''); }}
        footer={null}
        styles={{ body: { padding: 20, background: '#f5f7f9' } }}
      >
        {selectedUser && (
          <>
            <div className={styles.userCard}>
              <Avatar className={styles.userCardAvatar} size={56}>
                {getInitials(selectedUser.nombre, selectedUser.apellido)}
              </Avatar>
              <div className={styles.userCardInfo}>
                <p className={styles.userCardName}>{`${selectedUser.nombre} ${selectedUser.apellido}`}</p>
                {selectedUser.email && (
                  <p className={styles.userCardEmail}>
                    <MailOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                    {selectedUser.email}
                  </p>
                )}
              </div>
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
                        <Button type="primary" size="small" loading={savingApps} disabled={appsToAssign.length === 0} onClick={() => void saveUserApps()} className={`${styles.actionButton} ${styles.btnPrimary}`}>
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
                        <Button type="default" size="small" loading={savingApps} disabled={appsToAssign.length === 0} onClick={() => void saveUserApps()} className={`${styles.actionButton} ${styles.btnSecondary}`} style={{ marginTop: 10 }}>
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
                  label: 'Empresas',
                  children: (
                    <div>
                      {!canAssignCompaniesPerm && (
                        <NoPermissionMessage message="Sin permiso para asignar empresas." required="config:users:assign-companies" variant="danger" />
                      )}
                      <p className={styles.sectionDescription}>
                        Solo las empresas marcadas. Si está desmarcada, el usuario no ve nada de ella.
                      </p>
                      <Alert
                        className={`${styles.infoBanner} ${styles.infoType}`}
                        type="info"
                        showIcon
                        message="Para qué sirve"
                        description="Define en cuáles empresas puede operar el usuario. Sin empresas asignadas, no tendrá contexto de trabajo."
                      />
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
                      <Button type="primary" size="small" loading={saving} disabled={!canAssignCompaniesPerm} onClick={() => void saveUserCompanies()} className={`${styles.actionButton} ${styles.btnPrimary}`}>
                        Guardar empresas
                      </Button>
                    </div>
                  ),
                },
                {
                  key: 'roles',
                  label: 'Roles',
                  children: selectedApp ? (
                    <div>
                      {!canAssignRolesPerm && (
                        <NoPermissionMessage message="Sin permiso para asignar roles." required="config:users:assign-roles" variant="danger" />
                      )}
                      {userCompanyIds.length === 0 && (
                        <Alert
                          className={`${styles.infoBanner} ${styles.warningType}`}
                          type="warning"
                          showIcon
                          message="Sin empresas asignadas los roles no tienen efecto"
                          description="Los roles globales solo aplican si el usuario tiene al menos una empresa asignada en la pestaña Empresas. Guarde las empresas primero."
                        />
                      )}
                      <p className={styles.sectionTitle}>Roles globales</p>
                      <p className={styles.sectionDescription}>
                        Se aplican automáticamente en todas las empresas del usuario.
                      </p>
                      <Alert
                        className={`${styles.infoBanner} ${styles.infoType}`}
                        type="info"
                        showIcon
                        message="Para qué sirve"
                        description="Asigna capacidades base del usuario para la aplicación seleccionada (KPITAL o TimeWise)."
                      />
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
                          <Button type="primary" size="small" loading={saving} disabled={!canAssignRolesPerm} onClick={() => void saveGlobalRoles()} className={`${styles.actionButton} ${styles.btnPrimary}`}>
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
                  label: 'Excepciones',
                  children: selectedApp ? (
                    <div style={{ paddingTop: 16 }}>
                      {!canDenyPermissionsPerm && (
                        <NoPermissionMessage message="Sin permiso para denegar permisos." required="config:users:deny-permissions" variant="danger" />
                      )}
                      {userCompanyIds.length === 0 && (
                        <Alert
                          className={`${styles.infoBanner} ${styles.warningType}`}
                          type="warning"
                          showIcon
                          message="Sin empresas asignadas las excepciones no tienen efecto"
                          description="Asigne al menos una empresa en la pestaña Empresas para que los roles y permisos apliquen al refrescar el perfil."
                        />
                      )}
                      <Alert
                        className={`${styles.infoBanner} ${styles.warningType}`}
                        type="warning"
                        showIcon
                        message="Denegar permisos globalmente"
                        description="Los permisos marcados NO se aplicarán en ninguna empresa. Seleccione un rol para ver sus permisos y revocar los que no debe tener el usuario."
                      />
                      <Alert
                        className={`${styles.infoBanner} ${styles.infoType}`}
                        type="info"
                        showIcon
                        message="Para qué sirve"
                        description="Restringe permisos específicos aunque el rol los otorgue. Úselo para excepciones puntuales de seguridad."
                      />
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
                          <Button type="default" size="small" loading={saving} disabled={!canDenyPermissionsPerm} onClick={() => void saveGlobalPermissionDenials()} className={`${styles.actionButton} ${styles.btnSecondary}`} style={{ marginTop: 8 }}>
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
                {
                  key: 'acciones',
                  label: 'Acciones',
                  children: (
                    <div style={{ paddingTop: 16 }}>
                      <p className={styles.sectionTitle}>Acceso al sistema</p>
                      <p className={styles.sectionDescription}>
                        Controles de estado del usuario para habilitar o restringir su acceso a la plataforma.
                      </p>
                      <Alert
                        className={`${styles.infoBanner} ${styles.infoType}`}
                        type="info"
                        showIcon
                        message="Inactivar vs Bloquear"
                        description="Inactivar retira acceso por estado inactivo. Bloquear corta acceso inmediato. Reactivar restablece acceso."
                      />
                      <Flex gap={8} wrap="wrap">
                        {selectedUser.estado === 1 ? (
                          <>
                            <Popconfirm
                              title="Inactivar usuario"
                              description="El usuario perderá acceso al sistema."
                              onConfirm={() => void applyUserStateChange(selectedUser.id, 'inactivate')}
                            >
                              <Button size="small" danger disabled={!canViewConfigUsersPerm || selectedUser.id === authUserId}>
                                Inactivar
                              </Button>
                            </Popconfirm>
                            <Popconfirm
                              title="Bloquear usuario"
                              description="Bloquea el acceso inmediatamente."
                              onConfirm={() => void applyUserStateChange(selectedUser.id, 'block')}
                            >
                              <Button size="small" disabled={!canViewConfigUsersPerm || selectedUser.id === authUserId}>
                                Bloquear
                              </Button>
                            </Popconfirm>
                          </>
                        ) : (
                          <Popconfirm
                            title="Reactivar usuario"
                            description="Restablece el acceso al sistema."
                            onConfirm={() => void applyUserStateChange(selectedUser.id, 'reactivate')}
                          >
                            <Button size="small" type="primary" disabled={!canViewConfigUsersPerm}>
                              Reactivar
                            </Button>
                          </Popconfirm>
                        )}
                      </Flex>
                    </div>
                  ),
                },
                {
                  key: 'bitacora',
                  label: 'Bitacora',
                  children: (
                    <div style={{ paddingTop: 16 }}>
                      <p className={styles.sectionTitle}>Historial de cambios</p>
                      <p className={styles.sectionDescription}>
                        Muestra quien hizo el cambio, cuando se hizo y el detalle registrado en bitacora.
                      </p>
                      <Alert
                        className={`${styles.infoBanner} ${styles.infoType}`}
                        type="info"
                        showIcon
                        message="Informacion de sistema"
                        description="Se listan las acciones aplicadas al usuario en orden de la mas reciente a la mas antigua."
                      />
                      <Table<UserAuditTrailItem>
                        className={`${styles.configTable} ${styles.auditTableCompact}`}
                        rowKey="id"
                        loading={loadingAuditTrail}
                        columns={auditColumns}
                        dataSource={auditTrail}
                        size="small"
                        pagination={{
                          pageSize: 8,
                          showSizeChanger: true,
                          showTotal: (total) => `${total} registro(s)`,
                        }}
                        locale={{ emptyText: 'No hay registros de bitacora para este usuario.' }}
                      />
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

