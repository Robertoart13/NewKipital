import {
  BankOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  DollarCircleOutlined,
  MenuOutlined,
  IdcardOutlined,
  MailOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
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
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildEmployeeDisplayName, sortEmployeesByDisplayName } from '../../../../lib/employeeName';

import 'dayjs/locale/es';
import {
  fetchAbsencePayrollsCatalog,
  fetchVacationAvailability,
  fetchVacationBookedDates,
} from '../../../../api/personalActions';
import { formatDateTime12h } from '../../../../lib/formatDate';
import sharedStyles from '../../configuration/UsersManagementPage.module.css';
import { formatEmployeeLabel } from '../shared/employeeLabel';

import styles from './VacationTransactionModal.module.css';

import type { CatalogPayPeriod } from '../../../../api/catalogs';
import type { PayrollMovementListItem } from '../../../../api/payrollMovements';
import type {
  PersonalActionAuditTrailItem,
  VacationAvailability,
  VacationBookedDateItem,
  VacationHolidayItem,
} from '../../../../api/personalActions';
import type { ColumnsType } from 'antd/es/table';

export interface VacationDateSelection {
  key: string;
  fecha: Dayjs;
}

export interface VacationFormDraft {
  idEmpresa: number;
  idEmpleado: number;
  payrollId?: number;
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
  onCompanyChange?: (companyId?: number) => void;
  initialCompanyId?: number;
  initialDraft?: VacationFormDraft;
  onCancel: () => void;
  onSubmit: (payload: VacationFormDraft) => Promise<void> | void;
}

