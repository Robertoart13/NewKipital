import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  App as AntdApp,
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
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
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  StopOutlined,
  CheckCircleOutlined,
  SearchOutlined,
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
  const [search, setSearch] = useState('');
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

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return companies;
    return companies.filter((company) =>
      (company.nombre ?? '').toLowerCase().includes(term)
      || (company.nombreLegal ?? '').toLowerCase().includes(term)
      || (company.cedula ?? '').toLowerCase().includes(term)
      || (company.prefijo ?? '').toLowerCase().includes(term));
  }, [companies, search]);

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
      title: 'Empresa',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (_, company) => (
        <div>
          <p className={styles.userCellName}>{company.nombre}</p>
          <p className={styles.userCellEmail}>{company.nombreLegal ?? 'Sin nombre legal'}</p>
        </div>
      ),
    },
    {
      title: 'Cédula',
      dataIndex: 'cedula',
      key: 'cedula',
      width: 180,
      render: (value) => value || '-',
    },
    {
      title: 'Prefijo',
      dataIndex: 'prefijo',
      key: 'prefijo',
      width: 120,
      render: (value) => value || '-',
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 120,
      render: (_, company) => (
        <Tag className={company.estado === 1 ? styles.tagActivo : styles.tagInactivo}>
          {company.estado === 1 ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 220,
      render: (_, company) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            className={`${styles.actionButton} ${styles.btnSecondary}`}
            disabled={!canEditCompanyPerm}
            onClick={() => openEditModal(company)}
          >
            Editar
          </Button>
          {company.estado === 1 ? (
            <Popconfirm
              title="¿Inactivar empresa?"
              description="La empresa no se elimina. Solo quedará inactiva."
              onConfirm={() => void handleInactivate(company)}
              okText="Inactivar"
              cancelText="Cancelar"
              disabled={!canInactivateCompanyPerm}
            >
              <Button size="small" icon={<StopOutlined />} disabled={!canInactivateCompanyPerm}>
                Inactivar
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="¿Reactivar empresa?"
              description="La empresa volverá a estar disponible para asignaciones."
              onConfirm={() => void handleReactivate(company)}
              okText="Reactivar"
              cancelText="Cancelar"
              disabled={!canReactivateCompanyPerm}
            >
              <Button size="small" icon={<CheckCircleOutlined />} disabled={!canReactivateCompanyPerm}>
                Reactivar
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link className={styles.pageBackLink} to="/dashboard">
            <ArrowLeftOutlined />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Empresas</h1>
            <p className={styles.pageSubtitle}>Gestión de organización y datos legales/fiscales</p>
          </div>
        </div>
      </div>

      <Card className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          <Alert
            className={`${styles.infoBanner} ${styles.infoType}`}
            type="info"
            showIcon
            title="Para qué sirve"
            description="Administra las empresas del sistema. La inactivación es lógica (no se elimina histórico ni relaciones)."
          />

          <div className={styles.controlBar}>
            <Input
              placeholder="Buscar por nombre, cédula o prefijo"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 420 }}
            />
            <Flex align="center" gap={8}>
              <span style={{ color: '#6b7a85', fontSize: 13 }}>Mostrar inactivas</span>
              <Switch checked={showInactive} onChange={setShowInactive} />
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
          </div>

          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredCompanies}
            className={styles.configTable}
            pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} empresa(s)` }}
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
