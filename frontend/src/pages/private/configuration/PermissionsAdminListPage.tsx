import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  createConfigPermission,
  fetchConfigPermissions,
  fetchPermissionsCatalogMode,
  inactivateConfigPermission,
  reactivateConfigPermission,
  updateConfigPermission,
  type PermissionCatalogMode,
  type SystemPermission,
} from '../../../api/securityConfig';
import { canViewConfigRoles, canViewConfigUsers, canViewConfigPermissions } from '../../../store/selectors/permissions.selectors';
import { useAppSelector } from '../../../store/hooks';
import { formatDateTime12h } from '../../../lib/formatDate';
import styles from './UsersManagementPage.module.css';

const { Text } = Typography;

const CODE_PATTERN = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;

interface PermissionFormValues {
  codigo: string;
  nombre: string;
  modulo: string;
  descripcion?: string;
}

export function PermissionsAdminListPage() {
  const { message } = AntdApp.useApp();
  const canViewConfigRolesPerm = useAppSelector(canViewConfigRoles);
  const canViewConfigUsersPerm = useAppSelector(canViewConfigUsers);
  const canViewConfigPermissionsPerm = useAppSelector(canViewConfigPermissions);
  const [form] = Form.useForm<PermissionFormValues>();
  const [items, setItems] = useState<SystemPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<PermissionCatalogMode>('migration');
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<SystemPermission | null>(null);

  const isEditable = mode === 'ui';

  const loadData = async () => {
    setLoading(true);
    try {
      const [catalogMode, permissions] = await Promise.all([
        fetchPermissionsCatalogMode(),
        fetchConfigPermissions({ includeInactive }),
      ]);
      setMode(catalogMode);
      setItems(permissions);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar permisos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [includeInactive]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) =>
      [item.codigo, item.nombre, item.modulo, item.descripcion ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [items, search]);

  const onOpenCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpenModal(true);
  };

  const onOpenEdit = (item: SystemPermission) => {
    setEditing(item);
    form.setFieldsValue({
      codigo: item.codigo,
      nombre: item.nombre,
      modulo: item.modulo,
      descripcion: item.descripcion ?? undefined,
    });
    setOpenModal(true);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        codigo: values.codigo.trim().toLowerCase(),
        modulo: values.modulo.trim().toLowerCase(),
        descripcion: values.descripcion?.trim() || undefined,
      };

      if (editing) {
        await updateConfigPermission(editing.id, payload);
        message.success('Permiso actualizado');
      } else {
        await createConfigPermission(payload);
        message.success('Permiso creado');
      }

      setOpenModal(false);
      await loadData();
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const onToggleState = async (item: SystemPermission) => {
    try {
      setSaving(true);
      if (item.estado === 1) {
        await inactivateConfigPermission(item.id);
        message.success('Permiso inactivado');
      } else {
        await reactivateConfigPermission(item.id);
        message.success('Permiso reactivado');
      }
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cambiar estado');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<SystemPermission> = useMemo(() => {
    const base: ColumnsType<SystemPermission> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 230,
      render: (value: string) => <Text code>{value}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 220,
    },
    {
      title: 'Módulo',
      dataIndex: 'modulo',
      key: 'modulo',
      width: 140,
      render: (value: string) => <Tag className={styles.tagInactivo}>{value}</Tag>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (value: number) =>
        value === 1 ? <Tag className={styles.tagActivo}>Activo</Tag> : <Tag className={styles.tagInactivo}>Inactivo</Tag>,
    },
    {
      title: 'Auditoria',
      key: 'auditoria',
      width: 230,
      render: (_, item) => (
        <Space orientation="vertical" size={0}>
          <Text type="secondary">Creado: {formatDateTime12h(item.fechaCreacion)}</Text>
          <Text type="secondary">Actualizado: {formatDateTime12h(item.fechaModificacion)}</Text>
          <Text type="secondary">Usuario: {item.modificadoPor ?? item.creadoPor ?? '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      ellipsis: true,
      render: (value: string | null) => value || 'Sin descripción',
    },
    ];
    if (isEditable) {
      base.push({
        title: 'Acciones',
        key: 'actions',
        width: 180,
        render: (_: unknown, item: SystemPermission) => (
          <Space>
            <Button size="small" className={styles.btnSecondary} onClick={() => onOpenEdit(item)}>Editar</Button>
            <Popconfirm
              title={item.estado === 1 ? 'Inactivar permiso' : 'Reactivar permiso'}
              description={`Código: ${item.codigo}`}
              onConfirm={() => onToggleState(item)}
              okButtonProps={{ loading: saving }}
            >
              <Button size="small" className={styles.btnSecondary}>
                {item.estado === 1 ? 'Inactivar' : 'Reactivar'}
              </Button>
            </Popconfirm>
          </Space>
        ),
      });
    }
    return base;
  }, [isEditable, saving]);

  const location = useLocation();
  const activeTab = location.pathname.includes('/users') ? 'users' : location.pathname.includes('/permissions') ? 'permissions' : 'roles';

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link to="/configuration" className={styles.pageBackLink}>
            <ArrowLeftOutlined style={{ fontSize: 18 }} />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Permisos</h1>
            <p className={styles.pageSubtitle}>Catálogo módulo:acción</p>
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

      <div className={styles.infoBanner}>
        {isEditable ? 'Modo administración por interfaz.' : 'Modo controlado por migración. Catálogo solo lectura.'}
      </div>

      <Card className={styles.mainCard} styles={{ body: { padding: 0 } }}>
        <div className={styles.mainCardBody}>
          <div className={styles.controlBar}>
            <div className={styles.searchBar}>
              <Input.Search
                allowClear
                placeholder="Buscar por código, módulo o descripción"
                style={{ maxWidth: 340 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Space>
              <Text style={{ color: '#4a5a68', fontSize: 14 }}>Incluir inactivos</Text>
              <Switch checked={includeInactive} onChange={setIncludeInactive} />
            </Space>
            <Button disabled={!isEditable} onClick={onOpenCreate} className={styles.btnSecondary}>Crear permiso</Button>
          </div>

          <Table<SystemPermission>
            className={styles.configTable}
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredItems}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} permiso(s)` }}
          />
        </div>
      </Card>

      <Modal
        open={openModal}
        title={editing ? 'Editar permiso' : 'Crear permiso'}
        okText={editing ? 'Guardar cambios' : 'Crear'}
        cancelText="Cancelar"
        onCancel={() => setOpenModal(false)}
        onOk={() => void onSubmit()}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Código"
            name="codigo"
            rules={[
              { required: true, message: 'El código es requerido' },
              { pattern: CODE_PATTERN, message: 'Formato: modulo:accion (ej: employee:create)' },
            ]}
          >
            <Input placeholder="Ej: employee:create" />
          </Form.Item>

          <Form.Item label="Módulo" name="modulo" rules={[{ required: true, message: 'El módulo es requerido' }]}>
            <Input placeholder="Ej: employee" />
          </Form.Item>

          <Form.Item label="Nombre" name="nombre" rules={[{ required: true, message: 'El nombre es requerido' }]}>
            <Input placeholder="Ej: Crear empleado" />
          </Form.Item>

          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
