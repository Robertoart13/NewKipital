import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  App as AntdApp,
  Button,
  Card,
  Collapse,
  Descriptions,
  Input,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchPayPeriods, type CatalogPayPeriod } from '../../../api/catalogs';
import {
  approvePersonalAction,
  createAbsence,
  createDiscount,
  createOvertime,
  createRetention,
  invalidateAbsence,
  invalidateLicense,
  invalidateDisability,
  invalidateBonus,
  invalidateOvertime,
  invalidateRetention,
  invalidateDiscount,
  invalidateIncrease,
  invalidateVacation,
  fetchAbsenceMovementsCatalog,
} from '../../../api/personalActions';
import type {
  AbsenceMovementCatalogItem,
  UpsertAbsenceLinePayload,
  UpsertDiscountLinePayload,
  UpsertOvertimeLinePayload,
  UpsertRetentionLinePayload,
} from '../../../api/personalActions';

import { AbsenceInlineForm } from './AbsenceInlineForm';
import { DiscountInlineForm } from './DiscountInlineForm';
import { OvertimeInlineForm } from './OvertimeInlineForm';
import { RetentionInlineForm } from './RetentionInlineForm';
import {
  fetchPayroll,
  fetchPayrolls,
  loadPayrollTable,
  updatePayrollEmployeeSelection,
  type PayrollListItem,
  type PayrollPreviewActionRow,
  type PayrollPreviewEmployeeRow,
  type PayrollPreviewTable,
} from '../../../api/payroll';
import { bustApiCache } from '../../../lib/apiCache';
import { useAppSelector } from '../../../store/hooks';
import { canProcessPayroll } from '../../../store/selectors/permissions.selectors';

import styles from '../configuration/UsersManagementPage.module.css';
import genStyles from './PayrollGeneratePage.module.css';

const { Text } = Typography;

type CurrencyFilter = 'ALL' | 'CRC' | 'USD';
type PayPeriodFilter = 'ALL' | number;
type PayrollOption = {
  value: number;
  label: string;
};

const STATE_LABEL: Record<number, string> = {
  0: 'Inactiva',
  1: 'Abierta',
  2: 'En Proceso',
  3: 'Verificada',
  4: 'Aplicada',
  5: 'Contabilizada',
  6: 'Notificada',
  7: 'Inactiva',
};

const STATE_COLOR: Record<number, string> = {
  0: 'default',
  1: 'default',
  2: 'processing',
  3: 'default',
  4: 'success',
  5: 'default',
  6: 'default',
  7: 'default',
};

const OPERATIONAL_STATES = [1, 2] as const;

function parseCompanyId(value: number | string | null | undefined): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function formatPeriod(row: PayrollListItem): string {
  const inicio = row.fechaInicioPeriodo ?? '';
  const fin = row.fechaFinPeriodo ?? '';
  if (!inicio && !fin) return '--';
  return `${inicio || '--'} - ${fin || '--'}`;
}

function formatDate(value?: string | null): string {
  if (!value) return '--';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : '--';
}

function isRegularPayroll(row: PayrollListItem): boolean {
  if (Number(row.idTipoPlanilla) === 1) return true;
  return (row.tipoPlanilla ?? '').trim().toLowerCase() === 'regular';
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  return String(value);
}

function toBooleanFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'si' || normalized === 'yes';
  }
  return false;
}

function formatMoney(value: string | number): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function isApprovedActionVisual(row: PayrollPreviewActionRow): boolean {
  const estado = String(row.estado ?? '').trim().toLowerCase();
  const categoria = String(row.categoria ?? '').trim().toLowerCase();
  if (categoria === 'carga social') return true;
  if (categoria === 'impuesto renta') return true;
  return estado.includes('aprobad');
}

/**
 * Vista operativa para Cargar Planilla Regular:
 * - Filtros de empresa, moneda y periodo.
 * - Seleccion de planilla regular.
 * - Boton de carga para generar tabla de revision por empleado y acciones.
 */
const INVALIDATABLE_CATEGORIES = [
  'Ausencias',
  'Licencias',
  'Incapacidades',
  'Bonificaciones',
  'Horas Extras',
  'Retenciones',
  'Deducciones',
  'Aumentos',
  'Vacaciones',
] as const;

function isInvalidatableAction(row: PayrollPreviewActionRow): boolean {
  if (!row.idAccion) return false;
  const cat = (row.categoria ?? '').trim();
  return INVALIDATABLE_CATEGORIES.some((c) => cat.toLowerCase() === c.toLowerCase());
}

