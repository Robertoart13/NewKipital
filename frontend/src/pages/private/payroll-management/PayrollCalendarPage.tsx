import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  App as AntdApp,
  Alert,
  Button,
  Calendar,
  Card,
  Collapse,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Flex,
  Segmented,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  LeftOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '../../../store/hooks';
import {
  applyPayroll,
  fetchPayroll,
  fetchPayrollSnapshotSummary,
  fetchPayrolls,
  processPayroll,
  verifyPayroll,
  type PayrollListItem,
} from '../../../api/payroll';
import { fetchPayrollHolidays, payrollHolidayTypeLabel, type PayrollHolidayItem } from '../../../api/payrollHolidays';
import sharedStyles from '../configuration/UsersManagementPage.module.css';
import styles from './PayrollCalendarPage.module.css';

const { Text } = Typography;

dayjs.locale('es');

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getYearOptions() {
  const current = dayjs().year();
  const years: { label: string; value: number }[] = [];
  for (let y = current - 4; y <= current + 2; y += 1) years.push({ label: String(y), value: y });
  return years;
}

type CalendarMode = 'Mensual' | 'Timeline';

interface CalendarEvent {
  id: string;
  payrollId?: number;
  label: string;
  kind: 'period' | 'payment' | 'holiday';
  status?: number;
  holidayType?: PayrollHolidayItem['tipo'];
}

interface PayrollDetails extends PayrollListItem {
  versionLock?: number;
  createdBy?: number;
}

const TYPE_COLOR: Record<string, string> = {
  regular: '#1E88E5',
  aguinaldo: '#2E7D32',
  liquidacion: '#C62828',
  extraordinaria: '#F57C00',
};

const STATUS_VISUAL: Record<number, { label: string; icon: ReactNode }> = {
  1: { label: 'Abierta', icon: <WarningOutlined /> },
  2: { label: 'En Proceso', icon: <LoadingOutlined spin /> },
  3: { label: 'Verificada', icon: <SafetyOutlined /> },
  4: { label: 'Aplicada', icon: <CheckCircleOutlined /> },
  5: { label: 'Enviada NetSuite', icon: <CloudUploadOutlined /> },
  6: { label: 'Error de envio', icon: <ExclamationCircleOutlined /> },
  0: { label: 'Inactiva', icon: <WarningOutlined /> },
  7: { label: 'Inactiva', icon: <WarningOutlined /> },
};

function toDate(value?: string | null): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.startOf('day') : null;
}

