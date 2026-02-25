import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  App as AntdApp,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CloseOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {
  canCreateClass,
  canEditClass,
  canInactivateClass,
  canReactivateClass,
  canViewClasses,
} from '../../../store/selectors/permissions.selectors';
import { useAppSelector } from '../../../store/hooks';
import { formatDateTime12h } from '../../../lib/formatDate';
import { optionalNoSqlInjection, textRules } from '../../../lib/formValidation';
import {
  createClass,
  fetchClasses,
  inactivateClass,
  reactivateClass,
  updateClass,
  type ClassListItem,
  type ClassPayload,
} from '../../../api/classes';
import styles from './UsersManagementPage.module.css';

interface ClassFormValues {
  nombre: string;
  descripcion?: string;
  codigo: string;
  idExterno?: string;
}

type PaneKey = 'nombre' | 'codigo' | 'idExterno' | 'estado';

interface PaneConfig {
  key: PaneKey;
  title: string;
}

interface PaneOption {
  value: string;
  count: number;
}

const paneConfig: PaneConfig[] = [
  { key: 'nombre', title: 'Nombre Clase' },
  { key: 'codigo', title: 'Codigo Clase' },
  { key: 'idExterno', title: 'ID Externo Clase' },
  { key: 'estado', title: 'Estado Clase' },
];

function normalizePayload(values: ClassFormValues): ClassPayload {
  return {
    nombre: values.nombre.trim(),
    descripcion: values.descripcion?.trim() || undefined,
    codigo: values.codigo.trim(),
    idExterno: values.idExterno?.trim() || undefined,
  };
}

function getPaneValue(row: ClassListItem, key: PaneKey): string {
  if (key === 'nombre') return row.nombre ?? '';
  if (key === 'codigo') return row.codigo ?? '';
  if (key === 'idExterno') return row.idExterno ?? '';
  return row.esInactivo === 1 ? 'Inactivo' : 'Activo';
}

