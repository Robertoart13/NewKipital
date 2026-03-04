import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App as AntdApp,
  Avatar,
  Button,
  Card,
  Col,
  Collapse,
  DatePicker,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BankOutlined,
  CalendarOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
  IdcardOutlined,
  MailOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { PayrollListItem } from '../../../../api/payroll';
import type { PayrollMovementListItem } from '../../../../api/payrollMovements';
import type { CatalogPayPeriod } from '../../../../api/catalogs';
import type {
  IncreaseCalculationMethod,
  PersonalActionAuditTrailItem,
} from '../../../../api/personalActions';
import { fetchAbsencePayrollsCatalog } from '../../../../api/personalActions';
import sharedStyles from '../../configuration/UsersManagementPage.module.css';
import { EMPLOYEE_MONEY_MAX_DIGITS } from '../../../../lib/moneyInputSanitizer';
import { useMoneyFieldFormatter } from '../../../../hooks/useMoneyFieldFormatter';
import { formatDateTime12h } from '../../../../lib/formatDate';

export interface IncreaseTransactionLine {
  payrollId?: number;
  fechaEfecto?: Dayjs;
  movimientoId?: number;
  metodoCalculo?: IncreaseCalculationMethod;
  monto?: number;
  montoInput?: string;
  porcentaje?: number;
  salarioActual?: number;
  nuevoSalario?: number;
  formula?: string;
  payrollLabel?: string;
  payrollEstado?: number;
  movimientoLabel?: string;
  movimientoInactivo?: boolean;
}

export interface IncreaseFormDraft {
  idEmpresa: number;
  idEmpleado: number;
  observacion?: string;
  line: IncreaseTransactionLine;
}

interface IncreaseTransactionModalProps {
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
  actionTypeIdForIncrease?: number;
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
  initialDraft?: IncreaseFormDraft;
  onCancel: () => void;
  onSubmit: (payload: IncreaseFormDraft) => Promise<void> | void;
}

interface HeaderValues {
  idEmpresa?: number;
  idEmpleado?: number;
  observacion?: string;
}

function buildEmptyLine(): IncreaseTransactionLine {
  return {
    metodoCalculo: 'PORCENTAJE',
    montoInput: '',
    monto: 0,
    porcentaje: 0,
  };
}