function normalizeType(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

function getTypeColor(value?: string | null): string {
  return TYPE_COLOR[normalizeType(value)] ?? '#4f6272';
}

function hasOverlap(a: PayrollListItem, b: PayrollListItem): boolean {
  const aStart = toDate(a.fechaInicioPeriodo);
  const aEnd = toDate(a.fechaFinPeriodo);
  const bStart = toDate(b.fechaInicioPeriodo);
  const bEnd = toDate(b.fechaFinPeriodo);
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return !aEnd.isBefore(bStart, 'day') && !bEnd.isBefore(aStart, 'day');
}

export function PayrollCalendarPage() {
  const { modal, message } = AntdApp.useApp();
  const companies = useAppSelector((state) => state.auth.companies);
  const activeCompany = useAppSelector((state) => state.activeCompany.company);
  const canProcess = useAppSelector((state) => state.permissions.permissions.includes('payroll:process'));
  const canVerify = useAppSelector((state) => state.permissions.permissions.includes('payroll:verify'));
  const canApply = useAppSelector((state) => state.permissions.permissions.includes('payroll:apply'));
  const canViewSensitive = useAppSelector((state) => state.permissions.permissions.includes('payroll:view_sensitive'));

  const [rows, setRows] = useState<PayrollListItem[]>([]);
  const [allRows, setAllRows] = useState<PayrollListItem[]>([]);
  const [holidays, setHolidays] = useState<PayrollHolidayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [hideHolidays, setHideHolidays] = useState(false);
  const [panelMonth, setPanelMonth] = useState<Dayjs>(() => dayjs().startOf('month'));
  const [mode, setMode] = useState<CalendarMode>('Mensual');

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(() => {
    const active = Number(activeCompany?.id);
    if (Number.isFinite(active) && active > 0) return active;
    const first = Number(companies[0]?.id);
    return Number.isFinite(first) && first > 0 ? first : undefined;
  });

  const [selectedCurrency, setSelectedCurrency] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [selectedState, setSelectedState] = useState<number | undefined>(undefined);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | undefined>(undefined);

  const [isNarrowScreen, setIsNarrowScreen] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [selectedPayrollId, setSelectedPayrollId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => setIsNarrowScreen(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<PayrollDetails | null>(null);
  const [detailTotals, setDetailTotals] = useState<{
    bruto: string;
    deducciones: string;
    neto: string;
    empleados: number;
  } | null>(null);
  const [snapshotInputs, setSnapshotInputs] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPayrolls = useCallback(async () => {
    if (!selectedCompanyId) {
      setRows([]);
      setAllRows([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const from = panelMonth.startOf('month').subtract(1, 'month').format('YYYY-MM-DD');
      const to = panelMonth.endOf('month').add(1, 'month').format('YYYY-MM-DD');
      const data = await fetchPayrolls(String(selectedCompanyId), showInactive, from, to, false);
      setAllRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el calendario de planillas.');
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }, [panelMonth, selectedCompanyId, showInactive]);

  useEffect(() => {
    void loadPayrolls();
  }, [loadPayrolls]);

  useEffect(() => {
    const loadHolidays = async () => {
      setLoadingHolidays(true);
      try {
        const data = await fetchPayrollHolidays();
        setHolidays(data);
      } catch (err) {
        message.warning(err instanceof Error ? err.message : 'No se pudieron cargar los feriados para el calendario.');
        setHolidays([]);
      } finally {
        setLoadingHolidays(false);
      }
    };
    void loadHolidays();
  }, [message]);

  useEffect(() => {
    let filtered = showInactive ? allRows : allRows.filter((item) => item.estado !== 0 && item.estado !== 7);

    if (selectedCurrency) {
      filtered = filtered.filter((item) => (item.moneda ?? '').toUpperCase() === selectedCurrency);
    }
    if (selectedType) {
      filtered = filtered.filter((item) => normalizeType(item.tipoPlanilla) === normalizeType(selectedType));
    }
    if (selectedState != null) {
      filtered = filtered.filter((item) => item.estado === selectedState);
    }
    if (selectedPeriodId != null) {
      filtered = filtered.filter((item) => item.idPeriodoPago === selectedPeriodId);
    }

    setRows(filtered);
  }, [allRows, selectedCurrency, selectedPeriodId, selectedState, selectedType, showInactive]);

  const openDetails = useCallback(async (payrollId: number) => {
    setSelectedPayrollId(payrollId);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const [detailRes, totalsRes] = await Promise.all([
        fetchPayroll(payrollId),
        fetchPayrollSnapshotSummary(payrollId).catch(() => null),
      ]);

      setDetail(detailRes as PayrollDetails);
      if (totalsRes) {
        setDetailTotals({
          bruto: totalsRes.totalBruto,
          deducciones: totalsRes.totalDeducciones,
          neto: totalsRes.totalNeto,
          empleados: totalsRes.empleados,
        });
        setSnapshotInputs(totalsRes.inputs ?? 0);
      } else {
        setDetailTotals(null);
        setSnapshotInputs(null);
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const runAction = useCallback(async (action: 'process' | 'verify' | 'apply') => {
    if (!selectedPayrollId) return;

    setActionLoading(true);
    try {
      if (action === 'process') await processPayroll(selectedPayrollId);
      if (action === 'verify') await verifyPayroll(selectedPayrollId);
      if (action === 'apply') await applyPayroll(selectedPayrollId);
      message.success(
        action === 'process'
          ? 'La planilla se proceso correctamente.'
          : action === 'verify'
            ? 'La planilla se verifico correctamente.'
            : 'La planilla se aplico correctamente.',
      );
      await loadPayrolls();
      await openDetails(selectedPayrollId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'No se pudo ejecutar la accion.');
    } finally {
      setActionLoading(false);
    }
  }, [loadPayrolls, message, openDetails, selectedPayrollId]);

  const confirmAction = useCallback((action: 'process' | 'verify' | 'apply') => {
    const actionLabel =
      action === 'process' ? 'procesar' : action === 'verify' ? 'verificar' : 'aplicar';

    if (action === 'verify' && snapshotInputs === 0) {
      message.warning('No se puede verificar la planilla porque no tiene movimientos cargados para procesar.');
      return;
    }
    if (action === 'apply' && detail?.requiresRecalculation === 1) {
      message.warning('No se puede aplicar: existen nuevas acciones aprobadas que requieren recalcular la planilla.');
      return;
    }

    modal.confirm({
      title: `Confirmar accion`,
      content: `Esta seguro de ${actionLabel} esta planilla?`,
      okText: `Si, ${actionLabel}`,
      cancelText: 'Cancelar',
      centered: true,
      onOk: () => runAction(action),
    });
  }, [detail?.requiresRecalculation, message, modal, runAction, snapshotInputs]);

  const periodOptions = useMemo(() => {
    const options = new Map<number, string>();
    rows.forEach((item) => {
      if (!options.has(item.idPeriodoPago)) {
        options.set(item.idPeriodoPago, `Periodo #${item.idPeriodoPago}`);
      }
    });
    return Array.from(options.entries()).map(([value, label]) => ({ value, label }));
  }, [rows]);

  const typeOptions = useMemo(() => {
    const types = Array.from(
      new Set(rows.map((item) => item.tipoPlanilla?.trim()).filter((item): item is string => Boolean(item))),
    );
    return types.map((type) => ({ label: type, value: type }));
  }, [rows]);

  const riskMetrics = useMemo(() => {
    const today = dayjs().startOf('day');

    const overdueOpen = rows.filter((item) => {
      const payDate = toDate(item.fechaPagoProgramada);
      return item.estado === 1 && payDate != null && payDate.isBefore(today, 'day');
    }).length;

    const netsuiteErrors = rows.filter((item) => item.estado === 6).length;

    let overlaps = 0;
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        if ((rows[i].moneda ?? '') === (rows[j].moneda ?? '') && hasOverlap(rows[i], rows[j])) {
          overlaps += 1;
        }
      }
    }

    const unverifiedBeforePayment = rows.filter((item) => {
      const payDate = toDate(item.fechaPagoProgramada);
      return payDate != null && payDate.isBefore(today, 'day') && item.estado < 3;
    }).length;

    return { overdueOpen, netsuiteErrors, overlaps, unverifiedBeforePayment };
  }, [rows]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const push = (dateKey: string, event: CalendarEvent) => {
      const current = map.get(dateKey) ?? [];
      current.push(event);
      map.set(dateKey, current);
    };

    rows.forEach((row) => {
      const start = toDate(row.fechaInicioPeriodo);
      const paymentDate = toDate(row.fechaPagoProgramada);
      const name = row.nombrePlanilla?.trim() || `Planilla #${row.id}`;

      // En vista mensual solo marcamos el inicio del periodo para evitar repetir
      // la misma planilla en todos los dias del rango.
      if (start) {
        push(start.format('YYYY-MM-DD'), {
          id: `payroll-${row.id}-period`,
          payrollId: row.id,
          label: name,
          kind: 'period',
          status: row.estado,
        });
      }

      if (paymentDate) {
        push(paymentDate.format('YYYY-MM-DD'), {
          id: `payroll-${row.id}-payment`,
          payrollId: row.id,
          label: `Pago: ${name}`,
          kind: 'payment',
          status: row.estado,
        });
      }
    });

    if (!hideHolidays) {
      holidays.forEach((holiday) => {
        const start = toDate(holiday.fechaInicio);
        const end = toDate(holiday.fechaFin);
        if (!start || !end) return;

        let cursor = start;
        while (cursor.isBefore(end, 'day') || cursor.isSame(end, 'day')) {
          push(cursor.format('YYYY-MM-DD'), {
            id: `holiday-${holiday.id}-${cursor.format('YYYYMMDD')}`,
            label: `${holiday.nombre} (${payrollHolidayTypeLabel(holiday.tipo)})`,
            kind: 'holiday',
            holidayType: holiday.tipo,
          });
          cursor = cursor.add(1, 'day');
        }
      });
    }

    return map;
  }, [hideHolidays, holidays, rows]);

  const cellRender = (value: Dayjs) => {
    const key = value.format('YYYY-MM-DD');
    const events = eventsByDate.get(key) ?? [];
    if (events.length === 0) return null;

    return (
      <ul className={styles.eventsList}>
        {events.slice(0, 2).map((event, index) => (
          <li key={`${event.id}-${index}`}>
            <Tooltip title={event.label}>
              {event.kind === 'holiday' ? (
                <div className={`${styles.eventChip} ${styles.eventChipHoliday}`}>
                  <span className={styles.eventChipIcon}><CalendarOutlined /></span>
                  <Text ellipsis style={{ fontSize: 12, flex: 1, minWidth: 0 }}>{event.label}</Text>
                </div>
              ) : (
                <button
                  type="button"
                  className={`${styles.eventChip} ${event.kind === 'payment' ? styles.eventChipPayment : styles.eventChipPeriod} ${event.status === 1 ? styles.eventChipOpen : ''}`}
                  onClick={() => event.payrollId && void openDetails(event.payrollId)}
                >
                  <span className={styles.eventChipIcon}>{STATUS_VISUAL[event.status ?? 1]?.icon}</span>
                  <Text ellipsis style={{ fontSize: 12, flex: 1, minWidth: 0 }}>{event.label}</Text>
                </button>
              )}
            </Tooltip>
          </li>
        ))}
        {events.length > 2 ? (
          <li className={styles.eventMore}>
            <Tooltip title={`${events.length - 2} evento(s) más en este día. Pulse en un evento arriba para ver detalle.`}>
              <span>+{events.length - 2} más</span>
            </Tooltip>
          </li>
        ) : null}
      </ul>
    );
  };

  const hasEventsInCurrentMonth = useMemo(() => {
    const monthStart = panelMonth.startOf('month');
    const monthEnd = panelMonth.endOf('month');
    for (const key of eventsByDate.keys()) {
      const date = dayjs(key);
      if (!date.isValid()) continue;
      if ((date.isAfter(monthStart, 'day') || date.isSame(monthStart, 'day'))
        && (date.isBefore(monthEnd, 'day') || date.isSame(monthEnd, 'day'))) {
        return true;
      }
    }
    return false;
  }, [eventsByDate, panelMonth]);

  return (
    <div className={sharedStyles.pageWrapper}>
      {/* ----- Sección: Encabezado de página ----- */}
      <div className={sharedStyles.pageHeader}>
        <div className={sharedStyles.pageHeaderLeft}>
          <Link
            className={sharedStyles.pageBackLink}
            to="/payroll-params/calendario/dias-pago"
            aria-label="Volver al listado de planillas"
          >
            <ArrowLeftOutlined />
            <span className={styles.backLinkText}>Volver</span>
          </Link>
          <div className={sharedStyles.pageTitleBlock}>
            <h1 className={sharedStyles.pageTitle}>Calendario de Nómina</h1>
            <p className={sharedStyles.pageSubtitle}>
              Visualice el control operativo por periodo, tipo, moneda y estado.
            </p>
          </div>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void loadPayrolls()}
          loading={loading}
          aria-label="Refrescar calendario"
        >
          Refrescar
        </Button>
      </div>

      {/* ----- Sección: Panel Calendario de Nómina ----- */}
      <Card className={sharedStyles.mainCard} style={{ marginBottom: 20 }}>
        <div className={sharedStyles.mainCardBody}>
          <Flex align="center" gap={16}>
            <div className={sharedStyles.gestionIconWrap}>
              <CalendarOutlined className={sharedStyles.gestionIcon} />
            </div>
            <div>
              <h2 className={sharedStyles.gestionTitle}>Calendario de Nómina</h2>
              <p className={sharedStyles.gestionDesc}>
                Filtre por empresa, moneda, tipo y estado; revise indicadores y fechas de periodo y pago en el calendario.
              </p>
            </div>
          </Flex>
        </div>
      </Card>

      {/* ----- Layout: Filtros (izq) | Calendario + Indicadores (der) ----- */}
      <div className={styles.mainLayout}>
        {/* Columna izquierda: Filtros apilados hacia abajo */}
        <div className={styles.filtersCol}>
          <Card className={`${sharedStyles.mainCard} ${styles.filtersColCard}`}>
            <div className={sharedStyles.mainCardBody}>
              <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
                <FilterOutlined className={sharedStyles.registrosFilterIcon} />
                <h3 className={sharedStyles.registrosTitle}>Filtros</h3>
              </Flex>
              <div className={styles.filtersStack}>
                <div className={styles.filterGroup}>
                  <span className={sharedStyles.filterLabel}>Empresa</span>
                  <Select
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="label"
                    value={selectedCompanyId}
                    placeholder="Seleccione empresa"
                    options={companies.map((company) => ({
                      label: company.nombre,
                      value: Number(company.id),
                    }))}
                    onChange={(value) => setSelectedCompanyId(value)}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <span className={sharedStyles.filterLabel}>Moneda</span>
                  <Select
                    allowClear
                    style={{ width: '100%' }}
                    placeholder="Todas"
                    value={selectedCurrency}
                    onChange={setSelectedCurrency}
                    options={[
                      { label: 'CRC', value: 'CRC' },
                      { label: 'USD', value: 'USD' },
                    ]}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <span className={sharedStyles.filterLabel}>Tipo planilla</span>
                  <Select
                    allowClear
                    style={{ width: '100%' }}
                    placeholder="Todos"
                    value={selectedType}
                    onChange={setSelectedType}
                    options={typeOptions}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <span className={sharedStyles.filterLabel}>Estado</span>
                  <Select
                    allowClear
                    style={{ width: '100%' }}
                    placeholder="Todos"
                    value={selectedState}
                    onChange={setSelectedState}
                    options={[
                      { label: 'Abierta', value: 1 },
                      { label: 'En Proceso', value: 2 },
                      { label: 'Verificada', value: 3 },
                      { label: 'Aplicada', value: 4 },
                      { label: 'Enviada NetSuite', value: 5 },
                      { label: 'Error de envío', value: 6 },
                      { label: 'Inactiva', value: 7 },
                    ]}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <span className={sharedStyles.filterLabel}>Periodo de pago</span>
                  <Select
                    allowClear
                    style={{ width: '100%' }}
                    placeholder="Todos"
                    value={selectedPeriodId}
                    onChange={setSelectedPeriodId}
                    options={periodOptions}
                  />
                </div>
                <div className={styles.filterGroup}>
                  <span className={sharedStyles.filterLabel}>Inactivas</span>
                  <Flex align="center" gap={8} style={{ paddingTop: 2 }}>
                    <Switch checked={showInactive} onChange={setShowInactive} />
                    <span style={{ fontSize: 13, color: '#6b7a85' }}>Mostrar inactivas</span>
                  </Flex>
                </div>
                <div className={styles.filterGroup}>
                  <span className={sharedStyles.filterLabel}>Feriados</span>
                  <Flex align="center" gap={8} style={{ paddingTop: 2 }}>
                    <Switch checked={hideHolidays} onChange={setHideHolidays} />
                    <span style={{ fontSize: 13, color: '#6b7a85' }}>Ocultar feriados</span>
                  </Flex>
                </div>
                <div className={styles.legend}>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.legendDotPeriod}`} />
                    Inicio periodo
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.legendDotPayment}`} />
                    Fecha de pago
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.legendDotHoliday}`} />
                    Feriado
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Columna derecha: Indicadores arriba, Calendario abajo */}
        <div className={styles.contentCol}>
          {/* Indicadores (contraíble, cerrado por defecto) */}
          <Card className={sharedStyles.mainCard}>
            <Collapse
              defaultActiveKey={[]}
              className={styles.indicadoresCollapse}
              items={[
                {
                  key: 'indicadores',
                  label: (
                    <Flex align="center" gap={8}>
                      <span className={sharedStyles.registrosTitle} style={{ margin: 0 }}>Indicadores</span>
                      {(riskMetrics.overdueOpen + riskMetrics.netsuiteErrors + riskMetrics.overlaps + riskMetrics.unverifiedBeforePayment) > 0 && (
                        <Tag color="red">
                          {riskMetrics.overdueOpen + riskMetrics.netsuiteErrors + riskMetrics.overlaps + riskMetrics.unverifiedBeforePayment} alerta(s)
                        </Tag>
                      )}
                    </Flex>
                  ),
                  children: (
                    <div className={styles.metricsRow}>
                      <div className={`${styles.metricCard} ${riskMetrics.overdueOpen > 0 ? styles.danger : ''}`}>
                        <div className={styles.metricCardTitle}><WarningOutlined /> Planillas abiertas con pago vencido</div>
                        <div className={styles.metricCardValue}>{riskMetrics.overdueOpen}</div>
                      </div>
                      <div className={`${styles.metricCard} ${riskMetrics.netsuiteErrors > 0 ? styles.danger : ''}`}>
                        <div className={styles.metricCardTitle}><ExclamationCircleOutlined /> Fallo envío contable</div>
                        <div className={styles.metricCardValue}>{riskMetrics.netsuiteErrors}</div>
                      </div>
                      <div className={`${styles.metricCard} ${riskMetrics.overlaps > 0 ? styles.danger : ''}`}>
                        <div className={styles.metricCardTitle}><ExclamationCircleOutlined /> Periodos traslapados</div>
                        <div className={styles.metricCardValue}>{riskMetrics.overlaps}</div>
                      </div>
                      <div className={`${styles.metricCard} ${riskMetrics.unverifiedBeforePayment > 0 ? styles.danger : ''}`}>
                        <div className={styles.metricCardTitle}><WarningOutlined /> Sin verificar (pago vencido)</div>
                        <div className={styles.metricCardValue}>{riskMetrics.unverifiedBeforePayment}</div>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          {/* Vista de calendario */}
          <Card className={sharedStyles.mainCard}>
            <div className={sharedStyles.mainCardBody}>
              {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
              <Flex align="center" gap={8} className={styles.calendarViewHeader}>
                <span className={styles.calendarViewLabel}>Vista</span>
                <div className={styles.viewSwitch}>
                  <Segmented<CalendarMode>
                    options={['Mensual', 'Timeline']}
                    value={mode}
                    onChange={(value) => setMode(value)}
                    size="small"
                  />
                </div>
              </Flex>

              <Spin spinning={loading || loadingHolidays} tip="Cargando...">
                {!selectedCompanyId ? (
                  <div className={styles.calendarWrap}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span>
                          <strong>Seleccione una empresa</strong>
                          <br />
                          <Text type="secondary" style={{ fontSize: 13 }}>Use los filtros a la izquierda para elegir empresa y ver el calendario.</Text>
                        </span>
                      }
                      className={styles.calendarEmptyState}
                    />
                  </div>
                ) : mode === 'Timeline' ? (
                  <div className={styles.timelineWrap}>
                    <div className={sharedStyles.configTable}>
                      <Table
                        rowKey="id"
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        dataSource={rows}
                        columns={[
                          {
                            title: 'Planilla',
                            render: (_, row) => (
                              <Space orientation="vertical" size={2}>
                                <Text strong>{row.nombrePlanilla || `Planilla #${row.id}`}</Text>
                                <Tag color={getTypeColor(row.tipoPlanilla)}>{row.tipoPlanilla || 'Tipo N/D'}</Tag>
                              </Space>
                            ),
                          },
                          {
                            title: 'Línea de tiempo',
                            render: (_, row) => (
                              <Space>
                                <Tag>{toDate(row.fechaInicioPeriodo)?.format('YYYY-MM-DD')}</Tag>
                                <span>→</span>
                                <Tag>{toDate(row.fechaFinPeriodo)?.format('YYYY-MM-DD')}</Tag>
                                <span>Pago:</span>
                                <Tag color="green">{toDate(row.fechaPagoProgramada)?.format('YYYY-MM-DD') || 'N/D'}</Tag>
                              </Space>
                            ),
                          },
                          {
                            title: 'Estado',
                            render: (_, row) => (
                              <Tag icon={STATUS_VISUAL[row.estado]?.icon}>{STATUS_VISUAL[row.estado]?.label || `Estado ${row.estado}`}</Tag>
                            ),
                          },
                          {
                            title: 'Detalle',
                            render: (_, row) => (
                              <Button size="small" onClick={() => void openDetails(row.id)}>
                                Ver
                              </Button>
                            ),
                          },
                        ]}
                      />
                    </div>
                    {!hideHolidays ? (
                      <>
                        <Divider style={{ margin: '12px 0' }} />
                        <div className={sharedStyles.configTable}>
                          <Table
                            rowKey={(row) => `timeline-holiday-${row.id}`}
                            pagination={{ pageSize: 8, showSizeChanger: false }}
                            dataSource={holidays.filter((holiday) => {
                              const start = toDate(holiday.fechaInicio);
                              const end = toDate(holiday.fechaFin);
                              if (!start || !end) return false;
                              const monthStart = panelMonth.startOf('month');
                              const monthEnd = panelMonth.endOf('month');
                              return !end.isBefore(monthStart, 'day') && !start.isAfter(monthEnd, 'day');
                            })}
                            locale={{ emptyText: 'No hay feriados en el mes seleccionado.' }}
                            columns={[
                              {
                                title: 'Feriado',
                                render: (_, row) => (
                                  <Space orientation="vertical" size={2}>
                                    <Text strong>{row.nombre}</Text>
                                    <Tag color="gold">{payrollHolidayTypeLabel(row.tipo)}</Tag>
                                  </Space>
                                ),
                              },
                              {
                                title: 'Rango de fechas',
                                render: (_, row) => (
                                  <Space>
                                    <Tag>{row.fechaInicio}</Tag>
                                    <span>→</span>
                                    <Tag>{row.fechaFin}</Tag>
                                  </Space>
                                ),
                              },
                              {
                                title: 'Descripcion',
                                render: (_, row) => row.descripcion?.trim() || '--',
                              },
                            ]}
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className={styles.calendarWrap}>
                    {!hasEventsInCurrentMonth ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <span>
                            <strong>No hay eventos para el periodo seleccionado</strong>
                            <br />
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Cambie de mes en el calendario o ajuste los filtros para ver resultados.
                            </Text>
                          </span>
                        }
                        className={styles.calendarEmptyState}
                      />
                    ) : null}
                    <div className={styles.calendarHeader}>
                      <Button
                        type="text"
                        size="small"
                        icon={<LeftOutlined />}
                        onClick={() => setPanelMonth(panelMonth.clone().subtract(1, 'month').startOf('month'))}
                        aria-label="Mes anterior"
                      />
                      <Flex align="center" gap={8} className={styles.calendarHeaderCenter}>
                        <span className={styles.calendarHeaderMonth}>
                          {MONTHS_ES[panelMonth.month()]}
                        </span>
                        <Select
                          size="small"
                          className={styles.calendarHeaderYear}
                          value={panelMonth.year()}
                          options={getYearOptions()}
                          onChange={(year) => setPanelMonth(panelMonth.clone().year(year).startOf('month'))}
                          aria-label="Seleccionar año"
                        />
                      </Flex>
                      <Button
                        type="text"
                        size="small"
                        icon={<RightOutlined />}
                        onClick={() => setPanelMonth(panelMonth.clone().add(1, 'month').startOf('month'))}
                        aria-label="Mes siguiente"
                      />
                    </div>
                    <Calendar
                      value={panelMonth}
                      onPanelChange={(date) => setPanelMonth(date.startOf('month'))}
                      cellRender={cellRender}
                      fullscreen={!isNarrowScreen}
                    />
                  </div>
                )}
              </Spin>
            </div>
          </Card>
        </div>
      </div>

      <Drawer
        title="Detalle de la planilla"
        size="large"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        className={styles.drawer}
      >
        <Spin spinning={detailLoading || actionLoading}>
          {!detail ? (
            <Empty description="Seleccione una planilla para ver el detalle." />
          ) : (
            <div className={styles.drawerBody}>
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionHeader}>Información general</div>
                <div className={styles.drawerSectionBody}>
                  <Descriptions column={1} size="small" bordered className={styles.drawerDescriptions}>
                    <Descriptions.Item label="Empresa">
                      {companies.find((company) => Number(company.id) === detail.idEmpresa)?.nombre || `Empresa #${detail.idEmpresa}`}
                    </Descriptions.Item>
                    <Descriptions.Item label="Periodo laborado">{detail.fechaInicioPeriodo} al {detail.fechaFinPeriodo}</Descriptions.Item>
                    <Descriptions.Item label="Fecha de corte">{detail.fechaCorte || '--'}</Descriptions.Item>
                    <Descriptions.Item label="Fecha programada de pago">{detail.fechaPagoProgramada || '--'}</Descriptions.Item>
                    <Descriptions.Item label="Moneda de planilla">{detail.moneda || '--'}</Descriptions.Item>
                    <Descriptions.Item label="Estado de la planilla">
                      <Tag icon={STATUS_VISUAL[detail.estado]?.icon}>{STATUS_VISUAL[detail.estado]?.label || `Estado ${detail.estado}`}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Control de cambios">{detail.versionLock ?? '--'}</Descriptions.Item>
                    <Descriptions.Item label="Persona que creó la planilla">{detail.createdBy ?? '--'}</Descriptions.Item>
                  </Descriptions>
                </div>
              </div>

              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionHeader}>Totales de planilla</div>
                <div className={styles.drawerSectionBody}>
                  <div className={styles.drawerTotalsGrid}>
                    <div className={styles.drawerTotalItem}>
                      <div className={styles.drawerTotalLabel}>Bruto</div>
                      <div className={styles.drawerTotalValue}>{canViewSensitive ? detailTotals?.bruto ?? '--' : '***'}</div>
                    </div>
                    <div className={styles.drawerTotalItem}>
                      <div className={styles.drawerTotalLabel}>Deducciones</div>
                      <div className={styles.drawerTotalValue}>{canViewSensitive ? detailTotals?.deducciones ?? '--' : '***'}</div>
                    </div>
                    <div className={styles.drawerTotalItem}>
                      <div className={styles.drawerTotalLabel}>Neto</div>
                      <div className={styles.drawerTotalValue}>{canViewSensitive ? detailTotals?.neto ?? '--' : '***'}</div>
                    </div>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>Colaboradores incluidos: {detailTotals?.empleados ?? 0}</Text>
                </div>
              </div>

              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionHeader}>Acciones</div>
                <div className={styles.drawerSectionBody}>
                  <p className={styles.drawerActionsHelp}><strong>Qué hace cada acción</strong></p>
                  <ul className={styles.drawerActionsList}>
                    <li>Procesar: prepara la planilla del periodo y genera los movimientos a pagar.</li>
                    <li>Verificar: revisa que la planilla procesada esté completa y lista para aprobar.</li>
                    <li>Aplicar: confirma oficialmente la planilla y deja los resultados en firme.</li>
                    <li>Enviar a NetSuite: envía el asiento contable de la planilla aplicada.</li>
                  </ul>
                  <div className={styles.drawerActionsButtons}>
                    <Tooltip title="Genera los movimientos de la planilla para este periodo.">
                      <Button
                        icon={<PlayCircleOutlined />}
                        disabled={!canProcess || detail.estado !== 1}
                        onClick={() => confirmAction('process')}
                      >
                        Procesar
                      </Button>
                    </Tooltip>
                    <Tooltip title="Valida la planilla ya procesada antes de aplicarla.">
                      <Button
                        icon={<SafetyOutlined />}
                        disabled={!canVerify || detail.estado !== 2 || snapshotInputs === 0}
                        onClick={() => confirmAction('verify')}
                      >
                        Verificar
                      </Button>
                    </Tooltip>
                    <Tooltip
                      title={
                        detail.requiresRecalculation === 1
                          ? 'Existen nuevas acciones aprobadas que requieren recalcular la planilla antes de aplicar.'
                          : 'Aprueba en firme la planilla verificada.'
                      }
                    >
                      <Button
                        icon={<CheckCircleOutlined />}
                        disabled={!canApply || detail.estado !== 3 || detail.requiresRecalculation === 1}
                        onClick={() => confirmAction('apply')}
                      >
                        Aplicar
                      </Button>
                    </Tooltip>
                    <Tooltip title="Envía la planilla aplicada al sistema contable NetSuite.">
                      <Button icon={<CloudUploadOutlined />} disabled>
                        Enviar NetSuite
                      </Button>
                    </Tooltip>
                  </div>
                  {detail.estado === 2 && snapshotInputs === 0 ? (
                    <div style={{ marginTop: 12 }}>
                      <Text type="warning">
                        No se puede verificar esta planilla porque todavía no tiene movimientos procesados.
                      </Text>
                    </div>
                  ) : null}
                  {detail.estado === 3 && detail.requiresRecalculation === 1 ? (
                    <div style={{ marginTop: 12 }}>
                      <Text type="warning">
                        No se puede aplicar: existen nuevas acciones aprobadas que requieren recalcular la planilla.
                      </Text>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </Spin>
      </Drawer>
    </div>
  );
}
