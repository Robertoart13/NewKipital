import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  App as AntdApp,
  Button,
  Card,
  Collapse,
  DatePicker,
  Divider,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '../../../store/hooks';
import {
  canCreatePayrollHolidays,
  canDeletePayrollHolidays,
  canEditPayrollHolidays,
} from '../../../store/selectors/permissions.selectors';
import {
  createPayrollHoliday,
  deletePayrollHoliday,
  fetchPayrollHolidays,
  payrollHolidayTypeLabel,
  type PayrollHolidayItem,
  type PayrollHolidayPayload,
  updatePayrollHoliday,
} from '../../../api/payrollHolidays';
import styles from '../configuration/UsersManagementPage.module.css';

const { Text } = Typography;

interface HolidayFormValues {
  nombre: string;
  tipo: PayrollHolidayItem['tipo'];
  fechaInicio: dayjs.Dayjs;
  fechaFin: dayjs.Dayjs;
  descripcion?: string;
}

interface HolidayFilters {
  search: string;
  tipo?: PayrollHolidayItem['tipo'];
  rango?: [dayjs.Dayjs, dayjs.Dayjs];
}

const HOLIDAY_TYPE_OPTIONS = [
  { label: 'Obligatorio Pago Doble', value: 'OBLIGATORIO_PAGO_DOBLE' },
  { label: 'Obligatorio Pago Simple', value: 'OBLIGATORIO_PAGO_SIMPLE' },
  { label: 'Movible', value: 'MOVIBLE' },
  { label: 'No Obligatorio', value: 'NO_OBLIGATORIO' },
] satisfies Array<{ label: string; value: PayrollHolidayItem['tipo'] }>;

