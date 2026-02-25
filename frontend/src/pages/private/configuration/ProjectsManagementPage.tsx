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
  ProjectOutlined,
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
  canCreateProject,
  canEditProject,
  canInactivateProject,
  canReactivateProject,
  canViewProjectAudit,
  canViewProjects,
} from '../../../store/selectors/permissions.selectors';
import { useAppSelector } from '../../../store/hooks';
import { formatDateTime12h } from '../../../lib/formatDate';
import { optionalNoSqlInjection, textRules } from '../../../lib/formValidation';
import {
  createProject,
  fetchProject,
  fetchProjectAuditTrail,
  fetchProjects,
  inactivateProject,
  reactivateProject,
  updateProject,
  type ProjectAuditTrailItem,
  type ProjectListItem,
  type ProjectPayload,
} from '../../../api/projects';
import styles from './UsersManagementPage.module.css';

interface ProjectFormValues {
  idEmpresa?: number;
  nombre: string;
  descripcion?: string;
  codigo: string;
  idExterno?: string;
}

type PaneKey = 'empresa' | 'nombre' | 'codigo' | 'idExterno' | 'estado';

interface PaneConfig {
  key: PaneKey;
  title: string;
}

interface PaneOption {
  value: string;
  count: number;
}

const paneConfig: PaneConfig[] = [
  { key: 'empresa', title: 'Empresa' },
  { key: 'nombre', title: 'Nombre Proyecto' },
  { key: 'codigo', title: 'Codigo Proyecto' },
  { key: 'idExterno', title: 'ID Externo Proyecto' },
  { key: 'estado', title: 'Estado Proyecto' },
];

function normalizePayload(values: ProjectFormValues): Omit<ProjectPayload, 'idEmpresa'> {
  return {
    nombre: values.nombre.trim(),
    descripcion: values.descripcion?.trim() || undefined,
    codigo: values.codigo.trim(),
    idExterno: values.idExterno?.trim() || undefined,
  };
}

function getPaneValue(row: ProjectListItem, key: PaneKey, companies: Array<{ id: number; nombre: string }>): string {
  if (key === 'empresa') {
    const company = companies.find((c) => c.id === row.idEmpresa);
    return company?.nombre ?? `Empresa #${row.idEmpresa}`;
  }
  if (key === 'nombre') return row.nombre ?? '';
  if (key === 'codigo') return row.codigo ?? '';
  if (key === 'idExterno') return row.idExterno ?? '';
  return row.esInactivo === 1 ? 'Inactivo' : 'Activo';
}

