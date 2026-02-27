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
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CloseOutlined,
  DownOutlined,
  EditOutlined,
  FilterOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {
  canCreateDepartment,
  canEditDepartment,
  canInactivateDepartment,
  canReactivateDepartment,
  canViewDepartments,
  canViewDepartmentAudit,
} from '../../../store/selectors/permissions.selectors';
import { useAppSelector } from '../../../store/hooks';
import { formatDateTime12h } from '../../../lib/formatDate';
import { optionalNoSqlInjection, textRules } from '../../../lib/formValidation';
import {
  createDepartment,
  fetchDepartment,
  fetchDepartmentAuditTrail,
  fetchDepartmentsAdmin,
  inactivateDepartment,
  reactivateDepartment,
  updateDepartment,
  type DepartmentAuditTrailItem,
  type DepartmentListItem,
  type DepartmentPayload,
} from '../../../api/departments-admin';
import styles from './UsersManagementPage.module.css';

interface DepartmentFormValues {
  nombre: string;
  idExterno?: string;
}

type PaneKey = 'nombre' | 'idExterno' | 'estado';

interface PaneConfig {
  key: PaneKey;
  title: string;
}

interface PaneOption {
  value: string;
  count: number;
}

const paneConfig: PaneConfig[] = [
  { key: 'nombre', title: 'Nombre Departamento' },
  { key: 'idExterno', title: 'ID Externo Departamento' },
  { key: 'estado', title: 'Estado Departamento' },
];

function normalizePayload(values: DepartmentFormValues): DepartmentPayload {
  return {
    nombre: values.nombre.trim(),
    idExterno: values.idExterno?.trim() || undefined,
  };
}

function getPaneValue(row: DepartmentListItem, key: PaneKey): string {
  if (key === 'nombre') return row.nombre ?? '';
  if (key === 'idExterno') return row.idExterno ?? '';
  return row.estado === 0 ? 'Inactivo' : 'Activo';
}

