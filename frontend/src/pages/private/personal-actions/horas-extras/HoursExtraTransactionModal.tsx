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
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tabs,
  Tooltip,
} from 'antd';
import { CalendarOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, QuestionCircleOutlined, SearchOutlined } from '@ant-design/icons';
import {
  BankOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
  IdcardOutlined,
  MailOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { PayrollListItem } from '../../../../api/payroll';
import type { PayrollMovementListItem } from '../../../../api/payrollMovements';
import type { CatalogPayPeriod } from '../../../../api/catalogs';
import type { OvertimeShiftType, PersonalActionAuditTrailItem } from '../../../../api/personalActions';
import { fetchAbsencePayrollsCatalog } from '../../../../api/personalActions';
import sharedStyles from '../../configuration/UsersManagementPage.module.css';
import { formatDateTime12h } from '../../../../lib/formatDate';
import {
  EMPLOYEE_MONEY_MAX_DIGITS,
} from '../../../../lib/moneyInputSanitizer';
import { useMoneyFieldFormatter } from '../../../../hooks/useMoneyFieldFormatter';
import { useTransactionLines } from '../../../../hooks/useTransactionLines';
import { isCoreTransactionLineComplete } from '../shared/coreTransactionLine';

function getPayrollEstadoLabel(estado?: number): string {
  if (estado === 1) return 'Abierta';
  if (estado === 2) return 'En proceso';
  if (estado === 3) return 'Verificada';
  if (estado === 4) return 'Aplicada';
  if (estado === 5) return 'Contabilizada';
  if (estado === 6) return 'Notificada';
  if (estado === 0) return 'Inactiva';
  return `Estado ${estado ?? '-'}`;
}

export interface OvertimeTransactionLine {
  key: string;
  payrollId?: number;
  payrollLabel?: string;
  payrollEstado?: number;
  fechaEfecto?: Dayjs;
  movimientoId?: number;
  movimientoLabel?: string;
  movimientoInactivo?: boolean;
  fechaInicioHoraExtra?: Dayjs;
  fechaFinHoraExtra?: Dayjs;
  tipoJornadaHorasExtras: OvertimeShiftType;
  cantidad?: number;
  monto?: number;
  montoInput?: string;
  remuneracion: boolean;
  formula: string;
}

export interface OvertimeFormDraft {
  idEmpresa: number;
  idEmpleado: number;
  observacion?: string;
  lines: OvertimeTransactionLine[];
}

interface HoursExtraTransactionModalProps {
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
  actionTypeIdForOvertime?: number;
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
  initialDraft?: OvertimeFormDraft;
  onCancel: () => void;
  onSubmit: (payload: OvertimeFormDraft) => Promise<void> | void;
}

interface HeaderValues {
  idEmpresa?: number;
  idEmpleado?: number;
  observacion?: string;
}

const OVERTIME_SHIFT_OPTIONS: Array<{ value: OvertimeShiftType; label: string }> = [
  { value: '6', label: 'Nocturna (6 horas)' },
  { value: '7', label: 'Mixta (7 horas)' },
  { value: '8', label: 'Diurna (8 horas)' },
];

function buildEmptyLine(): OvertimeTransactionLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipoJornadaHorasExtras: '8',
    remuneracion: true,
    formula: '',
    montoInput: '',
  };
}

