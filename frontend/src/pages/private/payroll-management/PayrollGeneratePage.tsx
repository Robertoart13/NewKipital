/**
 * @file PayrollGeneratePage.tsx
 * @description Vista operativa para cargar y revisar una Planilla Regular.
 *
 * Flujo principal:
 *  1. El usuario filtra por empresa, moneda y periodo de pago.
 *  2. Selecciona una planilla Regular en estado Abierta o En Proceso.
 *  3. Presiona "Cargar planilla" → se genera la tabla de revisión.
 *  4. Desde la tabla puede: incluir/excluir empleados, aprobar/invalidar
 *     acciones de personal y agregar nuevas acciones inline.
 */

// ─── Librerías externas ───────────────────────────────────────────────────────
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  App as AntdApp,
  Button,
  Card,
  Collapse,
  Descriptions,
  Input,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ─── APIs ─────────────────────────────────────────────────────────────────────
import { fetchPayPeriods, type CatalogPayPeriod } from '../../../api/catalogs';
import {
  approvePersonalAction,
  createAbsence,
  createDiscount,
  createOvertime,
  createRetention,
  fetchAbsenceMovementsCatalog,
  invalidateAbsence,
  invalidateBonus,
  invalidateDisability,
  invalidateDiscount,
  invalidateIncrease,
  invalidateLicense,
  invalidateOvertime,
  invalidateRetention,
  invalidateVacation,
  type AbsenceMovementCatalogItem,
  type UpsertAbsenceLinePayload,
  type UpsertDiscountLinePayload,
  type UpsertOvertimeLinePayload,
  type UpsertRetentionLinePayload,
} from '../../../api/personalActions';
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

// ─── Formularios inline y modales auxiliares ─────────────────────────────────
import { AbsenceInlineForm } from './AbsenceInlineForm';
import { DiscountInlineForm } from './DiscountInlineForm';
import { OvertimeInlineForm } from './OvertimeInlineForm';
import { RetentionInlineForm } from './RetentionInlineForm';
import { EmployeePayrollPreviewModal } from './EmployeePayrollPreviewModal';

// ─── Store / Permisos ─────────────────────────────────────────────────────────
import { bustApiCache } from '../../../lib/apiCache';
import { useAppSelector } from '../../../store/hooks';
import { canProcessPayroll } from '../../../store/selectors/permissions.selectors';

// ─── Estilos ──────────────────────────────────────────────────────────────────
import styles from '../configuration/UsersManagementPage.module.css';
import genStyles from './PayrollGeneratePage.module.css';

const { Text } = Typography;

// =============================================================================
// TIPOS LOCALES
// =============================================================================

type CurrencyFilter = 'ALL' | 'CRC' | 'USD';
type PayPeriodFilter = 'ALL' | number;

interface PayrollSelectOption {
  value: number;
  label: string;
}

// =============================================================================
// CONSTANTES
// =============================================================================

/** Etiquetas legibles para cada estado numérico de planilla. */
const PAYROLL_STATE_LABEL: Record<number, string> = {
  0: 'Inactiva',
  1: 'Abierta',
  2: 'En Proceso',
  3: 'Verificada',
  4: 'Aplicada',
  5: 'Contabilizada',
  6: 'Notificada',
  7: 'Inactiva',
};

/** Color de Tag de Ant Design por estado de planilla. */
const PAYROLL_STATE_COLOR: Record<number, string> = {
  0: 'default',
  1: 'default',
  2: 'processing',
  3: 'default',
  4: 'success',
  5: 'default',
  6: 'default',
  7: 'default',
};

/** Estados que se consideran "operativos" para permitir cargar la planilla. */
const OPERATIONAL_STATES = [1, 2] as const;

/**
 * Categorías de acciones de personal que admiten invalidación desde esta vista.
 * Se comparan en minúsculas para evitar problemas de capitalización.
 */
const INVALIDATABLE_CATEGORIES = [
  'ausencias',
  'licencias',
  'incapacidades',
  'bonificaciones',
  'horas extras',
  'retenciones',
  'deducciones',
  'aumentos',
  'vacaciones',
] as const;

// =============================================================================
// UTILIDADES PURAS
// =============================================================================

/**
 * Convierte un valor a `number` positivo y finito.
 * Retorna `undefined` si el valor no cumple la condición.
 */
function parseCompanyId(value: number | string | null | undefined): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Genera el rango de fechas ±12 meses desde hoy para consultar planillas.
 */
function getPayrollDateRange() {
  return {
    from: dayjs().subtract(12, 'month').format('YYYY-MM-DD'),
    to: dayjs().add(12, 'month').format('YYYY-MM-DD'),
  };
}

/**
 * Construye el string "fechaInicio - fechaFin" del periodo de una planilla.
 * Usa "--" como fallback cuando alguna fecha no existe.
 */
function formatPeriod(row: PayrollListItem): string {
  const start = row.fechaInicioPeriodo ?? '';
  const end = row.fechaFinPeriodo ?? '';
  if (!start && !end) return '--';
  return `${start || '--'} - ${end || '--'}`;
}

/**
 * Formatea una fecha ISO a "DD/MM/YYYY".
 * Retorna "--" para valores nulos, vacíos o inválidos.
 */
function formatDate(value?: string | null): string {
  if (!value) return '--';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '--';
}

/**
 * Formatea un valor primitivo para mostrarlo en Descriptions.
 * - `null | undefined | ''`  →  "--"
 * - `boolean`                →  "Si" / "No"
 * - Cualquier otro           →  `String(value)`
 */
function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  return String(value);
}

/**
 * Formatea un número como monto con separadores de miles (locale es-CR, 2 decimales).
 * Retorna el valor original como string si no es un número válido.
 */
function formatMoney(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Normaliza distintos formatos de flag booleano a `boolean`.
 * Acepta: boolean, 0/1, "true"/"false", "si"/"yes"/"1".
 */
function toBooleanFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['1', 'true', 'si', 'yes'].includes(value.trim().toLowerCase());
  }
  return false;
}

/**
 * Determina si una planilla es de tipo "Regular"
 * por `idTipoPlanilla === 1` o por descripción textual.
 */
function isRegularPayroll(row: PayrollListItem): boolean {
  if (Number(row.idTipoPlanilla) === 1) return true;
  return (row.tipoPlanilla ?? '').trim().toLowerCase() === 'regular';
}

