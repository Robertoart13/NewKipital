import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  App as AntdApp,
  Button,
  Card,
  Collapse,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '../../../store/hooks';
import {
  hasPermission,
} from '../../../store/selectors/permissions.selectors';
import {
  approvePersonalAction,
  createPersonalAction,
  fetchPersonalActions,
  rejectPersonalAction,
  type PersonalActionListItem,
} from '../../../api/personalActions';
import { fetchEmployees, type EmployeeListItem } from '../../../api/employees';
import { fetchPayrolls, type PayrollListItem } from '../../../api/payroll';
import styles from '../configuration/UsersManagementPage.module.css';

const { Text } = Typography;

interface PersonalActionFormValues {
  idEmpleado: number;
  tipoAccion: string;
  descripcion?: string;
  fechaEfecto?: Dayjs;
  monto?: number;
  helperPlanillaId?: number;
}

export interface PersonalActionsPageProps {
  pageTitle?: string;
  pageSubtitle?: string;
  fixedTipoAccion?: string;
  viewPermission?: string;
  createPermission?: string;
  approvePermission?: string;
}

const ESTADO_LABEL: Record<number, { text: string; color: string }> = {
  1: { text: 'Borrador', color: 'default' },
  2: { text: 'Pendiente Supervisor', color: 'orange' },
  3: { text: 'Pendiente RRHH', color: 'gold' },
  4: { text: 'Aprobada', color: 'green' },
  5: { text: 'Consumida', color: 'cyan' },
  6: { text: 'Cancelada', color: 'red' },
  7: { text: 'Invalidada', color: 'volcano' },
  8: { text: 'Expirada', color: 'magenta' },
  9: { text: 'Rechazada', color: 'red' },
};

const TIPO_ACCION_SUGERIDA = [
  'AUSENCIA',
  'INCAPACIDAD',
  'LICENCIA',
  'BONIFICACION',
  'DESCUENTO',
  'AUMENTO',
] as const;

function getEstadoTag(estado: number) {
  const meta = ESTADO_LABEL[estado] ?? { text: `Estado ${estado}`, color: 'default' };
  return <Tag color={meta.color}>{meta.text}</Tag>;
}

function canApproveOrReject(estado: number) {
  return estado === 2 || estado === 3;
}