export function DepartmentsManagementPage() {
  const { message, modal } = AntdApp.useApp();
  const [form] = Form.useForm<DepartmentFormValues>();

  const canView = useAppSelector(canViewDepartments);
  const canCreate = useAppSelector(canCreateDepartment);
  const canEdit = useAppSelector(canEditDepartment);
  const canInactivate = useAppSelector(canInactivateDepartment);
  const canReactivate = useAppSelector(canReactivateDepartment);
  const canViewAudit = useAppSelector(canViewDepartmentAudit);

  const [rows, setRows] = useState<DepartmentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<DepartmentListItem | null>(null);
  const editingId = editing?.id ?? null;
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('principal');
  const [auditTrail, setAuditTrail] = useState<DepartmentAuditTrailItem[]>([]);
  const [loadingAuditTrail, setLoadingAuditTrail] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [paneSearch, setPaneSearch] = useState<Record<PaneKey, string>>({
    nombre: '',
    idExterno: '',
    estado: '',
  });
  const [paneSelections, setPaneSelections] = useState<Record<PaneKey, string[]>>({
    nombre: [],
    idExterno: [],
    estado: [],
  });
  const [paneOpen, setPaneOpen] = useState<Record<PaneKey, boolean>>({
    nombre: false,
    idExterno: false,
    estado: false,
  });

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDepartmentsAdmin(showInactive);
      setRows(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar departamentos');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [message, showInactive]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const matchesGlobalSearch = useCallback((row: DepartmentListItem) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      (row.nombre ?? '').toLowerCase().includes(term)
      || (row.idExterno ?? '').toLowerCase().includes(term)
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
    setPaneSearch({ nombre: '', idExterno: '', estado: '' });
    setPaneSelections({ nombre: [], idExterno: [], estado: [] });
    setPaneOpen({ nombre: false, idExterno: false, estado: false });
  };

  const clearPaneSelection = (key: PaneKey) => {
    setPaneSelections((prev) => ({ ...prev, [key]: [] }));
    setPaneSearch((prev) => ({ ...prev, [key]: '' }));
  };

  const openAllPanes = () => {
    setPaneOpen({ nombre: true, idExterno: true, estado: true });
  };

  const collapseAllPanes = () => {
    setPaneOpen({ nombre: false, idExterno: false, estado: false });
  };

  const openCreateModal = () => {
    setEditing(null);
    setActiveTab('principal');
    form.resetFields();
    setOpenModal(true);
  };

  const openEditModal = (row: DepartmentListItem) => {
    if (!canEdit) return;
    setEditing(row);
    setActiveTab('principal');
    setOpenModal(true);
    applyDepartmentToForm(row);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    setAuditTrail([]);
    form.resetFields();
  };

  const applyDepartmentToForm = useCallback((row: DepartmentListItem) => {
    form.setFieldsValue({
      nombre: row.nombre ?? '',
      idExterno: row.idExterno ?? '',
    });
  }, [form]);

  const loadDepartmentDetail = useCallback(async (id: number) => {
    try {
      const detail = await fetchDepartment(id);
      setEditing(detail);
      applyDepartmentToForm(detail);
    } catch {
      // Keep current form values if detail fetch fails
    }
  }, [applyDepartmentToForm]);

  useEffect(() => {
    if (!openModal || !editingId) return;
    if (editing) applyDepartmentToForm(editing);
    void loadDepartmentDetail(editingId);
  }, [openModal, editingId, loadDepartmentDetail, applyDepartmentToForm]);

  const loadDepartmentAuditTrail = useCallback(async (id: number) => {
    if (!canViewAudit) {
      setAuditTrail([]);
      setLoadingAuditTrail(false);
      return;
    }
    setLoadingAuditTrail(true);
    try {
      const rows = await fetchDepartmentAuditTrail(id, 200);
      setAuditTrail(rows ?? []);
    } catch (error) {
      setAuditTrail([]);
      message.error(error instanceof Error ? error.message : 'Error al cargar bitacora');
    } finally {
      setLoadingAuditTrail(false);
    }
  }, [canViewAudit, message]);

  useEffect(() => {
    if (!openModal || !editingId) return;
    if (activeTab !== 'bitacora') return;
    if (!canViewAudit) return;
    void loadDepartmentAuditTrail(editingId);
  }, [openModal, editingId, activeTab, canViewAudit, loadDepartmentAuditTrail]);

  const submitDepartment = async () => {
    try {
      if (!editing && !canCreate) {
        message.error('No tiene permiso para crear departamentos.');
        return;
      }
      if (editing && !canEdit) {
        message.error('No tiene permiso para editar departamentos.');
        return;
      }

      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: editing ? 'Confirmar edicion de departamento' : 'Confirmar creacion de departamento',
          content: editing ? 'Se guardaran los cambios.' : 'Se creara el nuevo departamento.',
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
        await updateDepartment(editing.id, payload);
        message.success('Departamento actualizado correctamente');
      } else {
        await createDepartment(payload);
        message.success('Departamento creado correctamente');
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

  const handleInactivate = async (row: DepartmentListItem) => {
    if (!canInactivate) {
      message.error('No tiene permiso para inactivar departamentos.');
      return;
    }
    await inactivateDepartment(row.id);
    message.success(`Departamento ${row.nombre} inactivado`);
    await loadRows();
  };

  const handleReactivate = async (row: DepartmentListItem) => {
    if (!canReactivate) {
      message.error('No tiene permiso para reactivar departamentos.');
      return;
    }
    await reactivateDepartment(row.id);
    message.success(`Departamento ${row.nombre} reactivado`);
    await loadRows();
  };

  const columns: ColumnsType<DepartmentListItem> = [
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
      title: 'ID Externo',
      dataIndex: 'idExterno',
      key: 'idExterno',
      width: 180,
      render: (value) => value || '-',
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 120,
      render: (_, row) => (
        <Tag className={row.estado === 0 ? styles.tagInactivo : styles.tagActivo}>
          {row.estado === 0 ? 'Inactivo' : 'Activo'}
        </Tag>
      ),
    },
    {
      title: 'Ultima Modificacion',
      dataIndex: 'fechaModificacion',
      key: 'fechaModificacion',
      width: 220,
      render: (value) => formatDateTime12h(value),
    },
  ];

  const auditColumns: ColumnsType<DepartmentAuditTrailItem> = [
    {
      title: 'Fecha y hora',
      dataIndex: 'fechaCreacion',
      key: 'fechaCreacion',
      width: 160,
      render: (value: string | null) => formatDateTime12h(value),
    },
    {
      title: 'Quien lo hizo',
      key: 'actor',
      width: 210,
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
      title: 'Accion',
      key: 'accion',
      width: 170,
      render: (_, row) => (
        <Flex gap={6} wrap="wrap">
          <Tag className={styles.tagInactivo}>{row.modulo}</Tag>
          <Tag className={styles.tagActivo}>{row.accion}</Tag>
        </Flex>
      ),
    },
    {
      title: 'Detalle',
      dataIndex: 'descripcion',
      key: 'descripcion',
      render: (value: string, row) => {
        const changes = row.cambios ?? [];
        const tooltipContent = (
          <div style={{ maxWidth: 520 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{value}</div>
            {changes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {changes.map((change, index) => (
                  <div key={`${row.id}-${change.campo}-${index}`} style={{ fontSize: 12, lineHeight: 1.4 }}>
                    <div><strong>{change.campo}</strong></div>
                    <div>Antes: {change.antes}</div>
                    <div>Despues: {change.despues}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12 }}>Sin detalle de campos para esta accion.</div>
            )}
          </div>
        );

        return (
          <Tooltip title={tooltipContent}>
            <div className={styles.auditDetailCell}>{value}</div>
          </Tooltip>
        );
      },
    },
  ];

  if (!canView) {
    return (
      <div className={styles.pageWrapper}>
        <Spin />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link className={styles.pageBackLink} to="/configuration">
            <ArrowLeftOutlined />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Listado de Departamentos</h1>
            <p className={styles.pageSubtitle}>
              Visualice y gestione todos los departamentos registrados en el sistema de recursos humanos
            </p>
          </div>
        </div>
      </div>

      <Card className={styles.mainCard} style={{ marginBottom: 20 }}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={16}>
            <Flex align="center" gap={16}>
              <div className={styles.gestionIconWrap}>
                <AppstoreOutlined className={styles.gestionIcon} />
              </div>
              <div>
                <h2 className={styles.gestionTitle}>Gestion de Departamentos</h2>
                <p className={styles.gestionDesc}>
                  Administre y consulte todos los departamentos registrados en el sistema
                </p>
              </div>
            </Flex>
            {canCreate ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className={`${styles.actionButton} ${styles.btnPrimary}`}
                onClick={openCreateModal}
              >
                Crear Departamento
              </Button>
            ) : null}
          </Flex>
        </div>
      </Card>

      <Card className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={12} className={styles.registrosHeader}>
            <Flex align="center" gap={12} wrap="wrap">
              <Flex align="center" gap={8}>
                <FilterOutlined className={styles.registrosFilterIcon} />
                <h3 className={styles.registrosTitle}>Registros de Departamentos</h3>
              </Flex>
              <Flex align="center" gap={6}>
                <Select
                  value={pageSize}
                  onChange={setPageSize}
                  options={[10, 20, 50, 100].map((n) => ({ label: String(n), value: n }))}
                  style={{ width: 70 }}
                />
                <span style={{ color: '#6b7a85', fontSize: 14 }}>entries per page</span>
              </Flex>
            </Flex>
            <Flex align="center" gap={8}>
              <span style={{ color: '#6b7a85', fontSize: 14 }}>Mostrar inactivos</span>
              <Switch checked={showInactive} onChange={setShowInactive} size="small" />
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
              <span>{editing ? 'Editar Departamento' : 'Crear Departamento'}</span>
            </div>
            <Flex align="center" gap={12} className={styles.companyModalHeaderRight}>
              {editing ? (
                <div className={styles.companyModalEstadoPaper}>
                  <span style={{ fontWeight: 500, fontSize: 14, color: editing.estado === 0 ? '#64748b' : '#20638d' }}>
                    {editing.estado === 0 ? 'Inactivo' : 'Activo'}
                  </span>
                  <Switch
                    checked={editing.estado === 1}
                    disabled={editing.estado === 1 ? !canInactivate : !canReactivate}
                    onChange={(checked) => {
                      if (!editing) return;
                      modal.confirm({
                        title: checked ? 'Reactivar departamento' : 'Inactivar departamento',
                        content: checked
                          ? 'El departamento volvera a estar disponible.'
                          : 'El departamento quedara inactivo.',
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
        <Form<DepartmentFormValues> layout="vertical" form={form} preserve={false} className={styles.companyFormContent}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className={`${styles.tabsWrapper} ${styles.companyModalTabs}`}
            items={[
              {
                key: 'principal',
                label: (
                  <span>
                    <AppstoreOutlined style={{ marginRight: 8, fontSize: 16 }} />
                    Informacion Principal
                  </span>
                ),
                children: (
                  <div className={styles.companyFormGrid}>
                    <Form.Item name="nombre" label="Nombre Departamento *" rules={textRules({ required: true, max: 100 })}>
                      <Input maxLength={100} />
                    </Form.Item>
                    <Form.Item name="idExterno" label="ID Externo Departamento" rules={[{ validator: optionalNoSqlInjection }]}>
                      <Input maxLength={45} />
                    </Form.Item>
                  </div>
                ),
              },
              ...(editing && canViewAudit
                ? [{
                    key: 'bitacora',
                    label: (
                      <span>
                        <SearchOutlined style={{ marginRight: 8, fontSize: 16 }} />
                        Bitacora
                      </span>
                    ),
                    children: (
                      <div style={{ paddingTop: 8 }}>
                        <p className={styles.sectionTitle}>Historial de cambios del departamento</p>
                        <p className={styles.sectionDescription}>
                          Muestra quien hizo el cambio, cuando lo hizo y el detalle registrado en bitacora.
                        </p>
                        <Table<DepartmentAuditTrailItem>
                          rowKey="id"
                          size="small"
                          loading={loadingAuditTrail}
                          columns={auditColumns}
                          dataSource={auditTrail}
                          className={`${styles.configTable} ${styles.auditTableCompact}`}
                          pagination={{
                            pageSize: 8,
                            showSizeChanger: true,
                            showTotal: (total) => `${total} registro(s)`,
                          }}
                          locale={{ emptyText: 'No hay registros de bitacora para este departamento.' }}
                        />
                      </div>
                    ),
                  }]
                : []),
            ]}
          />
          <div className={styles.companyModalFooter}>
            <Button onClick={closeModal} className={styles.companyModalBtnCancel}>
              Cancelar
            </Button>
            <Button
              type="primary"
              className={styles.companyModalBtnSubmit}
              loading={saving}
              onClick={() => void submitDepartment()}
              icon={editing ? <EditOutlined /> : <PlusOutlined />}
              disabled={editing ? !canEdit : !canCreate}
            >
              {editing ? 'Guardar cambios' : 'Crear Departamento'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
