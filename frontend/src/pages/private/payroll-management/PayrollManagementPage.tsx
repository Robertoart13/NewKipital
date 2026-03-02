import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  App as AntdApp,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Divider,
  Flex,
  Form,
  Input,
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
  AppstoreOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DownOutlined,
  FilterOutlined,
  HistoryOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '../../../store/hooks';
import {
  canApplyPayroll,
  canCancelPayroll,
  canCreatePayroll,
  canEditPayroll,
  canProcessPayroll,
  canVerifyPayroll,
  canViewPayroll,
} from '../../../store/selectors/permissions.selectors';
import {
  applyPayroll,
  createPayroll,
  fetchPayrollAuditTrail,
  fetchPayroll,
  fetchPayrolls,
  inactivatePayroll,
  processPayroll,
  type PayrollAuditTrailItem,
  type PayrollListItem,
  updatePayroll,
  verifyPayroll,
} from '../../../api/payroll';
import { fetchPayPeriods, type CatalogPayPeriod } from '../../../api/catalogs';
import { formatDateTime12h } from '../../../lib/formatDate';
import styles from '../configuration/UsersManagementPage.module.css';
import dayjs, { type Dayjs } from 'dayjs';

const { Text } = Typography;

interface CreatePayrollFormValues {
  idEmpresa: number;
  idPeriodoPago: number;
  nombrePlanilla: string;
  tipoPlanilla: 'Regular' | 'Aguinaldo' | 'Liquidacion' | 'Extraordinaria';
  periodoInicio: Dayjs | string;
  periodoFin: Dayjs | string;
  fechaCorte: Dayjs | string;
  fechaInicioPago: Dayjs | string;
  fechaFinPago: Dayjs | string;
  fechaPagoProgramada: Dayjs | string;
  moneda: 'CRC' | 'USD';
}

type PaneKey = 'empresa' | 'nombre' | 'tipo' | 'moneda' | 'estado';

interface PaneOption {
  value: string;
  count: number;
}

const PANE_CONFIG: Array<{ key: PaneKey; title: string }> = [
  { key: 'empresa', title: 'Empresa' },
  { key: 'nombre', title: 'Nombre Planilla' },
  { key: 'tipo', title: 'Tipo Planilla' },
  { key: 'moneda', title: 'Moneda' },
  { key: 'estado', title: 'Estado' },
];

const STATE_LABEL: Record<number, { text: string; color: string }> = {
  0: { text: 'Inactiva', color: 'default' },
  1: { text: 'Abierta', color: 'blue' },
  2: { text: 'En Proceso', color: 'gold' },
  3: { text: 'Verificada', color: 'purple' },
  4: { text: 'Aplicada', color: 'green' },
  5: { text: 'Enviada NetSuite', color: 'cyan' },
  6: { text: 'Error Envio', color: 'red' },
  7: { text: 'Inactiva', color: 'default' },
};

const TIPO_PLANILLA_TO_ID: Record<CreatePayrollFormValues['tipoPlanilla'], number> = {
  Regular: 1,
  Aguinaldo: 2,
  Liquidacion: 3,
  Extraordinaria: 4,
};

function getRowPaneValue(
  row: PayrollListItem,
  key: PaneKey,
  companies: Array<{ id: number | string; nombre: string }>,
): string {
  if (key === 'empresa') {
    return companies.find((company) => Number(company.id) === row.idEmpresa)?.nombre ?? `Empresa #${row.idEmpresa}`;
  }
  if (key === 'nombre') return row.nombrePlanilla?.trim() || '--';
  if (key === 'tipo') return row.tipoPlanilla?.trim() || '--';
  if (key === 'moneda') return row.moneda?.trim() || '--';
  return STATE_LABEL[row.estado]?.text ?? `Estado ${row.estado}`;
}

function parseCompanyId(value: number | string | null | undefined): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function formatDateValue(value: Dayjs | string | Date | undefined | null): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : undefined;
  }
  if (value instanceof Date) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : undefined;
  }
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value.format('YYYY-MM-DD') : undefined;
  }
  return undefined;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const firstWeekday = firstDay.getDay();
  return Math.ceil((dayOfMonth + firstWeekday) / 7);
}

function toRoman(value: number): string {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  return romans[value - 1] ?? 'I';
}

function getFrequencyCode(periodName: string, endDate: Date): string {
  const normalizedName = normalizeText(periodName);
  const day = endDate.getDate();
  const month = endDate.getMonth() + 1;
  const week = getWeekOfMonth(endDate);

  if (normalizedName.includes('quincenal')) {
    return day <= 15 ? 'IQC' : 'IIQC';
  }
  if (normalizedName.includes('semanal')) {
    return `${toRoman(week)}SEM`;
  }
  if (normalizedName.includes('mensual')) {
    return 'IMEN';
  }
  if (normalizedName.includes('bisemanal')) {
    return `${toRoman(week)}BIS`;
  }
  if (normalizedName.includes('diario')) {
    return 'IDIA';
  }
  if (normalizedName.includes('trimestral')) {
    return `${toRoman(Math.ceil(month / 3))}TRI`;
  }
  if (normalizedName.includes('semestral')) {
    return `${toRoman(month <= 6 ? 1 : 2)}SEM`;
  }
  return '';
}

function toDate(value: Dayjs | string | undefined): Date | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return value.toDate();
}