export function ProjectsManagementPage() {
  const { message, modal } = AntdApp.useApp();
  const [form] = Form.useForm<ProjectFormValues>();

  const canView = useAppSelector(canViewProjects);
  const canCreate = useAppSelector(canCreateProject);
  const canEdit = useAppSelector(canEditProject);
  const canInactivate = useAppSelector(canInactivateProject);
  const canReactivate = useAppSelector(canReactivateProject);
  const canViewAudit = useAppSelector(canViewProjectAudit);
  const activeCompany = useAppSelector((s) => s.activeCompany.company);
  const companies = useAppSelector((s) => s.auth.companies);
  const activeCompanyIds = useMemo(() => new Set(companies.map((c) => c.id)), [companies]);
  const defaultCompanyId = activeCompany?.id ?? companies[0]?.id;

  const [rows, setRows] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [listCompanyId, setListCompanyId] = useState<number | undefined>(defaultCompanyId);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<ProjectListItem | null>(null);
  const editingId = editing?.id ?? null;
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('principal');
  const [auditTrail, setAuditTrail] = useState<ProjectAuditTrailItem[]>([]);
  const [loadingAuditTrail, setLoadingAuditTrail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [paneSearch, setPaneSearch] = useState<Record<PaneKey, string>>({
    empresa: '',
    nombre: '',
    codigo: '',
    idExterno: '',
    estado: '',
  });
  const [paneSelections, setPaneSelections] = useState<Record<PaneKey, string[]>>({
    empresa: [],
    nombre: [],
    codigo: [],
    idExterno: [],
    estado: [],
  });
  const [paneOpen, setPaneOpen] = useState<Record<PaneKey, boolean>>({
    empresa: false,
    nombre: false,
    codigo: false,
    idExterno: false,
    estado: false,
  });

  const loadRows = useCallback(async (companyId?: number) => {
    setLoading(true);
    try {
      const targetCompanyId = companyId ?? listCompanyId ?? defaultCompanyId;
      if (!targetCompanyId) {
        setRows([]);
        return;
      }
      const data = await fetchProjects(targetCompanyId, showInactive);
      setRows(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar proyectos');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [defaultCompanyId, listCompanyId, message, showInactive]);

  useEffect(() => {
    setListCompanyId(defaultCompanyId);
  }, [defaultCompanyId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows, listCompanyId, showInactive]);

  const matchesGlobalSearch = useCallback((row: ProjectListItem) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      (row.nombre ?? '').toLowerCase().includes(term)
      || (row.codigo ?? '').toLowerCase().includes(term)
      || (row.idExterno ?? '').toLowerCase().includes(term)
      || (companies.find((c) => c.id === row.idEmpresa)?.nombre ?? '').toLowerCase().includes(term)
      || (row.descripcion ?? '').toLowerCase().includes(term)
    );
  }, [companies, search]);

  const dataFilteredByPaneSelections = useCallback((excludePane?: PaneKey) => {
    return rows.filter((row) => {
      if (!matchesGlobalSearch(row)) return false;
      for (const pane of paneConfig) {
        if (pane.key === excludePane) continue;
        const selected = paneSelections[pane.key];
        if (selected.length === 0) continue;
        const value = getPaneValue(row, pane.key, companies);
        if (!selected.includes(value)) return false;
      }
      return true;
    });
  }, [companies, matchesGlobalSearch, paneSelections, rows]);

  const paneOptions = useMemo(() => {
    const result: Record<PaneKey, PaneOption[]> = {
      empresa: [],
      nombre: [],
      codigo: [],
      idExterno: [],
      estado: [],
    };

    for (const pane of paneConfig) {
      const filteredData = dataFilteredByPaneSelections(pane.key);
      const counter = new Map<string, number>();
      for (const row of filteredData) {
        const value = getPaneValue(row, pane.key, companies).trim();
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
  }, [companies, dataFilteredByPaneSelections, paneSearch]);

  const filteredRows = useMemo(() => dataFilteredByPaneSelections(), [dataFilteredByPaneSelections]);

  const clearAllFilters = () => {
    setSearch('');
    setPaneSearch({ empresa: '', nombre: '', codigo: '', idExterno: '', estado: '' });
    setPaneSelections({ empresa: [], nombre: [], codigo: [], idExterno: [], estado: [] });
    setPaneOpen({ empresa: false, nombre: false, codigo: false, idExterno: false, estado: false });
  };

  const clearPaneSelection = (key: PaneKey) => {
    setPaneSelections((prev) => ({ ...prev, [key]: [] }));
    setPaneSearch((prev) => ({ ...prev, [key]: '' }));
  };

  const openAllPanes = () => {
    setPaneOpen({ empresa: true, nombre: true, codigo: true, idExterno: true, estado: true });
  };

  const collapseAllPanes = () => {
    setPaneOpen({ empresa: false, nombre: false, codigo: false, idExterno: false, estado: false });
  };

  const openCreateModal = () => {
    setEditing(null);
    setActiveTab('principal');
    form.resetFields();
    if (defaultCompanyId) {
      form.setFieldsValue({ idEmpresa: defaultCompanyId });
    }
    setOpenModal(true);
  };

  const openEditModal = (row: ProjectListItem) => {
    if (!canEdit) return;
    setEditing(row);
    setActiveTab('principal');
    setOpenModal(true);
    applyProjectToForm(row);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    setAuditTrail([]);
    form.resetFields();
  };

  const applyProjectToForm = useCallback((row: ProjectListItem) => {
    const isActiveCompany = activeCompanyIds.has(row.idEmpresa);
    form.setFieldsValue({
      idEmpresa: isActiveCompany ? row.idEmpresa : undefined,
      nombre: row.nombre ?? '',
      descripcion: row.descripcion ?? '',
      codigo: row.codigo ?? '',
      idExterno: row.idExterno ?? '',
    });
  }, [form, activeCompanyIds]);

  const loadProjectDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchProject(id);
      setEditing(detail);
      applyProjectToForm(detail);
    } catch {
      // Keep current form values if detail fetch fails
    } finally {
      setLoadingDetail(false);
    }
  }, [applyProjectToForm]);

  useEffect(() => {
    if (!openModal || !editingId) return;
    applyProjectToForm(editing);
    void loadProjectDetail(editingId);
  }, [openModal, editingId, loadProjectDetail, applyProjectToForm]);

  const loadProjectAuditTrail = useCallback(async (id: number) => {
    if (!canViewAudit) {
      setAuditTrail([]);
      setLoadingAuditTrail(false);
      return;
    }
    setLoadingAuditTrail(true);
    try {
      const rows = await fetchProjectAuditTrail(id, 200);
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
    void loadProjectAuditTrail(editingId);
  }, [openModal, editingId, activeTab, canViewAudit, loadProjectAuditTrail]);

  const submitProject = async () => {
    try {
      if (!editing && !canCreate) {
        message.error('No tiene permiso para crear proyectos.');
        return;
      }
      if (editing && !canEdit) {
        message.error('No tiene permiso para editar proyectos.');
        return;
      }

      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: editing ? 'Confirmar edicion de proyecto' : 'Confirmar creacion de proyecto',
          content: editing ? 'Se guardaran los cambios.' : 'Se creara el nuevo proyecto.',
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
      const selectedEmpresa = values.idEmpresa ?? defaultCompanyId;
      if (!editing && !selectedEmpresa) {
        message.error('Debe seleccionar una empresa activa para gestionar proyectos.');
        return;
      }
      setSaving(true);

      if (editing) {
        const updatePayload: Partial<ProjectPayload> = { ...payload };
        if (values.idEmpresa && values.idEmpresa !== editing.idEmpresa) {
          updatePayload.idEmpresa = values.idEmpresa;
        }
        await updateProject(editing.id, updatePayload);
        message.success('Proyecto actualizado correctamente');
      } else {
        await createProject({ ...payload, idEmpresa: selectedEmpresa });
        message.success('Proyecto creado correctamente');
        setListCompanyId(selectedEmpresa);
      }

      closeModal();
      await loadRows(selectedEmpresa ?? listCompanyId);
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInactivate = async (row: ProjectListItem) => {
    if (!canInactivate) {
      message.error('No tiene permiso para inactivar proyectos.');
      return;
    }
    await inactivateProject(row.id);
    message.success(`Proyecto ${row.nombre} inactivado`);
    await loadRows();
  };

  const handleReactivate = async (row: ProjectListItem) => {
    if (!canReactivate) {
      message.error('No tiene permiso para reactivar proyectos.');
      return;
    }
    await reactivateProject(row.id);
    message.success(`Proyecto ${row.nombre} reactivado`);
    await loadRows();
  };

  const columns: ColumnsType<ProjectListItem> = [
    {
      title: 'Empresa',
      dataIndex: 'idEmpresa',
      key: 'empresa',
      width: 220,
      render: (value: number) => {
        const company = companies.find((c) => c.id === value);
        return company?.nombre ?? `Empresa #${value}`;
      },
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (_, row) => (
        <Space>
          <ProjectOutlined />
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
      render: (_, row) => (
        <Tag className={row.esInactivo === 1 ? styles.tagInactivo : styles.tagActivo}>
          {row.esInactivo === 1 ? 'Inactivo' : 'Activo'}
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

  const auditColumns: ColumnsType<ProjectAuditTrailItem> = [
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
            <h1 className={styles.pageTitle}>Listado de Proyectos</h1>
            <p className={styles.pageSubtitle}>
              Visualice y gestione todos los proyectos registrados en el sistema de recursos humanos
            </p>
          </div>
        </div>
      </div>

      <Card className={styles.mainCard} style={{ marginBottom: 20 }}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={16}>
            <Flex align="center" gap={16}>
              <div className={styles.gestionIconWrap}>
                <ProjectOutlined className={styles.gestionIcon} />
              </div>
              <div>
                <h2 className={styles.gestionTitle}>Gestion de Proyectos</h2>
                <p className={styles.gestionDesc}>
                  Administre y consulte todos los proyectos registrados en el sistema
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
                Crear Proyecto
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
                <h3 className={styles.registrosTitle}>Registros de Proyectos</h3>
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
              <span style={{ color: '#6b7a85', fontSize: 14 }}>Mostrar inactivas</span>
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
                <ProjectOutlined />
              </div>
              <span>{editing ? 'Editar Proyecto' : 'Crear Proyecto'}</span>
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
                        title: checked ? 'Reactivar proyecto' : 'Inactivar proyecto',
                        content: checked
                          ? 'El proyecto volvera a estar disponible.'
                          : 'El proyecto quedara inactivo.',
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
        <Form<ProjectFormValues> layout="vertical" form={form} preserve={false} className={styles.companyFormContent}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className={`${styles.tabsWrapper} ${styles.companyModalTabs}`}
            items={[
              {
                key: 'principal',
                label: (
                  <span>
                    <ProjectOutlined style={{ marginRight: 8, fontSize: 16 }} />
                    Informacion Principal
                  </span>
                ),
                children: (
                  <Spin spinning={loadingDetail}>
                    <div className={styles.companyFormGrid}>
                    {(() => {
                      const editingCompanyActive = editing ? activeCompanyIds.has(editing.idEmpresa) : true;
                      const editingCompanyLabel = editing
                        ? (companies.find((c) => c.id === editing.idEmpresa)?.nombre ?? `Empresa #${editing.idEmpresa}`)
                        : '';

                      if (editing && !editingCompanyActive) {
                        return (
                          <>
                            <Form.Item label="Empresa actual">
                              <Flex align="center" gap={8}>
                                <Input value={editingCompanyLabel} disabled />
                                <Tag className={styles.tagInactivo}>Inactiva</Tag>
                              </Flex>
                            </Form.Item>
                            {companies.length > 0 ? (
                              <Form.Item name="idEmpresa" label="Cambiar a empresa activa">
                                <Select
                                  placeholder="Seleccionar empresa activa"
                                  options={companies.map((c) => ({ value: c.id, label: c.nombre }))}
                                  showSearch
                                  optionFilterProp="label"
                                  filterOption={(input, option) =>
                                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                  }
                                />
                              </Form.Item>
                            ) : (
                              <Form.Item label="Cambiar a empresa activa">
                                <Input value="No hay empresas activas disponibles" disabled />
                              </Form.Item>
                            )}
                          </>
                        );
                      }

                      if (companies.length > 1) {
                        return (
                          <Form.Item name="idEmpresa" label="Empresa *" rules={[{ required: true }]}>
                            <Select
                              placeholder="Seleccionar empresa"
                              options={companies.map((c) => ({ value: c.id, label: c.nombre }))}
                              showSearch
                              optionFilterProp="label"
                              filterOption={(input, option) =>
                                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                              }
                            />
                          </Form.Item>
                        );
                      }

                      if (companies.length === 1) {
                        return (
                          <>
                            <Form.Item name="idEmpresa" hidden>
                              <Input />
                            </Form.Item>
                            <Form.Item label="Empresa *">
                              <Input value={companies[0]?.nombre ?? ''} disabled />
                            </Form.Item>
                          </>
                        );
                      }

                      return (
                        <Form.Item label="Empresa *">
                          <Input value="No hay empresas activas disponibles" disabled />
                        </Form.Item>
                      );
                    })()}
                      <Form.Item name="nombre" label="Nombre Proyecto *" rules={textRules({ required: true, max: 255 })}>
                        <Input maxLength={255} />
                      </Form.Item>
                      <Form.Item name="codigo" label="Codigo Proyecto *" rules={textRules({ required: true, max: 50 })}>
                        <Input maxLength={50} />
                      </Form.Item>
                      <Form.Item name="idExterno" label="ID Externo Proyecto" rules={[{ validator: optionalNoSqlInjection }]}>
                        <Input maxLength={45} />
                      </Form.Item>
                      <Form.Item name="descripcion" label="Descripcion Proyecto" rules={[{ validator: optionalNoSqlInjection }]}>
                        <Input.TextArea rows={4} />
                      </Form.Item>
                    </div>
                  </Spin>
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
                        <p className={styles.sectionTitle}>Historial de cambios del proyecto</p>
                        <p className={styles.sectionDescription}>
                          Muestra quien hizo el cambio, cuando lo hizo y el detalle registrado en bitacora.
                        </p>
                        <Table<ProjectAuditTrailItem>
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
                          locale={{ emptyText: 'No hay registros de bitacora para este proyecto.' }}
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
              onClick={() => void submitProject()}
              icon={editing ? <EditOutlined /> : <PlusOutlined />}
              disabled={editing ? !canEdit : !canCreate}
            >
              {editing ? 'Guardar cambios' : 'Crear Proyecto'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
