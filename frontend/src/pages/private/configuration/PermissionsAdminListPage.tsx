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

  const columns: ColumnsType<SystemPermission> = [
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
      render: (value: string) => <Tag style={{ background: '#f3f4f6', color: '#374151', border: 'none' }}>{value}</Tag>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (value: number) => (value === 1 ? <Tag style={{ background: '#f3f4f6', color: '#374151', border: 'none' }}>Activo</Tag> : <Tag style={{ background: '#f3f4f6', color: '#6b7280', border: 'none' }}>Inactivo</Tag>),
    },
    {
      title: 'Auditoria',
      key: 'auditoria',
      width: 230,
      render: (_, item) => (
        <Space orientation="vertical" size={0}>
          <Text type="secondary">Creado: {item.fechaCreacion ? new Date(item.fechaCreacion).toLocaleString() : '-'}</Text>
          <Text type="secondary">Actualizado: {item.fechaModificacion ? new Date(item.fechaModificacion).toLocaleString() : '-'}</Text>
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
    {
      title: 'Acciones',
      key: 'actions',
      width: 180,
      render: (_, item) => (
        <Space>
          <Button disabled={!isEditable} size="small" onClick={() => onOpenEdit(item)}>Editar</Button>
          <Popconfirm
            title={item.estado === 1 ? 'Inactivar permiso' : 'Reactivar permiso'}
            description={`Código: ${item.codigo}`}
            onConfirm={() => onToggleState(item)}
            okButtonProps={{ loading: saving }}
            disabled={!isEditable}
          >
            <Button disabled={!isEditable} size="small" danger={item.estado === 1}>
              {item.estado === 1 ? 'Inactivar' : 'Reactivar'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const location = useLocation();
  const activeTab = location.pathname.includes('/users') ? 'users' : location.pathname.includes('/permissions') ? 'permissions' : 'roles';
  const tabBase = { padding: '8px 16px', borderRadius: 6, textDecoration: 'none', fontSize: 14 };

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/configuration" style={{ color: '#6b7280', display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined style={{ fontSize: 18 }} />
          </Link>
          <div>
            <Text strong style={{ fontSize: 18, color: '#111827', display: 'block' }}>Permisos</Text>
            <Text type="secondary" style={{ fontSize: 12, color: '#6b7280' }}>Catálogo `module:action`</Text>
          </div>
          <div style={{ display: 'flex', marginLeft: 24, gap: 2 }}>
            {canViewConfigRolesPerm && <Link to="/configuration/roles" style={{ ...tabBase, color: activeTab === 'roles' ? '#111827' : '#6b7280', fontWeight: activeTab === 'roles' ? 600 : 400, backgroundColor: activeTab === 'roles' ? '#f3f4f6' : 'transparent' }}>Roles</Link>}
            {canViewConfigUsersPerm && <Link to="/configuration/users" style={{ ...tabBase, color: activeTab === 'users' ? '#111827' : '#6b7280', fontWeight: activeTab === 'users' ? 600 : 400, backgroundColor: activeTab === 'users' ? '#f3f4f6' : 'transparent' }}>Usuarios</Link>}
            {canViewConfigPermissionsPerm && <Link to="/configuration/permissions" style={{ ...tabBase, color: activeTab === 'permissions' ? '#111827' : '#6b7280', fontWeight: activeTab === 'permissions' ? 600 : 400, backgroundColor: activeTab === 'permissions' ? '#f3f4f6' : 'transparent' }}>Permisos</Link>}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, color: '#4b5563' }}>
        {isEditable ? 'Modo administración por interfaz.' : 'Modo controlado por migración. Catálogo solo lectura.'}
      </div>

      <Card styles={{ body: { padding: 24 } }} style={{ borderRadius: 6, border: '1px solid #e5e7eb' }}>
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="Buscar por código, módulo o descripción"
              style={{ width: 340 }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Space>
              <Text>Incluir inactivos</Text>
              <Switch checked={includeInactive} onChange={setIncludeInactive} />
            </Space>
            <Button disabled={!isEditable} onClick={onOpenCreate}>Crear permiso</Button>
          </Space>

          <Table<SystemPermission>
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredItems}
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        </Space>
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
