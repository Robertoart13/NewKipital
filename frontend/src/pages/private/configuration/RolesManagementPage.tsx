import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  App as AntdApp,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Form,
  Input,
  Modal,
  Radio,
  Space,
  Table,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  EllipsisOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  createRole,
  fetchPermissionsForRoles,
  fetchRolePermissions,
  fetchRoles,
  replaceRolePermissions,
  type SystemPermission,
  type SystemRole,
} from '../../../api/securityConfig';
import { canViewConfigRoles, canViewConfigUsers, canViewConfigPermissions } from '../../../store/selectors/permissions.selectors';
import { useAppSelector } from '../../../store/hooks';
import styles from './UsersManagementPage.module.css';

const { Text } = Typography;

/** Módulos de KPITAL 360 (ERP planillas, RRHH). Son permisos distintos a TimeWise. */
const KPITAL_MODULES = ['payroll', 'employee', 'personal-action', 'company', 'report', 'config'];

/** Módulos de TimeWise (asistencia, tiempo). Son permisos distintos a KPITAL. */
const TIMEWISE_MODULES = ['timewise'];

type AppContext = 'kpital' | 'timewise';

interface RoleFormValues {
  codigo: string;
  nombre: string;
  descripcion?: string;
  appCode: AppContext;
}

type MatrixRow = {
  key: string;
  type: 'app' | 'module' | 'permission';
  moduleName?: string;
  app?: 'kpital' | 'timewise';
  label: string;
  codigo?: string;
  descripcion?: string | null;
  children?: MatrixRow[];
};