export function PayrollGeneratePage() {
  const { message, modal } = AntdApp.useApp();
  const canProcess = useAppSelector(canProcessPayroll);
  const canViewSensitive = useAppSelector((state) => state.permissions.permissions.includes('payroll:view_sensitive'));
  const canApprovePersonalActions = useAppSelector((state) =>
    state.permissions.permissions.includes('hr_action:approve'),
  );
  const companies = useAppSelector((state) => state.auth.companies);
  const activeCompany = useAppSelector((state) => state.activeCompany.company);

  const defaultCompanyId =
    parseCompanyId(activeCompany?.id) ?? parseCompanyId(companies[0]?.id) ?? undefined;

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(defaultCompanyId);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyFilter>('ALL');
  const [selectedPayPeriodId, setSelectedPayPeriodId] = useState<PayPeriodFilter>('ALL');
  const [selectedPayrollId, setSelectedPayrollId] = useState<number | undefined>(undefined);
  const [rows, setRows] = useState<PayrollListItem[]>([]);
  const [payPeriods, setPayPeriods] = useState<CatalogPayPeriod[]>([]);
  const [selectedPayrollDetail, setSelectedPayrollDetail] = useState<PayrollListItem | null>(null);
  const [previewTable, setPreviewTable] = useState<PayrollPreviewTable | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(true);
  const [approvingActionId, setApprovingActionId] = useState<number | null>(null);
  const [invalidatingActionId, setInvalidatingActionId] = useState<number | null>(null);
  const [addActionTypeByEmployee, setAddActionTypeByEmployee] = useState<Record<number, string>>({});
  const [overtimeMovements, setOvertimeMovements] = useState<AbsenceMovementCatalogItem[]>([]);
  const [absenceMovements, setAbsenceMovements] = useState<AbsenceMovementCatalogItem[]>([]);
  const [retentionMovements, setRetentionMovements] = useState<AbsenceMovementCatalogItem[]>([]);
  const [discountMovements, setDiscountMovements] = useState<AbsenceMovementCatalogItem[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loadingAbsenceMovements, setLoadingAbsenceMovements] = useState(false);
  const [loadingRetentionMovements, setLoadingRetentionMovements] = useState(false);
  const [loadingDiscountMovements, setLoadingDiscountMovements] = useState(false);
  const [overtimeSubmitting, setOvertimeSubmitting] = useState<number | null>(null);
  const [absenceSubmitting, setAbsenceSubmitting] = useState<number | null>(null);
  const [retentionSubmitting, setRetentionSubmitting] = useState<number | null>(null);
  const [discountSubmitting, setDiscountSubmitting] = useState<number | null>(null);
  const [pendingSelectionByEmployee, setPendingSelectionByEmployee] = useState<Record<number, boolean>>({});

  const resetPreview = useCallback(() => {
    setPreviewTable(null);
    setSearchTerm('');
  }, []);

  const loadPayPeriods = useCallback(async () => {
    try {
      const list = await fetchPayPeriods();
      setPayPeriods(list);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar periodos de pago');
    }
  }, [message]);

  const loadPayrolls = useCallback(async () => {
    if (!selectedCompanyId) {
      setRows([]);
      setSelectedPayrollId(undefined);
      setSelectedPayrollDetail(null);
      resetPreview();
      return;
    }

    setLoading(true);
    try {
      const list = await fetchPayrolls(
        String(selectedCompanyId),
        false,
        dayjs().subtract(12, 'month').format('YYYY-MM-DD'),
        dayjs().add(12, 'month').format('YYYY-MM-DD'),
        false,
        [...OPERATIONAL_STATES],
      );
      setRows(list);
      setSelectedPayrollId(undefined);
      setSelectedPayrollDetail(null);
      resetPreview();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar planillas');
    } finally {
      setLoading(false);
    }
  }, [message, resetPreview, selectedCompanyId]);

  useEffect(() => {
    void loadPayPeriods();
  }, [loadPayPeriods]);

  useEffect(() => {
    void loadPayrolls();
  }, [loadPayrolls]);

  const companyIdForOvertime = selectedPayrollDetail?.idEmpresa ?? selectedCompanyId;

  /** Carga movimientos de horas extras (tipo 11) cuando hay empresa/planilla. */
  useEffect(() => {
    if (!companyIdForOvertime) {
      setOvertimeMovements([]);
      return;
    }
    let cancelled = false;
    setLoadingMovements(true);
    fetchAbsenceMovementsCatalog(companyIdForOvertime, 11)
      .then((list) => {
        if (!cancelled) setOvertimeMovements(list);
      })
      .catch(() => {
        if (!cancelled) setOvertimeMovements([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMovements(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyIdForOvertime]);

  /** Carga movimientos de ausencias (tipo 20) cuando hay empresa/planilla. */
  useEffect(() => {
    if (!companyIdForOvertime) {
      setAbsenceMovements([]);
      return;
    }
    let cancelled = false;
    setLoadingAbsenceMovements(true);
    fetchAbsenceMovementsCatalog(companyIdForOvertime, 20)
      .then((list) => {
        if (!cancelled) setAbsenceMovements(list);
      })
      .catch(() => {
        if (!cancelled) setAbsenceMovements([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAbsenceMovements(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyIdForOvertime]);

  /** Carga movimientos de retenciones (tipo 5) cuando hay empresa/planilla. */
  useEffect(() => {
    if (!companyIdForOvertime) {
      setRetentionMovements([]);
      return;
    }
    let cancelled = false;
    setLoadingRetentionMovements(true);
    fetchAbsenceMovementsCatalog(companyIdForOvertime, 5)
      .then((list) => {
        if (!cancelled) setRetentionMovements(list);
      })
      .catch(() => {
        if (!cancelled) setRetentionMovements([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRetentionMovements(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyIdForOvertime]);

  /** Carga movimientos de descuentos (tipo 6) cuando hay empresa/planilla. */
  useEffect(() => {
    if (!companyIdForOvertime) {
      setDiscountMovements([]);
      return;
    }
    let cancelled = false;
    setLoadingDiscountMovements(true);
    fetchAbsenceMovementsCatalog(companyIdForOvertime, 6)
      .then((list) => {
        if (!cancelled) setDiscountMovements(list);
      })
      .catch(() => {
        if (!cancelled) setDiscountMovements([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDiscountMovements(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyIdForOvertime]);

  const payPeriodNameById = useMemo(
    () => new Map(payPeriods.map((period) => [Number(period.id), period.nombre])),
    [payPeriods],
  );

  const selectedCompanyName = useMemo(
    () => companies.find((company) => Number(company.id) === selectedCompanyId)?.nombre ?? '--',
    [companies, selectedCompanyId],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesCurrency =
        selectedCurrency === 'ALL' || (row.moneda ?? '').toUpperCase() === selectedCurrency;
      const matchesPayPeriod =
        selectedPayPeriodId === 'ALL' || Number(row.idPeriodoPago) === Number(selectedPayPeriodId);
      const matchesRegular = isRegularPayroll(row);
      return matchesCurrency && matchesPayPeriod && matchesRegular;
    });
  }, [rows, selectedCurrency, selectedPayPeriodId]);

  useEffect(() => {
    if (!selectedPayrollId) return;
    const stillExists = filteredRows.some((row) => row.id === selectedPayrollId);
    if (!stillExists) {
      setSelectedPayrollId(undefined);
      setSelectedPayrollDetail(null);
      resetPreview();
    }
  }, [filteredRows, resetPreview, selectedPayrollId]);

  useEffect(() => {
    if (!selectedPayrollId) {
      setSelectedPayrollDetail(null);
      resetPreview();
      return;
    }

    let cancelled = false;
    const loadDetail = async () => {
      try {
        const detail = await fetchPayroll(selectedPayrollId);
        if (!cancelled) setSelectedPayrollDetail(detail);
      } catch (error) {
        if (!cancelled) {
          setSelectedPayrollDetail(null);
          message.error(error instanceof Error ? error.message : 'Error al cargar detalle de planilla');
        }
      }
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [message, resetPreview, selectedPayrollId]);

  const selectedPayrollFromList = useMemo(
    () => filteredRows.find((row) => row.id === selectedPayrollId),
    [filteredRows, selectedPayrollId],
  );

  const selectedPayroll = selectedPayrollDetail ?? selectedPayrollFromList ?? null;

  const payrollOptions = useMemo<PayrollOption[]>(
    () =>
      filteredRows.map((row) => ({
        value: row.id,
        label: `${row.nombrePlanilla?.trim() || '--'} | ${row.tipoPlanilla?.trim() || '--'} | ${
          payPeriodNameById.get(Number(row.idPeriodoPago)) ?? `Periodo #${row.idPeriodoPago}`
        } | ${row.moneda?.trim() || '--'} | ${formatPeriod(row)} | ${
          STATE_LABEL[row.estado] ?? `Estado ${row.estado}`
        }`,
      })),
    [filteredRows, payPeriodNameById],
  );

  const handleLoadPayroll = async () => {
    if (!selectedPayrollId) {
      message.warning('Seleccione una planilla para cargar.');
      return;
    }

    setLoadingProcess(true);
    try {
      const table = await loadPayrollTable(selectedPayrollId);
      setPreviewTable(table);
      const detail = await fetchPayroll(selectedPayrollId);
      setSelectedPayrollDetail(detail);
      bustApiCache('/payroll');
      message.success('Tabla de planilla cargada correctamente.');
      setContentExpanded(false);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar tabla de planilla');
    } finally {
      setLoadingProcess(false);
    }
  };

  const refreshLoadedPayrollTable = useCallback(async () => {
    if (!selectedPayrollId) return;
    const table = await loadPayrollTable(selectedPayrollId);
    setPreviewTable(table);
    const detail = await fetchPayroll(selectedPayrollId);
    setSelectedPayrollDetail(detail);
    bustApiCache('/payroll');
  }, [selectedPayrollId]);

  const handleApproveAction = useCallback(
    async (actionId: number | null) => {
      if (!actionId || !selectedPayrollId) return;
      setApprovingActionId(actionId);
      try {
        await approvePersonalAction(actionId, { payrollId: selectedPayrollId });
        await refreshLoadedPayrollTable();
        message.success('Accion aprobada y tabla actualizada.');
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'Error al aprobar la accion personal');
      } finally {
        setApprovingActionId(null);
      }
    },
    [message, refreshLoadedPayrollTable, selectedPayrollId],
  );

  const handleInvalidateAction = useCallback(
    (row: PayrollPreviewActionRow) => {
      const actionId = row.idAccion;
      const idEmpresa = selectedPayrollDetail?.idEmpresa ?? selectedCompanyId;
      if (!actionId || !idEmpresa) return;
      if (!canApprovePersonalActions) {
        message.warning('Sin permiso para invalidar acciones de personal.');
        return;
      }
      modal.confirm({
        title: 'Confirmar invalidación',
        content:
          'Esta acción de personal se marcará como invalidada y no afectará el cálculo de la planilla. ¿Está seguro de que desea invalidarla?',
        okText: 'Sí, invalidar',
        cancelText: 'Cancelar',
        okButtonProps: { danger: true },
        centered: true,
        onOk: async () => {
          setInvalidatingActionId(actionId);
          const cat = (row.categoria ?? '').trim().toLowerCase();
          try {
            if (cat === 'ausencias') await invalidateAbsence(actionId, idEmpresa);
            else if (cat === 'licencias') await invalidateLicense(actionId);
            else if (cat === 'incapacidades') await invalidateDisability(actionId);
            else if (cat === 'bonificaciones') await invalidateBonus(actionId);
            else if (cat === 'horas extras') await invalidateOvertime(actionId);
            else if (cat === 'retenciones') await invalidateRetention(actionId);
            else if (cat === 'deducciones') await invalidateDiscount(actionId);
            else if (cat === 'aumentos') await invalidateIncrease(actionId);
            else if (cat === 'vacaciones') await invalidateVacation(actionId);
            else {
              message.error(`No se puede invalidar acciones de categoría: ${row.categoria}`);
              return;
            }
            await refreshLoadedPayrollTable();
            message.success('Acción invalidada y tabla actualizada.');
          } catch (error) {
            message.error(error instanceof Error ? error.message : 'Error al invalidar la acción de personal');
          } finally {
            setInvalidatingActionId(null);
          }
        },
      });
    },
    [
      canApprovePersonalActions,
      message,
      modal,
      refreshLoadedPayrollTable,
      selectedCompanyId,
      selectedPayrollDetail?.idEmpresa,
    ],
  );

  const handleAddActionTypeChange = useCallback((idEmpleado: number, value: string | undefined) => {
    setAddActionTypeByEmployee((prev) => {
      const next = { ...prev };
      if (value) next[idEmpleado] = value;
      else delete next[idEmpleado];
      return next;
    });
  }, []);

  const handleCreateOvertime = useCallback(
    async (idEmpleado: number, payloadLines: UpsertOvertimeLinePayload[]) => {
      const idEmpresa = selectedPayrollDetail?.idEmpresa ?? selectedCompanyId;
      if (!idEmpresa || !selectedPayrollId || !selectedPayroll) {
        message.warning('Falta empresa o planilla seleccionada.');
        return;
      }
      setOvertimeSubmitting(idEmpleado);
      try {
        await createOvertime({
          idEmpresa,
          idEmpleado,
          lines: payloadLines,
        });
        handleAddActionTypeChange(idEmpleado, undefined);
        message.success('Hora extra guardada. Recalculando planilla en segundo plano...');
        void refreshLoadedPayrollTable().catch(() => {
          message.warning('La tabla se actualizara en unos segundos.');
        });
      } catch (error) {
        message.error(
          error instanceof Error ? error.message : 'Error al crear la hora extra',
        );
      } finally {
        setOvertimeSubmitting(null);
      }
    },
    [
      selectedPayrollDetail?.idEmpresa,
      selectedCompanyId,
      selectedPayrollId,
      selectedPayroll,
      refreshLoadedPayrollTable,
      message,
      handleAddActionTypeChange,
    ],
  );

  /** Crea ausencia con las líneas capturadas (mismo flujo que Acción de Personal). */
  const handleCreateAbsence = useCallback(
    async (idEmpleado: number, payloadLines: UpsertAbsenceLinePayload[]) => {
      const idEmpresa = selectedPayrollDetail?.idEmpresa ?? selectedCompanyId;
      if (!idEmpresa || !selectedPayrollId || !selectedPayroll) {
        message.warning('Falta empresa o planilla seleccionada.');
        return;
      }
      setAbsenceSubmitting(idEmpleado);
      try {
        await createAbsence({
          idEmpresa,
          idEmpleado,
          lines: payloadLines,
        });
        handleAddActionTypeChange(idEmpleado, undefined);
        message.success('Ausencia guardada. Recalculando planilla en segundo plano...');
        void refreshLoadedPayrollTable().catch(() => {
          message.warning('La tabla se actualizara en unos segundos.');
        });
      } catch (error) {
        message.error(
          error instanceof Error ? error.message : 'Error al crear la ausencia',
        );
      } finally {
        setAbsenceSubmitting(null);
      }
    },
    [
      selectedPayrollDetail?.idEmpresa,
      selectedCompanyId,
      selectedPayrollId,
      selectedPayroll,
      refreshLoadedPayrollTable,
      message,
      handleAddActionTypeChange,
    ],
  );

  /** Crea retención con las líneas capturadas (mismo flujo que Acción de Personal). */
  const handleCreateRetention = useCallback(
    async (idEmpleado: number, payloadLines: UpsertRetentionLinePayload[]) => {
      const idEmpresa = selectedPayrollDetail?.idEmpresa ?? selectedCompanyId;
      if (!idEmpresa || !selectedPayrollId || !selectedPayroll) {
        message.warning('Falta empresa o planilla seleccionada.');
        return;
      }
      setRetentionSubmitting(idEmpleado);
      try {
        await createRetention({
          idEmpresa,
          idEmpleado,
          lines: payloadLines,
        });
        handleAddActionTypeChange(idEmpleado, undefined);
        message.success('Retencion guardada. Recalculando planilla en segundo plano...');
        void refreshLoadedPayrollTable().catch(() => {
          message.warning('La tabla se actualizara en unos segundos.');
        });
      } catch (error) {
        message.error(
          error instanceof Error ? error.message : 'Error al crear la retención',
        );
      } finally {
        setRetentionSubmitting(null);
      }
    },
    [
      selectedPayrollDetail?.idEmpresa,
      selectedCompanyId,
      selectedPayrollId,
      selectedPayroll,
      refreshLoadedPayrollTable,
      message,
      handleAddActionTypeChange,
    ],
  );

  /** Crea descuento con las líneas capturadas (mismo flujo que Acción de Personal). */
  const handleCreateDiscount = useCallback(
    async (idEmpleado: number, payloadLines: UpsertDiscountLinePayload[]) => {
      const idEmpresa = selectedPayrollDetail?.idEmpresa ?? selectedCompanyId;
      if (!idEmpresa || !selectedPayrollId || !selectedPayroll) {
        message.warning('Falta empresa o planilla seleccionada.');
        return;
      }
      setDiscountSubmitting(idEmpleado);
      try {
        await createDiscount({
          idEmpresa,
          idEmpleado,
          lines: payloadLines,
        });
        handleAddActionTypeChange(idEmpleado, undefined);
        message.success('Descuento guardado. Recalculando planilla en segundo plano...');
        void refreshLoadedPayrollTable().catch(() => {
          message.warning('La tabla se actualizara en unos segundos.');
        });
      } catch (error) {
        message.error(
          error instanceof Error ? error.message : 'Error al crear el descuento',
        );
      } finally {
        setDiscountSubmitting(null);
      }
    },
    [
      selectedPayrollDetail?.idEmpresa,
      selectedCompanyId,
      selectedPayrollId,
      selectedPayroll,
      refreshLoadedPayrollTable,
      message,
      handleAddActionTypeChange,
    ],
  );

  const collapseLabel = (
    <span className={genStyles.collapseLabel}>
      {selectedPayroll
        ? `Detalle de la planilla: ${selectedPayroll.nombrePlanilla?.trim() || `#${selectedPayroll.id}`}`
        : 'Cargar Planilla Regular'}
    </span>
  );

  const filteredPreviewRows = useMemo(() => {
    if (!previewTable) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return previewTable.empleados;
    return previewTable.empleados.filter((row) => {
      const byName = row.nombreEmpleado.toLowerCase().includes(term);
      const byCode = row.codigoEmpleado.toLowerCase().includes(term);
      return byName || byCode;
    });
  }, [previewTable, searchTerm]);

  const selectedPreviewRowKeys = useMemo(
    () =>
      filteredPreviewRows
        .filter((row) => toBooleanFlag(row.seleccionadoPlanilla))
        .map((row) => row.idEmpleado),
    [filteredPreviewRows],
  );

  const updateEmployeeSelectionForPayroll = useCallback(
    async (employeeIds: number[], selected: boolean) => {
      if (!selectedPayrollId) return;
      const uniqueIds = Array.from(
        new Set(employeeIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)),
      );
      if (uniqueIds.length === 0) return;
      setPendingSelectionByEmployee((prev) => {
        const next = { ...prev };
        for (const employeeId of uniqueIds) next[employeeId] = true;
        return next;
      });
      setPreviewTable((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          empleados: prev.empleados.map((employee) => {
            if (!uniqueIds.includes(employee.idEmpleado)) return employee;
            return {
              ...employee,
              seleccionadoPlanilla: selected,
              verificadoEmpleado: selected,
              requiereRevalidacion: false,
              estado: selected ? 'Verificado' : 'Excluido',
            };
          }),
        };
      });
      try {
        await updatePayrollEmployeeSelection(selectedPayrollId, uniqueIds, selected);
        void refreshLoadedPayrollTable().catch(() => {
          message.warning('La tabla se actualizara en unos segundos.');
        });
        message.success(
          selected
            ? 'Empleado(s) marcado(s) para incluir en planilla.'
            : 'Empleado(s) desmarcado(s) de planilla.',
        );
      } catch (error) {
        void refreshLoadedPayrollTable().catch(() => {
          message.warning('La tabla se actualizara en unos segundos.');
        });
        message.error(
          error instanceof Error ? error.message : 'No se pudo actualizar la seleccion de empleados',
        );
      } finally {
        setPendingSelectionByEmployee((prev) => {
          const next = { ...prev };
          for (const employeeId of uniqueIds) delete next[employeeId];
          return next;
        });
      }
    },
    [message, refreshLoadedPayrollTable, selectedPayrollId],
  );

  // Totales e info se calculan solo con empleados marcados para planilla (no depende del filtro de busqueda).
  const previewSummary = useMemo(() => {
    const parseDecimal = (value: string): number => {
      const parsed = Number(String(value ?? '').replace(/,/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const allRows = previewTable?.empleados ?? [];
    const totalEmployees = allRows.length;
    const includedRows = allRows.filter((row) => toBooleanFlag(row.seleccionadoPlanilla));
    const verifiedEmployees = includedRows.filter((row) => toBooleanFlag(row.verificadoEmpleado)).length;
    const pendingEmployees = Math.max(0, includedRows.length - verifiedEmployees);

    const totalDevengado = includedRows.reduce((sum, row) => sum + parseDecimal(row.devengadoMonto), 0);
    const totalCargas = includedRows.reduce((sum, row) => sum + parseDecimal(row.cargasSociales), 0);
    const totalRenta = includedRows.reduce((sum, row) => sum + parseDecimal(row.impuestoRenta), 0);
    const totalNeto = includedRows.reduce((sum, row) => sum + parseDecimal(row.totalNeto), 0);

    return {
      totalEmployees,
      includedEmployees: includedRows.length,
      verifiedEmployees,
      pendingEmployees,
      totalDevengado,
      totalCargas,
      totalRenta,
      totalNeto,
    };
  }, [previewTable]);

  const employeeColumns: ColumnsType<PayrollPreviewEmployeeRow> = useMemo(
    () => [
      {
        title: '#',
        dataIndex: 'idEmpleado',
        width: 90,
      },
      {
        title: 'Empleado',
        key: 'empleado',
        render: (_, row) => (
          <div>
            <div style={{ fontWeight: 600 }}>{row.nombreEmpleado}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{row.codigoEmpleado}</Text>
          </div>
        ),
      },
      {
        title: 'Salario Base',
        dataIndex: 'salarioBase',
        align: 'right',
        render: (value: string) => (
          <span className={genStyles.employeeMonto}>
            {canViewSensitive ? formatMoney(value) : '***'}
          </span>
        ),
      },
      {
        title: 'Salario Quincenal Bruto',
        dataIndex: 'salarioBrutoPeriodo',
        align: 'right',
        render: (value: string) => (
          <span className={genStyles.employeeMonto}>
            {canViewSensitive ? formatMoney(value) : '***'}
          </span>
        ),
      },
      {
        title: 'Devengado',
        dataIndex: 'devengadoMonto',
        align: 'right',
        render: (value: string) => (
          <span className={genStyles.employeeMonto}>
            {canViewSensitive ? formatMoney(value) : '***'}
          </span>
        ),
      },
      {
        title: 'Cargas Sociales',
        dataIndex: 'cargasSociales',
        align: 'right',
        render: (value: string) => (
          <span className={genStyles.employeeMonto}>
            {canViewSensitive ? formatMoney(value) : '***'}
          </span>
        ),
      },
      {
        title: 'Impuesto Renta',
        dataIndex: 'impuestoRenta',
        align: 'right',
        render: (value: string) => (
          <span className={genStyles.employeeMonto}>
            {canViewSensitive ? formatMoney(value) : '***'}
          </span>
        ),
      },
      {
        title: 'Monto Neto',
        dataIndex: 'totalNeto',
        align: 'right',
        render: (value: string) => (
          <strong className={genStyles.employeeMonto}>
            {canViewSensitive ? formatMoney(value) : '***'}
          </strong>
        ),
      },
      {
        title: 'Dias',
        dataIndex: 'dias',
        align: 'right',
        render: (value: string) => (canViewSensitive ? value : '***'),
      },
      {
        title: 'Estado',
        dataIndex: 'estado',
        align: 'center',
        render: (value: string) => <Tag className={genStyles.tableStateTag}>{value}</Tag>,
      },
      {
        title: 'Acciones',
        key: 'acciones-view',
        align: 'center',
        render: () => <EyeOutlined />,
      },
    ],
    [canViewSensitive],
  );

  const actionColumns: ColumnsType<PayrollPreviewActionRow> = useMemo(
    () => [
      { title: 'Categoria', dataIndex: 'categoria' },
      { title: 'Tipo de Accion', dataIndex: 'tipoAccion' },
      {
        title: 'Tipo (+/-)',
        dataIndex: 'tipoSigno',
        align: 'center',
        width: 90,
        render: (value: string) => (
          <span
            className={
              value === '+'
                ? `${genStyles.tipoSignoBadge} ${genStyles.tipoSignoPlus}`
                : `${genStyles.tipoSignoBadge} ${genStyles.tipoSignoMinus}`
            }
            title={value === '+' ? 'Suma al devengado' : 'Resta / deducción'}
          >
            {value === '+' ? '+' : '−'}
          </span>
        ),
      },
      {
        title: 'Monto',
        dataIndex: 'monto',
        align: 'right',
        render: (value: string) => (
          <span className={genStyles.actionsMonto}>
            {canViewSensitive ? formatMoney(value) : '***'}
          </span>
        ),
      },
      {
        title: 'Estado',
        dataIndex: 'estado',
        align: 'center',
        render: (value: string, row) => (
          <Tag
            className={`${genStyles.tableStateTag} ${
              isApprovedActionVisual(row) ? genStyles.stateApproved : genStyles.statePendingReview
            }`}
          >
            {isApprovedActionVisual(row) ? 'Aprobada' : value}
          </Tag>
        ),
      },
      {
        title: 'Acción',
        key: 'approve-action',
        align: 'center',
        render: (_, row) => {
          const showApprove = row.canApprove && row.idAccion && canApprovePersonalActions;
          const showInvalidate = isInvalidatableAction(row) && canApprovePersonalActions;
          if (!showApprove && !showInvalidate) return <Text type="secondary">--</Text>;
          return (
            <span style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {showApprove && (
                <Button
                  size="small"
                  type="link"
                  onClick={() => void handleApproveAction(row.idAccion)}
                  loading={approvingActionId === row.idAccion}
                >
                  Aprobar
                </Button>
              )}
              {showInvalidate && (
                <Button
                  size="small"
                  danger
                  type="link"
                  onClick={() => handleInvalidateAction(row)}
                  loading={invalidatingActionId === row.idAccion}
                >
                  Invalidar
                </Button>
              )}
            </span>
          );
        },
      },
    ],
    [
      approvingActionId,
      invalidatingActionId,
      canApprovePersonalActions,
      canViewSensitive,
      handleApproveAction,
      handleInvalidateAction,
    ],
  );

  return (
    <div className={genStyles.payrollPageWrap}>
      <div className={genStyles.payrollPageHeader}>
        <h1 className={genStyles.payrollPageTitle}>Cargar Planilla Regular</h1>
        <p className={genStyles.payrollPageSubtitle}>
          Configure filtros, seleccione una planilla Regular y cargue la tabla de revision de empleados y acciones.
        </p>
      </div>

      <Card className={`${styles.mainCard} ${genStyles.pageCard}`}>
        <div className={styles.mainCardBody}>
          <Collapse
            activeKey={contentExpanded ? ['content'] : []}
            onChange={(keys) =>
              setContentExpanded((Array.isArray(keys) ? keys : [keys]).includes('content'))
            }
            className={genStyles.collapsePanel}
            items={[
              {
                key: 'content',
                label: collapseLabel,
                children: (
                  <div className={genStyles.panelContent}>
                    <div className={genStyles.sectionLabel}>Filtros</div>
                    <div className={genStyles.statsRow}>
                      <div className={genStyles.statCard}>
                        <div className={genStyles.statLabel}>Empresa</div>
                        <Select
                          className={genStyles.statSelect}
                          value={selectedCompanyId}
                          onChange={(value) => {
                            setSelectedCompanyId(parseCompanyId(value));
                            setSelectedPayrollId(undefined);
                            setSelectedPayrollDetail(null);
                            resetPreview();
                          }}
                          placeholder="Seleccione"
                          options={companies.map((company) => ({
                            value: Number(company.id),
                            label: company.nombre,
                          }))}
                        />
                      </div>
                      <div className={genStyles.statCard}>
                        <div className={genStyles.statLabel}>Moneda</div>
                        <Select
                          className={genStyles.statSelect}
                          value={selectedCurrency}
                          onChange={(value) => {
                            setSelectedCurrency(value);
                            setSelectedPayrollId(undefined);
                            setSelectedPayrollDetail(null);
                            resetPreview();
                          }}
                          options={[
                            { value: 'ALL', label: 'Todas' },
                            { value: 'CRC', label: 'CRC' },
                            { value: 'USD', label: 'USD' },
                          ]}
                        />
                      </div>
                      <div className={genStyles.statCard}>
                        <div className={genStyles.statLabel}>Tipo de periodo</div>
                        <Select
                          className={genStyles.statSelect}
                          value={selectedPayPeriodId}
                          onChange={(value) => {
                            setSelectedPayPeriodId(value as PayPeriodFilter);
                            setSelectedPayrollId(undefined);
                            setSelectedPayrollDetail(null);
                            resetPreview();
                          }}
                          options={[
                            { value: 'ALL', label: 'Todos' },
                            ...payPeriods.map((period) => ({
                              value: Number(period.id),
                              label: period.nombre,
                            })),
                          ]}
                        />
                      </div>
                      <div className={`${genStyles.statCard} ${genStyles.statCardAction}`}>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={() => {
                            setSelectedPayrollId(undefined);
                            setSelectedPayrollDetail(null);
                            resetPreview();
                            bustApiCache('/payroll');
                            void loadPayrolls();
                          }}
                          className={genStyles.refreshBtn}
                        >
                          Refrescar
                        </Button>
                      </div>
                    </div>

                    <div className={genStyles.sectionBlock}>
                      <div className={genStyles.sectionLabel}>Planillas Regulares por Empresa y Moneda</div>
                      <div className={genStyles.contentCard}>
                        <Select
                          showSearch
                          optionFilterProp="label"
                          className={styles.filterInput}
                          style={{ width: '100%' }}
                          loading={loading}
                          value={selectedPayrollId}
                          onChange={(value) => {
                            setSelectedPayrollId(Number(value));
                            setSelectedPayrollDetail(null);
                            resetPreview();
                          }}
                          placeholder="Seleccione planilla"
                          options={payrollOptions}
                          notFoundContent="No hay planillas regulares en estado Abierta o En Proceso."
                        />
                        <p className={genStyles.selectHint}>
                          Tipo mostrado: Regular. Estados mostrados: Abierta y En Proceso.
                        </p>
                      </div>
                    </div>

                    <div className={genStyles.sectionBlock}>
                      <div className={genStyles.sectionLabel}>Detalle de la planilla</div>
                      {selectedPayroll ? (
                        <div className={genStyles.contentCard}>
                          <div className={genStyles.detailHeader}>
                            <span className={genStyles.detailTitle}>
                              {selectedPayroll.nombrePlanilla?.trim() || `Planilla #${selectedPayroll.id}`}
                            </span>
                            <Tag
                              color={STATE_COLOR[selectedPayroll.estado]}
                              bordered
                              className={genStyles.stateTag}
                            >
                              {STATE_LABEL[selectedPayroll.estado]}
                            </Tag>
                          </div>

                          <Descriptions
                            column={{ xs: 1, sm: 2, md: 3 }}
                            size="small"
                            className={genStyles.descriptions}
                          >
                            <Descriptions.Item label="Empresa">{selectedCompanyName}</Descriptions.Item>
                            <Descriptions.Item label="Tipo de periodo">
                              {payPeriodNameById.get(Number(selectedPayroll.idPeriodoPago)) ?? '--'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Moneda">
                              {formatPrimitive(selectedPayroll.moneda)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Fecha inicio periodo">
                              {formatDate(selectedPayroll.fechaInicioPeriodo)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Fecha fin periodo">
                              {formatDate(selectedPayroll.fechaFinPeriodo)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Fecha corte">
                              {formatDate(selectedPayroll.fechaCorte)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Fecha inicio pago">
                              {formatDate(selectedPayroll.fechaInicioPago)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Fecha fin pago">
                              {formatDate(selectedPayroll.fechaFinPago)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Fecha pago programada">
                              {formatDate(selectedPayroll.fechaPagoProgramada)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Tipo planilla">
                              {formatPrimitive(selectedPayroll.tipoPlanilla)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Estado">
                              {STATE_LABEL[selectedPayroll.estado] ?? `Estado ${selectedPayroll.estado}`}
                            </Descriptions.Item>
                          </Descriptions>


                        </div>
                      ) : (
                        <p className={genStyles.emptyDetail}>Seleccione una planilla para ver el detalle.</p>
                      )}
                    </div>

                  </div>
                ),
              },
            ]}
          />
          {selectedPayroll ? (
            <div className={genStyles.sectionBlock} style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  type="primary"
                  className={genStyles.primaryBtn}
                  onClick={() => void handleLoadPayroll()}
                  loading={loadingProcess}
                  disabled={!canProcess}
                >
                  Cargar planilla
                </Button>
                {!canProcess ? (
                  <Text type="secondary">No tiene permiso para cargar planilla.</Text>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </Card>
      {previewTable ? (
        <Card className={`${styles.mainCard} ${genStyles.pageCard}`} style={{ marginTop: 16 }}>
          <div className={styles.mainCardBody}>
            <div className={genStyles.sectionBlock}>
              <div className={genStyles.sectionLabel}>Tabla de empleados y acciones</div>
              <div className={`${genStyles.contentCard} ${genStyles.previewTableWrap}`}>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Buscar empleado por nombre o codigo..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className={genStyles.searchInput}
                  style={{ marginBottom: 14, maxWidth: 380 }}
                />
                <Table<PayrollPreviewEmployeeRow>
                  rowKey={(row) => row.idEmpleado}
                  dataSource={filteredPreviewRows}
                  columns={employeeColumns}
                  className={genStyles.previewTable}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                  rowSelection={{
                    selectedRowKeys: selectedPreviewRowKeys,
                    onSelect: (record, selected) => {
                      void updateEmployeeSelectionForPayroll([record.idEmpleado], selected);
                    },
                    onSelectAll: (selected, selectedRows, changeRows) => {
                      const targetRows =
                        changeRows.length > 0
                          ? changeRows
                          : selectedRows.length > 0
                            ? selectedRows
                            : filteredPreviewRows;
                      void updateEmployeeSelectionForPayroll(
                        targetRows.map((row) => row.idEmpleado),
                        selected,
                      );
                    },
                    preserveSelectedRowKeys: true,
                    getCheckboxProps: (record) => ({
                      disabled: Boolean(pendingSelectionByEmployee[record.idEmpleado]) || loadingProcess,
                    }),
                  }}
                  expandable={{
                    expandedRowRender: (row) => (
                      <div className={genStyles.actionsDetailWrap}>
                        {(() => {
                          const isEmployeeLockedForActions =
                            toBooleanFlag(row.seleccionadoPlanilla) && toBooleanFlag(row.verificadoEmpleado);
                          const isSavingPersonalAction =
                            overtimeSubmitting === row.idEmpleado ||
                            absenceSubmitting === row.idEmpleado ||
                            retentionSubmitting === row.idEmpleado ||
                            discountSubmitting === row.idEmpleado;
                          const lockReason =
                            'Empleado marcado para planilla: desmarquelo para crear o aprobar nuevas acciones.';
                          return (
                            <>
                        <div className={genStyles.actionsDetailTitle}>
                          Detalle de acciones de personal
                        </div>
                        {isSavingPersonalAction ? (
                          <div className={genStyles.addActionProgressHint}>
                            Guardando accion de personal y recalculando planilla en segundo plano...
                          </div>
                        ) : null}
                        <Table<PayrollPreviewActionRow>
                          rowKey={(action) => `${row.idEmpleado}-${action.idAccion ?? 'na'}-${action.categoria}-${action.tipoAccion}-${action.monto}-${action.estado}-${action.tipoSigno}`}
                          dataSource={row.acciones}
                          columns={actionColumns}
                          size="small"
                          className={`${genStyles.previewTable} ${genStyles.actionsTable}`}
                          rowClassName={(action) =>
                            isApprovedActionVisual(action) ? 'action-row-approved' : 'action-row-pending'
                          }
                          pagination={false}
                        />
                        <div className={genStyles.addActionSelectWrap}>
                          <Select
                            placeholder={
                              isEmployeeLockedForActions
                                ? 'Empleado bloqueado para nuevas acciones'
                                : 'Agregar acciones de personal'
                            }
                            allowClear
                            disabled={isEmployeeLockedForActions}
                            value={addActionTypeByEmployee[row.idEmpleado]}
                            onChange={(value) => handleAddActionTypeChange(row.idEmpleado, value)}
                            options={[
                              { value: 'horas_extras', label: 'Horas extras' },
                              { value: 'ausencias', label: 'Ausencias' },
                              { value: 'retenciones', label: 'Retenciones' },
                              { value: 'deducciones', label: 'Deducciones' },
                            ]}
                            style={{ minWidth: 220 }}
                          />
                          {isEmployeeLockedForActions ? (
                            <div className={genStyles.addActionLockHint}>
                              {lockReason}
                            </div>
                          ) : null}
                        </div>
                        {!isEmployeeLockedForActions &&
                        addActionTypeByEmployee[row.idEmpleado] === 'horas_extras' &&
                        selectedPayroll &&
                        selectedPayrollId ? (
                          <OvertimeInlineForm
                            idEmpresa={selectedPayrollDetail?.idEmpresa ?? selectedCompanyId ?? 0}
                            idEmpleado={row.idEmpleado}
                            payrollId={selectedPayrollId}
                            employeeRow={row}
                            selectedPayroll={selectedPayroll}
                            movements={overtimeMovements}
                            loadingMovements={loadingMovements}
                            canViewSensitive={!!canViewSensitive}
                            onSubmit={async (payloadLines) => {
                              await handleCreateOvertime(row.idEmpleado, payloadLines);
                            }}
                            onSuccess={() => handleAddActionTypeChange(row.idEmpleado, undefined)}
                          />
                        ) : null}
                        {!isEmployeeLockedForActions &&
                        addActionTypeByEmployee[row.idEmpleado] === 'ausencias' &&
                        selectedPayroll &&
                        selectedPayrollId ? (
                          <AbsenceInlineForm
                            idEmpresa={selectedPayrollDetail?.idEmpresa ?? selectedCompanyId ?? 0}
                            idEmpleado={row.idEmpleado}
                            payrollId={selectedPayrollId}
                            employeeRow={row}
                            selectedPayroll={selectedPayroll}
                            movements={absenceMovements}
                            loadingMovements={loadingAbsenceMovements}
                            canViewSensitive={!!canViewSensitive}
                            onSubmit={async (payloadLines) => {
                              await handleCreateAbsence(row.idEmpleado, payloadLines);
                            }}
                            onSuccess={() => handleAddActionTypeChange(row.idEmpleado, undefined)}
                          />
                        ) : null}
                        {!isEmployeeLockedForActions &&
                        addActionTypeByEmployee[row.idEmpleado] === 'retenciones' &&
                        selectedPayroll &&
                        selectedPayrollId ? (
                          <RetentionInlineForm
                            idEmpresa={selectedPayrollDetail?.idEmpresa ?? selectedCompanyId ?? 0}
                            idEmpleado={row.idEmpleado}
                            payrollId={selectedPayrollId}
                            employeeRow={row}
                            selectedPayroll={selectedPayroll}
                            movements={retentionMovements}
                            loadingMovements={loadingRetentionMovements}
                            canViewSensitive={!!canViewSensitive}
                            onSubmit={async (payloadLines) => {
                              await handleCreateRetention(row.idEmpleado, payloadLines);
                            }}
                            onSuccess={() => handleAddActionTypeChange(row.idEmpleado, undefined)}
                          />
                        ) : null}
                        {!isEmployeeLockedForActions &&
                        addActionTypeByEmployee[row.idEmpleado] === 'deducciones' &&
                        selectedPayroll &&
                        selectedPayrollId ? (
                          <DiscountInlineForm
                            idEmpresa={selectedPayrollDetail?.idEmpresa ?? selectedCompanyId ?? 0}
                            idEmpleado={row.idEmpleado}
                            payrollId={selectedPayrollId}
                            employeeRow={row}
                            selectedPayroll={selectedPayroll}
                            movements={discountMovements}
                            loadingMovements={loadingDiscountMovements}
                            canViewSensitive={!!canViewSensitive}
                            onSubmit={async (payloadLines) => {
                              await handleCreateDiscount(row.idEmpleado, payloadLines);
                            }}
                            onSuccess={() => handleAddActionTypeChange(row.idEmpleado, undefined)}
                          />
                        ) : null}
                            </>
                          );
                        })()}
                      </div>
                    ),
                  }}
                />

                <div className={genStyles.summaryGrid}>
                  <div className={genStyles.summaryCard}>
                    <div className={genStyles.summaryTitle}>Informacion de Empleados</div>
                    <table className={genStyles.summaryTable}>
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Total Empleados</td>
                          <td>{previewSummary.totalEmployees}</td>
                        </tr>
                        <tr>
                          <td>Incluidos en Planilla</td>
                          <td>{previewSummary.includedEmployees}</td>
                        </tr>
                        <tr>
                          <td>Empleados Verificados</td>
                          <td>{previewSummary.verifiedEmployees}</td>
                        </tr>
                        <tr>
                          <td>Pendientes de Verificar</td>
                          <td>{previewSummary.pendingEmployees}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className={genStyles.summaryCard}>
                    <div className={genStyles.summaryTitle}>Totales Monetarios</div>
                    <table className={genStyles.summaryTable}>
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Devengado (Bruto total)</td>
                          <td>{canViewSensitive ? `CRC ${formatMoney(previewSummary.totalDevengado)}` : '***'}</td>
                        </tr>
                        <tr>
                          <td>Cargas Sociales</td>
                          <td>{canViewSensitive ? `CRC ${formatMoney(previewSummary.totalCargas)}` : '***'}</td>
                        </tr>
                        <tr>
                          <td>Impuesto Renta</td>
                          <td>{canViewSensitive ? `CRC ${formatMoney(previewSummary.totalRenta)}` : '***'}</td>
                        </tr>
                        <tr className={genStyles.summaryTotalRow}>
                          <td>MONTO NETO TOTAL</td>
                          <td>{canViewSensitive ? `CRC ${formatMoney(previewSummary.totalNeto)}` : '***'}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className={genStyles.summaryHint}>(Solo empleados marcados para planilla)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}




