export function PersonalActionsPage({
  pageTitle = 'Acciones de Personal',
  pageSubtitle = 'Gestione acciones de personal por empresa para integracion con planilla',
  fixedTipoAccion,
  createPermission = 'hr_action:create',
  approvePermission = 'hr_action:approve',
}: PersonalActionsPageProps = {}) {
  const { message, modal } = AntdApp.useApp();
  const [form] = Form.useForm<PersonalActionFormValues>();

  const canCreate = useAppSelector((state) => hasPermission(state, createPermission));
  const canApprove = useAppSelector((state) => hasPermission(state, approvePermission));
  const companies = useAppSelector((state) => state.auth.companies);
  const activeCompany = useAppSelector((state) => state.activeCompany.company);

  const defaultCompanyId = useMemo(() => {
    const active = Number(activeCompany?.id);
    if (Number.isFinite(active) && active > 0) return active;
    const first = Number(companies[0]?.id);
    return Number.isFinite(first) && first > 0 ? first : undefined;
  }, [activeCompany?.id, companies]);

  const [companyId, setCompanyId] = useState<number | undefined>(defaultCompanyId);
  const [estado, setEstado] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<PersonalActionListItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [payrollHelpers, setPayrollHelpers] = useState<PayrollListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedHelperId = Form.useWatch('helperPlanillaId', form);

  const selectedHelper = useMemo(
    () => payrollHelpers.find((item) => item.id === selectedHelperId),
    [payrollHelpers, selectedHelperId],
  );

  const loadRows = useCallback(async () => {
    if (!companyId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPersonalActions(String(companyId), estado);
      setRows(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'No se pudieron cargar las acciones.');
    } finally {
      setLoading(false);
    }
  }, [companyId, estado, message]);

  const loadHelpers = useCallback(async () => {
    if (!companyId) {
      setEmployees([]);
      setPayrollHelpers([]);
      return;
    }

    try {
      const [employeeResp, payrollResp] = await Promise.all([
        fetchEmployees(String(companyId), { page: 1, pageSize: 300, includeInactive: false }),
        fetchPayrolls(String(companyId), true),
      ]);
      setEmployees(employeeResp.data);
      setPayrollHelpers(payrollResp.filter((payroll) => payroll.estado === 1 || payroll.estado === 2));
    } catch {
      setEmployees([]);
      setPayrollHelpers([]);
    }
  }, [companyId]);

  useEffect(() => {
    if (defaultCompanyId && !companyId) {
      setCompanyId(defaultCompanyId);
    }
  }, [companyId, defaultCompanyId]);

  useEffect(() => {
    void loadRows();
    void loadHelpers();
  }, [loadRows, loadHelpers]);

  useEffect(() => {
    if (!selectedHelper) return;
    const currentDate = form.getFieldValue('fechaEfecto') as Dayjs | undefined;
    if (!currentDate) {
      form.setFieldValue('fechaEfecto', dayjs(selectedHelper.fechaFinPeriodo));
    }
  }, [form, selectedHelper]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const baseRows = fixedTipoAccion
      ? rows.filter((row) => row.tipoAccion.trim().toLowerCase() === fixedTipoAccion.trim().toLowerCase())
      : rows;
    if (!term) return baseRows;
    return baseRows.filter((row) => {
      const text = `${row.tipoAccion} ${row.descripcion ?? ''} ${row.idEmpleado}`.toLowerCase();
      return text.includes(term);
    });
  }, [rows, search, fixedTipoAccion]);

  const columns: ColumnsType<PersonalActionListItem> = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 90 },
      { title: 'Empleado', dataIndex: 'idEmpleado', key: 'idEmpleado', width: 110 },
      { title: 'Tipo Accion', dataIndex: 'tipoAccion', key: 'tipoAccion', width: 160 },
      {
        title: 'Estado',
        dataIndex: 'estado',
        key: 'estado',
        width: 170,
        render: (value: number) => getEstadoTag(value),
      },
      {
        title: 'Fecha efecto',
        dataIndex: 'fechaEfecto',
        key: 'fechaEfecto',
        width: 130,
        render: (value: string | null | undefined) => (value ? dayjs(value).format('YYYY-MM-DD') : '--'),
      },
      {
        title: 'Monto',
        dataIndex: 'monto',
        key: 'monto',
        width: 120,
        render: (value: number | null | undefined) =>
          value != null ? Number(value).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--',
      },
      {
        title: 'Descripcion',
        dataIndex: 'descripcion',
        key: 'descripcion',
        render: (value: string | null | undefined) => (value?.trim() ? value : '--'),
      },
      {
        title: 'Acciones',
        key: 'acciones',
        width: 230,
        render: (_, row) => (
          <Space>
            <Button
              size="small"
              icon={<CheckOutlined />}
              disabled={!canApprove || !canApproveOrReject(row.estado)}
              onClick={() => {
                modal.confirm({
                  title: 'Confirmar aprobacion',
                  content: `Se aprobara la accion #${row.id}.`,
                  okText: 'Aprobar',
                  cancelText: 'Cancelar',
                  onOk: async () => {
                    try {
                      await approvePersonalAction(row.id);
                      message.success('Accion aprobada correctamente.');
                      await loadRows();
                    } catch (error) {
                      message.error(error instanceof Error ? error.message : 'No se pudo aprobar la accion.');
                    }
                  },
                });
              }}
            >
              Aprobar
            </Button>
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              disabled={!canApprove || !canApproveOrReject(row.estado)}
              onClick={() => {
                modal.confirm({
                  title: 'Confirmar rechazo',
                  content: `Se rechazara la accion #${row.id}.`,
                  okText: 'Rechazar',
                  cancelText: 'Cancelar',
                  onOk: async () => {
                    try {
                      await rejectPersonalAction(row.id, 'Rechazado por usuario responsable');
                      message.success('Accion rechazada correctamente.');
                      await loadRows();
                    } catch (error) {
                      message.error(error instanceof Error ? error.message : 'No se pudo rechazar la accion.');
                    }
                  },
                });
              }}
            >
              Rechazar
            </Button>
          </Space>
        ),
      },
    ],
    [canApprove, loadRows, message, modal],
  );

  const handleOpenCreate = () => {
    if (!canCreate) {
      message.error('No tiene permiso para crear acciones de personal.');
      return;
    }
    form.resetFields();
    form.setFieldsValue({ descripcion: '--', ...(fixedTipoAccion ? { tipoAccion: fixedTipoAccion } : {}) });
    setCreateOpen(true);
  };

  const handleSubmit = async () => {
    if (!companyId) {
      message.error('Seleccione una empresa antes de crear la accion.');
      return;
    }

    try {
      const values = await form.validateFields();
      setSaving(true);
      await createPersonalAction({
        idEmpresa: companyId,
        idEmpleado: values.idEmpleado,
        tipoAccion: values.tipoAccion.trim(),
        descripcion: values.descripcion?.trim() || undefined,
        fechaEfecto: values.fechaEfecto ? values.fechaEfecto.format('YYYY-MM-DD') : undefined,
        monto: values.monto != null ? Number(values.monto) : undefined,
      });
      message.success('Accion de personal creada correctamente.');
      setCreateOpen(false);
      form.resetFields();
      await loadRows();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link className={styles.pageBackLink} to="/dashboard">
            <ArrowLeftOutlined />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
            <p className={styles.pageSubtitle}>{pageSubtitle}</p>
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
                <h2 className={styles.gestionTitle}>Bandeja de Acciones</h2>
                <p className={styles.gestionDesc}>Listado, aprobacion y rechazo de acciones segun el flujo de RRHH y Supervisor</p>
              </div>
            </Flex>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className={`${styles.actionButton} ${styles.btnPrimary}`}
              disabled={!canCreate}
              onClick={handleOpenCreate}
            >
              Nueva accion
            </Button>
          </Flex>
        </div>
      </Card>

      <Card className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={12} className={styles.registrosHeader}>
            <Flex align="center" gap={8} wrap="wrap">
              <FilterOutlined className={styles.registrosFilterIcon} />
              <h3 className={styles.registrosTitle}>Registros de Acciones</h3>
              <Text style={{ color: '#6b7a85' }}>{filteredRows.length} registro(s)</Text>
            </Flex>
            <Button icon={<ReloadOutlined />} onClick={() => void loadRows()}>
              Refrescar
            </Button>
          </Flex>

          <Collapse
            className={styles.filtersCollapse}
            activeKey={filtersOpen ? ['filtros'] : []}
            onChange={(keys) => setFiltersOpen((Array.isArray(keys) ? keys : [keys]).includes('filtros'))}
            items={[
              {
                key: 'filtros',
                label: 'Filtros',
                children: (
                  <Flex gap={12} wrap="wrap" align="end">
                    <div style={{ minWidth: 260 }}>
                      <span className={styles.filterLabel}>Empresa</span>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        style={{ width: '100%' }}
                        value={companyId}
                        placeholder="Seleccione empresa"
                        options={companies.map((company) => ({
                          value: Number(company.id),
                          label: company.nombre,
                        }))}
                        onChange={(value) => setCompanyId(Number(value))}
                      />
                    </div>
                    <div style={{ minWidth: 240 }}>
                      <span className={styles.filterLabel}>Estado</span>
                      <Select
                        allowClear
                        style={{ width: '100%' }}
                        placeholder="Todos"
                        value={estado}
                        options={Object.entries(ESTADO_LABEL).map(([value, meta]) => ({
                          value: Number(value),
                          label: meta.text,
                        }))}
                        onChange={(value) => setEstado(value)}
                      />
                    </div>
                    <div style={{ minWidth: 260 }}>
                      <span className={styles.filterLabel}>Buscar</span>
                      <Input
                        allowClear
                        value={search}
                        placeholder="Tipo, descripcion o empleado"
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </div>
                  </Flex>
                ),
              },
            ]}
          />

          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredRows}
            className={`${styles.configTable} ${styles.companiesTable}`}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total, [start, end]) => `Mostrando ${start} a ${end} de ${total} registros`,
            }}
          />
        </div>
      </Card>

      <Modal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        title="Crear Accion de Personal"
        okText="Crear accion"
        cancelText="Cancelar"
        confirmLoading={saving}
        onOk={() => void handleSubmit()}
        width={860}
      >
        <Form form={form} layout="vertical">
          <Flex gap={12} wrap="wrap">
            <Form.Item label="Empresa" style={{ flex: '1 1 260px' }}>
              <Input
                value={companies.find((company) => Number(company.id) === companyId)?.nombre ?? '--'}
                disabled
              />
            </Form.Item>
            <Form.Item
              name="idEmpleado"
              label="Empleado"
              rules={[{ required: true, message: 'Seleccione un empleado' }]}
              style={{ flex: '1 1 320px' }}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Seleccione empleado"
                options={employees.map((employee) => ({
                  value: employee.id,
                  label: `${employee.nombre} ${employee.apellido1} (${employee.codigo})`,
                }))}
              />
            </Form.Item>
          </Flex>

          <Flex gap={12} wrap="wrap">
            <Form.Item
              name="tipoAccion"
              label="Tipo Accion"
              rules={[{ required: true, message: 'Digite o seleccione el tipo de accion' }]}
              style={{ flex: '1 1 260px' }}
            >
              <Select
                showSearch
                disabled={!!fixedTipoAccion}
                placeholder="Seleccione tipo"
                options={[
                  ...TIPO_ACCION_SUGERIDA.map((tipo) => ({ value: tipo, label: tipo })),
                  ...(fixedTipoAccion && !TIPO_ACCION_SUGERIDA.includes(fixedTipoAccion as any)
                    ? [{ value: fixedTipoAccion, label: fixedTipoAccion }]
                    : []),
                ]}
              />
            </Form.Item>
            <Form.Item name="fechaEfecto" label="Fecha Efecto" style={{ flex: '1 1 220px' }}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="monto" label="Monto" style={{ flex: '1 1 180px' }}>
              <InputNumber min={0} precision={6} style={{ width: '100%' }} />
            </Form.Item>
          </Flex>

          <Form.Item name="descripcion" label="Descripcion">
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>

          <Form.Item name="helperPlanillaId" label="Planilla de referencia (helper)">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Opcional: usar planilla para sugerir fecha"
              options={payrollHelpers.map((payroll) => ({
                value: payroll.id,
                label: `${payroll.nombrePlanilla ?? `Planilla #${payroll.id}`} | ${payroll.moneda ?? 'CRC'} | ${payroll.fechaInicioPeriodo} a ${payroll.fechaFinPeriodo}`,
              }))}
            />
          </Form.Item>

          {selectedHelper && (
            <Card size="small" style={{ background: '#f8fafc', borderColor: '#dbe5ef' }}>
              <Text strong>Referencia de planilla seleccionada</Text>
              <div>Periodo: {selectedHelper.fechaInicioPeriodo} a {selectedHelper.fechaFinPeriodo}</div>
              <div>Moneda: {selectedHelper.moneda ?? 'CRC'}</div>
              <div>Nota: se usa solo como apoyo visual, no enlaza la accion directamente al run.</div>
            </Card>
          )}
        </Form>
      </Modal>
    </div>
  );
}