function formatMoney(amount: number | null | undefined, currency = 'CRC') {
  if (amount == null || Number.isNaN(Number(amount))) return '--';
  return `${currency} ${new Intl.NumberFormat('es-CR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount))}`;
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateSalaryByPeriod(salaryBase: number, payPeriodId?: number | null, jornada?: string | null): number {
  const id = Number(payPeriodId);
  const isByHours = (jornada ?? '').trim().toLowerCase() === 'por horas';
  if (isByHours && (id === 8 || id === 11)) return 0;

  switch (id) {
    case 8:
      return salaryBase / 4;
    case 9:
      return salaryBase / 2;
    case 10:
      return salaryBase;
    case 11:
      return salaryBase / 2;
    case 12:
      return salaryBase / 30;
    case 13:
      return salaryBase * 3;
    case 14:
      return salaryBase * 6;
    case 15:
      return salaryBase * 12;
    default:
      return salaryBase;
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
    case 8:
      return 48;
    case 9:
      return 96;
    case 10:
      return 192;
    case 11:
      return 96;
    case 12:
      return 10;
    case 13:
      return 576;
    case 14:
      return 1152;
    case 15:
      return 2304;
    default:
      return 192;
  }
}

function parseNonNegative(value: string | number | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

const MAX_ABSENCE_MONTO_DIGITS = EMPLOYEE_MONEY_MAX_DIGITS;

function normalizeIntegerAmount(value: unknown): number {
  const raw = String(value ?? '');
  const onlyDigits = raw.replace(/\D+/g, '').slice(0, MAX_ABSENCE_MONTO_DIGITS);
  if (!onlyDigits) return 0;
  const parsed = Number.parseInt(onlyDigits, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function HoursExtraTransactionModal({
  open,
  mode,
  title,
  companies,
  employees,
  payPeriods,
  movements,
  actionTypeIdForOvertime,
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
}: HoursExtraTransactionModalProps) {
  const { message, modal } = AntdApp.useApp();
  const moneyField = useMoneyFieldFormatter(MAX_ABSENCE_MONTO_DIGITS);
  const [form] = Form.useForm<HeaderValues>();
  const isLineComplete = (line: OvertimeTransactionLine): boolean =>
    isCoreTransactionLineComplete(line) &&
    !!line.fechaInicioHoraExtra &&
    !!line.fechaFinHoraExtra &&
    !!line.tipoJornadaHorasExtras;
  const {
    lines,
    setLines,
    activeLineKeys,
    setActiveLineKeys,
    updateLine,
    addLine,
    removeLine,
  } = useTransactionLines<OvertimeTransactionLine>({
    buildEmptyLine,
    isLineComplete,
    onIncompleteLine: () => {
      message.warning('Complete la linea actual antes de agregar una nueva.');
    },
  });
  const [employeePayrollConfig, setEmployeePayrollConfig] = useState<{
    idPeriodoPago?: number;
    moneda?: string;
  } | null>(null);
  const [eligiblePayrolls, setEligiblePayrolls] = useState<PayrollListItem[]>([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [auditLoaded, setAuditLoaded] = useState(false);
  const lastLineRef = useRef<HTMLDivElement>(null);
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
      const draftLines = (initialDraft.lines.length > 0 ? initialDraft.lines : [buildEmptyLine()])
        .map((line) => ({
          ...line,
          montoInput:
            line.monto == null
              ? ''
              : String(normalizeIntegerAmount(line.monto)),
        }));
      setLines(draftLines);
      setActiveLineKeys(mode === 'edit' ? [] : draftLines.map((l) => l.key));
      return;
    }

    form.setFieldsValue({ idEmpresa: initialCompanyId });
    const initialLine = buildEmptyLine();
    setLines([initialLine]);
    setActiveLineKeys([initialLine.key]);
  }, [open, initialDraft, initialCompanyId, form, mode]);

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

  // Al cambiar de empleado se reinician las líneas porque cada empleado tiene planillas distintas
  useEffect(() => {
    if (!open) {
      prevEmployeeIdRef.current = undefined;
      return;
    }
    const prev = prevEmployeeIdRef.current;
    const current = selectedEmployeeId;

    // Evita reset por cambios transitorios de tabs (cuando el campo se desmonta temporalmente).
    // Solo resetea cuando realmente cambia de un empleado válido a otro empleado válido.
    if (current == null) {
      return;
    }

    if (prev !== undefined && prev !== current) {
      const oneLine = buildEmptyLine();
      setLines([oneLine]);
      setActiveLineKeys([oneLine.key]);
    }
    prevEmployeeIdRef.current = current;
  }, [open, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId || !selectedCompanyId) {
      setEmployeePayrollConfig(null);
      setEligiblePayrolls([]);
      return;
    }
    const employee = employees.find(
      (item) => item.id === selectedEmployeeId && item.idEmpresa === selectedCompanyId,
    );
    if (!employee) {
      setEmployeePayrollConfig(null);
      return;
    }
    setEmployeePayrollConfig({
      idPeriodoPago: employee.idPeriodoPago ?? undefined,
      moneda: (employee.monedaSalario ?? '').toUpperCase() || undefined,
    });
  }, [selectedCompanyId, selectedEmployeeId, employees]);

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

  // El calculo siempre usa el salario real; el permiso sensible solo controla visibilidad en UI.
  const salaryBase = toNumber(selectedEmployee?.salarioBase);
  const employeeCurrency = (selectedEmployee?.monedaSalario ?? 'CRC').toUpperCase();
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

  const payrollsByCompany = useMemo(() => {
    if (!selectedCompanyId) return [];
    let list = eligiblePayrolls.filter((payroll) => payroll.idEmpresa === selectedCompanyId);
    if (employeePayrollConfig?.idPeriodoPago) {
      list = list.filter(
        (payroll) => Number(payroll.idPeriodoPago) === Number(employeePayrollConfig.idPeriodoPago),
      );
    }
    if (employeePayrollConfig?.moneda) {
      list = list.filter(
        (payroll) => (payroll.moneda ?? '').toUpperCase() === employeePayrollConfig.moneda,
      );
    }
    return list;
  }, [eligiblePayrolls, selectedCompanyId, employeePayrollConfig]);

  const filteredMovements = useMemo(() => {
    if (!selectedCompanyId) return [];
    let list = movements.filter((movement) => movement.idEmpresa === selectedCompanyId);

    if (actionTypeIdForOvertime) {
      list = list.filter((movement) => movement.idTipoAccionPersonal === actionTypeIdForOvertime);
    }

    const selectedIds = new Set(lines.map((line) => line.movimientoId).filter(Boolean));
    list = list.filter((movement) => movement.esInactivo === 0 || selectedIds.has(movement.id));

    return list;
  }, [movements, selectedCompanyId, actionTypeIdForOvertime, lines]);

  const calculateLineAmount = (
    line: OvertimeTransactionLine,
    movimientoId?: number,
    cantidadValue?: number,
  ) => {
    const cantidad = parseNonNegative(cantidadValue ?? line.cantidad ?? 0);
    const movement = filteredMovements.find((m) => m.id === (movimientoId ?? line.movimientoId));

    if (!movement) {
      return { monto: 0, montoInput: '0', formula: 'Seleccione un movimiento para calcular' };
    }

    const montoFijo = parseNonNegative(movement.montoFijo);
    const porcentaje = parseNonNegative(movement.porcentaje);

    if (movement.esMontoFijo === 1 && montoFijo > 0) {
      const montoCalculado = normalizeIntegerAmount(Math.round(montoFijo * cantidad));
      return {
        monto: montoCalculado,
        montoInput: String(montoCalculado),
        formula: `Monto fijo: ${montoFijo} × ${cantidad}`,
      };
    }

    if (porcentaje > 0) {
      const salarioBase = parseNonNegative(selectedEmployee?.salarioBase);
      const payPeriodId = Number(selectedEmployee?.idPeriodoPago);
      const jornadaHoras = Number(line.tipoJornadaHorasExtras || '8');
      const porcentajeDecimal = porcentaje / 100;
      const baseTxt = canViewEmployeeSensitive ? String(round2(salarioBase)) : '***';

      if (payPeriodId === 8 || payPeriodId === 11) {
        const monto = round2(salarioBase * porcentajeDecimal * cantidad);
        const montoCalculado = normalizeIntegerAmount(Math.round(monto));
        return {
          monto: montoCalculado,
          montoInput: String(montoCalculado),
          formula: `${baseTxt} × ${porcentaje}% × ${cantidad}`,
        };
      }

      const salarioPorDia = salarioBase / 30;
      const horas = Number.isFinite(jornadaHoras) && jornadaHoras > 0 ? jornadaHoras : 8;
      const valorHora = salarioPorDia / horas;
      const monto = round2(valorHora * porcentajeDecimal * cantidad);
      const montoCalculado = normalizeIntegerAmount(Math.round(monto));
      return {
        monto: montoCalculado,
        montoInput: String(montoCalculado),
        formula: `(${baseTxt}/30)/${horas} × ${porcentaje}% × ${cantidad}`,
      };
    }

    return { monto: 0, montoInput: '0', formula: 'Sin configuración de cálculo' };
  };

  const handlePayrollChange = (lineKey: string, payrollId?: number) => {
    const payroll = payrollsByCompany.find((item) => item.id === payrollId);
    updateLine(lineKey, {
      payrollId,
      payrollLabel: payroll?.nombrePlanilla ?? undefined,
      payrollEstado: payroll?.estado,
      fechaEfecto: payroll?.fechaFinPeriodo ? dayjs(payroll.fechaFinPeriodo) : undefined,
    });
  };

  const handleMovimientoChange = (lineKey: string, movimientoId?: number) => {
    const currentLine = lines.find((line) => line.key === lineKey);
    if (!currentLine) return;
    const movement = filteredMovements.find((item) => item.id === movimientoId);
    const cleaned = {
      movimientoId,
      movimientoLabel: movement?.nombre,
      movimientoInactivo: movement ? movement.esInactivo === 1 : false,
      monto: 0,
      montoInput: '0',
      formula: '',
    };
    const calculated = calculateLineAmount(
      currentLine,
      movimientoId,
      currentLine.cantidad,
    );
    updateLine(lineKey, { ...cleaned, ...calculated });
  };

  const handleCantidadChange = (lineKey: string, cantidad?: number) => {
    const currentLine = lines.find((line) => line.key === lineKey);
    if (!currentLine) return;
    const calculated = calculateLineAmount(
      currentLine,
      currentLine.movimientoId,
      cantidad,
    );
    updateLine(lineKey, { cantidad, ...calculated });
  };

  const handleTipoJornadaHorasExtrasChange = (lineKey: string, tipoJornadaHorasExtras: OvertimeShiftType) => {
    const currentLine = lines.find((line) => line.key === lineKey);
    if (!currentLine) return;
    const calculated = calculateLineAmount(
      { ...currentLine, tipoJornadaHorasExtras },
      currentLine.movimientoId,
      currentLine.cantidad,
    );
    updateLine(lineKey, { tipoJornadaHorasExtras, ...calculated });
  };

  const handleFechaInicioHoraExtraChange = (lineKey: string, value?: Dayjs) => {
    const currentLine = lines.find((line) => line.key === lineKey);
    if (!currentLine) return;
    if (
      value &&
      currentLine.fechaFinHoraExtra &&
      value.isAfter(currentLine.fechaFinHoraExtra, 'day')
    ) {
      message.error('La fecha inicio no puede ser mayor que la fecha fin.');
      return;
    }
    updateLine(lineKey, {
      fechaInicioHoraExtra: value,
      fechaFinHoraExtra: currentLine.fechaFinHoraExtra ?? value,
    });
  };

  const handleFechaFinHoraExtraChange = (lineKey: string, value?: Dayjs) => {
    const currentLine = lines.find((line) => line.key === lineKey);
    if (
      currentLine &&
      value &&
      currentLine.fechaInicioHoraExtra &&
      value.isBefore(currentLine.fechaInicioHoraExtra, 'day')
    ) {
      message.error('La fecha fin no puede ser menor que la fecha inicio.');
      return;
    }
    updateLine(lineKey, { fechaFinHoraExtra: value });
  };

  const handleAddLine = () => {
    addLine();
  };

  const handleAccept = async () => {
    if (loading) return;
    const values = await form.validateFields();
    if (lines.length === 0 || !lines.every(isLineComplete)) {
      message.error('Complete todas las lineas antes de crear/guardar la hora extra.');
      return;
    }

    const payload = {
      idEmpresa: values.idEmpresa!,
      idEmpleado: values.idEmpleado!,
      observacion: values.observacion,
      lines,
    };

    modal.confirm({
      title: mode === 'create' ? 'Confirmar creación de hora extra' : 'Confirmar actualización de hora extra',
      content:
        mode === 'create'
          ? '¿Está seguro de crear esta hora extra con las líneas capturadas?'
          : '¿Está seguro de guardar los cambios de esta hora extra?',
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
  };

  const canSubmit =
    !loading &&
    !readOnly &&
    !!selectedCompanyId &&
    !!selectedEmployeeId &&
    lines.length > 0 &&
    lines.every(isLineComplete);
  const sensitiveMaskedValue = '***';

  const showGlobalPreload =
    loading ||
    (!!selectedCompanyId && !!selectedEmployeeId && loadingPayrolls) ||
    (activeTab === 'bitacora' && loadingAuditTrail);
  const disableFutureDate = (current: Dayjs) => current.isAfter(dayjs().endOf('day'));
  const disableStartDate = (line: OvertimeTransactionLine) => (current: Dayjs) => {
    if (disableFutureDate(current)) return true;
    if (line.fechaFinHoraExtra && current.isAfter(line.fechaFinHoraExtra, 'day')) return true;
    return false;
  };
  const disableEndDate = (line: OvertimeTransactionLine) => (current: Dayjs) => {
    if (disableFutureDate(current)) return true;
    if (line.fechaInicioHoraExtra && current.isBefore(line.fechaInicioHoraExtra, 'day')) return true;
    return false;
  };

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
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
      <Form form={form} layout="vertical" className={sharedStyles.companyFormContent} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ flexShrink: 0 }}>
        {readOnly ? (
          <Alert
            type="warning"
            showIcon
            title={readOnlyMessage ?? 'Esta hora extra Está en modo solo lectura por su estado actual.'}
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
                ? [
                  {
                    key: 'bitacora',
                    label: (
                      <span>
                        <SearchOutlined style={{ marginRight: 8, fontSize: 16 }} />
                        Bitacora
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
            className={`${sharedStyles.employeeAccordion}`}
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

        <Card size="small" style={{ marginBottom: 12, border: '1px solid #e8ecf0', borderRadius: 8 }}>
          <Flex gap={10} wrap="wrap">
            <Form.Item
              style={{ flex: '1 1 300px', marginBottom: 0 }}
              name="idEmpresa"
              label="Empresa"
              rules={[{ required: true, message: 'Seleccione la empresa' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Seleccione empresa"
                disabled={mode === 'edit' || readOnly}
                options={companies.map((company) => ({
                  value: Number(company.id),
                  label: company.nombre,
                }))}
              />
            </Form.Item>

            {selectedCompanyId ? (
              <Form.Item
                style={{ flex: '1 1 380px', marginBottom: 0 }}
                name="idEmpleado"
                label="Empleado"
                rules={[{ required: true, message: 'Seleccione el empleado' }]}
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
                    label: `${[employee.apellido1, employee.apellido2, employee.nombre]
                      .filter((part) => typeof part === 'string' && part.trim().length > 0)
                      .join(' ')} (${employee.codigo})`,
                  }))}
                />
              </Form.Item>
            ) : null}
          </Flex>

          <Form.Item name="observacion" label="Observacion" style={{ marginTop: 8, marginBottom: 0 }}>
            <Input.TextArea rows={1} autoSize={{ minRows: 1, maxRows: 3 }} maxLength={500} disabled={readOnly} />
          </Form.Item>
        </Card>
        </>
        )}
        </div>

        {(mode !== 'edit' || activeTab === 'info') && selectedCompanyId && selectedEmployeeId ? (
          <Card
            size="small"
            title="Líneas de Transacción"
            style={{
              border: '1px solid #e8ecf0',
              borderRadius: 8,
              flex: 1,
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              marginTop: 12,
            }}
            bodyStyle={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: 16,
              overflow: 'hidden',
            }}
          >
            {loading && !showGlobalPreload ? (
              <Flex justify="center" align="center" style={{ minHeight: 220 }}>
                <Spin size="large" description="Cargando lineas de transaccion..." />
              </Flex>
            ) : (
            <>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 0 }}>
              <Collapse
                className={sharedStyles.lineCollapse}
                activeKey={activeLineKeys}
                onChange={(keys) => setActiveLineKeys(Array.isArray(keys) ? keys : keys ? [keys] : [])}
                items={lines.map((line, index) => {
                  const selectedMovement = filteredMovements.find((movement) => movement.id === line.movimientoId);
                  const payrollOptions = payrollsByCompany.map((payroll) => ({
                    value: payroll.id,
                    label: `${payroll.nombrePlanilla ?? `Planilla #${payroll.id}`} (${getPayrollEstadoLabel(payroll.estado)})`,
                    disabled: false,
                  }));
                  if (
                    line.payrollId &&
                    !payrollOptions.some((option) => option.value === line.payrollId)
                  ) {
                    payrollOptions.push({
                      value: line.payrollId,
                      label: `${line.payrollLabel ?? `Planilla #${line.payrollId}`} (No elegible hoy)`,
                      disabled: true,
                    });
                  }

                  const movementOptions = filteredMovements.map((movement) => ({
                    value: movement.id,
                    label: `${movement.nombre} (${movement.esMontoFijo === 1 ? 'Monto' : '%'})${movement.esInactivo === 1 ? ' (Inactivo)' : ''}`,
                    disabled: movement.esInactivo === 1 && movement.id !== line.movimientoId,
                  }));
                  if (
                    line.movimientoId &&
                    !movementOptions.some((option) => option.value === line.movimientoId)
                  ) {
                    movementOptions.push({
                      value: line.movimientoId,
                      label: `${line.movimientoLabel ?? `Movimiento #${line.movimientoId}`} (No elegible hoy)`,
                      disabled: true,
                    });
                  }
                  return {
                    key: line.key,
                    label: (
                      <Flex justify="space-between" align="center" style={{ width: '100%', paddingRight: 8 }}>
                        <span style={{ fontWeight: 600, color: '#3d4f5c' }}>Línea {index + 1}</span>
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLine(line.key);
                          }}
                          disabled={readOnly || lines.length <= 1}
                        >
                          Eliminar
                        </Button>
                      </Flex>
                    ),
                    children: (
                      <div ref={index === lines.length - 1 ? lastLineRef : undefined}>
                        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                      <Row gutter={[16, 12]}>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>1. Periodo de pago (Planilla)</div>
                          <Select
                            style={{ width: '100%' }}
                            showSearch
                            optionFilterProp="label"
                            loading={loadingPayrolls}
                            notFoundContent={loadingPayrolls ? <Spin size="small" /> : null}
                            value={line.payrollId}
                            placeholder="Seleccione planilla"
                            options={payrollOptions}
                            onChange={(value) => handlePayrollChange(line.key, value)}
                            disabled={readOnly}
                          />
                          {line.payrollId && !payrollsByCompany.some((item) => item.id === line.payrollId) ? (
                            <Alert
                              type="warning"
                              showIcon
                              title="La planilla de esta linea ya no es elegible (cerrada, vencida o fuera de reglas)."
                              className={`${sharedStyles.infoBanner} ${sharedStyles.warningType}`}
                              style={{ marginTop: 10 }}
                            />
                          ) : null}
                          {payrollsByCompany.length === 0 ? (
                            <Alert
                              type={loadingPayrolls ? 'info' : 'error'}
                              showIcon
                              title={loadingPayrolls
                                ? 'Cargando planillas elegibles...'
                                : 'No hay planillas que coincidan con empresa, periodo de pago y moneda del empleado.'}
                              className={`${sharedStyles.infoBanner} ${sharedStyles.dangerType}`}
                              style={{ marginTop: 10 }}
                            />
                          ) : null}
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>2. Movimiento</div>
                          <Tooltip title={!line.payrollId ? 'Seleccione primero el periodo de pago' : undefined}>
                            <Select
                              style={{ width: '100%' }}
                              showSearch
                              optionFilterProp="label"
                              loading={movementsLoading}
                              notFoundContent={movementsLoading ? <Spin size="small" /> : null}
                              disabled={readOnly || !line.payrollId}
                              placeholder={!line.payrollId ? 'Seleccione planilla primero' : 'Seleccione movimiento'}
                              value={line.movimientoId}
                              onChange={(value) => handleMovimientoChange(line.key, value)}
                              options={movementOptions}
                            />
                          </Tooltip>
                          {selectedMovement?.esInactivo === 1 ? (
                            <Tag color="orange" style={{ marginTop: 6 }}>Inactivo</Tag>
                          ) : null}
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>3. Tipo de jornada</div>
                          <Tooltip title={!line.movimientoId ? 'Seleccione primero el movimiento' : undefined}>
                            <Select
                              style={{ width: '100%' }}
                              disabled={readOnly || !line.movimientoId}
                              placeholder={!line.movimientoId ? 'Seleccione movimiento primero' : 'Seleccione jornada'}
                              value={line.tipoJornadaHorasExtras}
                              onChange={(value) => handleTipoJornadaHorasExtrasChange(line.key, value)}
                              options={OVERTIME_SHIFT_OPTIONS}
                            />
                          </Tooltip>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>4. Fecha inicio hora extra</div>
                          <DatePicker
                            style={{ width: '100%' }}
                            value={line.fechaInicioHoraExtra}
                            format="YYYY-MM-DD"
                            disabled={readOnly || !line.movimientoId}
                            disabledDate={disableStartDate(line)}
                            onChange={(value) => handleFechaInicioHoraExtraChange(line.key, value ?? undefined)}
                          />
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>5. Fecha fin hora extra</div>
                          <DatePicker
                            style={{ width: '100%' }}
                            value={line.fechaFinHoraExtra}
                            format="YYYY-MM-DD"
                            disabled={readOnly || !line.movimientoId}
                            disabledDate={disableEndDate(line)}
                            onChange={(value) => handleFechaFinHoraExtraChange(line.key, value ?? undefined)}
                          />
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>6. Cantidad</div>
                          <Tooltip title={!line.movimientoId ? 'Seleccione primero el movimiento' : undefined}>
                            <InputNumber
                              min={1}
                              precision={0}
                              step={1}
                              style={{ width: '100%' }}
                              disabled={readOnly || !line.movimientoId}
                              placeholder={!line.movimientoId ? '-' : undefined}
                              value={line.cantidad}
                              onChange={(value) => handleCantidadChange(line.key, value ?? undefined)}
                            />
                          </Tooltip>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>
                            {`7. Monto (${employeePayrollConfig?.moneda ?? 'MONEDA'})`}
                          </div>
                          <Tooltip title={!line.movimientoId ? 'Seleccione primero el movimiento' : undefined}>
                            <Input
                              style={{ width: '100%' }}
                              placeholder={!line.movimientoId ? '-' : undefined}
                              maxLength={moneyField.maxInputLength}
                              inputMode="numeric"
                              value={moneyField.formatDisplay(line.montoInput)}
                              disabled={readOnly}
                              onChange={(event) => {
                                const raw = event.target.value ?? '';
                                const onlyDigits = moneyField.sanitize(raw);
                                updateLine(line.key, {
                                  montoInput: onlyDigits,
                                  monto: onlyDigits.length > 0
                                    ? (moneyField.parse(onlyDigits) ?? 0)
                                    : undefined,
                                });
                              }}
                            />
                          </Tooltip>
                        </Col>
                      </Row>

                      <div style={{ borderTop: '1px solid #e8ecf0', paddingTop: 16, marginTop: 4 }}>
                        <Row gutter={[16, 12]}>
                          <Col xs={24} md={12}>
                            <div className={sharedStyles.filterLabel} style={{ color: '#94a3b8' }}>Fecha Efecto</div>
                            <DatePicker
                              style={{ width: '100%' }}
                              value={line.fechaEfecto}
                              format="YYYY-MM-DD"
                              disabled
                            />
                          </Col>
                          <Col xs={24} md={12}>
                            <div className={sharedStyles.filterLabel} style={{ color: '#94a3b8' }}>Formula</div>
                            <Input
                              value={line.formula}
                              disabled
                              readOnly
                              placeholder="Derivado del movimiento"
                            />
                          </Col>
                        </Row>
                      </div>
                        </Space>
                      </div>
                    ),
                  };
                })}
              />
            </div>
            <Flex justify="center" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e8ecf0', flexShrink: 0 }}>
              <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddLine} disabled={readOnly}>
                Agregar Línea de transacción
              </Button>
            </Flex>
            </>
            )}
          </Card>
        ) : null}

        {mode === 'edit' && activeTab === 'bitacora' ? (
          <div className={sharedStyles.historicoSection}>
            <p className={sharedStyles.sectionTitle}>Historial de cambios de la hora extra</p>
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
                pageSize: 8,
                showSizeChanger: true,
                showTotal: (total) => `${total} registro(s)`,
              }}
              locale={{ emptyText: 'No hay registros de bitacora para esta hora extra.' }}
            />
          </div>
        ) : null}

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
              icon={mode === 'create' ? <PlusOutlined /> : undefined}
            >
              {mode === 'create' ? 'Crear hora extra' : 'Guardar cambios'}
            </Button>
          ) : null}
        </div>
        </div>
      </Form>
      </div>
    </Modal>
  );
}










