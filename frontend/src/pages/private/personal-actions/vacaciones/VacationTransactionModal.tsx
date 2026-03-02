import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App as AntdApp,
  Avatar,
  Button,
  Calendar,
  Card,
  Col,
  Collapse,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import {
  BankOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  MenuOutlined,
  IdcardOutlined,
  MailOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import type { CatalogPayPeriod } from '../../../../api/catalogs';
import type { PayrollMovementListItem } from '../../../../api/payrollMovements';
import type {
  PersonalActionAuditTrailItem,
  VacationAvailability,
  VacationBookedDateItem,
  VacationHolidayItem,
} from '../../../../api/personalActions';
import {
  fetchAbsencePayrollsCatalog,
  fetchVacationAvailability,
  fetchVacationBookedDates,
} from '../../../../api/personalActions';
import type { ColumnsType } from 'antd/es/table';
import { formatDateTime12h } from '../../../../lib/formatDate';
import sharedStyles from '../../configuration/UsersManagementPage.module.css';
import styles from './VacationTransactionModal.module.css';

export interface VacationDateSelection {
  key: string;
  fecha: Dayjs;
}

export interface VacationFormDraft {
  idEmpresa: number;
  idEmpleado: number;
  payrollId: number;
  movimientoId: number;
  observacion?: string;
  fechas: VacationDateSelection[];
}

interface VacationTransactionModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  title: string;
  companies: Array<{ id: number | string; nombre: string }>;
  employees: Array<{
    id: number;
    idEmpresa: number;
    codigo: string;
    nombre: string;
    apellido1: string;
    apellido2?: string | null;
    cedula?: string | null;
    email?: string | null;
    telefono?: string | null;
    jornada?: string | null;
    idPeriodoPago?: number | null;
    salarioBase?: number | null;
    monedaSalario?: string | null;
  }>;
  payPeriods: CatalogPayPeriod[];
  movements: PayrollMovementListItem[];
  holidays: VacationHolidayItem[];
  availability?: VacationAvailability | null;
  excludeActionId?: number;
  sourceOrigin?: string | null;
  canViewEmployeeSensitive?: boolean;
  employeesLoading?: boolean;
  movementsLoading?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  readOnlyMessage?: string;
  showAudit?: boolean;
  auditTrail?: PersonalActionAuditTrailItem[];
  loadingAuditTrail?: boolean;
  onLoadAuditTrail?: () => Promise<void> | void;
  initialCompanyId?: number;
  initialDraft?: VacationFormDraft;
  onCancel: () => void;
  onSubmit: (payload: VacationFormDraft) => Promise<void> | void;
}

interface HeaderValues {
  idEmpresa?: number;
  idEmpleado?: number;
  payrollId?: number;
  movimientoId?: number;
  observacion?: string;
}

function formatEmployeeLabel(
  emp: VacationTransactionModalProps['employees'][number],
  canViewEmployeeSensitive?: boolean,
) {
  const base = `${emp.nombre} ${emp.apellido1}${emp.apellido2 ? ` ${emp.apellido2}` : ''}`.trim();
  if (base) {
    return canViewEmployeeSensitive && emp.codigo
      ? `${base} (${emp.codigo})`
      : base;
  }
  return emp.codigo || 'Empleado sin codigo';
}

function isWeekend(date: Dayjs) {
  const day = date.day();
  return day === 0 || day === 6;
}

function isHoliday(date: Dayjs, holidays: VacationHolidayItem[]) {
  return holidays.some((holiday) => {
    const start = dayjs(holiday.fechaInicio);
    const end = dayjs(holiday.fechaFin);
    return (
      date.isSame(start, 'day') ||
      date.isSame(end, 'day') ||
      (date.isAfter(start, 'day') && date.isBefore(end, 'day'))
    );
  });
}

function buildDateKey(date: Dayjs) {
  const raw = date.toDate();
  const year = raw.getUTCFullYear();
  const month = raw.getUTCMonth() + 1;
  const day = raw.getUTCDate();
  const monthText = String(month).padStart(2, '0');
  const dayText = String(day).padStart(2, '0');
  return `${year}-${monthText}-${dayText}`;
}