/**
 * Indica si una acción debe mostrarse visualmente como "Aprobada".
 * Las categorías "Carga Social" e "Impuesto Renta" siempre se aprueban
 * automáticamente en el cálculo de planilla.
 */
function isApprovedActionVisual(row: PayrollPreviewActionRow): boolean {
  const cat = (row.categoria ?? '').trim().toLowerCase();
  if (cat === 'carga social' || cat === 'impuesto renta') return true;
  return (row.estado ?? '').trim().toLowerCase().includes('aprobad');
}

/**
 * Determina si una acción de personal puede ser invalidada desde esta vista.
 * Requiere `idAccion` y que la categoría esté en `INVALIDATABLE_CATEGORIES`.
 */
function isInvalidatableAction(row: PayrollPreviewActionRow): boolean {
  if (!row.idAccion) return false;
  const cat = (row.categoria ?? '').trim().toLowerCase();
  return INVALIDATABLE_CATEGORIES.includes(cat as (typeof INVALIDATABLE_CATEGORIES)[number]);
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PayrollGeneratePage() {
  // ── Hooks de feedback de Ant Design ────────────────────────────────────────
  const { message, modal } = AntdApp.useApp();

  // ── Permisos desde Redux ────────────────────────────────────────────────────
  const canProcess           = useAppSelector(canProcessPayroll);
  const canViewSensitive     = useAppSelector((s) => s.permissions.permissions.includes('payroll:view_sensitive'));
  const canApproveActions    = useAppSelector((s) => s.permissions.permissions.includes('hr_action:approve'));
  const companies            = useAppSelector((s) => s.auth.companies);
  const activeCompany        = useAppSelector((s) => s.activeCompany.company);

  // Empresa inicial: la activa o la primera disponible
  const defaultCompanyId = parseCompanyId(activeCompany?.id) ?? parseCompanyId(companies[0]?.id);

  // ── Estado: filtros ─────────────────────────────────────────────────────────
  const [selectedCompanyId,    setSelectedCompanyId]    = useState<number | undefined>(defaultCompanyId);
  const [selectedCurrency,     setSelectedCurrency]     = useState<CurrencyFilter>('ALL');
  const [selectedPayPeriodId,  setSelectedPayPeriodId]  = useState<PayPeriodFilter>('ALL');

  // ── Estado: selección de planilla ───────────────────────────────────────────
  const [selectedPayrollId,     setSelectedPayrollId]     = useState<number | undefined>(undefined);

  // ── Estado: modal de previsualización de pago por empleado ──────────────────
  const [previewEmployee,       setPreviewEmployee]       = useState<PayrollPreviewEmployeeRow | null>(null);
  const [selectedPayrollDetail, setSelectedPayrollDetail] = useState<PayrollListItem | null>(null);

  // ── Estado: datos de catálogos ──────────────────────────────────────────────
  const [payrolls,    setPayrolls]    = useState<PayrollListItem[]>([]);
  const [payPeriods,  setPayPeriods]  = useState<CatalogPayPeriod[]>([]);

  // ── Estado: tabla de previsualización ──────────────────────────────────────
  const [previewTable, setPreviewTable] = useState<PayrollPreviewTable | null>(null);
  const [searchTerm,   setSearchTerm]   = useState('');

  // ── Estado: indicadores de carga globales ───────────────────────────────────
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [loadingProcess,  setLoadingProcess]  = useState(false);

  // ── Estado: UI ──────────────────────────────────────────────────────────────
  const [contentExpanded, setContentExpanded] = useState(true);
  const [expandedEmployeeRowKeys, setExpandedEmployeeRowKeys] = useState<number[]>([]);

  // ── Estado: acciones en vuelo (por idAccion o idEmpleado) ──────────────────
  const [approvingActionId,   setApprovingActionId]   = useState<number | null>(null);
  const [invalidatingActionId, setInvalidatingActionId] = useState<number | null>(null);
  const [overtimeSubmitting,  setOvertimeSubmitting]  = useState<number | null>(null);
  const [absenceSubmitting,   setAbsenceSubmitting]   = useState<number | null>(null);
  const [retentionSubmitting, setRetentionSubmitting] = useState<number | null>(null);
  const [discountSubmitting,  setDiscountSubmitting]  = useState<number | null>(null);

  /** Tipo de acción inline que el usuario quiere agregar, por idEmpleado. */
  const [addActionTypeByEmployee, setAddActionTypeByEmployee] = useState<Record<number, string>>({});

  /** Empleados con actualización de selección en vuelo (para deshabilitar checkbox). */
  const [pendingSelectionByEmployee, setPendingSelectionByEmployee] = useState<Record<number, boolean>>({});

  // ── Estado: catálogos de movimientos ───────────────────────────────────────
  const [overtimeMovements,   setOvertimeMovements]   = useState<AbsenceMovementCatalogItem[]>([]);
  const [absenceMovements,    setAbsenceMovements]    = useState<AbsenceMovementCatalogItem[]>([]);
  const [retentionMovements,  setRetentionMovements]  = useState<AbsenceMovementCatalogItem[]>([]);
  const [discountMovements,   setDiscountMovements]   = useState<AbsenceMovementCatalogItem[]>([]);
  const [loadingOvertimeMovements,   setLoadingOvertimeMovements]   = useState(false);
  const [loadingAbsenceMovements,    setLoadingAbsenceMovements]    = useState(false);
  const [loadingRetentionMovements,  setLoadingRetentionMovements]  = useState(false);
  const [loadingDiscountMovements,   setLoadingDiscountMovements]   = useState(false);

  // ==========================================================================
  // HELPERS INTERNOS
  // ==========================================================================

  /** Limpia la tabla de previsualización y el buscador. */
  const resetPreview = useCallback(() => {
    setPreviewTable(null);
    setSearchTerm('');
    setExpandedEmployeeRowKeys([]);
  }, []);

  /**
   * Resetea toda la selección de planilla: id, detalle y preview.
   * Útil al cambiar filtros o empresa.
   */
  const resetPayrollSelection = useCallback(() => {
    setSelectedPayrollId(undefined);
    setSelectedPayrollDetail(null);
    resetPreview();
  }, [resetPreview]);

  // ==========================================================================
  // CARGA DE DATOS
  // ==========================================================================

  /** Carga el catálogo de periodos de pago (solo al montar). */
  const loadPayPeriods = useCallback(async () => {
    try {
      setPayPeriods(await fetchPayPeriods());
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Error al cargar periodos de pago');
    }
  }, [message]);

  /** Carga las planillas operativas para la empresa seleccionada. */
  const loadPayrolls = useCallback(async () => {
    if (!selectedCompanyId) {
      setPayrolls([]);
      resetPayrollSelection();
      return;
    }

    setLoadingPayrolls(true);
    const { from, to } = getPayrollDateRange();

    try {
      const list = await fetchPayrolls(
        String(selectedCompanyId),
        false,
        from,
        to,
        false,
        [...OPERATIONAL_STATES],
      );
      setPayrolls(list);
      resetPayrollSelection();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Error al cargar planillas');
    } finally {
      setLoadingPayrolls(false);
    }
  }, [message, resetPayrollSelection, selectedCompanyId]);

  /** Recarga la tabla de planilla desde el backend (tras cambios en acciones/empleados). */
  const refreshPreviewTable = useCallback(async () => {
    if (!selectedPayrollId) return;
    const [table, detail] = await Promise.all([
      loadPayrollTable(selectedPayrollId),
      fetchPayroll(selectedPayrollId),
    ]);
    setPreviewTable(table);
    setSelectedPayrollDetail(detail);
    bustApiCache('/payroll');
  }, [selectedPayrollId]);

  // ── useEffects de carga ─────────────────────────────────────────────────────

  useEffect(() => { void loadPayPeriods(); }, [loadPayPeriods]);
  useEffect(() => { void loadPayrolls(); },  [loadPayrolls]);

  /** Carga el detalle de la planilla cuando cambia el id seleccionado. */
  useEffect(() => {
    if (!selectedPayrollId) {
      setSelectedPayrollDetail(null);
      resetPreview();
      return;
    }

    let cancelled = false;
    fetchPayroll(selectedPayrollId)
      .then((detail) => { if (!cancelled) setSelectedPayrollDetail(detail); })
      .catch((err) => {
        if (!cancelled) {
          setSelectedPayrollDetail(null);
          message.error(err instanceof Error ? err.message : 'Error al cargar detalle de planilla');
        }
      });
    return () => { cancelled = true; };
  }, [message, resetPreview, selectedPayrollId]);

  /**
   * Carga un catálogo de movimientos para un tipo dado.
   * Retorna la función de limpieza para evitar actualizaciones en componentes desmontados.
   */
  const loadMovementsCatalog = useCallback(
    (
      companyId: number | undefined,
      typeId: number,
      setData: (v: AbsenceMovementCatalogItem[]) => void,
      setLoading: (v: boolean) => void,
    ) => {
      if (!companyId) { setData([]); return; }

      let cancelled = false;
      setLoading(true);
      fetchAbsenceMovementsCatalog(companyId, typeId)
        .then((list) => { if (!cancelled) setData(list); })
        .catch(() => { if (!cancelled) setData([]); })
        .finally(() => { if (!cancelled) setLoading(false); });

      return () => { cancelled = true; };
    },
    [],
  );

  /** Id de empresa efectivo para cargar catálogos de movimientos. */
  const movementsCompanyId = selectedPayrollDetail?.idEmpresa ?? selectedCompanyId;

  useEffect(
    () => loadMovementsCatalog(movementsCompanyId, 11, setOvertimeMovements,  setLoadingOvertimeMovements),
    [loadMovementsCatalog, movementsCompanyId],
  );
  useEffect(
    () => loadMovementsCatalog(movementsCompanyId, 20, setAbsenceMovements,   setLoadingAbsenceMovements),
    [loadMovementsCatalog, movementsCompanyId],
  );
  useEffect(
    () => loadMovementsCatalog(movementsCompanyId, 5,  setRetentionMovements, setLoadingRetentionMovements),
    [loadMovementsCatalog, movementsCompanyId],
  );
  useEffect(
    () => loadMovementsCatalog(movementsCompanyId, 6,  setDiscountMovements,  setLoadingDiscountMovements),
    [loadMovementsCatalog, movementsCompanyId],
  );

  // ==========================================================================
  // VALORES DERIVADOS (useMemo)
  // ==========================================================================

  /** Mapa `idPeriodoPago → nombre` para consultas O(1). */
  const payPeriodNameById = useMemo(
    () => new Map(payPeriods.map((p) => [Number(p.id), p.nombre])),
    [payPeriods],
  );

  /** Nombre de la empresa activa para mostrar en el detalle. */
  const selectedCompanyName = useMemo(
    () => companies.find((c) => Number(c.id) === selectedCompanyId)?.nombre ?? '--',
    [companies, selectedCompanyId],
  );

  /** Planillas filtradas por moneda, periodo de pago y tipo Regular. */
  const filteredPayrolls = useMemo(
    () =>
      payrolls.filter((row) => {
        const matchesCurrency   = selectedCurrency === 'ALL' || (row.moneda ?? '').toUpperCase() === selectedCurrency;
        const matchesPeriod     = selectedPayPeriodId === 'ALL' || Number(row.idPeriodoPago) === Number(selectedPayPeriodId);
        return matchesCurrency && matchesPeriod && isRegularPayroll(row);
      }),
    [payrolls, selectedCurrency, selectedPayPeriodId],
  );

  /** Si la planilla seleccionada desaparece del listado filtrado, se limpia la selección. */
  useEffect(() => {
    if (!selectedPayrollId) return;
    const stillExists = filteredPayrolls.some((r) => r.id === selectedPayrollId);
    if (!stillExists) resetPayrollSelection();
  }, [filteredPayrolls, resetPayrollSelection, selectedPayrollId]);

  /** Opciones para el Select de planillas con label descriptivo. */
  const payrollSelectOptions = useMemo<PayrollSelectOption[]>(
    () =>
      filteredPayrolls.map((row) => ({
        value: row.id,
        label: [
          row.nombrePlanilla?.trim() || '--',
          row.tipoPlanilla?.trim()   || '--',
          payPeriodNameById.get(Number(row.idPeriodoPago)) ?? `Periodo #${row.idPeriodoPago}`,
          row.moneda?.trim() || '--',
          formatPeriod(row),
          PAYROLL_STATE_LABEL[row.estado] ?? `Estado ${row.estado}`,
        ].join(' | '),
      })),
    [filteredPayrolls, payPeriodNameById],
  );

  /**
   * Planilla seleccionada efectiva.
   * Prioriza el detalle cargado; si no está listo, usa el registro del listado.
   */
  const selectedPayroll =
    selectedPayrollDetail ??
    filteredPayrolls.find((r) => r.id === selectedPayrollId) ??
    null;

  /**
   * Filas de empleados filtradas por búsqueda y ordenadas:
   *  1) No seleccionados para planilla primero.
   *  2) Seleccionados al final.
   *  3) Alfabético por nombre dentro de cada grupo.
   */
  const filteredPreviewRows = useMemo(() => {
    if (!previewTable) return [];

    const term = searchTerm.trim().toLowerCase();
    const base = term
      ? previewTable.empleados.filter(
          (r) =>
            r.nombreEmpleado.toLowerCase().includes(term) ||
            r.codigoEmpleado.toLowerCase().includes(term),
        )
      : [...previewTable.empleados];

    return base.sort((a, b) => {
      const aSelected = toBooleanFlag(a.seleccionadoPlanilla);
      const bSelected = toBooleanFlag(b.seleccionadoPlanilla);
      if (aSelected !== bSelected) return aSelected ? 1 : -1;
      return a.nombreEmpleado.localeCompare(b.nombreEmpleado, 'es', { sensitivity: 'base' });
    });
  }, [previewTable, searchTerm]);

  useEffect(() => {
    if (expandedEmployeeRowKeys.length === 0) return;
    const visibleEmployeeIds = new Set(filteredPreviewRows.map((row) => row.idEmpleado));
    setExpandedEmployeeRowKeys((prev) => prev.filter((id) => visibleEmployeeIds.has(id)).slice(0, 1));
  }, [expandedEmployeeRowKeys.length, filteredPreviewRows]);

  /** Ids de empleados actualmente marcados para planilla (para `rowSelection`). */
  const selectedPreviewRowKeys = useMemo(
    () => filteredPreviewRows.filter((r) => toBooleanFlag(r.seleccionadoPlanilla)).map((r) => r.idEmpleado),
    [filteredPreviewRows],
  );

  /**
   * Totales calculados SOLO sobre empleados marcados para planilla.
   * No depende del filtro de búsqueda.
   */
  const previewSummary = useMemo(() => {
    const toDecimal = (v: string) => {
      const n = Number(String(v ?? '').replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    };

    const all      = previewTable?.empleados ?? [];
    const included = all.filter((r) => toBooleanFlag(r.seleccionadoPlanilla));
    const verified = included.filter((r) => toBooleanFlag(r.verificadoEmpleado)).length;

    return {
      totalEmployees:    all.length,
      includedEmployees: included.length,
      verifiedEmployees: verified,
      pendingEmployees:  Math.max(0, included.length - verified),
      totalDevengado:    included.reduce((sum, r) => sum + toDecimal(r.devengadoMonto), 0),
      totalCargas:       included.reduce((sum, r) => sum + toDecimal(r.cargasSociales), 0),
      totalRenta:        included.reduce((sum, r) => sum + toDecimal(r.impuestoRenta), 0),
      totalNeto:         included.reduce((sum, r) => sum + toDecimal(r.totalNeto), 0),
    };
  }, [previewTable]);

  // ==========================================================================
  // HANDLERS: CARGA DE PLANILLA
  // ==========================================================================

  /** Carga la tabla de revisión para la planilla seleccionada. */
  const handleLoadPayroll = async () => {
    if (!selectedPayrollId) {
      message.warning('Seleccione una planilla para cargar.');
      return;
    }

    setLoadingProcess(true);
    try {
      const [table, detail] = await Promise.all([
        loadPayrollTable(selectedPayrollId),
        fetchPayroll(selectedPayrollId),
      ]);
      setPreviewTable(table);
      setSelectedPayrollDetail(detail);
      bustApiCache('/payroll');
      message.success('Tabla de planilla cargada correctamente.');
      setContentExpanded(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Error al cargar tabla de planilla');
    } finally {
      setLoadingProcess(false);
    }
  };

  // ==========================================================================
  // HANDLERS: ACCIONES DE PERSONAL
  // ==========================================================================

  /** Aprueba una acción de personal y recarga la tabla. */
  const handleApproveAction = useCallback(
    async (actionId: number | null) => {
      if (!actionId || !selectedPayrollId) return;

      setApprovingActionId(actionId);
      try {
        await approvePersonalAction(actionId, { payrollId: selectedPayrollId });
        await refreshPreviewTable();
        message.success('Acción aprobada y tabla actualizada.');
      } catch (err) {
        message.error(err instanceof Error ? err.message : 'Error al aprobar la acción de personal');
      } finally {
        setApprovingActionId(null);
      }
    },
    [message, refreshPreviewTable, selectedPayrollId],
  );

  /**
   * Muestra un modal de confirmación e invalida la acción de personal
   * usando el endpoint correcto según su categoría.
   */
  const handleInvalidateAction = useCallback(
    (row: PayrollPreviewActionRow) => {
      const { idAccion } = row;
      const idEmpresa = selectedPayrollDetail?.idEmpresa ?? selectedCompanyId;

      if (!idAccion || !idEmpresa) return;
      if (!canApproveActions) {
        message.warning('Sin permiso para invalidar acciones de personal.');
        return;
      }

      modal.confirm({
        title:    'Confirmar invalidación',
        content:  'Esta acción se marcará como invalidada y no afectará el cálculo de la planilla. ¿Desea continuar?',
        okText:   'Sí, invalidar',
        cancelText: 'Cancelar',
        okButtonProps: { danger: true },
        centered: true,
        onOk: async () => {
          setInvalidatingActionId(idAccion);
          const cat = (row.categoria ?? '').trim().toLowerCase();

          // Mapa categoría → función de invalidación
          const invalidateByCategory: Record<string, () => Promise<void>> = {
            'ausencias':      () => invalidateAbsence(idAccion, idEmpresa),
            'licencias':      () => invalidateLicense(idAccion),
            'incapacidades':  () => invalidateDisability(idAccion),
            'bonificaciones': () => invalidateBonus(idAccion),
            'horas extras':   () => invalidateOvertime(idAccion),
            'retenciones':    () => invalidateRetention(idAccion),
            'deducciones':    () => invalidateDiscount(idAccion),
            'aumentos':       () => invalidateIncrease(idAccion),
            'vacaciones':     () => invalidateVacation(idAccion),
          };

          const invalidateFn = invalidateByCategory[cat];
          if (!invalidateFn) {
            message.error(`No se puede invalidar acciones de categoría: ${row.categoria}`);
            return;
          }

          try {
            await invalidateFn();
            await refreshPreviewTable();
            message.success('Acción invalidada y tabla actualizada.');
          } catch (err) {
            message.error(err instanceof Error ? err.message : 'Error al invalidar la acción de personal');
          } finally {
            setInvalidatingActionId(null);
          }
        },
      });
    },
    [canApproveActions, message, modal, refreshPreviewTable, selectedCompanyId, selectedPayrollDetail?.idEmpresa],
  );

  // ==========================================================================
  // HANDLERS: ACCIONES INLINE POR EMPLEADO
  // ==========================================================================

  /** Actualiza el tipo de acción seleccionada para agregar a un empleado. */
  const handleAddActionTypeChange = useCallback((idEmpleado: number, value: string | undefined) => {
    setAddActionTypeByEmployee((prev) => {
      const next = { ...prev };
      if (value) next[idEmpleado] = value;
      else delete next[idEmpleado];
      return next;
    });
  }, []);

  /**
   * Factory que genera el handler `onSubmit` para los formularios inline.
   * Evita duplicar la lógica de error/loading/refresh para cada tipo de acción.
   */
  function makeActionSubmitHandler<T>(
    createFn: (payload: { idEmpresa: number; idEmpleado: number; lines: T[] }) => Promise<void>,
    setSubmitting: (id: number | null) => void,
    successMsg: string,
  ) {
    return async (idEmpleado: number, lines: T[]) => {
      const idEmpresa = selectedPayrollDetail?.idEmpresa ?? selectedCompanyId;
      if (!idEmpresa || !selectedPayrollId) {
        message.warning('Falta empresa o planilla seleccionada.');
        return;
      }

      setSubmitting(idEmpleado);
      try {
        await createFn({ idEmpresa, idEmpleado, lines });
        handleAddActionTypeChange(idEmpleado, undefined);
        message.success(`${successMsg} Recalculando planilla en segundo plano...`);
        void refreshPreviewTable().catch(() => message.warning('La tabla se actualizará en unos segundos.'));
      } catch (err) {
        message.error(err instanceof Error ? err.message : `Error al guardar ${successMsg.toLowerCase()}`);
      } finally {
        setSubmitting(null);
      }
    };
  }

  const handleCreateOvertime   = useCallback(
    (idEmpleado: number, lines: UpsertOvertimeLinePayload[]) =>
      makeActionSubmitHandler(createOvertime,   setOvertimeSubmitting,  'Hora extra guardada.')(idEmpleado, lines),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPayrollDetail, selectedCompanyId, selectedPayrollId, refreshPreviewTable, message, handleAddActionTypeChange],
  );

  const handleCreateAbsence    = useCallback(
    (idEmpleado: number, lines: UpsertAbsenceLinePayload[]) =>
      makeActionSubmitHandler(createAbsence,    setAbsenceSubmitting,   'Ausencia guardada.')(idEmpleado, lines),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPayrollDetail, selectedCompanyId, selectedPayrollId, refreshPreviewTable, message, handleAddActionTypeChange],
  );

  const handleCreateRetention  = useCallback(
    (idEmpleado: number, lines: UpsertRetentionLinePayload[]) =>
      makeActionSubmitHandler(createRetention,  setRetentionSubmitting, 'Retención guardada.')(idEmpleado, lines),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPayrollDetail, selectedCompanyId, selectedPayrollId, refreshPreviewTable, message, handleAddActionTypeChange],
  );

  const handleCreateDiscount   = useCallback(
    (idEmpleado: number, lines: UpsertDiscountLinePayload[]) =>
      makeActionSubmitHandler(createDiscount,   setDiscountSubmitting,  'Descuento guardado.')(idEmpleado, lines),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPayrollDetail, selectedCompanyId, selectedPayrollId, refreshPreviewTable, message, handleAddActionTypeChange],
  );

  // ==========================================================================
  // HANDLER: SELECCIÓN DE EMPLEADOS EN PLANILLA
  // ==========================================================================

  /**
   * Marca o desmarca empleados para ser incluidos en la planilla.
   * Aplica un optimistic update local antes de confirmar con el backend.
   */
  const updateEmployeeSelection = useCallback(
    async (employeeIds: number[], selected: boolean) => {
      if (!selectedPayrollId) return;

      const uniqueIds = [...new Set(employeeIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
      if (!uniqueIds.length) return;

      // Marcar como pendiente en UI
      setPendingSelectionByEmployee((prev) => {
        const next = { ...prev };
        uniqueIds.forEach((id) => { next[id] = true; });
        return next;
      });

      // Optimistic update local
      setPreviewTable((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          empleados: prev.empleados.map((emp) => {
            if (!uniqueIds.includes(emp.idEmpleado)) return emp;
            return {
              ...emp,
              seleccionadoPlanilla: selected,
              verificadoEmpleado:   selected,
              requiereRevalidacion: false,
              estado: selected ? 'Verificado' : 'Excluido',
            };
          }),
        };
      });

      try {
        await updatePayrollEmployeeSelection(selectedPayrollId, uniqueIds, selected);
        void refreshPreviewTable().catch(() => message.warning('La tabla se actualizará en unos segundos.'));
        message.success(selected ? 'Empleado(s) incluido(s) en planilla.' : 'Empleado(s) excluido(s) de planilla.');
      } catch (err) {
        // Revertir en caso de error
        void refreshPreviewTable().catch(() => message.warning('La tabla se actualizará en unos segundos.'));
        message.error(err instanceof Error ? err.message : 'No se pudo actualizar la selección de empleados');
      } finally {
        setPendingSelectionByEmployee((prev) => {
          const next = { ...prev };
          uniqueIds.forEach((id) => { delete next[id]; });
          return next;
        });
      }
    },
    [message, refreshPreviewTable, selectedPayrollId],
  );

  // ==========================================================================
  // DEFINICIÓN DE COLUMNAS
  // ==========================================================================

  /** Columnas de la tabla principal de empleados. */
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
        render: (v: string) => (
          <span className={genStyles.employeeMonto}>{canViewSensitive ? formatMoney(v) : '***'}</span>
        ),
      },
      {
        title: 'Salario Quincenal Bruto',
        dataIndex: 'salarioBrutoPeriodo',
        align: 'right',
        render: (v: string) => (
          <span className={genStyles.employeeMonto}>{canViewSensitive ? formatMoney(v) : '***'}</span>
        ),
      },
      {
        title: 'Devengado',
        dataIndex: 'devengadoMonto',
        align: 'right',
        render: (v: string) => (
          <span className={genStyles.employeeMonto}>{canViewSensitive ? formatMoney(v) : '***'}</span>
        ),
      },
      {
        title: 'Cargas Sociales',
        dataIndex: 'cargasSociales',
        align: 'right',
        render: (v: string) => (
          <span className={genStyles.employeeMonto}>{canViewSensitive ? formatMoney(v) : '***'}</span>
        ),
      },
      {
        title: 'Impuesto Renta',
        dataIndex: 'impuestoRenta',
        align: 'right',
        render: (v: string) => (
          <span className={genStyles.employeeMonto}>{canViewSensitive ? formatMoney(v) : '***'}</span>
        ),
      },
      {
        title: 'Monto Neto',
        dataIndex: 'totalNeto',
        align: 'right',
        render: (v: string) => (
          <strong className={genStyles.employeeMonto}>{canViewSensitive ? formatMoney(v) : '***'}</strong>
        ),
      },
      {
        title: 'Dias',
        dataIndex: 'dias',
        align: 'right',
        render: (v: string) => (canViewSensitive ? v : '***'),
      },
      {
        title: 'Estado',
        dataIndex: 'estado',
        align: 'center',
        render: (v: string) => <Tag className={genStyles.tableStateTag}>{v}</Tag>,
      },
      {
        title: 'Acciones',
        key: 'ver',
        align: 'center',
        render: (_, row) => (
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setPreviewEmployee(row)}
          />
        ),
      },
    ],
    [canViewSensitive],
  );

  /** Columnas de la tabla de acciones de personal (dentro del expand). */
  const buildActionColumns = useCallback(
    (isEmployeeLocked: boolean): ColumnsType<PayrollPreviewActionRow> => [
      { title: 'Categoría',      dataIndex: 'categoria' },
      { title: 'Tipo de Acción', dataIndex: 'tipoAccion' },
      {
        title: 'Tipo (+/−)',
        dataIndex: 'tipoSigno',
        align: 'center',
        width: 90,
        render: (v: string) => {
          const isPlus = v === '+';
          return (
            <span
              className={`${genStyles.tipoSignoBadge} ${isPlus ? genStyles.tipoSignoPlus : genStyles.tipoSignoMinus}`}
              title={isPlus ? 'Suma al devengado' : 'Resta / deducción'}
            >
              {isPlus ? '+' : '−'}
            </span>
          );
        },
      },
      {
        title: 'Monto',
        dataIndex: 'monto',
        align: 'right',
        render: (v: string) => (
          <span className={genStyles.actionsMonto}>{canViewSensitive ? formatMoney(v) : '***'}</span>
        ),
      },
      {
        title: 'Estado',
        dataIndex: 'estado',
        align: 'center',
        render: (v: string, row) => {
          const approved = isApprovedActionVisual(row);
          return (
            <Tag
              className={`${genStyles.tableStateTag} ${
                approved ? genStyles.stateApproved : genStyles.statePendingReview
              }`}
            >
              {approved ? 'Aprobada' : v}
            </Tag>
          );
        },
      },
      {
        title: 'Acción',
        key: 'accion',
        align: 'center',
        render: (_, row) => {
          if (isEmployeeLocked) {
            return <Text type="secondary">Bloqueado por verificacion</Text>;
          }
          const showApprove    = row.canApprove && row.idAccion && canApproveActions;
          const showInvalidate = isInvalidatableAction(row) && canApproveActions;

          if (!showApprove && !showInvalidate) return <Text type="secondary">--</Text>;

          return (
            <span style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {showApprove && (
                <Button
                  size="small"
                  type="link"
                  loading={approvingActionId === row.idAccion}
                  onClick={() => void handleApproveAction(row.idAccion)}
                >
                  Aprobar
                </Button>
              )}
              {showInvalidate && (
                <Button
                  size="small"
                  danger
                  type="link"
                  loading={invalidatingActionId === row.idAccion}
                  onClick={() => handleInvalidateAction(row)}
                >
                  Invalidar
                </Button>
              )}
            </span>
          );
        },
      },
    ],
    [approvingActionId, invalidatingActionId, canApproveActions, canViewSensitive, handleApproveAction, handleInvalidateAction],
  );

  // ==========================================================================
  // RENDER: SECCIONES REUTILIZABLES
  // ==========================================================================

  /**
   * Render del detalle de empleado expandido en la tabla.
   * Muestra sus acciones de personal y los formularios inline para agregar nuevas.
   */
  const renderExpandedEmployeeRow = (row: PayrollPreviewEmployeeRow) => {
    const isLocked =
      toBooleanFlag(row.seleccionadoPlanilla) && toBooleanFlag(row.verificadoEmpleado);
    const actionColumns = buildActionColumns(isLocked);

    const isSaving =
      overtimeSubmitting  === row.idEmpleado ||
      absenceSubmitting   === row.idEmpleado ||
      retentionSubmitting === row.idEmpleado ||
      discountSubmitting  === row.idEmpleado;

    const currentActionType = addActionTypeByEmployee[row.idEmpleado];
    const sharedFormProps = {
      idEmpresa:        selectedPayrollDetail?.idEmpresa ?? selectedCompanyId ?? 0,
      idEmpleado:       row.idEmpleado,
      payrollId:        selectedPayrollId!,
      employeeRow:      row,
      selectedPayroll:  selectedPayroll!,
      canViewSensitive: !!canViewSensitive,
      onSuccess:        () => handleAddActionTypeChange(row.idEmpleado, undefined),
    };

    return (
      <div className={genStyles.actionsDetailWrap}>
        <div className={genStyles.actionsDetailTitle}>Detalle de acciones de personal</div>

        <Spin spinning={isSaving} tip="Guardando acción y recalculando planilla...">
          <Table<PayrollPreviewActionRow>
            rowKey={(a) =>
              `${row.idEmpleado}-${a.idAccion ?? 'na'}-${a.categoria}-${a.tipoAccion}-${a.monto}-${a.estado}-${a.tipoSigno}`
            }
            dataSource={row.acciones}
            columns={actionColumns}
            size="small"
            className={`${genStyles.previewTable} ${genStyles.actionsTable}`}
            rowClassName={(a) => (isApprovedActionVisual(a) ? 'action-row-approved' : 'action-row-pending')}
            pagination={false}
          />
        </Spin>

        {/* Selector de tipo de acción a agregar */}
        <div className={genStyles.addActionSelectWrap}>
          <Select
            placeholder={isLocked ? 'Empleado bloqueado para nuevas acciones' : 'Agregar acción de personal'}
            allowClear
            disabled={isLocked}
            value={currentActionType}
            onChange={(v) => handleAddActionTypeChange(row.idEmpleado, v)}
            options={[
              { value: 'horas_extras', label: 'Horas extras' },
              { value: 'ausencias',    label: 'Ausencias' },
              { value: 'retenciones',  label: 'Retenciones' },
              { value: 'deducciones',  label: 'Deducciones' },
            ]}
            style={{ minWidth: 220 }}
          />
          {isLocked && (
            <div className={genStyles.addActionLockHint}>
              Desmarque al empleado de la planilla para agregar o aprobar nuevas acciones.
            </div>
          )}
        </div>

        {/* Formularios inline — solo se muestran si el empleado no está bloqueado */}
        {!isLocked && selectedPayroll && selectedPayrollId && (
          <>
            {currentActionType === 'horas_extras' && (
              <OvertimeInlineForm
                {...sharedFormProps}
                movements={overtimeMovements}
                loadingMovements={loadingOvertimeMovements}
                onSubmit={(lines) => handleCreateOvertime(row.idEmpleado, lines)}
              />
            )}
            {currentActionType === 'ausencias' && (
              <AbsenceInlineForm
                {...sharedFormProps}
                movements={absenceMovements}
                loadingMovements={loadingAbsenceMovements}
                onSubmit={(lines) => handleCreateAbsence(row.idEmpleado, lines)}
              />
            )}
            {currentActionType === 'retenciones' && (
              <RetentionInlineForm
                {...sharedFormProps}
                movements={retentionMovements}
                loadingMovements={loadingRetentionMovements}
                onSubmit={(lines) => handleCreateRetention(row.idEmpleado, lines)}
              />
            )}
            {currentActionType === 'deducciones' && (
              <DiscountInlineForm
                {...sharedFormProps}
                movements={discountMovements}
                loadingMovements={loadingDiscountMovements}
                onSubmit={(lines) => handleCreateDiscount(row.idEmpleado, lines)}
              />
            )}
          </>
        )}
      </div>
    );
  };

  // ==========================================================================
  // RENDER PRINCIPAL
  // ==========================================================================

  const collapseLabel = (
    <span className={genStyles.collapseLabel}>
      {selectedPayroll
        ? `Detalle de la planilla: ${selectedPayroll.nombrePlanilla?.trim() || `#${selectedPayroll.id}`}`
        : 'Cargar Planilla Regular'}
    </span>
  );

  return (
    <div className={genStyles.payrollPageWrap}>

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className={genStyles.payrollPageHeader}>
        <h1 className={genStyles.payrollPageTitle}>Cargar Planilla Regular</h1>
        <p className={genStyles.payrollPageSubtitle}>
          Configure filtros, seleccione una planilla Regular y cargue la tabla de revisión de empleados y acciones.
        </p>
      </div>

      {/* ── Tarjeta de filtros y selección ─────────────────────────────────── */}
      <Card className={`${styles.mainCard} ${genStyles.pageCard}`}>
        <div className={styles.mainCardBody}>
          <Collapse
            activeKey={contentExpanded ? ['content'] : []}
            onChange={(keys) => setContentExpanded((Array.isArray(keys) ? keys : [keys]).includes('content'))}
            className={genStyles.collapsePanel}
            items={[
              {
                key: 'content',
                label: collapseLabel,
                children: (
                  <div className={genStyles.panelContent}>

                    {/* Filtros */}
                    <div className={genStyles.sectionLabel}>Filtros</div>
                    <div className={genStyles.statsRow}>

                      <div className={genStyles.statCard}>
                        <div className={genStyles.statLabel}>Empresa</div>
                        <Select
                          className={genStyles.statSelect}
                          value={selectedCompanyId}
                          onChange={(v) => { setSelectedCompanyId(parseCompanyId(v)); resetPayrollSelection(); }}
                          placeholder="Seleccione"
                          options={companies.map((c) => ({ value: Number(c.id), label: c.nombre }))}
                        />
                      </div>

                      <div className={genStyles.statCard}>
                        <div className={genStyles.statLabel}>Moneda</div>
                        <Select
                          className={genStyles.statSelect}
                          value={selectedCurrency}
                          onChange={(v) => { setSelectedCurrency(v); resetPayrollSelection(); }}
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
                          onChange={(v) => { setSelectedPayPeriodId(v as PayPeriodFilter); resetPayrollSelection(); }}
                          options={[
                            { value: 'ALL', label: 'Todos' },
                            ...payPeriods.map((p) => ({ value: Number(p.id), label: p.nombre })),
                          ]}
                        />
                      </div>

                      <div className={`${genStyles.statCard} ${genStyles.statCardAction}`}>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={() => { bustApiCache('/payroll'); void loadPayrolls(); }}
                          className={genStyles.refreshBtn}
                        >
                          Refrescar
                        </Button>
                      </div>
                    </div>

                    {/* Selector de planilla */}
                    <div className={genStyles.sectionBlock}>
                      <div className={genStyles.sectionLabel}>Planillas Regulares por Empresa y Moneda</div>
                      <div className={genStyles.contentCard}>
                        <Select
                          showSearch
                          optionFilterProp="label"
                          className={styles.filterInput}
                          style={{ width: '100%' }}
                          loading={loadingPayrolls}
                          value={selectedPayrollId}
                          onChange={(v) => { setSelectedPayrollId(Number(v)); setSelectedPayrollDetail(null); resetPreview(); }}
                          placeholder="Seleccione planilla"
                          options={payrollSelectOptions}
                          notFoundContent="No hay planillas regulares en estado Abierta o En Proceso."
                        />
                        <p className={genStyles.selectHint}>
                          Tipo mostrado: Regular. Estados mostrados: Abierta y En Proceso.
                        </p>
                      </div>
                    </div>

                    {/* Detalle de la planilla seleccionada */}
                    <div className={genStyles.sectionBlock}>
                      <div className={genStyles.sectionLabel}>Detalle de la planilla</div>
                      {selectedPayroll ? (
                        <div className={genStyles.contentCard}>
                          <div className={genStyles.detailHeader}>
                            <span className={genStyles.detailTitle}>
                              {selectedPayroll.nombrePlanilla?.trim() || `Planilla #${selectedPayroll.id}`}
                            </span>
                            <Tag color={PAYROLL_STATE_COLOR[selectedPayroll.estado]} bordered className={genStyles.stateTag}>
                              {PAYROLL_STATE_LABEL[selectedPayroll.estado]}
                            </Tag>
                          </div>
                          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" className={genStyles.descriptions}>
                            <Descriptions.Item label="Empresa">{selectedCompanyName}</Descriptions.Item>
                            <Descriptions.Item label="Tipo de periodo">
                              {payPeriodNameById.get(Number(selectedPayroll.idPeriodoPago)) ?? '--'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Moneda">{formatPrimitive(selectedPayroll.moneda)}</Descriptions.Item>
                            <Descriptions.Item label="Inicio periodo">{formatDate(selectedPayroll.fechaInicioPeriodo)}</Descriptions.Item>
                            <Descriptions.Item label="Fin periodo">{formatDate(selectedPayroll.fechaFinPeriodo)}</Descriptions.Item>
                            <Descriptions.Item label="Fecha corte">{formatDate(selectedPayroll.fechaCorte)}</Descriptions.Item>
                            <Descriptions.Item label="Inicio pago">{formatDate(selectedPayroll.fechaInicioPago)}</Descriptions.Item>
                            <Descriptions.Item label="Fin pago">{formatDate(selectedPayroll.fechaFinPago)}</Descriptions.Item>
                            <Descriptions.Item label="Pago programado">{formatDate(selectedPayroll.fechaPagoProgramada)}</Descriptions.Item>
                            <Descriptions.Item label="Tipo planilla">{formatPrimitive(selectedPayroll.tipoPlanilla)}</Descriptions.Item>
                            <Descriptions.Item label="Estado">
                              {PAYROLL_STATE_LABEL[selectedPayroll.estado] ?? `Estado ${selectedPayroll.estado}`}
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

          {/* Botón de carga – centrado y con card propia, similar a GenerarPlanillas_lista */}
          {selectedPayroll && (
            <div className={genStyles.sectionBlock} style={{ marginTop: 16 }}>
              <div className={genStyles.loadPayrollCard}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <Button
                    type="primary"
                    className={genStyles.primaryBtn}
                    onClick={() => void handleLoadPayroll()}
                    loading={loadingProcess}
                    disabled={!canProcess}
                  >
                    Cargar planilla
                  </Button>
                  {!canProcess && (
                    <Text type="secondary">No tiene permiso para cargar planilla.</Text>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Tarjeta de tabla de empleados y acciones ───────────────────────── */}
      {previewTable && (
        <Card className={`${styles.mainCard} ${genStyles.pageCard}`} style={{ marginTop: 16 }}>
          <div className={styles.mainCardBody}>
            <div className={genStyles.sectionBlock}>
              <div className={genStyles.sectionLabel}>Tabla de empleados y acciones</div>
              <div className={`${genStyles.contentCard} ${genStyles.previewTableWrap}`}>

                {/* Buscador */}
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Buscar empleado por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={genStyles.searchInput}
                  style={{ marginBottom: 14, maxWidth: 380 }}
                />

                {/* Tabla principal de empleados */}
                <Table<PayrollPreviewEmployeeRow>
                  rowKey={(r) => r.idEmpleado}
                  dataSource={filteredPreviewRows}
                  columns={employeeColumns}
                  className={genStyles.previewTable}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                  rowSelection={{
                    selectedRowKeys: selectedPreviewRowKeys,
                    preserveSelectedRowKeys: true,
                    onSelect: (record, selected) => {
                      void updateEmployeeSelection([record.idEmpleado], selected);
                    },
                    onSelectAll: (selected, selectedRows, changeRows) => {
                      // Si hay cambios explícitos los usamos; si no, operamos sobre todas las visibles
                      const targets = changeRows.length > 0
                        ? changeRows
                        : selectedRows.length > 0
                          ? selectedRows
                          : filteredPreviewRows;
                      void updateEmployeeSelection(targets.map((r) => r.idEmpleado), selected);
                    },
                    getCheckboxProps: (record) => ({
                      disabled: Boolean(pendingSelectionByEmployee[record.idEmpleado]) || loadingProcess,
                    }),
                  }}
                  expandable={{
                    expandedRowRender: renderExpandedEmployeeRow,
                    // Permite expandir/contraer al hacer click en cualquier parte de la fila.
                    expandRowByClick: true,
                    expandedRowKeys: expandedEmployeeRowKeys,
                    onExpand: (expanded, record) => {
                      setExpandedEmployeeRowKeys(expanded ? [record.idEmpleado] : []);
                    },
                  }}
                />

                {/* Resumen de totales */}
                <div className={genStyles.summaryGrid}>

                  <div className={genStyles.summaryCard}>
                    <div className={genStyles.summaryTitle}>Información de Empleados</div>
                    <table className={genStyles.summaryTable}>
                      <thead>
                        <tr><th>Concepto</th><th>Total</th></tr>
                      </thead>
                      <tbody>
                        <tr><td>Total Empleados</td>           <td>{previewSummary.totalEmployees}</td></tr>
                        <tr><td>Incluidos en Planilla</td>     <td>{previewSummary.includedEmployees}</td></tr>
                        <tr><td>Empleados Verificados</td>     <td>{previewSummary.verifiedEmployees}</td></tr>
                        <tr><td>Pendientes de Verificar</td>   <td>{previewSummary.pendingEmployees}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div className={genStyles.summaryCard}>
                    <div className={genStyles.summaryTitle}>Totales Monetarios</div>
                    <table className={genStyles.summaryTable}>
                      <thead>
                        <tr><th>Concepto</th><th>Total</th></tr>
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
      )}

      <EmployeePayrollPreviewModal
        open={!!previewEmployee}
        onClose={() => setPreviewEmployee(null)}
        employee={previewEmployee}
        payroll={selectedPayroll}
        companyName={selectedCompanyName}
        canViewSensitive={!!canViewSensitive}
      />
    </div>
  );
}