export function ClassesManagementPage() {
  const { message, modal } = AntdApp.useApp();
  const [form] = Form.useForm<ClassFormValues>();

  const canView = useAppSelector(canViewClasses);
  const canCreate = useAppSelector(canCreateClass);
  const canEdit = useAppSelector(canEditClass);
  const canInactivate = useAppSelector(canInactivateClass);
  const canReactivate = useAppSelector(canReactivateClass);

  const [rows, setRows] = useState<ClassListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<ClassListItem | null>(null);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [paneSearch, setPaneSearch] = useState<Record<PaneKey, string>>({
    nombre: '',
    codigo: '',
    idExterno: '',
    estado: '',
  });
  const [paneSelections, setPaneSelections] = useState<Record<PaneKey, string[]>>({
    nombre: [],
    codigo: [],
    idExterno: [],
    estado: [],
  });
  const [paneOpen, setPaneOpen] = useState<Record<PaneKey, boolean>>({
    nombre: false,
    codigo: false,
    idExterno: false,
    estado: false,
  });

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClasses(showInactive);
      setRows(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar clases');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [message, showInactive]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const matchesGlobalSearch = useCallback((row: ClassListItem) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      (row.nombre ?? '').toLowerCase().includes(term)
      || (row.codigo ?? '').toLowerCase().includes(term)
      || (row.idExterno ?? '').toLowerCase().includes(term)
      || (row.descripcion ?? '').toLowerCase().includes(term)
    );
  }, [search]);

  const dataFilteredByPaneSelections = useCallback((excludePane?: PaneKey) => {
    return rows.filter((row) => {
      if (!matchesGlobalSearch(row)) return false;
      for (const pane of paneConfig) {
        if (pane.key === excludePane) continue;
        const selected = paneSelections[pane.key];
        if (selected.length === 0) continue;
        const value = getPaneValue(row, pane.key);
        if (!selected.includes(value)) return false;
      }
      return true;
    });
  }, [matchesGlobalSearch, paneSelections, rows]);

  const paneOptions = useMemo(() => {
    const result: Record<PaneKey, PaneOption[]> = {
      nombre: [],
      codigo: [],
      idExterno: [],
      estado: [],
    };

    for (const pane of paneConfig) {
      const filteredData = dataFilteredByPaneSelections(pane.key);
      const counter = new Map<string, number>();
      for (const row of filteredData) {
        const value = getPaneValue(row, pane.key).trim();
        if (!value) continue;
        counter.set(value, (counter.get(value) ?? 0) + 1);
      }

      const paneTerm = paneSearch[pane.key].trim().toLowerCase();
      result[pane.key] = Array.from(counter.entries())
        .map(([value, count]) => ({ value, count }))
        .filter((item) => !paneTerm || item.value.toLowerCase().includes(paneTerm))
        .sort((a, b) => a.value.localeCompare(b.value));
    }

    return result;
  }, [dataFilteredByPaneSelections, paneSearch]);

  const filteredRows = useMemo(() => dataFilteredByPaneSelections(), [dataFilteredByPaneSelections]);

  const clearAllFilters = () => {
    setSearch('');
    setPaneSearch({ nombre: '', codigo: '', idExterno: '', estado: '' });
    setPaneSelections({ nombre: [], codigo: [], idExterno: [], estado: [] });
    setPaneOpen({ nombre: false, codigo: false, idExterno: false, estado: false });
  };

  const clearPaneSelection = (key: PaneKey) => {
    setPaneSelections((prev) => ({ ...prev, [key]: [] }));
    setPaneSearch((prev) => ({ ...prev, [key]: '' }));
  };

  const openAllPanes = () => {
    setPaneOpen({ nombre: true, codigo: true, idExterno: true, estado: true });
  };

  const collapseAllPanes = () => {
    setPaneOpen({ nombre: false, codigo: false, idExterno: false, estado: false });
  };

  const openCreateModal = () => {
    setEditing(null);
    form.resetFields();
    setOpenModal(true);
  };

  const openEditModal = (row: ClassListItem) => {
    if (!canEdit) return;
    setEditing(row);
    form.setFieldsValue({
      nombre: row.nombre ?? '',
      descripcion: row.descripcion ?? '',
      codigo: row.codigo ?? '',
      idExterno: row.idExterno ?? '',
    });
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    form.resetFields();
  };

  const submitClass = async () => {
    try {
      if (!editing && !canCreate) {
        message.error('No tiene permiso para crear clases.');
        return;
      }
      if (editing && !canEdit) {
        message.error('No tiene permiso para editar clases.');
        return;
      }

      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: editing ? 'Confirmar edicion de clase' : 'Confirmar creacion de clase',
          content: editing ? 'Se guardaran los cambios.' : 'Se creara la nueva clase.',
          icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
          okText: editing ? 'Guardar cambios' : 'Crear',
          cancelText: 'Cancelar',
          centered: true,
          width: 420,
          rootClassName: styles.companyConfirmModal,
          okButtonProps: { className: styles.companyConfirmOk },
          cancelButtonProps: { className: styles.companyConfirmCancel },
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirmed) return;

      const values = await form.validateFields();
      const payload = normalizePayload(values);
      setSaving(true);

      if (editing) {
        await updateClass(editing.id, payload);
        message.success('Clase actualizada correctamente');
      } else {
        await createClass(payload);
        message.success('Clase creada correctamente');
      }

      closeModal();
      await loadRows();
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInactivate = async (row: ClassListItem) => {
    if (!canInactivate) {
      message.error('No tiene permiso para inactivar clases.');
      return;
    }
    await inactivateClass(row.id);
    message.success(`Clase ${row.nombre} inactivada`);
    await loadRows();
  };

  const handleReactivate = async (row: ClassListItem) => {
    if (!canReactivate) {
      message.error('No tiene permiso para reactivar clases.');
      return;
    }
    await reactivateClass(row.id);
    message.success(`Clase ${row.nombre} reactivada`);
    await loadRows();
  };

  const columns: ColumnsType<ClassListItem> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (_, row) => (
        <Space>
          <AppstoreOutlined />
          <span>{row.nombre}</span>
        </Space>
      ),
    },
    {
      title: 'Codigo',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 160,
    },
    {
      title: 'ID Externo',
      dataIndex: 'idExterno',
      key: 'idExterno',
      width: 180,
      render: (value) => value || '-',
    },
    {
      title: 'Descripcion',
      dataIndex: 'descripcion',
      key: 'descripcion',
      render: (value) => value || '-',
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 120,
      render: (_, row) => (row.esInactivo === 1 ? <Tag color="default">Inactivo</Tag> : <Tag color="blue">Activo</Tag>),
    },
    {
      title: 'Ultima Modificacion',
      dataIndex: 'fechaModificacion',
      key: 'fechaModificacion',
      width: 220,
      render: (value) => formatDateTime12h(value),
    },
  ];

  if (!canView) {
    return (
      <div className={styles.permissionsPage}>
        <Spin />
      </div>
    );
  }

  return (
    <div className={styles.permissionsPage}>
      <div className={styles.permissionsHeader}>
        <Link to="/dashboard" className={styles.backButton}>
          <ArrowLeftOutlined />
          <span>Volver</span>
        </Link>
      </div>

      <Card className={styles.permissionsCard}>
        <div className={styles.permissionsCardBody}>
          <Flex justify="space-between" align="center" style={{ marginBottom: 16 }} wrap="wrap" gap={12}>
            <Flex align="center" gap={12}>
              <h3 className={styles.registrosTitle}>Registros de Clases</h3>
            </Flex>
            <Flex align="center" gap={8}>
              <Select
                value={pageSize}
                onChange={setPageSize}
                options={[10, 20, 50, 100].map((n) => ({ label: String(n), value: n }))}
                style={{ width: 70 }}
              />
              <span style={{ color: '#6b7a85', fontSize: 14 }}>entries per page</span>
              <span style={{ color: '#6b7a85', fontSize: 14 }}>Mostrar inactivas</span>
              <Switch checked={showInactive} onChange={setShowInactive} size="small" />
              <Button
                icon={<PlusOutlined />}
                className={`${styles.actionButton} ${styles.btnPrimary}`}
                onClick={openCreateModal}
                disabled={!canCreate}
              >
                Crear Clase
              </Button>
            </Flex>
          </Flex>

          <Collapse
            activeKey={filtersExpanded ? ['filtros'] : []}
            onChange={(keys) => setFiltersExpanded(keys.includes('filtros'))}
            className={styles.filtersCollapse}
          >
            <Collapse.Panel header="Filtros" key="filtros">
              <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
                <Input
                  placeholder="Search"
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  allowClear
                  className={styles.searchInput}
                  style={{ maxWidth: 240 }}
                />
                <Flex gap={8}>
                  <Button size="small" onClick={collapseAllPanes}>Collapse All</Button>
                  <Button size="small" onClick={openAllPanes}>Show All</Button>
                  <Button size="small" onClick={clearAllFilters}>Limpiar Todo</Button>
                </Flex>
              </Flex>
              <Row gutter={[12, 12]}>
                {paneConfig.map((pane) => (
                  <Col xs={24} md={12} xl={8} key={pane.key}>
                    <div className={styles.paneCard}>
                      <Flex gap={6} align="center" wrap="wrap">
                        <Input
                          value={paneSearch[pane.key]}
                          onChange={(e) => setPaneSearch((prev) => ({ ...prev, [pane.key]: e.target.value }))}
                          placeholder={pane.title}
                          prefix={<SearchOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />}
                          suffix={(
                            <Flex gap={2}>
                              <SortAscendingOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                              <SortDescendingOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                            </Flex>
                          )}
                          size="middle"
                          className={styles.filterInput}
                          style={{ flex: 1, minWidth: 120 }}
                        />
                        <Button
                          size="middle"
                          icon={<SearchOutlined />}
                          onClick={() => setPaneOpen((prev) => ({ ...prev, [pane.key]: true }))}
                          title="Abrir opciones"
                        />
                        <Button size="middle" onClick={() => clearPaneSelection(pane.key)} title="Limpiar">
                          x
                        </Button>
                        <Button
                          size="middle"
                          icon={paneOpen[pane.key] ? <UpOutlined /> : <DownOutlined />}
                          onClick={() => setPaneOpen((prev) => ({ ...prev, [pane.key]: !prev[pane.key] }))}
                          title={paneOpen[pane.key] ? 'Colapsar' : 'Expandir'}
                        />
                      </Flex>
                      {paneOpen[pane.key] && (
                        <div className={styles.paneOptionsBox}>
                          <Checkbox.Group
                            value={paneSelections[pane.key]}
                            onChange={(values) => setPaneSelections((prev) => ({ ...prev, [pane.key]: values as string[] }))}
                            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                          >
                            {paneOptions[pane.key].map((option) => (
                              <Checkbox key={`${pane.key}:${option.value}`} value={option.value}>
                                <Space>
                                  <span>{option.value}</span>
                                  <Badge count={option.count} style={{ backgroundColor: '#5a6c7d' }} />
                                </Space>
                              </Checkbox>
                            ))}
                          </Checkbox.Group>
                          {paneOptions[pane.key].length === 0 && (
                            <span className={styles.emptyHint}>Sin valores para este filtro</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Col>
                ))}
              </Row>
            </Collapse.Panel>
          </Collapse>

          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredRows}
            className={`${styles.configTable} ${styles.companiesTable}`}
            pagination={{
              pageSize,
              showSizeChanger: false,
              showTotal: (total, range) => `Mostrando ${range[0]} a ${range[1]} de ${total} registros`,
            }}
            onRow={(record) => ({
              onClick: () => openEditModal(record),
              style: { cursor: canEdit ? 'pointer' : 'default' },
            })}
          />
        </div>
      </Card>

      <Modal
        className={styles.companyModal}
        open={openModal}
        onCancel={closeModal}
        closable={false}
        footer={null}
        width={860}
        destroyOnHidden
        title={(
          <Flex justify="space-between" align="center" wrap="nowrap" style={{ width: '100%', gap: 16 }}>
            <div className={styles.companyModalHeader}>
              <div className={styles.companyModalHeaderIcon}>
                <AppstoreOutlined />
              </div>
              <span>{editing ? 'Editar Clase' : 'Crear Clase'}</span>
            </div>
            <Flex align="center" gap={12} className={styles.companyModalHeaderRight}>
              {editing ? (
                <div className={styles.companyModalEstadoPaper}>
                  <span style={{ fontWeight: 500, fontSize: 14, color: editing.esInactivo === 1 ? '#64748b' : '#20638d' }}>
                    {editing.esInactivo === 1 ? 'Inactivo' : 'Activo'}
                  </span>
                  <Switch
                    checked={editing.esInactivo === 0}
                    disabled={editing.esInactivo === 0 ? !canInactivate : !canReactivate}
                    onChange={(checked) => {
                      if (!editing) return;
                      modal.confirm({
                        title: checked ? 'Reactivar clase' : 'Inactivar clase',
                        content: checked
                          ? 'La clase volvera a estar disponible.'
                          : 'La clase quedara inactiva.',
                        okText: checked ? 'Reactivar' : 'Inactivar',
                        cancelText: 'Cancelar',
                        centered: true,
                        width: 420,
                        rootClassName: styles.companyConfirmModal,
                        okButtonProps: { className: styles.companyConfirmOk },
                        cancelButtonProps: { className: styles.companyConfirmCancel },
                        icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
                        onOk: async () => {
                          if (checked) {
                            await handleReactivate(editing);
                          } else {
                            await handleInactivate(editing);
                          }
                          closeModal();
                        },
                      });
                    }}
                  />
                </div>
              ) : null}
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={closeModal}
                aria-label="Cerrar"
                className={styles.companyModalCloseBtn}
              />
            </Flex>
          </Flex>
        )}
      >
        <Form<ClassFormValues> layout="vertical" form={form} preserve={false} className={styles.companyFormContent}>
          <div className={styles.companyFormGrid}>
            <Form.Item name="nombre" label="Nombre Clase *" rules={textRules({ required: true, max: 255 })}>
              <Input maxLength={255} />
            </Form.Item>
            <Form.Item name="codigo" label="Codigo Clase *" rules={textRules({ required: true, max: 50 })}>
              <Input maxLength={50} />
            </Form.Item>
            <Form.Item name="idExterno" label="ID Externo Clase" rules={[{ validator: optionalNoSqlInjection }]}>
              <Input maxLength={45} />
            </Form.Item>
            <Form.Item name="descripcion" label="Descripcion Clase" rules={[{ validator: optionalNoSqlInjection }]}>
              <Input.TextArea rows={4} />
            </Form.Item>
          </div>
          <div className={styles.companyModalFooter}>
            <Button onClick={closeModal} className={styles.companyModalBtnCancel}>
              Cancelar
            </Button>
            <Button
              type="primary"
              className={styles.companyModalBtnSubmit}
              loading={saving}
              onClick={() => void submitClass()}
              icon={editing ? <EditOutlined /> : <PlusOutlined />}
              disabled={editing ? !canEdit : !canCreate}
            >
              {editing ? 'Guardar cambios' : 'Crear Clase'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