export function RolesManagementPage() {
  const { message } = AntdApp.useApp();
  const location = useLocation();
  const canViewConfigRolesPerm = useAppSelector(canViewConfigRoles);
  const canViewConfigUsersPerm = useAppSelector(canViewConfigUsers);
  const canViewConfigPermissionsPerm = useAppSelector(canViewConfigPermissions);
  const [roleForm] = Form.useForm<RoleFormValues>();
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [permissions, setPermissions] = useState<SystemPermission[]>([]);
  const [rolePermissionMap, setRolePermissionMap] = useState<Record<number, Set<string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openRoleModal, setOpenRoleModal] = useState(false);
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState(false);
  const [selectedApp, setSelectedApp] = useState<AppContext>('kpital');

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, permissionsData] = await Promise.all([
        fetchRoles(false, selectedApp),
        fetchPermissionsForRoles({ includeInactive: false }),
      ]);

      const activeRoles = rolesData.filter((role) => role.estado === 1);
      const activePermissions = permissionsData.filter((permission) => permission.estado === 1);

      const rolePermissions = await Promise.all(
        activeRoles.map(async (role) => {
          const assigned = await fetchRolePermissions(role.id);
          return [role.id, new Set(assigned.map((p) => p.codigo))] as const;
        }),
      );

      setRoles(activeRoles);
      setPermissions(activePermissions);
      setRolePermissionMap(Object.fromEntries(rolePermissions));
      setDirty(false);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar matriz de roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [selectedApp]);


  const modulesWithPermissions = useMemo(() => {
    const grouped = new Map<string, SystemPermission[]>();
    for (const permission of permissions) {
      const group = grouped.get(permission.modulo) ?? [];
      group.push(permission);
      grouped.set(permission.modulo, group);
    }
    return Array.from(grouped.entries()).map(([moduleName, perms]) => ({
      moduleName,
      app: KPITAL_MODULES.includes(moduleName) ? 'kpital' as const : TIMEWISE_MODULES.includes(moduleName) ? 'timewise' as const : 'kpital' as const,
      permissions: perms.sort((a, b) => a.codigo.localeCompare(b.codigo)),
    }));
  }, [permissions]);

  const tableData = useMemo<MatrixRow[]>(() => {
    const term = search.trim().toLowerCase();
    const sectionModules = modulesWithPermissions.filter((g) => g.app === selectedApp);
    const appLabel = selectedApp === 'kpital' ? 'KPITAL 360' : 'TimeWise';

    const allFilteredPerms: { p: SystemPermission; moduleName: string }[] = [];
    for (const group of sectionModules) {
      const filtered = group.permissions.filter((p) => {
        if (!term) return true;
        return (
          p.codigo.toLowerCase().includes(term) ||
          p.nombre.toLowerCase().includes(term) ||
          (p.descripcion ?? '').toLowerCase().includes(term)
        );
      });
      for (const p of filtered) {
        allFilteredPerms.push({ p, moduleName: group.moduleName });
      }
    }
    if (allFilteredPerms.length === 0) return [];

    const permRows: MatrixRow[] = allFilteredPerms.map(({ p, moduleName }) => ({
      key: `perm:${p.codigo}`,
      type: 'permission' as const,
      moduleName,
      label: p.nombre,
      codigo: p.codigo,
      descripcion: p.descripcion,
    }));

    if (selectedApp === 'timewise' && sectionModules.length <= 1) {
      return [
        {
          key: `app:${selectedApp}`,
          type: 'app',
          app: selectedApp,
          label: appLabel,
          children: permRows,
        },
      ];
    }

    const moduleRows: MatrixRow[] = [];
    for (const group of sectionModules) {
      const filtered = group.permissions.filter((p) => {
        if (!term) return true;
        return (
          p.codigo.toLowerCase().includes(term) ||
          p.nombre.toLowerCase().includes(term) ||
          (p.descripcion ?? '').toLowerCase().includes(term)
        );
      });
      if (filtered.length === 0) continue;

      moduleRows.push({
        key: `module:${group.moduleName}`,
        type: 'module',
        moduleName: group.moduleName,
        app: selectedApp,
        label: group.moduleName,
        children: filtered.map((p) => ({
          key: `perm:${p.codigo}`,
          type: 'permission' as const,
          moduleName: group.moduleName,
          label: p.nombre,
          codigo: p.codigo,
          descripcion: p.descripcion,
        })),
      });
    }
    if (moduleRows.length === 0) return [];

    return [
      {
        key: `app:${selectedApp}`,
        type: 'app',
        app: selectedApp,
        label: appLabel,
        children: moduleRows,
      },
    ];
  }, [modulesWithPermissions, search, selectedApp]);

  const permissionCodesByModule = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const group of modulesWithPermissions) {
      map.set(group.moduleName, group.permissions.map((p) => p.codigo));
    }
    return map;
  }, [modulesWithPermissions]);

  const togglePermission = (roleId: number, permissionCode: string, checked: boolean) => {
    setRolePermissionMap((prev) => {
      const next = { ...prev };
      const set = new Set(next[roleId] ?? []);
      checked ? set.add(permissionCode) : set.delete(permissionCode);
      next[roleId] = set;
      return next;
    });
    setDirty(true);
  };

  const toggleModuleForRole = (roleId: number, moduleName: string, checked: boolean) => {
    const codes = permissionCodesByModule.get(moduleName) ?? [];
    setRolePermissionMap((prev) => {
      const next = { ...prev };
      const set = new Set(next[roleId] ?? []);
      for (const code of codes) {
        checked ? set.add(code) : set.delete(code);
      }
      next[roleId] = set;
      return next;
    });
    setDirty(true);
  };

  const saveMatrix = async () => {
    try {
      setSaving(true);
      await Promise.all(
        roles.map((role) =>
          replaceRolePermissions(role.id, Array.from(rolePermissionMap[role.id] ?? []).sort()),
        ),
      );
      message.success('Permisos guardados correctamente');
      setDirty(false);
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const submitRole = async () => {
    try {
      const values = await roleForm.validateFields();
      setSaving(true);
      await createRole({
        codigo: values.codigo.trim().toUpperCase(),
        nombre: values.nombre.trim(),
        descripcion: values.descripcion?.trim(),
        appCode: values.appCode ?? selectedApp,
      });
      message.success('Rol creado');
      setOpenRoleModal(false);
      roleForm.resetFields();
      await loadData();
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const openAddRoleModal = () => {
    roleForm.setFieldsValue({ appCode: selectedApp });
    setOpenRoleModal(true);
  };

  const roleMenuItems = (_role: SystemRole) => [
    { key: 'edit', label: 'Editar rol', disabled: true },
    { key: 'permissions', label: 'Ver permisos', disabled: true },
  ];

  const columns = useMemo<ColumnsType<MatrixRow>>(() => {
    const roleCols: ColumnsType<MatrixRow> = roles.map((role) => ({
      title: (
        <Tooltip title="Cada rol puede tener permisos distintos en KPITAL y en TimeWise. Marque las casillas para asignar.">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 10, letterSpacing: '0.5px', display: 'block', color: '#6b7a85' }}>
                ROL
              </Text>
              <Text strong style={{ fontSize: 13, color: '#3d4f5c' }}>{role.nombre}</Text>
            </div>
          <Dropdown menu={{ items: roleMenuItems(role) }} trigger={['click']}>
            <Button
              type="text"
              size="small"
              icon={<EllipsisOutlined style={{ fontSize: 14, color: '#6b7a85' }} />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
        </Tooltip>
      ),
      key: `role-${role.id}`,
      width: 140,
      align: 'center' as const,
      render: (_, row) => {
        if (row.type === 'app') return null;
        if (row.type === 'permission' && row.codigo) {
          const checked = rolePermissionMap[role.id]?.has(row.codigo) ?? false;
          return (
            <Checkbox
              checked={checked}
              onChange={(e) => togglePermission(role.id, row.codigo!, e.target.checked)}
            />
          );
        }
        if (row.type === 'module' && row.moduleName) {
          const codes = permissionCodesByModule.get(row.moduleName) ?? [];
          const checkedCount = codes.filter((c) => rolePermissionMap[role.id]?.has(c)).length;
          const fullyChecked = codes.length > 0 && checkedCount === codes.length;
          const indeterminate = checkedCount > 0 && checkedCount < codes.length;
          return (
            <Checkbox
              checked={fullyChecked}
              indeterminate={indeterminate}
              onChange={(e) => toggleModuleForRole(role.id, row.moduleName!, e.target.checked)}
            />
          );
        }
        return null;
      },
    }));

    return [
      {
        title: (
          <Tooltip title="KPITAL 360 y TimeWise son aplicaciones distintas. Los permisos de cada una se configuran por separado.">
            <span style={{ color: '#3d4f5c' }}>
              Permisos por aplicación
              <InfoCircleOutlined style={{ marginLeft: 6, color: '#6b7a85', fontSize: 12 }} />
            </span>
          </Tooltip>
        ),
        key: 'permission-name',
        dataIndex: 'label',
        width: 380,
        render: (_, row) => {
          if (row.type === 'app') {
            return (
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#3d4f5c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>{row.label}</span>
                <Tooltip
                  title={
                    row.app === 'timewise'
                      ? 'TimeWise: Control de asistencia y tiempo. Los permisos aplican solo en TimeWise.'
                      : 'KPITAL 360: ERP de planillas y RRHH. Los permisos aplican solo en KPITAL.'
                  }
                  trigger={['hover']}
                  styles={{ container: { whiteSpace: 'nowrap' } }}
                >
                  <span>
                    <InfoCircleOutlined style={{ fontSize: 12, cursor: 'help' }} />
                  </span>
                </Tooltip>
              </div>
            );
          }
          if (row.type === 'module') {
            const count = permissionCodesByModule.get(row.moduleName ?? '')?.length ?? 0;
            return (
              <Space size={8} style={{ paddingLeft: 12 }}>
                <Text strong style={{ fontSize: 13 }}>{row.label}</Text>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>{count}</Text>
              </Space>
            );
          }
            return (
              <Space size={8} style={{ paddingLeft: 24 }}>
              <Text style={{ fontSize: 13, color: '#3d4f5c' }}>{row.label}</Text>
              <Tooltip title={row.descripcion || row.codigo || 'Sin descripción'}>
                <InfoCircleOutlined style={{ color: '#6b7a85', fontSize: 13, cursor: 'help' }} />
              </Tooltip>
            </Space>
          );
        },
      },
      ...roleCols,
    ];
  }, [permissionCodesByModule, rolePermissionMap, roles]);

  const activeTab = location.pathname.includes('/users')
    ? 'users'
    : location.pathname.includes('/permissions')
      ? 'permissions'
      : 'roles';

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link to="/configuration" className={styles.pageBackLink}>
            <ArrowLeftOutlined style={{ fontSize: 18 }} />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Roles</h1>
            <p className={styles.pageSubtitle}>Permisos por aplicación</p>
          </div>
          <div className={styles.pageTabs}>
            {canViewConfigRolesPerm && (
              <Link to="/configuration/roles" className={`${styles.pageTab} ${activeTab === 'roles' ? styles.pageTabActive : ''}`}>Roles</Link>
            )}
            {canViewConfigUsersPerm && (
              <Link to="/configuration/users" className={`${styles.pageTab} ${activeTab === 'users' ? styles.pageTabActive : ''}`}>Usuarios</Link>
            )}
            {canViewConfigPermissionsPerm && (
              <Link to="/configuration/permissions" className={`${styles.pageTab} ${activeTab === 'permissions' ? styles.pageTabActive : ''}`}>Permisos</Link>
            )}
          </div>
        </div>
      </div>

      <Card className={styles.mainCard} style={{ marginBottom: 20 }}>
        <div className={styles.mainCardBody}>
          <div className={styles.gestionHeader}>
            <div className={styles.gestionHeaderLeft}>
              <div className={styles.gestionIconWrap}>
                <AppstoreOutlined className={styles.gestionIcon} />
              </div>
              <div>
                <h2 className={styles.gestionTitle}>Gestion de Roles</h2>
                <p className={styles.gestionDesc}>
                  Defina qué permisos tiene cada rol en KPITAL 360 y TimeWise para administrar el acceso al sistema.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className={styles.appSelector}>
        <span className={styles.appSelectorLabel}>Aplicación:</span>
        <div className={styles.appSelectorButtons}>
          <Button
            type={selectedApp === 'kpital' ? 'primary' : 'default'}
            onClick={() => setSelectedApp('kpital')}
          >
            KPITAL 360
          </Button>
          <Button
            type={selectedApp === 'timewise' ? 'primary' : 'default'}
            onClick={() => setSelectedApp('timewise')}
          >
            TimeWise
          </Button>
        </div>
        <p className={styles.appSelectorDesc}>
          {selectedApp === 'kpital'
            ? 'Planillas y RRHH. Solo roles y permisos de KPITAL.'
            : 'Asistencia y tiempo. Solo roles y permisos de TimeWise.'}
        </p>
      </div>

      <Card className={styles.mainCard} styles={{ body: { padding: 0 } }}>
        <div className={styles.mainCardBody}>
          <div className={styles.controlBar}>
            <div className={styles.searchBar}>
              <Input.Search
                allowClear
                placeholder="Escriba el nombre o código del permiso..."
                style={{ maxWidth: 380 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Space size={12}>
              <Button icon={<PlusOutlined />} onClick={openAddRoleModal} className={styles.btnSecondary}>
                Agregar rol
              </Button>
              <Button
                type={dirty ? 'primary' : 'default'}
                disabled={!dirty}
                onClick={() => void saveMatrix()}
                loading={saving}
                className={dirty ? styles.btnPrimary : styles.btnSecondary}
              >
                Guardar cambios
              </Button>
            </Space>
          </div>

        <Table<MatrixRow>
          className={styles.configTable}
          rowKey="key"
          loading={loading}
          columns={columns}
          dataSource={tableData}
          pagination={false}
          locale={{
            emptyText:
              selectedApp === 'kpital'
                ? 'No hay permisos de KPITAL configurados.'
                : 'No hay permisos de TimeWise configurados.',
          }}
          expandable={{
            defaultExpandAllRows: true,
            childrenColumnName: 'children',
            expandIcon: ({ expanded, onExpand, record }) =>
              (record.type === 'app' || record.type === 'module') ? (
                <span
                  onClick={(e) => onExpand(record, e)}
                  style={{ marginRight: 8, cursor: 'pointer', color: '#6b7a85' }}
                >
                  {expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                </span>
              ) : (
                <span style={{ width: 22, display: 'inline-block' }} />
              ),
          }}
          size="middle"
          scroll={{ x: 'max-content', y: 520 }}
          onRow={(record) => ({
            style:
              record.type === 'app'
                ? { backgroundColor: '#f2f4f6', fontWeight: 600 }
                : record.type === 'module'
                  ? { backgroundColor: '#f8f9fa' }
                  : { backgroundColor: '#fff' },
          })}
          style={{ fontSize: 13 }}
        />
        </div>
      </Card>

      <Modal
        open={openRoleModal}
        title="Crear nuevo rol"
        okText="Crear"
        cancelText="Cancelar"
        onCancel={() => setOpenRoleModal(false)}
        onOk={() => void submitRole()}
        confirmLoading={saving}
      >
        <Form form={roleForm} layout="vertical" initialValues={{ appCode: selectedApp }}>
          <Form.Item
            label="Aplicación"
            name="appCode"
            rules={[{ required: true, message: 'Seleccione la aplicación del rol' }]}
          >
            <Radio.Group>
              <Radio value="kpital">KPITAL 360 — Planillas y RRHH</Radio>
              <Radio value="timewise">TimeWise — Asistencia y tiempo</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            label="Código"
            name="codigo"
            rules={[{ required: true, message: 'Requerido' }]}
          >
            <Input placeholder="Ej: GERENTE_RRHH o SUPERVISOR_AREA" />
          </Form.Item>
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[{ required: true, message: 'Requerido' }]}
          >
            <Input placeholder="Ej: Gerente de RRHH" />
          </Form.Item>
          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={2} placeholder="Descripción opcional" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