function formatDdMmYyyy(value: Dayjs | string | undefined): string {
  const date = toDate(value);
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

function toDayjs(value: Dayjs | string | undefined): Dayjs | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.startOf('day') : null;
  }
  return value.startOf('day');
}

export function PayrollManagementPage() {
  const { modal, message } = AntdApp.useApp();
  const [form] = Form.useForm<CreatePayrollFormValues>();

  const canView = useAppSelector(canViewPayroll);
  const canCreate = useAppSelector(canCreatePayroll);
  const canEdit = useAppSelector(canEditPayroll);
  const canProcess = useAppSelector(canProcessPayroll);
  const canVerify = useAppSelector(canVerifyPayroll);
  const canApply = useAppSelector(canApplyPayroll);
  const canCancel = useAppSelector(canCancelPayroll);
  const companies = useAppSelector((state) => state.auth.companies);
  const activeCompany = useAppSelector((state) => state.activeCompany.company);
  const defaultCompanyId = parseCompanyId(activeCompany?.id) ?? parseCompanyId(companies[0]?.id);

  const [rows, setRows] = useState<PayrollListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(defaultCompanyId);
  const [listDateRange, setListDateRange] = useState<[Dayjs, Dayjs]>(() => {
    const today = dayjs().startOf('day');
    return [today.subtract(1, 'month'), today.add(1, 'month')];
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPayrollId, setEditingPayrollId] = useState<number | null>(null);
  const [periodOptions, setPeriodOptions] = useState<CatalogPayPeriod[]>([]);
  const [activeCreateTab, setActiveCreateTab] = useState<'principal' | 'fechas' | 'bitacora'>('principal');
  const createCompanyId = Form.useWatch('idEmpresa', form);
  const createPeriodId = Form.useWatch('idPeriodoPago', form);
  const createPeriodEnd = Form.useWatch('periodoFin', form);
  const createCurrency = Form.useWatch('moneda', form);
  const generatedPayrollName = Form.useWatch('nombrePlanilla', form);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingAuditTrail, setLoadingAuditTrail] = useState(false);
  const [auditTrail, setAuditTrail] = useState<PayrollAuditTrailItem[]>([]);
  const [editNamePreview, setEditNamePreview] = useState('');
  const [modalReadOnlyReason, setModalReadOnlyReason] = useState<string | null>(null);
  const isReadOnlyModal = editingPayrollId != null && modalReadOnlyReason != null;

  const getEditRestrictionReason = useCallback((row: PayrollListItem): string | null => {
    if (row.estado === 0) return 'No se puede editar una planilla inactiva.';
    if (row.estado === 2) return 'No se puede editar una planilla en proceso.';
    if (row.estado === 3) return 'No se puede editar una planilla verificada. Primero debe reabrirse.';
    if (row.estado === 4 || row.estado === 5) return 'No se puede editar una planilla aplicada o contabilizada.';
    return null;
  }, []);

  const [search, setSearch] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [paneSearch, setPaneSearch] = useState<Record<PaneKey, string>>({
    empresa: '',
    nombre: '',
    tipo: '',
    moneda: '',
    estado: '',
  });
  const [paneSelections, setPaneSelections] = useState<Record<PaneKey, string[]>>({
    empresa: [],
    nombre: [],
    tipo: [],
    moneda: [],
    estado: [],
  });
  const [paneOpen, setPaneOpen] = useState<Record<PaneKey, boolean>>({
    empresa: false,
    nombre: false,
    tipo: false,
    moneda: false,
    estado: false,
  });

  const loadRows = useCallback(async () => {
    if (!selectedCompanyId || !canView) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPayrolls(
        String(selectedCompanyId),
        false,
        formatDateValue(listDateRange[0]),
        formatDateValue(listDateRange[1]),
        showInactive,
      );
      setRows(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar planillas');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canView, listDateRange, message, selectedCompanyId, showInactive]);

  const loadPeriods = useCallback(async () => {
    try {
      const data = await fetchPayPeriods();
      setPeriodOptions(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar periodos de pago');
      setPeriodOptions([]);
    }
  }, [message]);

  useEffect(() => {
    if (!selectedCompanyId && defaultCompanyId) {
      setSelectedCompanyId(defaultCompanyId);
    }
  }, [defaultCompanyId, selectedCompanyId]);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (!createOpen || editingPayrollId != null) return;
    const company = companies.find((item) => Number(item.id) === Number(createCompanyId));
    const period = periodOptions.find((item) => item.id === Number(createPeriodId));
    const currency = String(createCurrency ?? '').trim().toUpperCase();
    const dateText = formatDdMmYyyy(createPeriodEnd);
    const endDate = toDate(createPeriodEnd);
    const prefix = String(company?.codigo ?? '').trim().toUpperCase();
    const frequency = period && endDate ? getFrequencyCode(period.nombre, endDate) : '';

    const generatedName = prefix && frequency && dateText && currency
      ? `${prefix} - ${frequency} - ${dateText} - ${currency}`
      : '';

    form.setFieldValue('nombrePlanilla', generatedName);
  }, [companies, createCompanyId, createCurrency, createOpen, createPeriodEnd, createPeriodId, editingPayrollId, form, periodOptions]);

  useEffect(() => {
    if (!createOpen || activeCreateTab !== 'bitacora' || !editingPayrollId) return;
    setLoadingAuditTrail(true);
    void fetchPayrollAuditTrail(editingPayrollId)
      .then((rowsAudit) => setAuditTrail(rowsAudit))
      .catch((error) => {
        message.error(error instanceof Error ? error.message : 'Error al cargar bitacora');
        setAuditTrail([]);
      })
      .finally(() => setLoadingAuditTrail(false));
  }, [activeCreateTab, createOpen, editingPayrollId, message]);

  const matchesGlobalSearch = useCallback((row: PayrollListItem) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const stateText = STATE_LABEL[row.estado]?.text ?? '';
    return (
      (row.nombrePlanilla ?? '').toLowerCase().includes(term)
      || (row.tipoPlanilla ?? '').toLowerCase().includes(term)
      || (row.moneda ?? '').toLowerCase().includes(term)
      || stateText.toLowerCase().includes(term)
      || row.fechaInicioPeriodo.toLowerCase().includes(term)
      || row.fechaFinPeriodo.toLowerCase().includes(term)
    );
  }, [search]);

  const dataFilteredByPaneSelections = useCallback((excludePane?: PaneKey) => {
    return rows.filter((row) => {
      if (!matchesGlobalSearch(row)) return false;
      for (const pane of PANE_CONFIG) {
        if (pane.key === excludePane) continue;
        const selected = paneSelections[pane.key];
        if (selected.length === 0) continue;
        const value = getRowPaneValue(row, pane.key, companies);
        if (!selected.includes(value)) return false;
      }
      return true;
    });
  }, [companies, matchesGlobalSearch, paneSelections, rows]);

  const paneOptions = useMemo(() => {
    const optionsMap: Record<PaneKey, PaneOption[]> = {
      empresa: [],
      nombre: [],
      tipo: [],
      moneda: [],
      estado: [],
    };

    for (const pane of PANE_CONFIG) {
      const countMap = new Map<string, number>();
      const scopedRows = dataFilteredByPaneSelections(pane.key);
      scopedRows.forEach((row) => {
        const value = getRowPaneValue(row, pane.key, companies).trim();
        if (!value) return;
        countMap.set(value, (countMap.get(value) ?? 0) + 1);
      });

      const paneTerm = paneSearch[pane.key].trim().toLowerCase();
      optionsMap[pane.key] = Array.from(countMap.entries())
        .map(([value, count]) => ({ value, count }))
        .filter((item) => !paneTerm || item.value.toLowerCase().includes(paneTerm))
        .sort((a, b) => a.value.localeCompare(b.value));
    }

    return optionsMap;
  }, [companies, dataFilteredByPaneSelections, paneSearch]);

  const filteredRows = useMemo(() => dataFilteredByPaneSelections(), [dataFilteredByPaneSelections]);

  const clearPaneSelection = (key: PaneKey) => {
    setPaneSelections((current) => ({ ...current, [key]: [] }));
    setPaneSearch((current) => ({ ...current, [key]: '' }));
  };

  const clearAllFilters = () => {
    setSearch('');
    setPaneSearch({ empresa: '', nombre: '', tipo: '', moneda: '', estado: '' });
    setPaneSelections({ empresa: [], nombre: [], tipo: [], moneda: [], estado: [] });
    setPaneOpen({ empresa: false, nombre: false, tipo: false, moneda: false, estado: false });
  };

  const openAllPanes = () => {
    setPaneOpen({ empresa: true, nombre: true, tipo: true, moneda: true, estado: true });
  };

  const collapseAllPanes = () => {
    setPaneOpen({ empresa: false, nombre: false, tipo: false, moneda: false, estado: false });
  };

  const resetCreateForm = useCallback(() => {
    if (!selectedCompanyId) return;
    form.setFieldsValue({
      idEmpresa: selectedCompanyId,
      tipoPlanilla: 'Regular',
      moneda: 'CRC',
    } as Partial<CreatePayrollFormValues>);
  }, [form, selectedCompanyId]);

  const openCreateModal = () => {
    form.resetFields();
    resetCreateForm();
    setEditingPayrollId(null);
    setActiveCreateTab('principal');
    setAuditTrail([]);
    setEditNamePreview('');
    setModalReadOnlyReason(null);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const values = await form.validateFields();
    setSavingCreate(true);
    try {
      const periodoInicio = formatDateValue(values.periodoInicio ?? form.getFieldValue('periodoInicio'));
      const periodoFin = formatDateValue(values.periodoFin ?? form.getFieldValue('periodoFin'));
      const fechaInicioPago = formatDateValue(values.fechaInicioPago ?? form.getFieldValue('fechaInicioPago'));
      const fechaFinPago = formatDateValue(values.fechaFinPago ?? form.getFieldValue('fechaFinPago'));

      if (!periodoInicio || !periodoFin || !fechaInicioPago || !fechaFinPago) {
        setActiveCreateTab('fechas');
        message.error('Revise las fechas del periodo y ventana de pago. Deben ser fechas validas.');
        return;
      }

      const idTipoPlanilla = TIPO_PLANILLA_TO_ID[values.tipoPlanilla];
      const payload = {
        ...values,
        idTipoPlanilla,
        periodoInicio,
        periodoFin,
        fechaInicioPago,
        fechaFinPago,
        fechaCorte: formatDateValue(values.fechaCorte),
        fechaPagoProgramada: formatDateValue(values.fechaPagoProgramada),
      };
      if (editingPayrollId) {
        await updatePayroll(editingPayrollId, payload);
        message.success('Planilla actualizada correctamente');
      } else {
        await createPayroll(payload);
        message.success('Planilla creada correctamente');
      }
      setCreateOpen(false);
      setEditingPayrollId(null);
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al guardar planilla');
    } finally {
      setSavingCreate(false);
    }
  };

  const openEditModal = async (row: PayrollListItem) => {
    const rowRestriction = !canEdit
      ? 'No tiene permiso para editar planillas. Vista en modo solo lectura.'
      : getEditRestrictionReason(row);

    try {
      setEditingPayrollId(row.id);
      setActiveCreateTab('principal');
      setAuditTrail([]);
      setEditNamePreview(String(row.nombrePlanilla ?? '').trim());
      setModalReadOnlyReason(rowRestriction);
      form.setFieldsValue({
        idEmpresa: row.idEmpresa,
        idPeriodoPago: row.idPeriodoPago,
        nombrePlanilla: row.nombrePlanilla ?? '',
        tipoPlanilla: (row.tipoPlanilla as CreatePayrollFormValues['tipoPlanilla']) ?? 'Regular',
        periodoInicio: row.fechaInicioPeriodo ? dayjs(row.fechaInicioPeriodo) : undefined,
        periodoFin: row.fechaFinPeriodo ? dayjs(row.fechaFinPeriodo) : undefined,
        fechaCorte: row.fechaCorte ? dayjs(row.fechaCorte) : undefined,
        fechaInicioPago: row.fechaInicioPago ? dayjs(row.fechaInicioPago) : undefined,
        fechaFinPago: row.fechaFinPago ? dayjs(row.fechaFinPago) : undefined,
        fechaPagoProgramada: row.fechaPagoProgramada ? dayjs(row.fechaPagoProgramada) : undefined,
        moneda: (row.moneda as 'CRC' | 'USD') ?? 'CRC',
      });
      setCreateOpen(true);

      setLoadingDetail(true);
      const detail = await fetchPayroll(row.id);
      const detailReason = !canEdit
        ? 'No tiene permiso para editar planillas. Vista en modo solo lectura.'
        : getEditRestrictionReason(detail);
      setModalReadOnlyReason(detailReason);
      if (detailReason) {
        message.warning(detailReason);
      }
      setEditNamePreview(String(detail.nombrePlanilla ?? '').trim());
      form.setFieldsValue({
        idEmpresa: detail.idEmpresa,
        idPeriodoPago: detail.idPeriodoPago,
        nombrePlanilla: detail.nombrePlanilla ?? '',
        tipoPlanilla: (detail.tipoPlanilla as CreatePayrollFormValues['tipoPlanilla']) ?? 'Regular',
        periodoInicio: detail.fechaInicioPeriodo ? dayjs(detail.fechaInicioPeriodo) : undefined,
        periodoFin: detail.fechaFinPeriodo ? dayjs(detail.fechaFinPeriodo) : undefined,
        fechaCorte: detail.fechaCorte ? dayjs(detail.fechaCorte) : undefined,
        fechaInicioPago: detail.fechaInicioPago ? dayjs(detail.fechaInicioPago) : undefined,
        fechaFinPago: detail.fechaFinPago ? dayjs(detail.fechaFinPago) : undefined,
        fechaPagoProgramada: detail.fechaPagoProgramada ? dayjs(detail.fechaPagoProgramada) : undefined,
        moneda: (detail.moneda as 'CRC' | 'USD') ?? 'CRC',
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'No se pudo abrir la planilla para edicion');
    } finally {
      setLoadingDetail(false);
    }
  };

  const onCreate = async () => {
    const isEditing = editingPayrollId != null;
    if (isEditing && isReadOnlyModal) {
      message.warning(modalReadOnlyReason ?? 'La planilla esta en modo solo lectura.');
      return;
    }
    if (isEditing && !canEdit) {
      message.error('No tiene permiso para editar planillas.');
      return;
    }
    if (!isEditing && !canCreate) {
      message.error('No tiene permiso para crear planillas.');
      return;
    }
    const currentGeneratedName = String(form.getFieldValue('nombrePlanilla') ?? '').trim();
    if (!currentGeneratedName) {
      setActiveCreateTab('principal');
      message.error('Complete empresa, periodo de pago, fecha fin y moneda para generar el nombre de la planilla.');
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      modal.confirm({
        title: isEditing ? 'Confirmar actualizacion de planilla' : 'Confirmar apertura de planilla',
        content: isEditing
          ? 'Se guardaran los cambios de la planilla seleccionada.'
          : 'Se abrira una nueva planilla para la empresa y periodo seleccionados.',
        icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
        okText: isEditing ? 'Guardar cambios' : 'Crear planilla',
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
    await submitCreate();
  };

  const runAction = async (id: number, operation: () => Promise<unknown>, successMessage: string) => {
    setProcessingId(id);
    try {
      await operation();
      message.success(successMessage);
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Operacion no completada');
    } finally {
      setProcessingId(null);
    }
  };

  const confirmAndRunAction = async (
    row: PayrollListItem,
    title: string,
    content: string,
    okText: string,
    operation: () => Promise<unknown>,
    successMessage: string,
  ) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      modal.confirm({
        title,
        content,
        icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
        okText,
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
    await runAction(row.id, operation, successMessage);
  };

  const columns = useMemo<ColumnsType<PayrollListItem>>(() => [
    {
      title: 'EMPRESA',
      dataIndex: 'idEmpresa',
      width: 220,
      render: (idEmpresa: number) => companies.find((company) => company.id === idEmpresa)?.nombre ?? `Empresa #${idEmpresa}`,
    },
    {
      title: 'NOMBRE',
      dataIndex: 'nombrePlanilla',
      width: 240,
      render: (value: string | null | undefined) => value || '--',
    },
    {
      title: 'TIPO PLANILLA',
      dataIndex: 'tipoPlanilla',
      width: 190,
      render: (value: string | null | undefined) => value || '--',
    },
    {
      title: 'MONEDA',
      dataIndex: 'moneda',
      width: 120,
      render: (value: string | null | undefined) => value || '--',
    },
    {
      title: 'PERIODO',
      width: 220,
      render: (_, row) => `${row.fechaInicioPeriodo} - ${row.fechaFinPeriodo}`,
    },
    {
      title: 'ESTADO',
      dataIndex: 'estado',
      width: 130,
      render: (value: number) => {
        const info = STATE_LABEL[value] ?? { text: `Estado ${value}`, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: 'ULTIMA MODIFICACION',
      width: 220,
      render: (_, row) => formatDateTime12h(row.fechaAplicacion ?? row.fechaPagoProgramada ?? null),
    },
    {
      title: 'ACCIONES',
      width: 330,
      render: (_, row) => (
        <Space wrap>
          {canProcess && row.estado === 1 ? (
            <Tooltip title="Ejecuta el proceso de cálculo y genera snapshots de la planilla.">
              <Button
                size="small"
                icon={<PlayCircleOutlined />}
                loading={processingId === row.id}
                onClick={(event) => {
                  event.stopPropagation();
                  void confirmAndRunAction(
                    row,
                    'Confirmar proceso de planilla',
                    'Esta accion procesara la planilla y generara snapshots. ¿Desea continuar?',
                    'Procesar',
                    () => processPayroll(row.id),
                    'Planilla procesada',
                  );
                }}
              >
                Procesar
              </Button>
            </Tooltip>
          ) : null}
          {canVerify && row.estado === 2 ? (
            <Tooltip title="Confirma que los resultados procesados son correctos antes de aplicar.">
              <Button
                size="small"
                icon={<CheckCircleOutlined />}
                loading={processingId === row.id}
                onClick={(event) => {
                  event.stopPropagation();
                  void runAction(row.id, () => verifyPayroll(row.id), 'Planilla verificada');
                }}
              >
                Verificar
              </Button>
            </Tooltip>
          ) : null}
          {canApply && row.estado === 3 ? (
            <Tooltip
              title={
                row.requiresRecalculation === 1
                  ? 'Existen nuevas acciones aprobadas que requieren recalcular la planilla antes de aplicar.'
                  : 'Aplica la planilla y bloquea sus resultados para operación final.'
              }
            >
              <Button
                size="small"
                type="primary"
                loading={processingId === row.id}
                disabled={row.requiresRecalculation === 1}
                onClick={(event) => {
                  event.stopPropagation();
                  void runAction(row.id, () => applyPayroll(row.id), 'Planilla aplicada');
                }}
              >
                Aplicar
              </Button>
            </Tooltip>
          ) : null}
          {canCancel && row.estado !== 0 && row.estado !== 4 ? (
            <Tooltip title="Inactiva la planilla para que no continúe en el flujo operativo.">
              <Button
                size="small"
                danger
                icon={<PauseCircleOutlined />}
                loading={processingId === row.id}
                onClick={(event) => {
                  event.stopPropagation();
                  void confirmAndRunAction(
                    row,
                    'Confirmar inactivacion de planilla',
                    'La planilla quedara inactiva y saldra del flujo operativo. ¿Desea continuar?',
                    'Inactivar',
                    () => inactivatePayroll(row.id),
                    'Planilla inactivada',
                  );
                }}
              >
                Inactivar
              </Button>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
  ], [canApply, canCancel, canProcess, canVerify, companies, processingId]);

  const auditColumns = useMemo<ColumnsType<PayrollAuditTrailItem>>(
    () => [
      {
        title: 'Fecha y hora',
        dataIndex: 'fechaCreacion',
        key: 'fechaCreacion',
        width: 160,
        render: (value: string | null) => formatDateTime12h(value ?? undefined),
      },
      {
        title: 'Quien lo hizo',
        key: 'actor',
        width: 210,
        render: (_: unknown, row) => {
          const actorLabel = row.actorNombre?.trim() || row.actorEmail?.trim() || (row.actorUserId ? `Usuario ID ${row.actorUserId}` : 'Sistema');
          return (
            <div>
              <div style={{ fontWeight: 600, color: '#3d4f5c' }}>{actorLabel}</div>
              {row.actorEmail && <div style={{ color: '#8c8c8c', fontSize: 12 }}>{row.actorEmail}</div>}
            </div>
          );
        },
      },
      {
        title: 'Accion',
        key: 'accion',
        width: 170,
        render: (_: unknown, row) => (
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Tag className={styles.tagInactivo}>{row.modulo}</Tag>
            <Tag className={styles.tagActivo}>{String(row.accion ?? '').split('.').pop() || row.accion}</Tag>
          </span>
        ),
      },
      {
        title: 'Detalle',
        dataIndex: 'descripcion',
        key: 'descripcion',
        render: (value: string, row) => {
          const tooltipContent = (
            <div style={{ maxWidth: 520 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{value}</div>
              {(row.cambios ?? []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(row.cambios ?? []).map((change, index) => (
                    <div key={`${row.id}-${change.campo}-${index}`} style={{ fontSize: 12, lineHeight: 1.4 }}>
                      <div><strong>{change.campo}</strong></div>
                      <div>Antes: {change.antes}</div>
                      <div>Despues: {change.despues}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12 }}>Sin detalle adicional para esta accion.</div>
              )}
            </div>
          );
          return (
            <Tooltip title={tooltipContent}>
              <div className={styles.auditDetailCell}>{value}</div>
            </Tooltip>
          );
        },
      },
    ],
    [],
  );

  if (!canView) {
    return (
      <div className={styles.pageWrapper}>
        <Card className={styles.mainCard}>
          <p>No tiene permisos para visualizar planillas.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link className={styles.pageBackLink} to="/payroll-params">
            <ArrowLeftOutlined />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Listado de Planillas</h1>
            <p className={styles.pageSubtitle}>Visualice y gestione aperturas de planilla por empresa</p>
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
                <h2 className={styles.gestionTitle}>Gestion de Planillas</h2>
                <p className={styles.gestionDesc}>Aperture, procese, verifique y aplique corridas de planilla por empresa</p>
              </div>
            </Flex>
            {canCreate ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className={`${styles.actionButton} ${styles.btnPrimary}`}
                onClick={openCreateModal}
              >
                Abrir planilla
              </Button>
            ) : null}
          </Flex>
        </div>
      </Card>

      <Card className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={12} className={styles.registrosHeader}>
            <Flex align="center" gap={8} wrap="wrap">
              <FilterOutlined className={styles.registrosFilterIcon} />
              <h3 className={styles.registrosTitle}>Registros de Planillas</h3>
              <Select
                value={pageSize}
                style={{ width: 70 }}
                options={[10, 20, 50].map((size) => ({ label: size, value: size }))}
                onChange={(value) => setPageSize(value)}
              />
              <Text style={{ color: '#6b7a85' }}>entries per page</Text>
            </Flex>

            <Flex align="center" gap={12} wrap="wrap">
              <Space>
                <Text style={{ color: '#6b7a85' }}>Mostrar inactivas</Text>
                <Switch size="small" checked={showInactive} onChange={setShowInactive} />
              </Space>
              <Select
                style={{ minWidth: 230 }}
                value={selectedCompanyId}
                onChange={(value: number) => setSelectedCompanyId(value)}
                options={companies.map((company) => ({ label: company.nombre, value: company.id }))}
              />
              <DatePicker.RangePicker
                value={listDateRange}
                allowClear={false}
                format="YYYY-MM-DD"
                onChange={(range) => {
                  if (!range || !range[0] || !range[1]) return;
                  setListDateRange([range[0].startOf('day'), range[1].startOf('day')]);
                }}
              />
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
                  <>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
                      <Input
                        placeholder="Search"
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
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
                      {PANE_CONFIG.map((pane) => (
                        <Col xs={24} md={12} xl={8} key={pane.key}>
                          <div className={styles.paneCard}>
                            <Flex gap={6} align="center" wrap="wrap">
                              <Input
                                value={paneSearch[pane.key]}
                                onChange={(event) => setPaneSearch((prev) => ({ ...prev, [pane.key]: event.target.value }))}
                                placeholder={pane.title}
                                prefix={<SearchOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />}
                                suffix={(
                                  <Flex gap={2}>
                                    <SortAscendingOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                                    <SortDescendingOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                                  </Flex>
                                )}
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
                  </>
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
              onClick: () => {
                void openEditModal(record);
              },
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      </Card>

      <Modal
        className={styles.companyModal}
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setEditingPayrollId(null);
          setAuditTrail([]);
          setLoadingDetail(false);
          setEditNamePreview('');
          setModalReadOnlyReason(null);
        }}
        closable={false}
        footer={null}
        width={860}
        destroyOnHidden
        title={(
          <Flex justify="space-between" align="center" wrap="nowrap" style={{ width: '100%', gap: 16 }}>
            <div className={styles.companyModalHeader}>
              <div className={styles.companyModalHeaderIcon}>
                <AppstoreOutlined />
              </div>
              <span>{editingPayrollId ? 'Editar Planilla' : 'Abrir Planilla'}</span>
            </div>
            <Button
              type="text"
              icon={<PlusOutlined rotate={45} />}
              onClick={() => {
                setCreateOpen(false);
                setEditingPayrollId(null);
                setAuditTrail([]);
                setLoadingDetail(false);
                setEditNamePreview('');
                setModalReadOnlyReason(null);
              }}
              aria-label="Cerrar"
              className={styles.companyModalCloseBtn}
            />
          </Flex>
        )}
      >
        <Spin spinning={loadingDetail}>
        <Form
          form={form}
          disabled={isReadOnlyModal}
          layout="vertical"
          onFinish={onCreate}
          onFinishFailed={(info) => {
            const firstField = String(info.errorFields?.[0]?.name?.[0] ?? '');
            const firstFieldPath = info.errorFields?.[0]?.name;
            if (
              ['periodoInicio', 'periodoFin', 'fechaCorte', 'fechaInicioPago', 'fechaFinPago', 'fechaPagoProgramada']
                .includes(firstField)
            ) {
              setActiveCreateTab('fechas');
            } else {
              setActiveCreateTab('principal');
            }
            message.error('Complete los campos requeridos para continuar.');
            if (firstFieldPath && firstFieldPath.length > 0) {
              setTimeout(() => {
                form.scrollToField(firstFieldPath, { block: 'center' });
              }, 0);
            }
          }}
          scrollToFirstError={{ block: 'center' }}
          className={styles.companyFormContent}
        >
          {isReadOnlyModal ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
              message={modalReadOnlyReason}
            />
          ) : null}

          <Flex justify="flex-end" style={{ marginBottom: 8 }}>
            <div
              style={{
                minWidth: 260,
                maxWidth: '100%',
                border: '1px solid #d8e1e8',
                borderRadius: 8,
                background: '#f8fafc',
                padding: '6px 10px',
              }}
            >
              <div style={{ fontSize: 11, color: '#6b7a85', marginBottom: 2 }}>Nombre planilla generado</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#3d4f5c' }}>
                {generatedPayrollName?.trim() || editNamePreview || 'Pendiente de completar datos'}
              </div>
            </div>
          </Flex>

          <Tabs
            activeKey={activeCreateTab}
            onChange={(key) => setActiveCreateTab(key as 'principal' | 'fechas' | 'bitacora')}
            className={`${styles.tabsWrapper} ${styles.companyModalTabs}`}
            items={[
              {
                key: 'principal',
                forceRender: true,
                label: (
                  <span>
                    <AppstoreOutlined style={{ marginRight: 8, fontSize: 16 }} />
                    Informacion Principal
                  </span>
                ),
                children: (
                  <Row gutter={[12, 12]} className={styles.companyFormGrid}>
                    <Col span={12}>
                      <Form.Item name="idEmpresa" label="Empresa *" rules={[{ required: true }]}>
                        <Select
                          showSearch
                          optionFilterProp="label"
                          filterOption={(input, option) =>
                            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          disabled={editingPayrollId != null}
                          options={companies.map((company) => ({ label: company.nombre, value: company.id }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="nombrePlanilla" label="Nombre Planilla">
                        <Input
                          maxLength={150}
                          disabled
                          placeholder="Se genera automaticamente segun empresa, periodo, fecha fin y moneda"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="idPeriodoPago" label="Periodo de Pago *" rules={[{ required: true }]}>
                        <Select
                          showSearch
                          optionFilterProp="label"
                          filterOption={(input, option) =>
                            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          options={periodOptions.map((period) => ({
                            label: `${period.nombre} (${period.dias} dias)`,
                            value: period.id,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="tipoPlanilla" label="Tipo Planilla *" rules={[{ required: true }]}>
                        <Select
                          showSearch
                          optionFilterProp="label"
                          filterOption={(input, option) =>
                            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          options={[
                            { label: 'Regular', value: 'Regular' },
                            { label: 'Aguinaldo', value: 'Aguinaldo' },
                            { label: 'Liquidacion', value: 'Liquidacion' },
                            { label: 'Extraordinaria', value: 'Extraordinaria' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="moneda" label="Moneda *" rules={[{ required: true }]}>
                        <Select
                          showSearch
                          optionFilterProp="label"
                          filterOption={(input, option) =>
                            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          options={[{ label: 'CRC', value: 'CRC' }, { label: 'USD', value: 'USD' }]}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'fechas',
                forceRender: true,
                label: (
                  <span>
                    <HistoryOutlined style={{ marginRight: 8, fontSize: 16 }} />
                    Periodo y Fechas de Pago
                  </span>
                ),
                children: (
                  <Row gutter={[12, 12]} className={styles.companyFormGrid}>
                    <Col span={24}>
                      <Divider titlePlacement="left" style={{ margin: '8px 0 4px' }}>
                        Periodo de Nomina
                      </Divider>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="periodoInicio"
                        label="Inicio Periodo *"
                        rules={[
                          { required: true, message: 'Inicio Periodo es requerido' },
                          ({ getFieldValue }) => ({
                            validator(_, value: Dayjs | undefined) {
                              const start = toDayjs(value);
                              const end = toDayjs(getFieldValue('periodoFin'));
                              if (!start || !end) return Promise.resolve();
                              if (start.isAfter(end, 'day')) {
                                return Promise.reject(new Error('Inicio Periodo no puede ser mayor que Fin Periodo'));
                              }
                              return Promise.resolve();
                            },
                          }),
                        ]}
                      >
                        <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="periodoFin"
                        label="Fin Periodo *"
                        dependencies={['periodoInicio']}
                        rules={[
                          { required: true, message: 'Fin Periodo es requerido' },
                          ({ getFieldValue }) => ({
                            validator(_, value: Dayjs | undefined) {
                              const end = toDayjs(value);
                              const start = toDayjs(getFieldValue('periodoInicio'));
                              if (!start || !end) return Promise.resolve();
                              if (end.isBefore(start, 'day')) {
                                return Promise.reject(new Error('Fin Periodo no puede ser menor que Inicio Periodo'));
                              }
                              return Promise.resolve();
                            },
                          }),
                        ]}
                      >
                        <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="fechaCorte"
                        label="Fecha Corte"
                        dependencies={['periodoInicio', 'periodoFin']}
                        rules={[
                          ({ getFieldValue }) => ({
                            validator(_, value: Dayjs | undefined) {
                              if (!value) return Promise.resolve();
                              const corte = toDayjs(value);
                              const start = toDayjs(getFieldValue('periodoInicio'));
                              const end = toDayjs(getFieldValue('periodoFin'));
                              if (!corte || !start || !end) return Promise.resolve();
                              if (corte.isBefore(start, 'day') || corte.isAfter(end, 'day')) {
                                return Promise.reject(new Error('Fecha Corte debe estar dentro del Periodo de Nomina'));
                              }
                              return Promise.resolve();
                            },
                          }),
                        ]}
                      >
                        <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Divider titlePlacement="left" style={{ margin: '8px 0 4px' }}>
                        Ventana de Pago
                      </Divider>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="fechaInicioPago"
                        label="Inicio Pago *"
                        rules={[
                          { required: true, message: 'Inicio Pago es requerido' },
                          ({ getFieldValue }) => ({
                            validator(_, value: Dayjs | undefined) {
                              const start = toDayjs(value);
                              const end = toDayjs(getFieldValue('fechaFinPago'));
                              if (!start || !end) return Promise.resolve();
                              if (start.isAfter(end, 'day')) {
                                return Promise.reject(new Error('Inicio Pago no puede ser mayor que Fin Pago'));
                              }
                              return Promise.resolve();
                            },
                          }),
                        ]}
                      >
                        <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="fechaFinPago"
                        label="Fin Pago *"
                        dependencies={['fechaInicioPago']}
                        rules={[
                          { required: true, message: 'Fin Pago es requerido' },
                          ({ getFieldValue }) => ({
                            validator(_, value: Dayjs | undefined) {
                              const end = toDayjs(value);
                              const start = toDayjs(getFieldValue('fechaInicioPago'));
                              if (!start || !end) return Promise.resolve();
                              if (end.isBefore(start, 'day')) {
                                return Promise.reject(new Error('Fin Pago no puede ser menor que Inicio Pago'));
                              }
                              return Promise.resolve();
                            },
                          }),
                        ]}
                      >
                        <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="fechaPagoProgramada"
                        label="Fecha Pago Programada"
                        dependencies={['fechaInicioPago', 'fechaFinPago', 'fechaCorte']}
                        rules={[
                          ({ getFieldValue }) => ({
                            validator(_, value: Dayjs | undefined) {
                              if (!value) return Promise.resolve();
                              const programada = toDayjs(value);
                              const start = toDayjs(getFieldValue('fechaInicioPago'));
                              const end = toDayjs(getFieldValue('fechaFinPago'));
                              const corte = toDayjs(getFieldValue('fechaCorte'));
                              if (!programada || !start || !end) return Promise.resolve();
                              if (programada.isBefore(start, 'day') || programada.isAfter(end, 'day')) {
                                return Promise.reject(new Error('Fecha Pago Programada debe estar dentro de la Ventana de Pago'));
                              }
                              if (corte && programada.isBefore(corte, 'day')) {
                                return Promise.reject(new Error('Fecha Pago Programada no puede ser menor que Fecha Corte'));
                              }
                              return Promise.resolve();
                            },
                          }),
                        ]}
                      >
                        <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              ...(editingPayrollId
                ? [{
                  key: 'bitacora',
                  label: (
                    <span>
                      <HistoryOutlined style={{ marginRight: 8, fontSize: 16 }} />
                      Bitacora
                    </span>
                  ),
                  children: (
                    <Spin spinning={loadingAuditTrail}>
                      <div style={{ paddingTop: 8 }}>
                        <p className={styles.sectionTitle}>Historial de cambios de la planilla</p>
                        <p className={styles.sectionDescription}>
                          Muestra quien hizo el cambio, cuando lo hizo y el detalle registrado.
                        </p>
                        <Table
                          columns={auditColumns}
                          dataSource={auditTrail}
                          rowKey="id"
                          size="small"
                          loading={loadingAuditTrail}
                          className={`${styles.configTable} ${styles.auditTableCompact}`}
                          pagination={{
                            pageSize: 8,
                            showSizeChanger: true,
                            showTotal: (total) => `${total} registro(s)`,
                          }}
                          locale={{ emptyText: 'No hay registros de bitacora para esta planilla.' }}
                        />
                      </div>
                    </Spin>
                  ),
                }]
                : []),
            ]}
          />

          <div className={styles.companyModalFooter}>
            <Button
              onClick={() => {
                setCreateOpen(false);
                setEditingPayrollId(null);
                setAuditTrail([]);
                setLoadingDetail(false);
                setEditNamePreview('');
                setModalReadOnlyReason(null);
              }}
              className={styles.companyModalBtnCancel}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={savingCreate}
              disabled={isReadOnlyModal || (editingPayrollId ? !canEdit : !canCreate)}
              icon={editingPayrollId ? <CheckCircleOutlined /> : <PlusOutlined />}
              className={styles.companyModalBtnSubmit}
            >
              {editingPayrollId ? 'Guardar cambios' : 'Crear Planilla'}
            </Button>
          </div>
        </Form>
        </Spin>
      </Modal>

    </div>
  );
}