function formatMoney(amount: number | null | undefined, currency = 'CRC') {
  if (amount == null || Number.isNaN(Number(amount))) return '--';
  return `${currency} ${new Intl.NumberFormat('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount))}`;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function calculateSalaryByPeriod(salaryBase: number, payPeriodId?: number | null, jornada?: string | null): number {
  const id = Number(payPeriodId);
  const isByHours = (jornada ?? '').trim().toLowerCase() === 'por horas';
  if (isByHours && (id === 8 || id === 11)) return 0;
  switch (id) {
    case 8: return salaryBase / 4;
    case 9: return salaryBase / 2;
    case 10: return salaryBase;
    case 11: return salaryBase / 2;
    case 12: return salaryBase / 30;
    case 13: return salaryBase * 3;
    case 14: return salaryBase * 6;
    case 15: return salaryBase * 12;
    default: return salaryBase;
  }
}

function calculateHourValue(salaryBase: number, payPeriodId?: number | null, jornada?: string | null): number {
  const id = Number(payPeriodId);
  const isByHours = (jornada ?? '').trim().toLowerCase() === 'por horas';
  if (isByHours && (id === 8 || id === 11)) return salaryBase;
  return salaryBase / 30 / 8;
}

function calculatePeriodHours(payPeriodId?: number | null, jornada?: string | null): number {
  const id = Number(payPeriodId);
  const isByHours = (jornada ?? '').trim().toLowerCase() === 'por horas';
  if (isByHours && (id === 8 || id === 11)) return 0;
  switch (id) {
    case 8: return 48;
    case 9: return 96;
    case 10: return 192;
    case 11: return 96;
    case 12: return 10;
    case 13: return 576;
    case 14: return 1152;
    case 15: return 2304;
    default: return 192;
  }
}

export function IncreaseTransactionModal({
  open,
  mode,
  title,
  companies,
  employees,
  payPeriods,
  movements,
  actionTypeIdForIncrease,
  canViewEmployeeSensitive = false,
  employeesLoading = false,
  movementsLoading = false,
  loading = false,
  readOnly = false,
  readOnlyMessage,
  showAudit = false,
  auditTrail = [],
  loadingAuditTrail = false,
  onLoadAuditTrail,
  initialCompanyId,
  initialDraft,
  onCancel,
  onSubmit,
}: IncreaseTransactionModalProps) {
  const { message } = AntdApp.useApp();
  const moneyField = useMoneyFieldFormatter(EMPLOYEE_MONEY_MAX_DIGITS);
  const [form] = Form.useForm<HeaderValues>();
  const [line, setLine] = useState<IncreaseTransactionLine>(buildEmptyLine());
  const [eligiblePayrolls, setEligiblePayrolls] = useState<PayrollListItem[]>([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [auditLoaded, setAuditLoaded] = useState(false);
  const prevEmployeeIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setActiveTab('info');
    setAuditLoaded(false);
    form.resetFields();

    if (initialDraft) {
      form.setFieldsValue({
        idEmpresa: initialDraft.idEmpresa,
        idEmpleado: initialDraft.idEmpleado,
        observacion: initialDraft.observacion,
      });
      setLine({
        ...buildEmptyLine(),
        ...initialDraft.line,
        montoInput:
          initialDraft.line.monto == null
            ? ''
            : String(Math.trunc(initialDraft.line.monto)),
      });
      return;
    }

    form.setFieldsValue({ idEmpresa: initialCompanyId });
    setLine(buildEmptyLine());
  }, [open, initialDraft, initialCompanyId, form]);

  useEffect(() => {
    if (!open || !showAudit || activeTab !== 'bitacora' || auditLoaded) return;
    const load = async () => {
      await onLoadAuditTrail?.();
      setAuditLoaded(true);
    };
    void load();
  }, [activeTab, auditLoaded, onLoadAuditTrail, open, showAudit]);

  const selectedCompanyId = Form.useWatch('idEmpresa', form);
  const selectedEmployeeId = Form.useWatch('idEmpleado', form);

  useEffect(() => {
    if (!open) {
      prevEmployeeIdRef.current = undefined;
      return;
    }
    if (!selectedEmployeeId) return;
    const prev = prevEmployeeIdRef.current;
    if (prev != null && prev !== selectedEmployeeId) {
      setLine(buildEmptyLine());
    }
    prevEmployeeIdRef.current = selectedEmployeeId;
  }, [open, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedCompanyId || !selectedEmployeeId) {
      setEligiblePayrolls([]);
      setLoadingPayrolls(false);
      return;
    }
    let active = true;
    setLoadingPayrolls(true);
    void fetchAbsencePayrollsCatalog(Number(selectedCompanyId), Number(selectedEmployeeId))
      .then((list) => {
        if (!active) return;
        setEligiblePayrolls(list);
      })
      .catch(() => {
        if (!active) return;
        setEligiblePayrolls([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadingPayrolls(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCompanyId, selectedEmployeeId]);

  const employeesByCompany = useMemo(() => {
    if (!selectedCompanyId) return [];
    return employees.filter((employee) => employee.idEmpresa === selectedCompanyId);
  }, [employees, selectedCompanyId]);

  const selectedEmployee = useMemo(() => {
    if (!selectedCompanyId || !selectedEmployeeId) return null;
    return employees.find(
      (employee) => employee.idEmpresa === selectedCompanyId && employee.id === selectedEmployeeId,
    ) ?? null;
  }, [employees, selectedCompanyId, selectedEmployeeId]);

  const selectedPayPeriod = useMemo(() => {
    if (!selectedEmployee?.idPeriodoPago) return null;
    return payPeriods.find((period) => period.id === Number(selectedEmployee.idPeriodoPago)) ?? null;
  }, [payPeriods, selectedEmployee?.idPeriodoPago]);

  const employeeCurrency = (selectedEmployee?.monedaSalario ?? 'CRC').toUpperCase();
  const salarioActual = Number(
    selectedEmployee?.salarioBase ?? line.salarioActual ?? 0,
  );
  const salaryDisplay = canViewEmployeeSensitive
    ? formatMoney(salarioActual, employeeCurrency)
    : '***';

  const sensitiveMaskedValue = '***';
  const salaryBase = Number(selectedEmployee?.salarioBase ?? 0);
  const salaryByPeriod = calculateSalaryByPeriod(
    salaryBase,
    selectedEmployee?.idPeriodoPago,
    selectedEmployee?.jornada,
  );
  const hourValue = calculateHourValue(
    salaryBase,
    selectedEmployee?.idPeriodoPago,
    selectedEmployee?.jornada,
  );
  const periodHours = calculatePeriodHours(
    selectedEmployee?.idPeriodoPago,
    selectedEmployee?.jornada,
  );

  const showGlobalPreload =
    loading ||
    (!!selectedCompanyId && !!selectedEmployeeId && loadingPayrolls) ||
    (activeTab === 'bitacora' && loadingAuditTrail);

  const auditColumns: ColumnsType<PersonalActionAuditTrailItem> = useMemo(() => [
    {
      title: 'Fecha y hora',
      dataIndex: 'fechaCreacion',
      key: 'fechaCreacion',
      width: 170,
      render: (value: string | null) => formatDateTime12h(value),
    },
    {
      title: 'Quien lo hizo',
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
      title: 'Accion',
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
            <div className={sharedStyles.auditDetailCell}>{value}</div>
          </Tooltip>
        );
      },
    },
  ], []);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    setLine((prev) => ({
      ...prev,
      salarioActual,
    }));
  }, [selectedEmployeeId, salarioActual]);

  const payrollsByCompany = useMemo(() => {
    if (!selectedCompanyId) return [];
    let list = eligiblePayrolls.filter((payroll) => payroll.idEmpresa === selectedCompanyId);
    if (selectedEmployee?.idPeriodoPago) {
      list = list.filter(
        (payroll) => Number(payroll.idPeriodoPago) === Number(selectedEmployee.idPeriodoPago),
      );
    }
    if (selectedEmployee?.monedaSalario) {
      list = list.filter(
        (payroll) => (payroll.moneda ?? '').toUpperCase() === employeeCurrency,
      );
    }
    return list;
  }, [eligiblePayrolls, selectedCompanyId, selectedEmployee, employeeCurrency]);

  const selectedPayroll = useMemo(() => {
    if (!line.payrollId) return null;
    return payrollsByCompany.find((payroll) => payroll.id === Number(line.payrollId)) ?? null;
  }, [line.payrollId, payrollsByCompany]);

  const filteredMovements = useMemo(() => {
    if (!selectedCompanyId) return [];
    let list = movements.filter((movement) => movement.idEmpresa === selectedCompanyId);
    if (actionTypeIdForIncrease) {
      list = list.filter((movement) => movement.idTipoAccionPersonal === actionTypeIdForIncrease);
    }
    return list;
  }, [movements, selectedCompanyId, actionTypeIdForIncrease]);

  const metodoCalculo = line.metodoCalculo ?? 'PORCENTAJE';
  const inputMonto = Number(line.monto ?? 0);
  const inputPorcentaje = Number(line.porcentaje ?? 0);

  const calculated = useMemo(() => {
    if (!Number.isFinite(salarioActual) || salarioActual <= 0) {
      return { monto: 0, porcentaje: 0, nuevoSalario: 0 };
    }
    if (metodoCalculo === 'PORCENTAJE') {
      const porcentaje = Math.max(0, inputPorcentaje);
      const monto = round2(salarioActual * (porcentaje / 100));
      return {
        monto,
        porcentaje: round2(porcentaje),
        nuevoSalario: round2(salarioActual + monto),
      };
    }
    const monto = Math.max(0, inputMonto);
    const porcentaje = salarioActual > 0 ? round2((monto / salarioActual) * 100) : 0;
    return {
      monto: round2(monto),
      porcentaje,
      nuevoSalario: round2(salarioActual + monto),
    };
  }, [salarioActual, metodoCalculo, inputMonto, inputPorcentaje]);

  useEffect(() => {
    if (!selectedPayroll?.fechaInicioPago) return;
    const fechaEfecto = dayjs(selectedPayroll.fechaInicioPago);
    setLine((prev) => {
      const prevDate = prev.fechaEfecto?.format('YYYY-MM-DD');
      const nextDate = fechaEfecto.format('YYYY-MM-DD');
      if (prevDate === nextDate) return prev;
      return { ...prev, fechaEfecto };
    });
  }, [selectedPayroll?.fechaInicioPago]);

  const handleMethodChange = (checked: boolean) => {
    const metodo = checked ? 'MONTO' : 'PORCENTAJE';
    setLine((prev) => ({
      ...prev,
      metodoCalculo: metodo,
      monto: metodo === 'PORCENTAJE' ? 0 : prev.monto,
      montoInput: metodo === 'PORCENTAJE' ? '' : prev.montoInput,
      porcentaje: metodo === 'MONTO' ? 0 : prev.porcentaje,
    }));
  };

  const porcentajeDisplay = metodoCalculo === 'MONTO'
    ? calculated.porcentaje
    : line.porcentaje;
  const montoDisplayValue = metodoCalculo === 'PORCENTAJE'
    ? String(Math.round(calculated.monto))
    : line.montoInput;

  const handleSubmit = async () => {
    try {
      const header = await form.validateFields();
      if (!line.payrollId || !line.fechaEfecto || !line.movimientoId) {
        message.error('Debe completar periodo de pago, fecha de efecto y movimiento.');
        return;
      }
      if (metodoCalculo === 'MONTO' && calculated.monto <= 0) {
        message.error('El monto del aumento debe ser mayor a 0.');
        return;
      }
      if (metodoCalculo === 'PORCENTAJE' && calculated.porcentaje <= 0) {
        message.error('El porcentaje del aumento debe ser mayor a 0.');
        return;
      }

      const salarioTexto = canViewEmployeeSensitive
        ? round2(salarioActual).toFixed(2)
        : '***';
      const formula =
        metodoCalculo === 'PORCENTAJE'
          ? `Nuevo salario = ${salarioTexto} + (${salarioTexto} x ${round2(calculated.porcentaje).toFixed(2)}%) = ${round2(calculated.nuevoSalario).toFixed(2)}`
          : `Nuevo salario = ${salarioTexto} + ${round2(calculated.monto).toFixed(2)} = ${round2(calculated.nuevoSalario).toFixed(2)}`;

      await onSubmit({
        idEmpresa: Number(header.idEmpresa),
        idEmpleado: Number(header.idEmpleado),
        observacion: header.observacion?.trim() || undefined,
        line: {
          ...line,
          metodoCalculo,
          monto: calculated.monto,
          porcentaje: calculated.porcentaje,
          salarioActual,
          nuevoSalario: calculated.nuevoSalario,
          formula,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      className={sharedStyles.companyModal}
      closable={false}
      footer={null}
      width={1600}
      destroyOnClose
      centered={false}
      styles={{
        wrapper: { alignItems: 'flex-start', paddingTop: 0, marginTop: -80 },
        body: {
          maxHeight: '88vh',
          overflow: 'hidden',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
        },
      }}
      title={(
        <Flex justify="space-between" align="center" wrap="nowrap" style={{ width: '100%', gap: 16 }}>
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
        </Flex>
      )}
    >
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
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
            <Spin size="large" description="Cargando informacion..." />
          </div>
        ) : null}
        <Form form={form} layout="vertical" className={sharedStyles.companyFormContent} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ flexShrink: 0 }}>
            {readOnly ? (
              <Alert
                type="warning"
                showIcon
                title={readOnlyMessage ?? 'Este aumento esta en modo solo lectura por su estado actual.'}
                className={`${sharedStyles.infoBanner} ${sharedStyles.warningType}`}
                style={{ marginBottom: 12 }}
              />
            ) : null}

            {mode === 'edit' ? (
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                className={`${sharedStyles.tabsWrapper} ${sharedStyles.companyModalTabs} ${sharedStyles.tabsBarOnly}`}
                items={[
                  {
                    key: 'info',
                    label: (
                      <span>
                        <CalendarOutlined style={{ marginRight: 8, fontSize: 16 }} />
                        Informacion principal
                      </span>
                    ),
                  },
                  ...(showAudit
                    ? [{
                        key: 'bitacora',
                        label: (
                          <span>
                            <SearchOutlined style={{ marginRight: 8, fontSize: 16 }} />
                            Bitacora
                          </span>
                        ),
                      }]
                    : []),
                ]}
              />
            ) : null}

            {mode !== 'edit' || activeTab === 'info' ? (
              <Row gutter={16} wrap style={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}>
                <Col xs={24} lg={8} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                              <hr className={sharedStyles.employeeAccordionGridHr} />
                              <div className={sharedStyles.employeeAccordionGrid}>
                                <div className={sharedStyles.employeeAccordionItem}>
                                  <DollarCircleOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                  <div>
                                    <div className={sharedStyles.employeeAccordionItemLabel}>Salario Base</div>
                                    <div className={sharedStyles.employeeAccordionItemValue}>
                                      {canViewEmployeeSensitive ? formatMoney(selectedEmployee.salarioBase, employeeCurrency) : sensitiveMaskedValue}
                                    </div>
                                  </div>
                                </div>
                                <div className={sharedStyles.employeeAccordionItem}>
                                  <DollarCircleOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                  <div>
                                    <div className={sharedStyles.employeeAccordionItemLabel}>Salario {selectedPayPeriod?.nombre ?? 'Período'}</div>
                                    <div className={sharedStyles.employeeAccordionItemValue}>
                                      {canViewEmployeeSensitive ? formatMoney(salaryByPeriod, employeeCurrency) : sensitiveMaskedValue}
                                    </div>
                                  </div>
                                </div>
                                <div className={sharedStyles.employeeAccordionItem}>
                                  <DollarCircleOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                  <div>
                                    <div className={sharedStyles.employeeAccordionItemLabel}>Valor por Hora</div>
                                    <div className={sharedStyles.employeeAccordionItemValue}>
                                      {canViewEmployeeSensitive ? `${formatMoney(hourValue, employeeCurrency)}/hora` : sensitiveMaskedValue}
                                    </div>
                                  </div>
                                </div>
                                <div className={sharedStyles.employeeAccordionItem}>
                                  <ClockCircleOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                  <div>
                                    <div className={sharedStyles.employeeAccordionItemLabel}>Horas del Período</div>
                                    <div className={sharedStyles.employeeAccordionItemValue}>{`${periodHours} horas`}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ),
                        },
                      ]}
                    />
                  ) : null}

                  <Card size="small" className={sharedStyles.cardDefault} style={{ border: '1px solid #e8ecf0', borderRadius: 8 }}>
                    <Flex gap={10} wrap="wrap" style={{ flexDirection: 'column' }}>
                      <Form.Item
                        style={{ marginBottom: 12 }}
                        name="idEmpresa"
                        label="Empresa"
                        rules={[{ required: true, message: 'Seleccione empresa' }]}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder="Seleccione empresa"
                          disabled={mode === 'edit' || readOnly}
                          loading={employeesLoading}
                          options={companies.map((company) => ({
                            value: Number(company.id),
                            label: company.nombre,
                          }))}
                        />
                      </Form.Item>
                      {selectedCompanyId ? (
                        <Form.Item
                          style={{ marginBottom: 12 }}
                          name="idEmpleado"
                          label="Empleado"
                          rules={[{ required: true, message: 'Seleccione empleado' }]}
                        >
                          <Select
                            showSearch
                            optionFilterProp="label"
                            placeholder="Seleccione empleado"
                            disabled={mode === 'edit' || readOnly}
                            loading={employeesLoading}
                            notFoundContent={employeesLoading ? <Spin size="small" /> : null}
                            options={employeesByCompany.map((employee) => ({
                              value: employee.id,
                              label: `${employee.codigo} - ${employee.nombre} ${employee.apellido1} ${employee.apellido2 ?? ''}`.trim(),
                            }))}
                          />
                        </Form.Item>
                      ) : null}
                      <Form.Item style={{ marginBottom: 12 }} name="observacion" label="Motivo de Aumento">
                        <Input.TextArea rows={2} placeholder="Detalle del motivo" disabled={readOnly} />
                      </Form.Item>
                      <Form.Item style={{ marginBottom: 12 }} label="Periodo de Planilla">
                        <Select
                          placeholder="Seleccione"
                          disabled={readOnly || !selectedEmployeeId}
                          loading={loadingPayrolls}
                          value={line.payrollId}
                          onChange={(value) => setLine((prev) => ({ ...prev, payrollId: Number(value) }))}
                          options={payrollsByCompany.map((payroll) => ({
                            value: payroll.id,
                            label: payroll.nombrePlanilla ?? `Planilla #${payroll.id}`,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item style={{ marginBottom: 12 }} label="Movimiento">
                        <Select
                          placeholder="Seleccione"
                          loading={movementsLoading}
                          disabled={readOnly || movementsLoading || !selectedCompanyId}
                          value={line.movimientoId}
                          onChange={(value) => setLine((prev) => ({ ...prev, movimientoId: Number(value) }))}
                          options={filteredMovements.map((movement) => ({
                            value: movement.id,
                            label: movement.nombre,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item style={{ marginBottom: 0 }} label="Fecha de Efecto">
                        <DatePicker
                          style={{ width: '100%' }}
                          format="YYYY-MM-DD"
                          placeholder="Seleccionar fecha"
                          value={line.fechaEfecto}
                          disabled
                        />
                      </Form.Item>
                    </Flex>
                  </Card>
                </Col>

                <Col xs={24} lg={16} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
                  <Card size="small" className={sharedStyles.cardDefault} style={{ border: '1px solid #e8ecf0', borderRadius: 8 }}>
                    <div className={sharedStyles.filterLabel} style={{ marginBottom: 8, fontWeight: 600 }}>Método de Cálculo del Aumento</div>
                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                      {metodoCalculo === 'PORCENTAJE'
                        ? 'El aumento se calculará por porcentaje'
                        : 'El aumento se calculará por monto'}
                    </Typography.Text>
                    <Flex align="center" gap={12} wrap="wrap" style={{ marginBottom: 20 }}>
                      <Typography.Text>Por Porcentaje</Typography.Text>
                      <Switch checked={metodoCalculo === 'MONTO'} onChange={handleMethodChange} disabled={readOnly} />
                      <Typography.Text>Por Monto</Typography.Text>
                    </Flex>

                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>Salario Actual (Referencia)</div>
                      <Input disabled value={salaryDisplay} style={{ maxWidth: 240 }} />
                    </div>

                    <Divider style={{ margin: '16px 0' }} />
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 12, fontWeight: 500 }}>Datos del cálculo</div>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item label="Monto del Aumento" style={{ marginBottom: 0 }}>
                          <Input
                            prefix={employeeCurrency}
                            placeholder="0"
                            maxLength={moneyField.maxInputLength}
                            inputMode="numeric"
                            disabled={readOnly || metodoCalculo === 'PORCENTAJE'}
                            value={moneyField.formatDisplay(montoDisplayValue)}
                            onChange={(event) => {
                              const raw = event.target.value ?? '';
                              const onlyDigits = moneyField.sanitize(raw);
                              setLine((prev) => ({
                                ...prev,
                                montoInput: onlyDigits,
                                monto: onlyDigits.length > 0 ? (moneyField.parse(onlyDigits) ?? 0) : 0,
                              }));
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item label="Porcentaje del Aumento" style={{ marginBottom: 0 }}>
                          <InputNumber
                            min={0}
                            step={0.01}
                            style={{ width: '100%' }}
                            placeholder="Ej. 10"
                            disabled={readOnly || metodoCalculo === 'MONTO'}
                            value={porcentajeDisplay === 0 ? undefined : porcentajeDisplay}
                            onChange={(value) => setLine((prev) => ({ ...prev, porcentaje: Number(value ?? 0) }))}
                            addonAfter="%"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item label="Nuevo Salario" style={{ marginBottom: 0 }}>
                          <Input disabled value={formatMoney(calculated.nuevoSalario, employeeCurrency)} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider style={{ margin: '20px 0' }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', marginBottom: 16 }}>Resumen</div>

                    <Row gutter={[20, 16]}>
                      <Col xs={24} sm={8}>
                        <div style={{ padding: '12px 16px', border: '1px solid #f0f0f0', borderRadius: 8, backgroundColor: '#fafafa' }}>
                          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Salario Actual</Typography.Text>
                          <Typography.Text strong style={{ fontSize: 15 }}>{salaryDisplay}</Typography.Text>
                        </div>
                      </Col>
                      <Col xs={24} sm={8}>
                        <div style={{ padding: '12px 16px', border: '1px solid #f0f0f0', borderRadius: 8, backgroundColor: '#fafafa' }}>
                          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Aumento Aplicado</Typography.Text>
                          <Typography.Text strong style={{ fontSize: 15, color: '#389e0d' }}>+{formatMoney(calculated.monto, employeeCurrency)}</Typography.Text>
                        </div>
                      </Col>
                      <Col xs={24} sm={8}>
                        <div style={{ padding: '12px 16px', border: '1px solid #f0f0f0', borderRadius: 8, backgroundColor: '#fafafa' }}>
                          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Equivalente</Typography.Text>
                          <Typography.Text strong style={{ fontSize: 15 }}>{round2(calculated.porcentaje).toFixed(2)}%</Typography.Text>
                        </div>
                      </Col>
                    </Row>

                    <Divider style={{ margin: '16px 0' }} />

                    <Row gutter={[20, 16]}>
                      <Col xs={24} md={12}>
                        <div style={{ padding: '12px 16px', border: '1px solid #e6f7ff', borderRadius: 8, backgroundColor: '#f6ffed' }}>
                          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Nuevo Salario</Typography.Text>
                          <Typography.Text strong style={{ fontSize: 16, color: '#1677ff' }}>{formatMoney(calculated.nuevoSalario, employeeCurrency)}</Typography.Text>
                        </div>
                      </Col>
                      <Col xs={24} md={12}>
                        <div style={{ padding: '12px 16px', border: '1px solid #f0f0f0', borderRadius: 8, backgroundColor: '#fafafa' }}>
                          <div style={{ marginBottom: 8 }}>
                            <Flex align="center" gap={6}>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>Fórmula</Typography.Text>
                              <Tooltip title="La fórmula se recalcula automáticamente">
                                <QuestionCircleOutlined style={{ fontSize: 12 }} />
                              </Tooltip>
                            </Flex>
                          </div>
                          <Typography.Paragraph style={{ marginBottom: 0, fontSize: 13, lineHeight: 1.5 }}>
                            {metodoCalculo === 'PORCENTAJE'
                              ? `Nuevo salario = ${canViewEmployeeSensitive ? round2(salarioActual).toFixed(2) : '***'} + (${canViewEmployeeSensitive ? round2(salarioActual).toFixed(2) : '***'} x ${round2(calculated.porcentaje).toFixed(2)}%) = ${round2(calculated.nuevoSalario).toFixed(2)}`
                              : `Nuevo salario = ${canViewEmployeeSensitive ? round2(salarioActual).toFixed(2) : '***'} + ${round2(calculated.monto).toFixed(2)} = ${round2(calculated.nuevoSalario).toFixed(2)}`}
                          </Typography.Paragraph>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            ) : (
              <div className={sharedStyles.historicoSection}>
                <p className={sharedStyles.sectionTitle}>Historial de cambios del aumento</p>
                <p className={sharedStyles.sectionDescription} style={{ marginBottom: 16 }}>
                  Muestra quien hizo el cambio, cuando lo hizo y el detalle registrado en bitacora.
                </p>
                <Table<PersonalActionAuditTrailItem>
                  rowKey="id"
                  size="small"
                  loading={showGlobalPreload ? false : loadingAuditTrail}
                  columns={auditColumns}
                  dataSource={auditTrail}
                  className={`${sharedStyles.configTable} ${sharedStyles.auditTableCompact}`}
                  pagination={{
                    pageSize: 4,
                    showSizeChanger: true,
                    pageSizeOptions: [4, 8, 10],
                    showTotal: (total) => `${total} registro(s)`,
                  }}
                  locale={{ emptyText: 'No hay registros de bitácora para este aumento.' }}
                />
              </div>
            )}
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
                  disabled={false}
                  loading={loading}
                  onClick={() => void handleSubmit()}
                >
                  {mode === 'edit' ? 'Guardar cambios' : 'Crear aumento'}
                </Button>
              ) : null}
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
}