interface HeaderValues {
  idEmpresa?: number;
  idEmpleado?: number;
  movimientoId?: number;
  observacion?: string;
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
      date.isSame(start, 'day') || date.isSame(end, 'day') || (date.isAfter(start, 'day') && date.isBefore(end, 'day'))
    );
  });
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
    onCompanyChange,
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
      estado?: number;
    }>
  >([]);
  const [selectedDates, setSelectedDates] = useState<VacationDateSelection[]>([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [localAvailability, setLocalAvailability] = useState<VacationAvailability | null>(null);
  const [bookedDates, setBookedDates] = useState<VacationBookedDateItem[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'bitacora'>('info');
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [warnedInvalidDates, setWarnedInvalidDates] = useState(false);
  const [lockedPayrollId, setLockedPayrollId] = useState<number | null>(null);
  const initOnceRef = useRef(false);

  const selectedCompanyId = Form.useWatch('idEmpresa', form);
  const selectedEmployeeId = Form.useWatch('idEmpleado', form);

  useEffect(() => {
    if (!open) return;
    if (!onCompanyChange) return;
    onCompanyChange(selectedCompanyId ? Number(selectedCompanyId) : undefined);
  }, [onCompanyChange, open, selectedCompanyId]);
  const selectedMovementId = Form.useWatch('movimientoId', form);
  const resolvedCompanyId = selectedCompanyId ? initialDraft?.idEmpresa ?? null;
  const resolvedEmployeeId = selectedEmployeeId ? initialDraft?.idEmpleado ?? null;

  useEffect(() => {
    if (!open) {
    initOnceRef.current = false;
    return;
  }

  if (!initialDraft && initOnceRef.current) {
    return;
  }

  if (!initialDraft) {
    initOnceRef.current = true;
  }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTab('info');

    setAuditLoaded(false);

    if (initialDraft) {
      form.setFieldsValue({
        idEmpresa: initialDraft.idEmpresa,
        idEmpleado: initialDraft.idEmpleado,
        movimientoId: initialDraft.movimientoId,
        observacion: initialDraft.observacion ?? undefined,
      });
      setLockedPayrollId(
        typeof initialDraft.payrollId === 'number' && initialDraft.payrollId > 0 ? initialDraft.payrollId : null,
      );
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
        void fetchVacationAvailability(Number(initialDraft.idEmpresa), Number(initialDraft.idEmpleado))
          .then((resp) => setLocalAvailability(resp ?? null))
          .catch(() => setLocalAvailability(null));
        void fetchVacationBookedDates(Number(initialDraft.idEmpresa), Number(initialDraft.idEmpleado), excludeActionId)
          .then((resp) => setBookedDates(resp ?? []))
          .catch(() => setBookedDates([]));
      }
      return;
    }

    form.resetFields();

    setSelectedDates([]);

    setBookedDates([]);

    setWarnedInvalidDates(false);

    setLockedPayrollId(null);
    const nextCompanyId = mode === 'edit' ? initialCompanyId : undefined;
    // En creacion no se preselecciona empresa; el usuario debe elegirla.
    if (nextCompanyId) {
      form.setFieldsValue({ idEmpresa: nextCompanyId });
    }
  }, [excludeActionId, form, holidays, initialCompanyId, initialDraft, message, mode, open, warnedInvalidDates]);

  useEffect(() => {
    if (!open || !showAudit || activeTab !== 'bitacora' || auditLoaded || !onLoadAuditTrail) return;
    const load = async () => {
      await onLoadAuditTrail();
      setAuditLoaded(true);
    };
    void load();
  }, [activeTab, auditLoaded, onLoadAuditTrail, open, showAudit]);

  useEffect(() => {
    if (!resolvedCompanyId || !resolvedEmployeeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPayrollOptions([]);

      setLocalAvailability(null);
      return;
    }

    setLoadingPayrolls(true);
    void fetchAbsencePayrollsCatalog(Number(resolvedCompanyId), Number(resolvedEmployeeId))
      .then((items) => {
        const options = items.map((item) => ({
          id: item.id,
          label: `${item.nombrePlanilla ?? `Planilla #${item.id}`} (${item.fechaInicioPeriodo} - ${item.fechaFinPeriodo})`,
          periodo: `${item.fechaInicioPeriodo} - ${item.fechaFinPeriodo}`,
          fechaInicioPeriodo: item.fechaInicioPeriodo,
          fechaFinPeriodo: item.fechaFinPeriodo,
          tipoPlanilla: item.tipoPlanilla ?? null,
          tipoPlanilla: item.tipoPlanilla ?? null,
          estado: item.estado,
        }));
        setPayrollOptions(options);
      })
      .catch((error) => {
        message.error(error?.message ?? 'Error al cargar planillas elegibles');
        setPayrollOptions([]);
      })
      .finally(() => setLoadingPayrolls(false));
  }, [message, resolvedCompanyId, resolvedEmployeeId]);

  useEffect(() => {
    if (!resolvedCompanyId || !resolvedEmployeeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalAvailability(null);

      setBookedDates([]);
      return;
    }

    void fetchVacationAvailability(Number(resolvedCompanyId), Number(resolvedEmployeeId))
      .then((resp) => setLocalAvailability(resp ?? null))
      .catch(() => setLocalAvailability(null));

    void fetchVacationBookedDates(Number(resolvedCompanyId), Number(resolvedEmployeeId), excludeActionId)
      .then((resp) => {
        setBookedDates(resp ?? []);
        const bookedSet = new Set(
          (resp ?? []).map((item) => item.fecha?.trim()).filter((value): value is string => !!value),
        );
        if (bookedSet.size > 0) {
          setSelectedDates((prev) => prev.filter((item) => !bookedSet.has(item.key)));
        }
      })
      .catch(() => setBookedDates([]));
  }, [excludeActionId, resolvedCompanyId, resolvedEmployeeId]);

  const filteredEmployees = useMemo(() => {
    if (!resolvedCompanyId) return [];
    return sortEmployeesByDisplayName(employees.filter((emp) => Number(emp.idEmpresa) === Number(resolvedCompanyId)));
  }, [employees, resolvedCompanyId]);

  const selectedEmployee = useMemo(() => {
    if (!resolvedEmployeeId) return undefined;
    return employees.find((emp) => emp.id === Number(resolvedEmployeeId));
  }, [employees, resolvedEmployeeId]);

  const selectedPayPeriod = useMemo(() => {
    if (!selectedEmployee?.idPeriodoPago) return null;
    return payPeriods.find((p) => Number(p.id) === Number(selectedEmployee.idPeriodoPago)) ?? null;
  }, [payPeriods, selectedEmployee]);

  const salaryBase = toNumber(selectedEmployee?.salarioBase);
  const employeeCurrency = (selectedEmployee?.monedaSalario ?? 'CRC').toUpperCase();
  const salaryByPeriod = calculateSalaryByPeriod(
    salaryBase,
    selectedEmployee?.idPeriodoPago,
    selectedEmployee?.jornada,
  );
  const hourValue = calculateHourValue(salaryBase, selectedEmployee?.idPeriodoPago, selectedEmployee?.jornada);
  const periodHours = calculatePeriodHours(selectedEmployee?.idPeriodoPago, selectedEmployee?.jornada);

  const sensitiveMaskedValue = '***';

  const movementOptions = useMemo(() => {
    if (!selectedCompanyId) return [];
    return movements.filter((movement) => Number(movement.idEmpresa) === Number(selectedCompanyId));
  }, [movements, selectedCompanyId]);

  const availableDays = (availability ?? localAvailability)?.disponible ?? 0;
  const bookedDateSet = useMemo(
    () => new Set(bookedDates.map((item) => item.fecha?.trim()).filter((value): value is string => !!value)),
    [bookedDates],
  );
  const getPayrollTypeKey = useCallback(
    (item: { idTipoPlanilla?: number | null; tipoPlanilla?: string | null }) =>
      item.idTipoPlanilla != null
        ? `id:${item.idTipoPlanilla}`
        : `tipo:${String(item.tipoPlanilla ?? '').toLowerCase()}`,
    [],
  );
  const getPayrollMatchesForDate = useCallback(
    (date: Dayjs) => {
      return payrollOptions.filter((item) => {
        const start = dayjs(item.fechaInicioPeriodo);
        const end = dayjs(item.fechaFinPeriodo);
        return (
          date.isSame(start, 'day') ||
          date.isSame(end, 'day') ||
          (date.isAfter(start, 'day') && date.isBefore(end, 'day'))
        );
      });
    },
    [payrollOptions],
  );
  const pickPreferredPayroll = useCallback(
    (
      matches: Array<{
        id: number;
        label: string;
        estado?: number;
        fechaInicioPeriodo: string;
        fechaFinPeriodo: string;
        idTipoPlanilla?: number | null;
        tipoPlanilla?: string | null;
      }>,
    ) => {
      if (matches.length === 0) return null;
      if (matches.length === 1) return matches[0];
      const ranked = [...matches].sort((a, b) => {
        const estadoB = Number(b.estado ?? 99);
        const estadoB = Number(b.estado ? 99);
        if (estadoA !== estadoB) return estadoA - estadoB;
        const startB = b.fechaInicioPeriodo ?? '';
        const startB = b.fechaInicioPeriodo ?? '';
        if (startA !== startB) return startA.localeCompare(startB);
        return Number(a.id) - Number(b.id);
      });
      return ranked[0];
    },
    [],
  );
  const getSinglePayrollForDate = useCallback(
    (date: Dayjs) => {
      const matches = getPayrollMatchesForDate(date);
      return pickPreferredPayroll(matches);
    },
    [getPayrollMatchesForDate, pickPreferredPayroll],
  );
  const selectionTypeKey = useMemo(() => {
    if (!selectedDates.length) return null;
    const first = getSinglePayrollForDate(selectedDates[0].fecha);
    return first ? getPayrollTypeKey(first) : null;
  }, [getPayrollTypeKey, getSinglePayrollForDate, selectedDates]);
  const selectedPayrollSummary = useMemo(() => {
    if (!selectedDates.length) return { payrolls: [], invalidDates: [], ambiguousDates: [] };
    const map = new Map<number, string>();
    const invalidDates: string[] = [];
    const ambiguousDates: string[] = [];
    selectedDates.forEach((item) => {
      const matches = getPayrollMatchesForDate(item.fecha);
      if (matches.length === 0) {
        invalidDates.push(item.key);
        return;
      }
      if (matches.length > 1) {
        ambiguousDates.push(item.key);
      }
      const chosen = pickPreferredPayroll(matches);
      if (chosen) {
        map.set(chosen.id, chosen.label);
      }
    });
    return {
      payrolls: Array.from(map.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      invalidDates,
      ambiguousDates,
    };
  }, [getPayrollMatchesForDate, pickPreferredPayroll, selectedDates]);

  const getDateDisableReason = useCallback(
    (date: Dayjs) => {
      if (isWeekend(date)) return 'Fin de semana';
      if (isHoliday(date, holidays)) return 'Feriado';
      if (bookedDateSet.has(buildDateKey(date))) return 'Reservado';
      if (!payrollOptions.length) return 'Sin planillas elegibles';

      const matches = getPayrollMatchesForDate(date);
      if (matches.length === 0) return 'Sin planilla elegible';

      const match = pickPreferredPayroll(matches);
      if (!match) return 'Sin planilla elegible';
      if (lockedPayrollId && Number(match.id) !== Number(lockedPayrollId)) {
        return 'Fuera de la planilla original';
      }
      if (selectionTypeKey && getPayrollTypeKey(match) !== selectionTypeKey) {
        return 'Tipo de planilla diferente';
      }
      return null;
    },
    [
      bookedDateSet,
      getPayrollMatchesForDate,
      getPayrollTypeKey,
      holidays,
      lockedPayrollId,
      payrollOptions.length,
      pickPreferredPayroll,
      selectionTypeKey,
    ],
  );

  const disabledDate = useCallback(
    (date: Dayjs) => {
      return getDateDisableReason(date) != null;
    },
    [getDateDisableReason],
  );

  const toggleDate = useCallback(
    (date: Dayjs) => {
      const key = buildDateKey(date);
      const existing = selectedDates.find((item) => item.key === key);
      if (existing) {
        setSelectedDates((prev) => prev.filter((item) => item.key !== key));
        return;
      }
      if (selectedDates.length >= availableDays && availableDays >= 0) {
        message.warning('No hay saldo disponible para agregar más días.');
        return;
      }
      setSelectedDates((prev) => [...prev, { key, fecha: date }].sort((a, b) => (a.key < b.key ? -1 : 1)));
    },
    [availableDays, message, selectedDates],
  );

  const canSubmit =
    !loading &&
    !readOnly &&
    !!resolvedCompanyId &&
    !!resolvedEmployeeId &&
    !!selectedMovementId &&
    selectedDates.length > 0 &&
    selectedPayrollSummary.invalidDates.length === 0 &&
    selectedPayrollSummary.payrolls.length > 0;

  const showGlobalPreload =
    !!loading ||
    (!!resolvedCompanyId && !!resolvedEmployeeId && loadingPayrolls) ||
    (activeTab === 'bitacora' && !!loadingAuditTrail);

  const auditColumns: ColumnsType<PersonalActionAuditTrailItem> = useMemo(
    () => [
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
          const actorLabel =
            row.actorNombre?.trim() ||
            row.actorEmail?.trim() ||
            (row.actorUserId != null ? `Usuario ID ${row.actorUserId}` : 'Sistema');
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
                      <div>
                        <strong>{change.campo}</strong>
                      </div>
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
    ],

    [],
  );

  const handleAccept = useCallback(async () => {
    if (loading) return;
    const values = await form.validateFields();
    if (!selectedDates.length) {
      message.error('Debe seleccionar al menos una fecha de vacaciones.');
      return;
    }
    if (selectedPayrollSummary.invalidDates.length > 0 || selectedPayrollSummary.payrolls.length === 0) {
      message.error('Hay fechas sin planilla válida. Revise las fechas seleccionadas.');
      return;
    }

    const payload: VacationFormDraft = {
      idEmpresa: Number(values.idEmpresa),
      idEmpleado: Number(values.idEmpleado),
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
  }, [form, loading, message, modal, mode, onSubmit, selectedDates, selectedPayrollSummary]);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      className={sharedStyles.companyModal}
      closable={false}
      footer={null}
      width={1400}
      destroyOnHidden
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
      title={
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
      }
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: 'hidden',
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
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
          }}
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

            {mode !== 'edit' || activeTab === 'info' ? (
              <Row gutter={16} wrap style={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}>
                {/* Columna izquierda: formulario */}
                <Col xs={24} lg={10} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                                    {buildEmployeeDisplayName(selectedEmployee)}
                                  </div>
                                  <div className={sharedStyles.employeeAccordionId}>
                                    Empleado ID: {selectedEmployee.codigo || '--'}
                                    {canViewEmployeeSensitive && selectedEmployee.cedula
                                      ? ` - ${selectedEmployee.cedula}`
                                      : ''}
                                    {canViewEmployeeSensitive && selectedEmployee.telefono
                                      ? ` - ${selectedEmployee.telefono}`
                                      : ''}
                                  </div>
                                  <div className={sharedStyles.employeeAccordionCompany}>
                                    <BankOutlined />
                                    {companies.find(
                                    )?.nombre ?? '--'}
                                    )?.nombre ? '--'}
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
                                      {canViewEmployeeSensitive
                                        ? (selectedEmployee.cedula ?? '--')
                                        : sensitiveMaskedValue}
                                    </div>
                                  </div>
                                </div>
                                <div className={sharedStyles.employeeAccordionItem}>
                                  <MailOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                  <div>
                                    <div className={sharedStyles.employeeAccordionItemLabel}>Email</div>
                                    <div className={sharedStyles.employeeAccordionItemValue}>
                                      {canViewEmployeeSensitive
                                        ? (selectedEmployee.email ?? '--')
                                        : sensitiveMaskedValue}
                                    </div>
                                  </div>
                                </div>
                                <div className={sharedStyles.employeeAccordionItem}>
                                  <CalendarOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                  <div>
                                    <div className={sharedStyles.employeeAccordionItemLabel}>Período</div>
                                    <div className={sharedStyles.employeeAccordionItemValue}>
                                      {selectedPayPeriod?.nombre ?? '--'}
                                    </div>
                                  </div>
                                </div>
                                <div className={sharedStyles.employeeAccordionItem}>
                                  <ClockCircleOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                  <div>
                                    <div className={sharedStyles.employeeAccordionItemLabel}>Jornada</div>
                                    <div className={sharedStyles.employeeAccordionItemValue}>
                                      {selectedEmployee.jornada ?? '--'}
                                    </div>
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
                                      {canViewEmployeeSensitive
                                        ? formatMoney(selectedEmployee.salarioBase, employeeCurrency)
                                        : sensitiveMaskedValue}
                                    </div>
                                  </div>
                                </div>
                                <div className={sharedStyles.employeeAccordionItem}>
                                  <DollarCircleOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                  <div>
                                    <div className={sharedStyles.employeeAccordionItemLabel}>
                                      Salario {selectedPayPeriod?.nombre ?? 'PerÃ­odo'}
                                    </div>
                                    <div className={sharedStyles.employeeAccordionItemValue}>
                                      {canViewEmployeeSensitive
                                        ? formatMoney(salaryByPeriod, employeeCurrency)
                                        : sensitiveMaskedValue}
                                    </div>
                                  </div>
                                </div>
                                <div className={sharedStyles.employeeAccordionItem}>
                                  <DollarCircleOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                  <div>
                                    <div className={sharedStyles.employeeAccordionItemLabel}>Valor por Hora</div>
                                    <div className={sharedStyles.employeeAccordionItemValue}>
                                      {canViewEmployeeSensitive
                                        ? `${formatMoney(hourValue, employeeCurrency)}/hora`
                                        : sensitiveMaskedValue}
                                    </div>
                                  </div>
                                </div>
                                <div className={sharedStyles.employeeAccordionItem}>
                                  <ClockCircleOutlined className={sharedStyles.employeeAccordionItemIcon} />
                                  <div>
                                    <div className={sharedStyles.employeeAccordionItemLabel}>Horas del Período</div>
                                    <div
                                      className={sharedStyles.employeeAccordionItemValue}
                                    >{`${periodHours} horas`}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ),
                        },
                      ]}
                    />
                  ) : null}
                  <Card size="small" style={{ border: '1px solid #e8ecf0', borderRadius: 8 }}>
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
                    <Form.Item label="Días disponibles">
                      <Input value={availableDays} disabled />
                    </Form.Item>
                    <Form.Item label="Observación" name="observacion" style={{ marginBottom: 0 }}>
                      <Input.TextArea
                        rows={2}
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        disabled={readOnly}
                        maxLength={300}
                      />
                    </Form.Item>
                  </Card>
                </Col>

                {/* Columna derecha: Calendario de vacaciones + Fechas seleccionadas */}
                <Col xs={24} lg={14} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowX: 'hidden',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0,
                      minWidth: 0,
                    }}
                  >
                    {selectedPayrollSummary.ambiguousDates.length > 0 ? (
                      <Alert
                        type="warning"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message="Hay fechas que coinciden con múltiples planillas. Se asignará la planilla ABIERTA (o la de menor ID si hay empate)."
                      />
                    ) : null}
                    <Row gutter={16} wrap style={{ flex: 1, minHeight: 0 }}>
                      <Col xs={24} lg={14}>
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
                                  const reason = getDateDisableReason(date);
                                  if (reason && !selected) {
                                    return (
                                      <Tooltip title={reason}>
                                        <div className={styles.dateDisabledBadge}>Bloq.</div>
                                      </Tooltip>
                                    );
                                  }
                                  if (booked) {
                                    return <div className={styles.dateReservedBadge}>Res.</div>;
                                  }
                                  return selected ? <div className={styles.dateSelectedBadge}>Sel.</div> : null;
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
                      <Col xs={24} lg={10}>
                        <div
                          className={styles.datesListCard}
                          style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}
                        >
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
                                      {parseDateKey(item.key).locale('es').format('dddd, D [de] MMMM [de] YYYY')}
                                    </div>
                                    <div className={styles.dateRowSub}>{item.key}</div>
                                  </div>
                                  {!readOnly ? (
                                    <Button
                                      type="text"
                                      icon={<DeleteOutlined />}
                                      size="small"
                                      onClick={() =>
                                        setSelectedDates((prev) => prev.filter((row) => row.key !== item.key))
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
                  </div>
                </Col>
              </Row>
            ) : null}

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
                    pageSize: 4,
                    showSizeChanger: true,
                    pageSizeOptions: [4, 8, 10],
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















