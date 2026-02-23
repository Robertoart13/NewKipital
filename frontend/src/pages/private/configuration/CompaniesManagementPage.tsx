import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import {
  ArrowLeftOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  CloudUploadOutlined,
  DownOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  StopOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {
  commitCompanyLogo,
  createCompany,
  fetchCompanyLogoBlobUrl,
  fetchCompanies,
  inactivateCompany,
  reactivateCompany,
  uploadCompanyLogoTemp,
  updateCompany,
  type CompanyListItem,
  type CompanyPayload,
} from '../../../api/companies';
import {
  canCreateCompany,
  canEditCompany,
  canInactivateCompany,
  canReactivateCompany,
  canViewCompanies,
} from '../../../store/selectors/permissions.selectors';
import { useAppSelector } from '../../../store/hooks';
import styles from './UsersManagementPage.module.css';

interface CompanyFormValues {
  nombre: string;
  nombreLegal: string;
  cedula: string;
  actividadEconomica?: string;
  prefijo: string;
  idExterno?: string;
  direccionExacta?: string;
  telefono?: string;
  email?: string;
  codigoPostal?: string;
}

type PaneKey = 'prefijo' | 'nombre' | 'cedula' | 'idExterno' | 'telefono' | 'email' | 'estado';

interface PaneConfig {
  key: PaneKey;
  title: string;
}

interface PaneOption {
  value: string;
  count: number;
}

const DEFAULT_COMPANY_LOGO = '/assets/images/global/imgSEO.jpg';
const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024;

function getPaneValue(company: CompanyListItem, key: PaneKey): string {
  if (key === 'estado') return company.estado === 1 ? 'Activo' : 'Inactivo';
  if (key === 'nombre') return company.nombre ?? '';
  if (key === 'cedula') return company.cedula ?? '';
  if (key === 'idExterno') return company.idExterno ?? '';
  if (key === 'prefijo') return company.prefijo ?? '';
  if (key === 'telefono') return company.telefono ?? '';
  return company.email ?? '';
}

const paneConfig: PaneConfig[] = [
  { key: 'prefijo', title: 'Prefijo Empresa' },
  { key: 'nombre', title: 'Nombre Empresa' },
  { key: 'cedula', title: 'Cedula Empresa' },
  { key: 'idExterno', title: 'ID Externo Empresa' },
  { key: 'telefono', title: 'Telefono Empresa' },
  { key: 'email', title: 'Email Empresa' },
  { key: 'estado', title: 'Estado Empresa' },
];

function normalizeCompanyPayload(values: CompanyFormValues): CompanyPayload {
  return {
    nombre: values.nombre.trim(),
    nombreLegal: values.nombreLegal.trim(),
    cedula: values.cedula.trim(),
    actividadEconomica: values.actividadEconomica?.trim() || undefined,
    prefijo: values.prefijo.trim().toUpperCase(),
    idExterno: values.idExterno?.trim() || undefined,
    direccionExacta: values.direccionExacta?.trim() || undefined,
    telefono: values.telefono?.trim() || undefined,
    email: values.email?.trim() || undefined,
    codigoPostal: values.codigoPostal?.trim() || undefined,
  };
}

export function CompaniesManagementPage() {
  const { message, modal } = AntdApp.useApp();
  useAppSelector(canViewCompanies);
  const canCreateCompanyPerm = useAppSelector(canCreateCompany);
  const canEditCompanyPerm = useAppSelector(canEditCompany);
  const canInactivateCompanyPerm = useAppSelector(canInactivateCompany);
  const canReactivateCompanyPerm = useAppSelector(canReactivateCompany);

  const [form] = Form.useForm<CompanyFormValues>();
  const formValues = Form.useWatch([], form);
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [search, setSearch] = useState('');
  const [paneSearch, setPaneSearch] = useState<Record<PaneKey, string>>({
    prefijo: '',
    nombre: '',
    cedula: '',
    idExterno: '',
    telefono: '',
    email: '',
    estado: '',
  });
  const [paneSelections, setPaneSelections] = useState<Record<PaneKey, string[]>>({
    prefijo: [],
    nombre: [],
    cedula: [],
    idExterno: [],
    telefono: [],
    email: [],
    estado: [],
  });
  const [paneOpen, setPaneOpen] = useState<Record<PaneKey, boolean>>({
    prefijo: false,
    nombre: false,
    cedula: false,
    idExterno: false,
    telefono: false,
    email: false,
    estado: false,
  });
  const [openModal, setOpenModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyListItem | null>(null);
  const [activeTab, setActiveTab] = useState('principal');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoTempFileName, setLogoTempFileName] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>(DEFAULT_COMPANY_LOGO);
  const logoObjectUrlRef = useRef<string | null>(null);
  const canUploadLogo = editingCompany ? canEditCompanyPerm : canCreateCompanyPerm;
  const canSubmitCompany = useMemo(() => {
    const values = formValues ?? {};
    const required = [
      values.nombre,
      values.nombreLegal,
      values.cedula,
      values.prefijo,
    ];
    return required.every((value) => typeof value === 'string' && value.trim().length > 0);
  }, [formValues]);

  const clearLogoObjectUrl = useCallback(() => {
    if (!logoObjectUrlRef.current) return;
    URL.revokeObjectURL(logoObjectUrlRef.current);
    logoObjectUrlRef.current = null;
  }, []);

  const setPreviewFromObjectUrl = useCallback((url: string) => {
    clearLogoObjectUrl();
    logoObjectUrlRef.current = url;
    setLogoPreviewUrl(url);
  }, [clearLogoObjectUrl]);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCompanies(showInactive);
      setCompanies(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar empresas');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [message, showInactive]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const matchesGlobalSearch = useCallback((company: CompanyListItem) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      (company.nombre ?? '').toLowerCase().includes(term)
      || (company.nombreLegal ?? '').toLowerCase().includes(term)
      || (company.cedula ?? '').toLowerCase().includes(term)
      || (company.idExterno ?? '').toLowerCase().includes(term)
      || (company.email ?? '').toLowerCase().includes(term)
      || (company.prefijo ?? '').toLowerCase().includes(term)
    );
  }, [search]);

  const dataFilteredByPaneSelections = useCallback((excludePane?: PaneKey) => {
    return companies.filter((company) => {
      if (!matchesGlobalSearch(company)) return false;
      for (const pane of paneConfig) {
        if (pane.key === excludePane) continue;
        const selected = paneSelections[pane.key];
        if (selected.length === 0) continue;
        const value = getPaneValue(company, pane.key);
        if (!selected.includes(value)) return false;
      }
      return true;
    });
  }, [companies, matchesGlobalSearch, paneSelections]);

  const paneOptions = useMemo(() => {
    const result: Record<PaneKey, PaneOption[]> = {
      prefijo: [],
      nombre: [],
      cedula: [],
      idExterno: [],
      telefono: [],
      email: [],
      estado: [],
    };
    for (const pane of paneConfig) {
      const filteredData = dataFilteredByPaneSelections(pane.key);
      const counter = new Map<string, number>();
      for (const company of filteredData) {
        const value = getPaneValue(company, pane.key).trim();
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

  const filteredCompanies = useMemo(() => dataFilteredByPaneSelections(), [dataFilteredByPaneSelections]);

  const clearAllFilters = () => {
    setSearch('');
    setPaneSearch({ prefijo: '', nombre: '', cedula: '', idExterno: '', telefono: '', email: '', estado: '' });
    setPaneSelections({ prefijo: [], nombre: [], cedula: [], idExterno: [], telefono: [], email: [], estado: [] });
    setPaneOpen({ prefijo: false, nombre: false, cedula: false, idExterno: false, telefono: false, email: false, estado: false });
  };

  const clearPaneSelection = (key: PaneKey) => {
    setPaneSelections((prev) => ({ ...prev, [key]: [] }));
    setPaneSearch((prev) => ({ ...prev, [key]: '' }));
  };

  const openAllPanes = () => {
    setPaneOpen({ prefijo: true, nombre: true, cedula: true, idExterno: true, telefono: true, email: true, estado: true });
  };

  const collapseAllPanes = () => {
    setPaneOpen({ prefijo: false, nombre: false, cedula: false, idExterno: false, telefono: false, email: false, estado: false });
  };

  const logoUploadProps: UploadProps = {
    accept: 'image/png,image/jpeg,image/jpg,image/webp,image/svg+xml',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      const isImage = file.type?.startsWith('image/');
      if (!isImage) {
        message.error('Solo se permiten archivos de imagen');
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_LOGO_FILE_SIZE) {
        message.error('La imagen supera el tamano maximo de 5MB');
        return Upload.LIST_IGNORE;
      }
      clearLogoObjectUrl();
      setLogoFile(file as File);
      setLogoTempFileName(null);
      setLogoPreviewUrl(URL.createObjectURL(file));
      return false;
    },
  };

  useEffect(() => {
    return () => {
      clearLogoObjectUrl();
    };
  }, [clearLogoObjectUrl]);

  const openCreateModal = () => {
    setEditingCompany(null);
    setActiveTab('principal');
    clearLogoObjectUrl();
    setLogoFile(null);
    setLogoTempFileName(null);
    setLogoPreviewUrl(DEFAULT_COMPANY_LOGO);
    form.resetFields();
    setOpenModal(true);
  };

  const openEditModal = (company: CompanyListItem) => {
    setEditingCompany(company);
    setActiveTab('principal');
    clearLogoObjectUrl();
    setLogoFile(null);
    setLogoTempFileName(null);
    setLogoPreviewUrl(DEFAULT_COMPANY_LOGO);
    form.setFieldsValue({
      nombre: company.nombre ?? '',
      nombreLegal: company.nombreLegal ?? '',
      cedula: company.cedula ?? '',
      actividadEconomica: company.actividadEconomica ?? '',
      prefijo: company.prefijo ?? '',
      idExterno: company.idExterno ?? '',
      direccionExacta: company.direccionExacta ?? '',
      telefono: company.telefono ?? '',
      email: company.email ?? '',
      codigoPostal: company.codigoPostal ?? '',
    });
    setOpenModal(true);
  };

  const restoreEditingLogoPreview = useCallback(async () => {
    if (!editingCompany) {
      setLogoPreviewUrl(DEFAULT_COMPANY_LOGO);
      return;
    }
    try {
      const blobUrl = await fetchCompanyLogoBlobUrl(editingCompany.id);
      setPreviewFromObjectUrl(blobUrl);
    } catch {
      setLogoPreviewUrl(DEFAULT_COMPANY_LOGO);
    }
  }, [editingCompany, setPreviewFromObjectUrl]);

  useEffect(() => {
    if (!openModal || !editingCompany) return;

    let cancelled = false;
    const loadLogo = async () => {
      try {
        const blobUrl = await fetchCompanyLogoBlobUrl(editingCompany.id);
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        setPreviewFromObjectUrl(blobUrl);
      } catch {
        if (!cancelled) setLogoPreviewUrl(DEFAULT_COMPANY_LOGO);
      }
    };

    void loadLogo();
    return () => {
      cancelled = true;
    };
  }, [editingCompany, openModal, setPreviewFromObjectUrl]);

  const closeModal = () => {
    setOpenModal(false);
    setEditingCompany(null);
    clearLogoObjectUrl();
    setLogoFile(null);
    setLogoTempFileName(null);
    setLogoPreviewUrl(DEFAULT_COMPANY_LOGO);
    form.resetFields();
  };

  const submitCompany = async () => {
    try {
      const isEditing = Boolean(editingCompany);
      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: isEditing ? 'Confirmar edición de empresa' : 'Confirmar creación de empresa',
          content: isEditing
            ? '¿Está seguro de guardar los cambios de esta empresa?'
            : '¿Está seguro de crear esta empresa?',
          icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
          okText: isEditing ? 'Sí, guardar cambios' : 'Sí, crear',
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
      const payload = normalizeCompanyPayload(values);
      setSaving(true);

      let tempFileName = logoTempFileName;
      if (logoFile && !tempFileName) {
        const uploaded = await uploadCompanyLogoTemp(logoFile);
        tempFileName = uploaded.tempFileName;
        setLogoTempFileName(tempFileName);
      }

      let persistedCompany: CompanyListItem;

      if (editingCompany) {
        persistedCompany = await updateCompany(editingCompany.id, payload);
        message.success('Empresa actualizada correctamente');
      } else {
        persistedCompany = await createCompany(payload);
        message.success('Empresa creada correctamente');
      }

      if (tempFileName) {
        await commitCompanyLogo(persistedCompany.id, tempFileName);
      }

      closeModal();
      await loadCompanies();
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInactivate = async (company: CompanyListItem) => {
    try {
      await inactivateCompany(company.id);
      message.success(`Empresa ${company.nombre} inactivada`);
      await loadCompanies();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al inactivar empresa');
    }
  };

  const handleReactivate = async (company: CompanyListItem) => {
    try {
      await reactivateCompany(company.id);
      message.success(`Empresa ${company.nombre} reactivada`);
      await loadCompanies();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al reactivar empresa');
    }
  };

  const columns: ColumnsType<CompanyListItem> = [
    {
      title: 'PREFIJO EMPRESA',
      dataIndex: 'prefijo',
      key: 'prefijo',
      width: 140,
      sorter: (a, b) => (a.prefijo ?? '').localeCompare(b.prefijo ?? ''),
      render: (value) => value || '-',
    },
    {
      title: 'NOMBRE EMPRESA',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 320,
      ellipsis: true,
      sorter: (a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''),
      render: (_, company) => (
        <Tooltip title={company.nombre || '-'}>
          <span>{company.nombre || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'CEDULA EMPRESA',
      dataIndex: 'cedula',
      key: 'cedula',
      width: 160,
      sorter: (a, b) => (a.cedula ?? '').localeCompare(b.cedula ?? ''),
      render: (value) => value || '-',
    },
    {
      title: 'ID EXTERNO EMPRESA',
      dataIndex: 'idExterno',
      key: 'idExterno',
      width: 160,
      sorter: (a, b) => (a.idExterno ?? '').localeCompare(b.idExterno ?? ''),
      render: (value) => value || '-',
    },
    {
      title: 'TELEFONO EMPRESA',
      dataIndex: 'telefono',
      key: 'telefono',
      width: 140,
      sorter: (a, b) => (a.telefono ?? '').localeCompare(b.telefono ?? ''),
      render: (value) => value || '-',
    },
    {
      title: 'EMAIL EMPRESA',
      dataIndex: 'email',
      key: 'email',
      width: 220,
      sorter: (a, b) => (a.email ?? '').localeCompare(b.email ?? ''),
      render: (value) => value || '-',
    },
    {
      title: 'ESTADO EMPRESA',
      key: 'estado',
      width: 120,
      sorter: (a, b) => (a.estado ?? 0) - (b.estado ?? 0),
      render: (_, company) => (
        <Tag className={company.estado === 1 ? styles.tagActivo : styles.tagInactivo}>
          {company.estado === 1 ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
  ];

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link className={styles.pageBackLink} to="/configuration">
            <ArrowLeftOutlined />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Listado de Empresas</h1>
            <p className={styles.pageSubtitle}>
              Visualice y gestione todas las empresas registradas en el sistema de recursos humanos
            </p>
          </div>
        </div>
      </div>

      <Card className={styles.mainCard} style={{ marginBottom: 20 }}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={16}>
            <Flex align="center" gap={16}>
              <div className={styles.gestionIconWrap}>
                <BankOutlined className={styles.gestionIcon} />
              </div>
              <div>
                <h2 className={styles.gestionTitle}>Gestion de Empresas</h2>
                <p className={styles.gestionDesc}>
                  Administre y consulte todas las empresas registradas en el sistema
                </p>
              </div>
            </Flex>
            {canCreateCompanyPerm ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className={`${styles.actionButton} ${styles.btnPrimary}`}
                onClick={openCreateModal}
              >
                Crear Empresa
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
                <h3 className={styles.registrosTitle}>Registros de Empresas</h3>
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
                          suffix={
                            <Flex gap={2}>
                              <SortAscendingOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                              <SortDescendingOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                            </Flex>
                          }
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
            dataSource={filteredCompanies}
            className={`${styles.configTable} ${styles.companiesTable}`}
            pagination={{
              pageSize,
              showSizeChanger: false,
              showTotal: (total, range) => `Mostrando ${range[0]} a ${range[1]} de ${total} registros`,
            }}
            onRow={(record) => ({
              onClick: () => canEditCompanyPerm && openEditModal(record),
              style: { cursor: canEditCompanyPerm ? 'pointer' : 'default' },
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
        confirmLoading={saving}
        width={920}
        destroyOnHidden
        styles={{
          header: { marginBottom: 0, padding: 0 },
          body: { padding: 24 },
        }}
        title={(
          <Flex justify="space-between" align="center" wrap="nowrap" style={{ width: '100%', gap: 16 }}>
            <div className={styles.companyModalHeader}>
              <div className={styles.companyModalHeaderIcon}>
                <BankOutlined />
              </div>
              <span>{editingCompany ? 'Editar Empresa' : 'Crear Nueva Empresa'}</span>
            </div>
            <Flex align="center" gap={12} className={styles.companyModalHeaderRight}>
              <div className={styles.companyModalEstadoPaper}>
                <span style={{ fontWeight: 500, fontSize: 14, color: editingCompany?.estado === 0 ? '#64748b' : '#0369a1' }}>
                  {editingCompany ? (editingCompany.estado === 1 ? 'Activo' : 'Inactivo') : 'Activo'}
                </span>
                <Switch checked={editingCompany ? editingCompany.estado === 1 : true} disabled />
              </div>
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
        <Form<CompanyFormValues>
          layout="vertical"
          form={form}
          preserve={false}
          initialValues={{ prefijo: '', idExterno: '0' }}
          className={styles.companyFormContent}
        >
          {editingCompany && (
            <Flex gap={12} style={{ marginBottom: 16 }} wrap="wrap">
              {editingCompany.estado === 1 && canInactivateCompanyPerm ? (
                <Popconfirm
                  title="¿Inactivar empresa?"
                  description="La empresa no se elimina. Solo quedara inactiva."
                  onConfirm={async () => {
                    await handleInactivate(editingCompany);
                    closeModal();
                  }}
                  okText="Inactivar"
                  cancelText="Cancelar"
                >
                  <Button
                    icon={<StopOutlined />}
                    className={`${styles.actionButton} ${styles.btnSecondary}`}
                  >
                    Inactivar Empresa
                  </Button>
                </Popconfirm>
              ) : null}
              {editingCompany.estado !== 1 && canReactivateCompanyPerm ? (
                <Popconfirm
                  title="¿Reactivar empresa?"
                  description="La empresa volvera a estar disponible para asignaciones."
                  onConfirm={async () => {
                    await handleReactivate(editingCompany);
                    closeModal();
                  }}
                  okText="Reactivar"
                  cancelText="Cancelar"
                >
                  <Button
                    icon={<CheckCircleOutlined />}
                    className={`${styles.actionButton} ${styles.btnSecondary}`}
                  >
                    Reactivar Empresa
                  </Button>
                </Popconfirm>
              ) : null}
            </Flex>
          )}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className={`${styles.tabsWrapper} ${styles.companyModalTabs}`}
            items={[
              {
                key: 'principal',
                label: (
                  <span>
                    <BankOutlined style={{ marginRight: 8, fontSize: 16 }} />
                    Informacion Principal
                  </span>
                ),
                children: (
                  <>
                    <div className={styles.logoUploadArea}>
                      <Row gutter={16} align="middle" style={{ width: '100%' }}>
                        <Col flex="0 0 90px">
                          <img
                            src={logoPreviewUrl || DEFAULT_COMPANY_LOGO}
                            alt="Logo empresa"
                            className={styles.logoUploadPreview}
                            onError={(event) => {
                              const target = event.currentTarget;
                              if (!target.src.endsWith(DEFAULT_COMPANY_LOGO)) {
                                target.src = DEFAULT_COMPANY_LOGO;
                              }
                            }}
                          />
                        </Col>
                        <Col flex="1">
                          <div className={styles.logoUploadInfo}>
                            <p className={styles.logoUploadTitle}>Logo de la Empresa</p>
                            <p className={styles.logoUploadDesc}>Formato de imagen (PNG, JPG, SVG) - Maximo 5MB</p>
                            <Space style={{ marginTop: 8 }}>
                              {canUploadLogo ? (
                                <Upload {...logoUploadProps}>
                                  <Button
                                    icon={<CloudUploadOutlined />}
                                    className={`${styles.actionButton} ${styles.btnPrimary}`}
                                  >
                                    Cargar
                                  </Button>
                                </Upload>
                              ) : null}
                              {logoFile && canUploadLogo ? (
                                <Button
                                  icon={<CloseOutlined />}
                                  className={`${styles.actionButton} ${styles.btnSecondary}`}
                                  onClick={() => {
                                    setLogoFile(null);
                                    setLogoTempFileName(null);
                                    clearLogoObjectUrl();
                                    if (editingCompany) {
                                      void restoreEditingLogoPreview();
                                    } else {
                                      setLogoPreviewUrl(DEFAULT_COMPANY_LOGO);
                                    }
                                  }}
                                >
                                  Quitar
                                </Button>
                              ) : null}
                            </Space>
                          </div>
                        </Col>
                      </Row>
                    </div>
                    <Row gutter={[12, 12]} className={styles.companyFormGrid}>
                      <Col span={12}>
                        <Form.Item name="nombre" label="Nombre Empresa *" rules={[{ required: true, message: 'Ingrese el nombre de empresa' }]}>
                          <Input maxLength={200} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="nombreLegal" label="Nombre Legal Empresa *" rules={[{ required: true, message: 'Ingrese el nombre legal' }]}>
                          <Input maxLength={300} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="cedula" label="Cedula Empresa *" rules={[{ required: true, message: 'Ingrese la cedula' }]}>
                          <Input maxLength={50} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="actividadEconomica" label="Actividad Economica Empresa">
                          <Input maxLength={300} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="prefijo" label="Prefijo Empresa *" rules={[{ required: true, message: 'Ingrese el prefijo' }]}>
                          <Input maxLength={10} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="idExterno" label="ID Externo Empresa">
                          <Input maxLength={100} placeholder="0" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="email" label="Email 1 Empresa" rules={[{ type: 'email', message: 'Formato de correo invalido' }]}>
                          <Input maxLength={150} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="telefono" label="Telefono Empresa">
                          <Input maxLength={30} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: 'direccion',
                label: (
                  <span>
                    <EnvironmentOutlined style={{ marginRight: 8, fontSize: 16 }} />
                    Direccion
                  </span>
                ),
                children: (
                  <Row gutter={[12, 12]} className={styles.companyFormGrid}>
                    <Col span={16}>
                      <Form.Item name="direccionExacta" label="Direccion Exacta">
                        <Input.TextArea rows={4} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="codigoPostal" label="Codigo Postal">
                        <Input maxLength={20} />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
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
              disabled={!canSubmitCompany}
              onClick={() => void submitCompany()}
              icon={editingCompany ? undefined : <PlusOutlined />}
            >
              {editingCompany ? 'Guardar cambios' : 'Crear Empresa'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}