export function PayrollHolidaysPage() {
  const { message, modal } = AntdApp.useApp();
  const canCreate = useAppSelector(canCreatePayrollHolidays);
  const canEdit = useAppSelector(canEditPayrollHolidays);
  const canDelete = useAppSelector(canDeletePayrollHolidays);

  const [rows, setRows] = useState<PayrollHolidayItem[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filters, setFilters] = useState<HolidayFilters>({
    search: '',
    tipo: undefined,
    rango: undefined,
  });
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PayrollHolidayItem | null>(null);
  const [form] = Form.useForm<HolidayFormValues>();

  const loadRows = async () => {
    setLoading(true);
    try {
      const data = await fetchPayrollHolidays();
      setRows(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'No se pudieron cargar los feriados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const searchValue = filters.search.trim().toLowerCase();
    const rangeStart = filters.rango?.[0]?.startOf('day');
    const rangeEnd = filters.rango?.[1]?.endOf('day');

    return rows.filter((row) => {
      if (filters.tipo && row.tipo !== filters.tipo) return false;

      if (searchValue) {
        const text = `${row.nombre} ${row.descripcion ?? ''}`.toLowerCase();
        if (!text.includes(searchValue)) return false;
      }

      if (rangeStart && rangeEnd) {
        const holidayStart = dayjs(row.fechaInicio).startOf('day');
        const holidayEnd = dayjs(row.fechaFin).endOf('day');
        const overlapsRange = !holidayEnd.isBefore(rangeStart) && !holidayStart.isAfter(rangeEnd);
        if (!overlapsRange) return false;
      }

      return true;
    });
  }, [filters.rango, filters.search, filters.tipo, rows]);

  const openCreateModal = () => {
    if (!canCreate) {
      message.error('No tiene permiso para crear feriados.');
      return;
    }
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ descripcion: '--' });
    setOpenModal(true);
  };

  const openEditModal = (row: PayrollHolidayItem) => {
    if (!canEdit) {
      message.error('No tiene permiso para editar feriados.');
      return;
    }
    setEditing(row);
    form.setFieldsValue({
      nombre: row.nombre,
      tipo: row.tipo,
      fechaInicio: dayjs(row.fechaInicio),
      fechaFin: dayjs(row.fechaFin),
      descripcion: row.descripcion ?? '--',
    });
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    form.resetFields();
  };

  const columns: ColumnsType<PayrollHolidayItem> = useMemo(() => [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    {
      title: 'Tipo de feriado',
      key: 'tipo',
      render: (_, row) => <Tag>{payrollHolidayTypeLabel(row.tipo)}</Tag>,
    },
    { title: 'Fecha inicio', dataIndex: 'fechaInicio', key: 'fechaInicio' },
    { title: 'Fecha fin', dataIndex: 'fechaFin', key: 'fechaFin' },
    {
      title: 'Descripcion',
      key: 'descripcion',
      render: (_, row) => row.descripcion?.trim() || '--',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, row) => (
        <Space>
          <Tooltip title="Editar informacion del feriado seleccionado">
            <Button
              icon={<EditOutlined />}
              size="small"
              disabled={!canEdit}
              onClick={(event) => {
                event.stopPropagation();
                openEditModal(row);
              }}
            >
              Editar
            </Button>
          </Tooltip>
          <Tooltip title="Eliminar este feriado del catalogo">
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              disabled={!canDelete}
              onClick={(event) => {
                event.stopPropagation();
                void (async () => {
                  const confirmed = await new Promise<boolean>((resolve) => {
                    modal.confirm({
                      title: 'Confirmar eliminacion de feriado',
                      content: `Se eliminara el feriado "${row.nombre}". Esta accion no se puede deshacer.`,
                      icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
                      okText: 'Eliminar',
                      cancelText: 'Cancelar',
                      centered: true,
                      width: 420,
                      rootClassName: styles.companyConfirmModal,
                      okButtonProps: { className: styles.companyConfirmOk, danger: true },
                      cancelButtonProps: { className: styles.companyConfirmCancel },
                      onOk: () => resolve(true),
                      onCancel: () => resolve(false),
                    });
                  });
                  if (!confirmed) return;
                  try {
                    await deletePayrollHoliday(row.id);
                    message.success('Feriado eliminado correctamente.');
                    await loadRows();
                  } catch (error) {
                    message.error(error instanceof Error ? error.message : 'No se pudo eliminar el feriado.');
                  }
                })();
              }}
            >
              Eliminar
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ], [canDelete, canEdit, message, modal]);

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: PayrollHolidayPayload = {
        nombre: values.nombre.trim(),
        tipo: values.tipo,
        fechaInicio: values.fechaInicio.format('YYYY-MM-DD'),
        fechaFin: values.fechaFin.format('YYYY-MM-DD'),
        descripcion: values.descripcion?.trim() || '--',
      };
      setSaving(true);
      if (editing) {
        await updatePayrollHoliday(editing.id, payload);
        message.success('Feriado actualizado correctamente.');
      } else {
        await createPayrollHoliday(payload);
        message.success('Feriado creado correctamente.');
      }
      closeModal();
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
          <Link className={styles.pageBackLink} to="/payroll-params">
            <ArrowLeftOutlined />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Listado de Feriados</h1>
            <p className={styles.pageSubtitle}>Visualice y gestione los feriados para control de planilla</p>
          </div>
        </div>
      </div>

      <Card className={styles.mainCard} style={{ marginBottom: 20 }}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={16}>
            <Flex align="center" gap={16}>
              <div className={styles.gestionIconWrap}>
                <CalendarOutlined className={styles.gestionIcon} />
              </div>
              <div>
                <h2 className={styles.gestionTitle}>Gestion de Feriados</h2>
                <p className={styles.gestionDesc}>Configure feriados por tipo para aplicacion en procesos de planilla</p>
              </div>
            </Flex>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className={`${styles.actionButton} ${styles.btnPrimary}`}
              disabled={!canCreate}
              onClick={openCreateModal}
            >
              Crear feriado
            </Button>
          </Flex>
        </div>
      </Card>

      <Card className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={12} className={styles.registrosHeader}>
            <Flex align="center" gap={8} wrap="wrap">
              <FilterOutlined className={styles.registrosFilterIcon} />
              <h3 className={styles.registrosTitle}>Registros de Feriados</h3>
              <Select
                value={pageSize}
                style={{ width: 70 }}
                options={[10, 20, 50].map((size) => ({ label: size, value: size }))}
                onChange={(value) => setPageSize(value)}
              />
              <Text style={{ color: '#6b7a85' }}>entries per page</Text>
            </Flex>
            <Flex align="center" gap={12} wrap="wrap">
              <Button icon={<ReloadOutlined />} onClick={() => void loadRows()}>
                Refrescar
              </Button>
            </Flex>
          </Flex>

          <Collapse
            className={styles.filtersCollapse}
            activeKey={filtersExpanded ? ['filtros'] : []}
            onChange={(keys) => setFiltersExpanded((Array.isArray(keys) ? keys : [keys]).includes('filtros'))}
            items={[
              {
                key: 'filtros',
                label: 'Filtros',
                children: (
                  <Flex gap={12} wrap="wrap" align="end">
                    <div style={{ minWidth: 240 }}>
                      <span className={styles.filterLabel}>Buscar</span>
                      <Input
                        placeholder="Nombre o descripcion..."
                        prefix={<SearchOutlined />}
                        value={filters.search}
                        onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                        allowClear
                        className={styles.filterInput}
                      />
                    </div>
                    <div style={{ minWidth: 240 }}>
                      <span className={styles.filterLabel}>Tipo de feriado</span>
                      <Select
                        allowClear
                        placeholder="Seleccione tipo"
                        options={HOLIDAY_TYPE_OPTIONS}
                        value={filters.tipo}
                        onChange={(value) => setFilters((prev) => ({ ...prev, tipo: value }))}
                        style={{ width: '100%' }}
                        showSearch
                        optionFilterProp="label"
                        filterOption={(input, option) =>
                          String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </div>
                    <div style={{ minWidth: 280 }}>
                      <span className={styles.filterLabel}>Rango de fechas</span>
                      <DatePicker.RangePicker
                        value={filters.rango}
                        onChange={(range) => {
                          const start = range?.[0] ?? null;
                          const end = range?.[1] ?? null;
                          if (!start || !end) {
                            setFilters((prev) => ({ ...prev, rango: undefined }));
                            return;
                          }
                          setFilters((prev) => ({
                            ...prev,
                            rango: [start.startOf('day'), end.startOf('day')],
                          }));
                        }}
                        format="YYYY-MM-DD"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <Button
                      onClick={() =>
                        setFilters({
                          search: '',
                          tipo: undefined,
                          rango: undefined,
                        })
                      }
                    >
                      Limpiar filtros
                    </Button>
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
              pageSize,
              showSizeChanger: false,
              showTotal: (total, [start, end]) => `Mostrando ${start} a ${end} de ${total} registros`,
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
        width={760}
        destroyOnHidden
        title={(
          <Flex justify="space-between" align="center" wrap="nowrap" style={{ width: '100%', gap: 16 }}>
            <div className={styles.companyModalHeader}>
              <div className={styles.companyModalHeaderIcon}>
                <AppstoreOutlined />
              </div>
              <span>{editing ? 'Editar Feriado' : 'Crear Feriado'}</span>
            </div>
            <Button
              type="text"
              icon={<PlusOutlined rotate={45} />}
              onClick={closeModal}
              aria-label="Cerrar"
              className={styles.companyModalCloseBtn}
            />
          </Flex>
        )}
      >
        <Form form={form} layout="vertical" initialValues={{ descripcion: '--' }} onFinish={onSubmit} className={styles.companyFormContent}>
          <div className={styles.companyFormGrid}>
            <Divider titlePlacement="left" style={{ margin: '8px 0 12px' }}>
              Informacion Principal
            </Divider>
            <Flex gap={12}>
              <Form.Item
                style={{ flex: 1 }}
                name="nombre"
                label="Nombre del feriado *"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
              >
                <Input maxLength={200} placeholder="Nombre del feriado" />
              </Form.Item>
              <Form.Item
                style={{ flex: 1 }}
                name="tipo"
                label="Tipo de feriado *"
                rules={[{ required: true, message: 'El tipo es obligatorio' }]}
              >
                <Select
                  options={HOLIDAY_TYPE_OPTIONS}
                  showSearch
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  placeholder="Seleccione tipo de feriado"
                />
              </Form.Item>
            </Flex>
            <Flex gap={12}>
              <Form.Item
                style={{ flex: 1 }}
                name="fechaInicio"
                label="Fecha inicio *"
                rules={[{ required: true, message: 'La fecha inicio es obligatoria' }]}
              >
                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                style={{ flex: 1 }}
                name="fechaFin"
                label="Fecha fin *"
                rules={[
                  { required: true, message: 'La fecha fin es obligatoria' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value) return Promise.resolve();
                      const start = getFieldValue('fechaInicio');
                      if (!start || !value.isBefore(start, 'day')) return Promise.resolve();
                      return Promise.reject(new Error('La fecha fin no puede ser menor que la fecha inicio'));
                    },
                  }),
                ]}
              >
                <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
              </Form.Item>
            </Flex>
            <Form.Item name="descripcion" label="Descripcion">
              <Input.TextArea rows={4} maxLength={2000} placeholder="Descripcion del feriado" />
            </Form.Item>
          </div>
          <div className={styles.companyModalFooter}>
            <Button onClick={closeModal} className={styles.btnSecondary}>
              Cancelar
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlusOutlined />}
              loading={saving}
              className={`${styles.actionButton} ${styles.btnPrimary}`}
            >
              {editing ? 'Guardar cambios' : 'Crear Feriado'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
