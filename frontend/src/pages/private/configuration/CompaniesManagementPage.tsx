import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
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
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  BankOutlined,
  CheckCircleOutlined,
  DownOutlined,
  FilterOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  StopOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {
  createCompany,
  fetchCompanies,
  inactivateCompany,
  reactivateCompany,
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
  { key: 'cedula', title: 'Cédula Empresa' },
  { key: 'idExterno', title: 'ID Externo Empresa' },
  { key: 'telefono', title: 'Teléfono Empresa' },
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
  const { message } = AntdApp.useApp();
  useAppSelector(canViewCompanies);
  const canCreateCompanyPerm = useAppSelector(canCreateCompany);
  const canEditCompanyPerm = useAppSelector(canEditCompany);
  const canInactivateCompanyPerm = useAppSelector(canInactivateCompany);
  const canReactivateCompanyPerm = useAppSelector(canReactivateCompany);

  const [form] = Form.useForm<CompanyFormValues>();
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

  const openCreateModal = () => {
    setEditingCompany(null);
    setActiveTab('principal');
    form.resetFields();
    setOpenModal(true);
  };

  const openEditModal = (company: CompanyListItem) => {
    setEditingCompany(company);
    setActiveTab('principal');
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

  const closeModal = () => {
    setOpenModal(false);
    setEditingCompany(null);
    form.resetFields();
  };

  const submitCompany = async () => {
    try {
      const values = await form.validateFields();
      const payload = normalizeCompanyPayload(values);
      setSaving(true);

      if (editingCompany) {
        await updateCompany(editingCompany.id, payload);
        message.success('Empresa actualizada correctamente');
      } else {
        await createCompany(payload);
        message.success('Empresa creada correctamente');
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
      sorter: (a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''),
      render: (_, company) => company.nombre || '-',
    },
    {
      title: 'CÉDULA EMPRESA',
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
      title: 'TELÉFONO EMPRESA',
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
                <h2 className={styles.gestionTitle}>Gestión de Empresas</h2>
                <p className={styles.gestionDesc}>
                  Administre y consulte todas las empresas registradas en el sistema
                </p>
              </div>
            </Flex>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className={`${styles.actionButton} ${styles.btnPrimary}`}
              disabled={!canCreateCompanyPerm}
              onClick={openCreateModal}
            >
              Crear Empresa
            </Button>
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
                          ×
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
        open={openModal}
        onCancel={closeModal}
        onOk={() => void submitCompany()}
        okText={editingCompany ? 'Guardar cambios' : 'Crear Empresa'}
        cancelText="Cancelar"
        confirmLoading={saving}
        width={920}
        destroyOnHidden
        title={(
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={10}>
              <BankOutlined />
              <span>{editingCompany ? 'Editar Empresa' : 'Crear Nueva Empresa'}</span>
            </Flex>
            <Flex align="center" gap={8}>
              <span style={{ color: '#6b7a85', fontSize: 13 }}>Activo</span>
              <Switch checked={editingCompany ? editingCompany.estado === 1 : true} disabled />
            </Flex>
          </Flex>
        )}
      >
        <Form<CompanyFormValues>
          layout="vertical"
          form={form}
          preserve={false}
          initialValues={{ prefijo: '' }}
        >
          {editingCompany && (
            <Flex gap={12} style={{ marginBottom: 16 }} wrap="wrap">
              {editingCompany.estado === 1 ? (
                <Popconfirm
                  title="¿Inactivar empresa?"
                  description="La empresa no se elimina. Solo quedará inactiva."
                  onConfirm={async () => {
                    await handleInactivate(editingCompany);
                    closeModal();
                  }}
                  okText="Inactivar"
                  cancelText="Cancelar"
                  disabled={!canInactivateCompanyPerm}
                >
                  <Button
                    icon={<StopOutlined />}
                    disabled={!canInactivateCompanyPerm}
                    className={`${styles.actionButton} ${styles.btnSecondary}`}
                  >
                    Inactivar Empresa
                  </Button>
                </Popconfirm>
              ) : (
                <Popconfirm
                  title="¿Reactivar empresa?"
                  description="La empresa volverá a estar disponible para asignaciones."
                  onConfirm={async () => {
                    await handleReactivate(editingCompany);
                    closeModal();
                  }}
                  okText="Reactivar"
                  cancelText="Cancelar"
                  disabled={!canReactivateCompanyPerm}
                >
                  <Button
                    icon={<CheckCircleOutlined />}
                    disabled={!canReactivateCompanyPerm}
                    className={`${styles.actionButton} ${styles.btnSecondary}`}
                  >
                    Reactivar Empresa
                  </Button>
                </Popconfirm>
              )}
            </Flex>
          )}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'principal',
                label: 'Información Principal',
                children: (
                  <>
                    <Card variant="borderless" style={{ background: '#f7f8fa', border: '1px solid #e8ecf0', marginBottom: 16 }}>
                      <Flex align="center" gap={14}>
                        <Upload.Dragger
                          name="logo"
                          multiple={false}
                          disabled
                          style={{ maxWidth: 160 }}
                        >
                          <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                          </p>
                          <p className="ant-upload-text">Logo</p>
                        </Upload.Dragger>
                        <div>
                          <p style={{ margin: 0, color: '#3d4f5c', fontWeight: 600 }}>Logo de la Empresa</p>
                          <p style={{ margin: '4px 0 0', color: '#6b7a85', fontSize: 12 }}>
                            Formato PNG, JPG o SVG. Máximo 5MB (UI preparada para integración).
                          </p>
                        </div>
                      </Flex>
                    </Card>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="nombre" label="Nombre Empresa" rules={[{ required: true, message: 'Ingrese el nombre de empresa' }]}>
                          <Input maxLength={200} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="nombreLegal" label="Nombre Legal Empresa" rules={[{ required: true, message: 'Ingrese el nombre legal' }]}>
                          <Input maxLength={300} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={12}>
                      <Col span={8}>
                        <Form.Item name="cedula" label="Cédula Empresa" rules={[{ required: true, message: 'Ingrese la cédula' }]}>
                          <Input maxLength={50} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="actividadEconomica" label="Actividad Económica">
                          <Input maxLength={300} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="prefijo" label="Prefijo Empresa" rules={[{ required: true, message: 'Ingrese el prefijo' }]}>
                          <Input maxLength={10} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={12}>
                      <Col span={8}>
                        <Form.Item name="idExterno" label="ID Externo Empresa">
                          <Input maxLength={100} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="email" label="Email Empresa" rules={[{ type: 'email', message: 'Formato de correo inválido' }]}>
                          <Input maxLength={150} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="telefono" label="Teléfono Empresa">
                          <Input maxLength={30} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: 'direccion',
                label: 'Dirección',
                children: (
                  <Row gutter={12}>
                    <Col span={16}>
                      <Form.Item name="direccionExacta" label="Dirección Exacta">
                        <Input.TextArea rows={4} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="codigoPostal" label="Código Postal">
                        <Input maxLength={20} />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'financiera',
                label: 'Información Financiera',
                children: (
                  <Alert
                    className={`${styles.infoBanner} ${styles.infoType}`}
                    type="info"
                    showIcon
                    title="Sección de continuidad"
                    description="Esta sección usa los campos disponibles actualmente en BD. Está preparada para ampliar cuenta bancaria, moneda y tributación en una siguiente iteración."
                  />
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </div>
  );
}