function parseDateKey(key: string) {
  const [yearRaw, monthRaw, dayRaw] = key.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return dayjs(key);
  }
  return dayjs(new Date(year, month - 1, day));
}

function normalizeSelectionKey(rawKey: string, fecha: Dayjs) {
  if (rawKey && /^\d{4}-\d{2}-\d{2}/.test(rawKey)) {
    return rawKey.slice(0, 10);
  }
  return buildDateKey(fecha);
}

export function VacationTransactionModal(props: VacationTransactionModalProps) {
  const {
    open,
    mode,
    title,
    companies,
    employees,
    payPeriods,
    movements,
    holidays,
    availability,
    excludeActionId,
    sourceOrigin,
    canViewEmployeeSensitive,
    employeesLoading,
    movementsLoading,
    loading,
    readOnly,
    readOnlyMessage,
    showAudit,
    auditTrail,
    loadingAuditTrail,
    onLoadAuditTrail,
    initialCompanyId,
    initialDraft,
    onCancel,
    onSubmit,
  } = props;

  const [form] = Form.useForm<HeaderValues>();
  const { message, modal } = AntdApp.useApp();
  const [payrollOptions, setPayrollOptions] = useState<
    Array<{
      id: number;
      label: string;
      periodo: string;
      fechaInicioPeriodo: string;
      fechaFinPeriodo: string;
      idTipoPlanilla?: number | null;
      tipoPlanilla?: string | null;
    }>
  >([]);
  const [selectedDates, setSelectedDates] = useState<VacationDateSelection[]>([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [localAvailability, setLocalAvailability] = useState<VacationAvailability | null>(null);
  const [bookedDates, setBookedDates] = useState<VacationBookedDateItem[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'bitacora'>('info');
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [warnedInvalidDates, setWarnedInvalidDates] = useState(false);

  const selectedCompanyId = Form.useWatch('idEmpresa', form);
  const selectedEmployeeId = Form.useWatch('idEmpleado', form);
  const selectedPayrollId = Form.useWatch('payrollId', form);
  const selectedMovementId = Form.useWatch('movimientoId', form);

  useEffect(() => {
    if (!open) return;
    setActiveTab('info');
    setAuditLoaded(false);

    if (initialDraft) {
      form.setFieldsValue({
        idEmpresa: initialDraft.idEmpresa,
        idEmpleado: initialDraft.idEmpleado,
        payrollId: initialDraft.payrollId,
        movimientoId: initialDraft.movimientoId,
        observacion: initialDraft.observacion ?? undefined,
      });
      const normalizedSelections = (initialDraft.fechas ?? []).map((item) => {
        const baseKey = normalizeSelectionKey(item.key, item.fecha);
        return {
          key: baseKey,
          fecha: parseDateKey(baseKey),
        };
      });
      const filteredSelections = normalizedSelections.filter(
        (item) => !isWeekend(item.fecha) && !isHoliday(item.fecha, holidays),
      );
      if (!warnedInvalidDates && filteredSelections.length < normalizedSelections.length) {
        setWarnedInvalidDates(true);
        message.warning('Se removieron fechas inválidas (fin de semana o feriado).');
      }
      setSelectedDates(filteredSelections);
      setBookedDates([]);
      if (initialDraft.idEmpresa && initialDraft.idEmpleado) {
        void fetchVacationAvailability(
          Number(initialDraft.idEmpresa),
          Number(initialDraft.idEmpleado),
        )
          .then((resp) => setLocalAvailability(resp ?? null))
          .catch(() => setLocalAvailability(null));
        void fetchVacationBookedDates(
          Number(initialDraft.idEmpresa),
          Number(initialDraft.idEmpleado),
          excludeActionId,
        )
          .then((resp) => setBookedDates(resp ?? []))
          .catch(() => setBookedDates([]));
      }
      return;
    }

    form.resetFields();
    setSelectedDates([]);
    setBookedDates([]);
    setWarnedInvalidDates(false);
    if (initialCompanyId) {
      form.setFieldsValue({ idEmpresa: initialCompanyId });
    }
  }, [excludeActionId, form, holidays, initialCompanyId, initialDraft, message, open, warnedInvalidDates]);

  useEffect(() => {
    if (!open || !showAudit || activeTab !== 'bitacora' || auditLoaded || !onLoadAuditTrail) return;
    const load = async () => {
      await onLoadAuditTrail();
      setAuditLoaded(true);
    };
    void load();
  }, [activeTab, auditLoaded, onLoadAuditTrail, open, showAudit]);

  useEffect(() => {
    if (!selectedCompanyId || !selectedEmployeeId) {
      setPayrollOptions([]);
      setLocalAvailability(null);
      return;
    }

    setLoadingPayrolls(true);
    void fetchAbsencePayrollsCatalog(
      Number(selectedCompanyId),
      Number(selectedEmployeeId),
    )
      .then((items) => {
        const options = items.map((item) => ({
          id: item.id,
          label: `${item.nombrePlanilla ?? `Planilla #${item.id}`} (${item.fechaInicioPeriodo} - ${item.fechaFinPeriodo})`,
          periodo: `${item.fechaInicioPeriodo} - ${item.fechaFinPeriodo}`,
          fechaInicioPeriodo: item.fechaInicioPeriodo,
          fechaFinPeriodo: item.fechaFinPeriodo,
          idTipoPlanilla: item.idTipoPlanilla ?? null,
          tipoPlanilla: item.tipoPlanilla ?? null,
        }));
        setPayrollOptions(options);
      })
      .catch((error) => {
        message.error(error?.message ?? 'Error al cargar planillas elegibles');
        setPayrollOptions([]);
      })
      .finally(() => setLoadingPayrolls(false));
  }, [message, selectedCompanyId, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedCompanyId || !selectedEmployeeId) {
      setLocalAvailability(null);
      setBookedDates([]);
      return;
    }

    void fetchVacationAvailability(
      Number(selectedCompanyId),
      Number(selectedEmployeeId),
    )
      .then((resp) => setLocalAvailability(resp ?? null))
      .catch(() => setLocalAvailability(null));

    void fetchVacationBookedDates(
      Number(selectedCompanyId),
      Number(selectedEmployeeId),
      excludeActionId,
    )
      .then((resp) => {
        setBookedDates(resp ?? []);
        const bookedSet = new Set(
          (resp ?? [])
            .map((item) => item.fecha?.trim())
            .filter((value): value is string => !!value),
        );
        if (bookedSet.size > 0) {
          setSelectedDates((prev) =>
            prev.filter((item) => !bookedSet.has(item.key)),
          );
        }
      })
      .catch(() => setBookedDates([]));
  }, [excludeActionId, selectedCompanyId, selectedEmployeeId]);

  const filteredEmployees = useMemo(() => {
    if (!selectedCompanyId) return [];
    return employees.filter(
      (emp) => Number(emp.idEmpresa) === Number(selectedCompanyId),
    );
  }, [employees, selectedCompanyId]);

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return undefined;
    return employees.find((emp) => emp.id === Number(selectedEmployeeId));
  }, [employees, selectedEmployeeId]);

  const selectedPayPeriod = useMemo(() => {
    if (!selectedEmployee?.idPeriodoPago) return null;
    return payPeriods.find((p) => Number(p.id) === Number(selectedEmployee.idPeriodoPago)) ?? null;
  }, [payPeriods, selectedEmployee?.idPeriodoPago]);

  const sensitiveMaskedValue = '***';

  const movementOptions = useMemo(() => {
    if (!selectedCompanyId) return [];
    return movements.filter(
      (movement) => Number(movement.idEmpresa) === Number(selectedCompanyId),
    );
  }, [movements, selectedCompanyId]);

  const availableDays = (availability ?? localAvailability)?.disponible ?? 0;
  const bookedDateSet = useMemo(
    () =>
      new Set(
        bookedDates
          .map((item) => item.fecha?.trim())
          .filter((value): value is string => !!value),
      ),
    [bookedDates],
  );

  const disabledDate = useCallback(
    (date: Dayjs) => {
      if (isWeekend(date)) return true;
      if (isHoliday(date, holidays)) return true;
      if (bookedDateSet.has(buildDateKey(date))) return true;
      if (!selectedPayrollId) return true;

      const reference = payrollOptions.find(
        (item) => item.id === Number(selectedPayrollId),
      );
      if (!reference) return true;

      const referenceKey = reference.idTipoPlanilla != null
        ? `id:${reference.idTipoPlanilla}`
        : `tipo:${String(reference.tipoPlanilla ?? '').toLowerCase()}`;

      const match = payrollOptions.some((item) => {
        const key = item.idTipoPlanilla != null
          ? `id:${item.idTipoPlanilla}`
          : `tipo:${String(item.tipoPlanilla ?? '').toLowerCase()}`;
        if (key !== referenceKey) return false;
        const start = item.fechaInicioPeriodo;
        const end = item.fechaFinPeriodo;
        return (
          date.isSame(dayjs(start), 'day') ||
          date.isSame(dayjs(end), 'day') ||
          (date.isAfter(dayjs(start), 'day') && date.isBefore(dayjs(end), 'day'))
        );
      });

      return !match;
    },
    [bookedDateSet, holidays, payrollOptions, selectedPayrollId],
  );

  const toggleDate = useCallback(
    (date: Dayjs) => {
      const key = buildDateKey(date);
      // Debug temporal: log raw selection and computed key
      // eslint-disable-next-line no-console
      console.log('[vacaciones] calendar select', {
        input: date.toISOString?.(),
        local: date.format('YYYY-MM-DD'),
        key,
      });
      const existing = selectedDates.find((item) => item.key === key);
      if (existing) {
        setSelectedDates((prev) => prev.filter((item) => item.key !== key));
        return;
      }
      if (selectedDates.length >= availableDays && availableDays >= 0) {
        message.warning('No hay saldo disponible para agregar mas dias.');
        return;
      }
      setSelectedDates((prev) =>
        [...prev, { key, fecha: date }].sort((a, b) =>
          a.key < b.key ? -1 : 1,
        ),
      );
    },
    [availableDays, message, selectedDates],
  );

  const canSubmit =
    !loading &&
    !readOnly &&
    !!selectedCompanyId &&
    !!selectedEmployeeId &&
    !!selectedPayrollId &&
    !!selectedMovementId &&
    selectedDates.length > 0;

  const showGlobalPreload =
    !!loading ||
    (!!selectedCompanyId && !!selectedEmployeeId && loadingPayrolls) ||
    (activeTab === 'bitacora' && !!loadingAuditTrail);

  const auditColumns: ColumnsType<PersonalActionAuditTrailItem> = useMemo(() => [
    {
      title: 'Fecha y hora',
      dataIndex: 'fechaCreacion',
      key: 'fechaCreacion',
      width: 170,
      render: (value: string | null) => formatDateTime12h(value),
    },
    {
      title: 'Quién lo hizo',
      key: 'actor',
      width: 220,
      render: (_, row) => {
        const actorLabel = row.actorNombre?.trim() || row.actorEmail?.trim() || (row.actorUserId ? `Usuario ID ${row.actorUserId}` : 'Sistema');
        return (
          <div>
            <div style={{ fontWeight: 600, color: '#3d4f5c' }}>{actorLabel}</div>
            {row.actorEmail ? <div style={{ color: '#8c8c8c', fontSize: 12 }}>{row.actorEmail}</div> : null}
          </div>
        );
      },
    },
    {
      title: 'Acción',
      key: 'accion',
      width: 170,
      render: (_, row) => (
        <Flex gap={6} wrap="wrap">
          <Tag className={sharedStyles.tagInactivo}>{row.modulo}</Tag>
          <Tag className={sharedStyles.tagActivo}>{row.accion}</Tag>
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
          <div style={{ maxWidth: 560, maxHeight: 360, overflowY: 'auto' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{value}</div>
            {changes.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {changes.map((change, index) => (
                  <div key={`${row.id}-${change.campo}-${index}`} style={{ fontSize: 12, lineHeight: 1.4 }}>
                    <div><strong>{change.campo}</strong></div>
                    <div>Antes: {change.antes}</div>
                    <div>Después: {change.despues}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12 }}>Sin detalle de campos para esta acción.</div>
            )}
          </div>
        );
        return (
          <Tooltip title={tooltipContent}>
            <div className={sharedStyles.auditDetailCell}>{value}</div>
          </Tooltip>
        );
      },
    },
  ], []);

  const handleAccept = useCallback(async () => {
    if (loading) return;
    const values = await form.validateFields();
    if (!selectedDates.length) {
      message.error('Debe seleccionar al menos una fecha de vacaciones.');
      return;
    }

    const payload: VacationFormDraft = {
      idEmpresa: Number(values.idEmpresa),
      idEmpleado: Number(values.idEmpleado),
      payrollId: Number(values.payrollId),
      movimientoId: Number(values.movimientoId),
      observacion: values.observacion?.trim() || undefined,
      fechas: selectedDates,
    };

    modal.confirm({
      title: mode === 'create' ? 'Confirmar creación de vacaciones' : 'Confirmar actualización de vacaciones',
      content:
        mode === 'create'
          ? '¿Está seguro de crear estas vacaciones con las fechas seleccionadas?'
          : '¿Está seguro de guardar los cambios de estas vacaciones?',
      icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
      okText: mode === 'create' ? 'Sí, crear' : 'Sí, guardar',
      cancelText: 'Cancelar',
      centered: true,
      width: 420,
      rootClassName: sharedStyles.companyConfirmModal,
      okButtonProps: { className: sharedStyles.companyConfirmOk },
      cancelButtonProps: { className: sharedStyles.companyConfirmCancel },
      onOk: async () => {
        await onSubmit(payload);
      },
    });
  }, [activeTab, loading, message, modal, mode, onSubmit, selectedDates]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      className={sharedStyles.companyModal}
      closable={false}
      footer={null}
      width={1180}
      destroyOnHidden
      centered={false}
      styles={{
        wrapper: { alignItems: 'flex-start', paddingTop: 40 },
        body: {
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
        },
      }}
      title={(
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 16,
          }}
        >
          <div className={sharedStyles.companyModalHeader}>
            <div className={sharedStyles.companyModalHeaderIcon}>
              <CalendarOutlined />
            </div>
            <span>{title}</span>
          </div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onCancel}
            aria-label="Cerrar"
            className={sharedStyles.companyModalCloseBtn}
          />
        </div>
      )}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        {showGlobalPreload ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 20,
              background: 'rgba(255,255,255,0.72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
            }}
          >
            <Spin size="large" description="Cargando información..." />
          </div>
        ) : null}

        <Form
          form={form}
          layout="vertical"
          className={sharedStyles.companyFormContent}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
        >
          <div style={{ flexShrink: 0 }}>
            {readOnly && readOnlyMessage ? (
              <Alert
                type="warning"
                showIcon
                message={readOnlyMessage}
                className={`${sharedStyles.infoBanner} ${sharedStyles.warningType}`}
                style={{ marginBottom: 12 }}
              />
            ) : null}
            {mode === 'edit' && sourceOrigin?.toUpperCase?.() === 'TIMEWISE' ? (
              <Alert
                type="info"
                showIcon
                message="Solicitud creada desde Timewise"
                description="Complete periodo de pago y movimiento para que la solicitud pueda avanzar en el flujo."
                className={sharedStyles.infoBanner}
                style={{ marginBottom: 12 }}
              />
            ) : null}

            {mode === 'edit' ? (
              <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as 'info' | 'bitacora')}
                className={`${sharedStyles.tabsWrapper} ${sharedStyles.companyModalTabs} ${sharedStyles.tabsBarOnly}`}
                items={[
                  {
                    key: 'info',
                    label: (
                      <span>
                        <CalendarOutlined style={{ marginRight: 8, fontSize: 16 }} />
                        Información principal
                      </span>
                    ),
                  },
                  ...(showAudit
                    ? [
                      {
                        key: 'bitacora',
                        label: (
                          <span>
                            <SearchOutlined style={{ marginRight: 8, fontSize: 16 }} />
                            Bitácora
                          </span>
                        ),
                      },
                    ]
                    : []),
                ]}
              />
            ) : null}

            {(mode !== 'edit' || activeTab === 'info') && (
              <>
                {selectedEmployee ? (
                  <Collapse
                    defaultActiveKey={[]}
                    className={sharedStyles.employeeAccordion}
                    items={[
                      {
                        key: 'empleado',
                        label: (
                          <div className={sharedStyles.employeeAccordionHeader}>
                            <div className={sharedStyles.employeeAccordionHeaderLeft}>
                              <div className={sharedStyles.employeeAccordionAvatarWrap}>
                                <Avatar size={34} icon={<UserOutlined />} />
                              </div>
                              <div className={sharedStyles.employeeAccordionNameBlock}>
                                <div className={sharedStyles.employeeAccordionName}>
                                  {`${selectedEmployee.nombre || '--'} ${selectedEmployee.apellido1 || ''} ${selectedEmployee.apellido2 || ''}`.trim()}
                                </div>
                                <div className={sharedStyles.employeeAccordionId}>
                                  Empleado ID: {selectedEmployee.codigo || '--'}
                                  {canViewEmployeeSensitive && selectedEmployee.cedula ? ` - ${selectedEmployee.cedula}` : ''}
                                  {canViewEmployeeSensitive && selectedEmployee.telefono ? ` - ${selectedEmployee.telefono}` : ''}
                                </div>
                                <div className={sharedStyles.employeeAccordionCompany}>
                                  <BankOutlined />
                                  {companies.find((c) => Number(c.id) === selectedCompanyId)?.nombre ?? '--'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ),
                        children: (
                          <div className={sharedStyles.employeeAccordionContent}>
                            <div className={sharedStyles.employeeAccordionGrid}>
                              <div className={sharedStyles.employeeAccordionItem}>
                                <IdcardOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                <div>
                                  <div className={sharedStyles.employeeAccordionItemLabel}>Cédula</div>
                                  <div className={sharedStyles.employeeAccordionItemValue}>
                                    {canViewEmployeeSensitive ? (selectedEmployee.cedula ?? '--') : sensitiveMaskedValue}
                                  </div>
                                </div>
                              </div>
                              <div className={sharedStyles.employeeAccordionItem}>
                                <MailOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                <div>
                                  <div className={sharedStyles.employeeAccordionItemLabel}>Email</div>
                                  <div className={sharedStyles.employeeAccordionItemValue}>
                                    {canViewEmployeeSensitive ? (selectedEmployee.email ?? '--') : sensitiveMaskedValue}
                                  </div>
                                </div>
                              </div>
                              <div className={sharedStyles.employeeAccordionItem}>
                                <CalendarOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                <div>
                                  <div className={sharedStyles.employeeAccordionItemLabel}>Período</div>
                                  <div className={sharedStyles.employeeAccordionItemValue}>{selectedPayPeriod?.nombre ?? '--'}</div>
                                </div>
                              </div>
                              <div className={sharedStyles.employeeAccordionItem}>
                                <ClockCircleOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                <div>
                                  <div className={sharedStyles.employeeAccordionItemLabel}>Jornada</div>
                                  <div className={sharedStyles.employeeAccordionItemValue}>{selectedEmployee.jornada ?? '--'}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ),
                      },
                    ]}
                  />
                ) : null}

                <Card size="small" style={{ marginBottom: 12, marginTop: 12, border: '1px solid #e8ecf0', borderRadius: 8 }}>
                  <Row gutter={16}>
                    <Col xs={24} md={8} lg={8}>
                      <Form.Item
                        label="Empresa"
                        name="idEmpresa"
                        rules={[{ required: true, message: 'Seleccione empresa' }]}
                      >
                        <Select
                          placeholder="Seleccione empresa"
                          options={companies.map((company) => ({
                            value: Number(company.id),
                            label: company.nombre,
                          }))}
                          disabled={readOnly || mode === 'edit'}
                          showSearch
                          optionFilterProp="label"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8} lg={8}>
                      <Form.Item
                        label="Empleado"
                        name="idEmpleado"
                        rules={[{ required: true, message: 'Seleccione empleado' }]}
                      >
                        <Select
                          placeholder="Seleccione empleado"
                          options={filteredEmployees.map((emp) => ({
                            value: emp.id,
                            label: formatEmployeeLabel(emp, canViewEmployeeSensitive),
                          }))}
                          loading={employeesLoading}
                          disabled={readOnly || mode === 'edit'}
                          showSearch
                          optionFilterProp="label"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8} lg={8}>
                      <Form.Item
                        label="Periodo de Pago"
                        name="payrollId"
                        rules={[{ required: true, message: 'Seleccione planilla' }]}
                      >
                        <Select
                          placeholder="Seleccione planilla"
                          options={payrollOptions.map((item) => ({
                            value: item.id,
                            label: item.label,
                          }))}
                          loading={loadingPayrolls}
                          disabled={readOnly}
                          showSearch
                          optionFilterProp="label"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} md={8} lg={8}>
                      <Form.Item
                        label="Movimiento"
                        name="movimientoId"
                        rules={[{ required: true, message: 'Seleccione movimiento' }]}
                      >
                        <Select
                          placeholder="Seleccione movimiento"
                          options={movementOptions.map((movement) => ({
                            value: movement.id,
                            label: movement.nombre,
                          }))}
                          loading={movementsLoading}
                          disabled={readOnly}
                          showSearch
                          optionFilterProp="label"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8} lg={8}>
                      <Form.Item label="Días disponibles">
                        <Input value={availableDays} disabled />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8} lg={8}>
                      <Form.Item label="Observación" name="observacion">
                        <Input.TextArea
                          rows={1}
                          autoSize={{ minRows: 1, maxRows: 3 }}
                          disabled={readOnly}
                          maxLength={300}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                <Card
                  size="small"
                  title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: '#e8f4fd',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#20638d',
                        }}
                      >
                        <CalendarOutlined />
                      </span>
                      Selección de Fechas de Vacaciones
                    </span>
                  }
                  style={{
                    marginTop: 12,
                    border: '1px solid #e8ecf0',
                    borderRadius: 8,
                    overflow: 'visible',
                  }}
                  styles={{ body: { padding: 12 } }}
                >
                <Row gutter={16} wrap>
                  <Col xs={24} lg={12}>
                    <div className={styles.calendarCard}>
                      <div className={styles.calendarCardHeader}>
                        <div className={styles.calendarCardHeaderIcon}>
                          <CalendarOutlined />
                        </div>
                        <h3 className={styles.calendarCardHeaderTitle}>Calendario de vacaciones</h3>
                      </div>
                      <div className={styles.calendarContent}>
                        <div className={styles.calendarStyled}>
                          <Calendar
                            fullscreen={false}
                            disabledDate={disabledDate}
                            onSelect={(date) => {
                              if (readOnly) return;
                              if (disabledDate(date)) return;
                              toggleDate(date);
                            }}
                            cellRender={(date) => {
                              const key = buildDateKey(date);
                              const selected = selectedDates.some((item) => item.key === key);
                              const booked = bookedDateSet.has(key);
                              if (booked) {
                                return (
                                  <div className={styles.dateReservedBadge}>Reservado</div>
                                );
                              }
                              return selected ? (
                                <div className={styles.dateSelectedBadge}>Seleccionado</div>
                              ) : null;
                            }}
                          />
                        </div>
                        <div className={styles.statsRow}>
                          <div className={`${styles.statBadge} ${styles.statBadgeAvailable}`}>
                            Disponibles: {availableDays}
                          </div>
                          <div className={`${styles.statBadge} ${styles.statBadgeSelected}`}>
                            Seleccionados: {selectedDates.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className={styles.datesListCard}>
                      <div className={styles.datesListHeader}>
                        <div className={styles.datesListHeaderIcon}>
                          <CalendarOutlined />
                        </div>
                        <h3 className={styles.datesListHeaderTitle}>Fechas seleccionadas</h3>
                        {!readOnly && selectedDates.length > 0 && (
                          <Button
                            type="text"
                            size="small"
                            icon={<MenuOutlined />}
                            className={styles.clearAllBtn}
                            onClick={() => setSelectedDates([])}
                          >
                            Limpiar todo
                          </Button>
                        )}
                      </div>
                      <div className={styles.datesListContent}>
                        {selectedDates.length === 0 ? (
                          <div className={styles.datesListEmpty}>
                            <span>No hay fechas seleccionadas</span>
                            {!readOnly && (
                              <span className={styles.datesListEmptyHint}>
                                Seleccione fechas en el calendario para agregarlas
                              </span>
                            )}
                          </div>
                        ) : (
                          selectedDates.map((item) => (
                            <div key={item.key} className={styles.dateRow}>
                              <div>
                                <div className={styles.dateRowLabel}>
                                  {parseDateKey(item.key)
                                    .locale('es')
                                    .format('dddd, D [de] MMMM [de] YYYY')}
                                </div>
                                <div className={styles.dateRowSub}>{item.key}</div>
                              </div>
                              {!readOnly ? (
                                <Button
                                  type="text"
                                  icon={<DeleteOutlined />}
                                  size="small"
                                  onClick={() =>
                                    setSelectedDates((prev) =>
                                      prev.filter((row) => row.key !== item.key),
                                    )
                                  }
                                />
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </Col>
                </Row>
                </Card>
              </>
            )}

            {mode === 'edit' && activeTab === 'bitacora' && showAudit ? (
              <div className={sharedStyles.historicoSection} style={{ marginTop: 12 }}>
                <p className={sharedStyles.sectionTitle}>Historial de cambios de las vacaciones</p>
                <p className={sharedStyles.sectionDescription} style={{ marginBottom: 16 }}>
                  Muestra quién hizo el cambio, cuándo lo hizo y el detalle registrado en bitácora.
                </p>
                <Table<PersonalActionAuditTrailItem>
                  rowKey="id"
                  size="small"
                  loading={loadingAuditTrail}
                  columns={auditColumns}
                  dataSource={auditTrail ?? []}
                  className={`${sharedStyles.configTable} ${sharedStyles.auditTableCompact}`}
                  pagination={{
                    pageSize: 8,
                    showSizeChanger: true,
                    showTotal: (total) => `${total} registro(s)`,
                  }}
                  locale={{ emptyText: 'No hay registros de bitácora para estas vacaciones.' }}
                />
              </div>
            ) : null}
          </div>

          <div style={{ flexShrink: 0 }}>
            <div className={sharedStyles.companyModalFooter}>
              <Button onClick={onCancel} className={sharedStyles.companyModalBtnCancel}>
                {readOnly ? 'Cerrar' : 'Cancelar'}
              </Button>
              {!readOnly ? (
                <Button
                  type="primary"
                  className={sharedStyles.companyModalBtnSubmit}
                  disabled={!canSubmit}
                  onClick={() => void handleAccept()}
                  loading={loading}
                >
                  {mode === 'edit' ? 'Guardar cambios' : 'Crear vacaciones'}
                </Button>
              ) : null}
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
}






