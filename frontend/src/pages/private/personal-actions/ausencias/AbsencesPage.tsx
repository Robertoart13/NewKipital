import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  App as AntdApp,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Flex,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  DownOutlined,
  EditOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UpOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppSelector } from '../../../../store/hooks';
import { hasPermission } from '../../../../store/selectors/permissions.selectors';
import {
  fetchAbsenceAuditTrail,
  advanceAbsenceState,
  createAbsence,
  fetchAbsenceDetail,
  fetchAbsenceEmployeesCatalog,
  fetchAbsenceMovementsCatalog,
  fetchPersonalActions,
  invalidateAbsence,
  updateAbsence,
  type AbsenceDetailItem,
  type PersonalActionAuditTrailItem,
  type PersonalActionListItem,
} from '../../../../api/personalActions';
import { fetchPayPeriods, type CatalogPayPeriod } from '../../../../api/catalogs';
import {
  type PayrollMovementListItem,
} from '../../../../api/payrollMovements';
import styles from '../../configuration/UsersManagementPage.module.css';
import {
  AbsenceTransactionModal,
  type AbsenceFormDraft,
  type AbsenceTransactionLine,
} from './AbsenceTransactionModal';

const ESTADO_LABEL: Record<number, { text: string; tagClass: string }> = {
  1: { text: 'Borrador', tagClass: styles.tagEstadoDefault },
  2: { text: 'Pendiente Supervisor', tagClass: styles.tagEstadoWarning },
  3: { text: 'Pendiente RRHH', tagClass: styles.tagEstadoWarning },
  4: { text: 'Aprobada', tagClass: styles.tagEstadoSuccess },
  5: { text: 'Consumida', tagClass: styles.tagEstadoInfo },
  6: { text: 'Cancelada', tagClass: styles.tagEstadoError },
  7: { text: 'Invalidada', tagClass: styles.tagEstadoError },
  8: { text: 'Expirada', tagClass: styles.tagEstadoError },
  9: { text: 'Rechazada', tagClass: styles.tagEstadoError },
};

const ESTADO_HELP: Record<number, string> = {
  1: 'Borrador: accion en captura interna, aun no enviada al flujo de aprobacion.',
  2: 'Pendiente Supervisor: requiere revision/aprobacion del supervisor.',
  3: 'Pendiente RRHH: aprobada por supervisor, pendiente validacion final RRHH.',
  4: 'Aprobada: lista para consumo operativo en planilla segun reglas.',
  5: 'Consumida: ya fue aplicada/consumida por proceso de planilla.',
  6: 'Cancelada: se detuvo la accion por decision operativa.',
  7: 'Invalidada: accion anulada por inconsistencia o cambio de criterio.',
  8: 'Expirada: vencio su vigencia operativa.',
  9: 'Rechazada: no fue aprobada en flujo de validacion.',
};

const NEXT_STATE_ACTION_LABEL: Partial<Record<number, string>> = {
  1: 'Enviar a Supervisor',
  2: 'Enviar a RRHH',
  3: 'Aprobar',
};

type PaneKey = 'empresa' | 'empleado' | 'periodoPago' | 'movimiento' | 'remuneracion' | 'estado';

interface PaneConfig {
  key: PaneKey;
  title: string;
}

interface PaneOption {
  value: string;
  count: number;
}

const paneConfig: PaneConfig[] = [
  { key: 'empresa', title: 'Empresa' },
  { key: 'empleado', title: 'Empleado' },
  { key: 'periodoPago', title: 'Periodo de Pago' },
  { key: 'movimiento', title: 'Movimiento' },
  { key: 'remuneracion', title: 'Remunerada' },
  { key: 'estado', title: 'Estado' },
];

interface AbsenceUiRow extends PersonalActionListItem {
  employeeLabel?: string;
}

function isAbsenceEditableState(estado: number): boolean {
  return [1, 2, 3].includes(Number(estado));
}

function getPaneValue(
  row: AbsenceUiRow,
  key: PaneKey,
  companies: Array<{ id: number; nombre: string }>,
): string {
  if (key === 'empresa') {
    return companies.find((c) => Number(c.id) === row.idEmpresa)?.nombre ?? `Empresa #${row.idEmpresa}`;
  }
  if (key === 'empleado') return (row.employeeLabel ?? `Empleado #${row.idEmpleado}`).trim() || '--';
  if (key === 'periodoPago') return (row.periodoPagoResumen ?? '').trim() || '--';
  if (key === 'movimiento') return (row.movimientoResumen ?? '').trim() || '--';
  if (key === 'remuneracion') return row.remuneracionResumen === 'SI' ? 'Sí' : row.remuneracionResumen === 'NO' ? 'No' : row.remuneracionResumen === 'MIXTA' ? 'Mixta' : '--';
  if (key === 'estado') return ESTADO_LABEL[row.estado]?.text ?? `Estado ${row.estado}`;
  return '--';
}

function getEstadoTag(estado: number) {
  const meta = ESTADO_LABEL[estado] ?? { text: `Estado ${estado}`, tagClass: styles.tagEstadoDefault };
  const help = ESTADO_HELP[estado] ?? 'Estado operativo de la accion.';
  return (
    <Tooltip title={help}>
      <Tag className={meta.tagClass}>{meta.text}</Tag>
    </Tooltip>
  );
}

function summarizeCell(value?: string | null) {
  const text = (value ?? '').trim();
  if (!text) return '--';
  const short = text.length > 70 ? `${text.slice(0, 70)}...` : text;
  return (
    <Tooltip title={text} mouseEnterDelay={0.35}>
      <span>{short}</span>
    </Tooltip>
  );
}

function createDraftFromAbsenceDetail(detail: AbsenceDetailItem): AbsenceFormDraft {
  const lines: AbsenceTransactionLine[] =
    detail.lines?.length > 0
      ? detail.lines.map((line) => ({
        key: `${line.idLinea}-${line.orden}`,
        payrollId: line.payrollId,
        fechaEfecto: line.fechaEfecto ? dayjs(line.fechaEfecto) : undefined,
        movimientoId: line.movimientoId,
        tipoAusencia: line.tipoAusencia,
        cantidad: line.cantidad,
        monto: line.monto,
        remuneracion: line.remuneracion,
        formula: line.formula ?? '',
        payrollLabel: line.payrollLabel ?? undefined,
        payrollEstado: line.payrollEstado ?? undefined,
        movimientoLabel: line.movimientoLabel ?? undefined,
        movimientoInactivo: line.movimientoInactivo === true,
      }))
      : [{
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tipoAusencia: 'JUSTIFICADA',
        remuneracion: true,
        formula: detail.descripcion ?? '',
        monto: detail.monto ?? undefined,
        fechaEfecto: detail.fechaEfecto ? dayjs(detail.fechaEfecto) : undefined,
      }];

  return {
    idEmpresa: detail.idEmpresa,
    idEmpleado: detail.idEmpleado,
    observacion: detail.descripcion ?? '',
    lines,
  };
}

export function AbsencesPage() {
  const { message, modal } = AntdApp.useApp();
  const companies = useAppSelector((state) => state.auth.companies);
  const activeCompany = useAppSelector((state) => state.activeCompany.company);
  const canCreate = useAppSelector((state) => hasPermission(state, 'hr-action-ausencias:create'));
  const canEdit = useAppSelector((state) => hasPermission(state, 'hr-action-ausencias:edit'));
  const canView = useAppSelector((state) =>
    hasPermission(state, 'hr-action-ausencias:view') ||
    hasPermission(state, 'hr_action:view'),
  );
  const canApprove = useAppSelector((state) => hasPermission(state, 'hr_action:approve'));
  const canViewEmployeeSensitive = useAppSelector((state) => hasPermission(state, 'employee:view-sensitive'));

  const defaultCompanyId = useMemo(() => {
    const active = Number(activeCompany?.id);
    if (Number.isFinite(active) && active > 0) return active;
    const first = Number(companies[0]?.id);
    return Number.isFinite(first) && first > 0 ? first : undefined;
  }, [activeCompany?.id, companies]);

  const [rows, setRows] = useState<AbsenceUiRow[]>([]);
  const [employees, setEmployees] = useState<
    Array<{
      id: number;
      idEmpresa: number;
      codigo: string;
      nombre: string;
      apellido1: string;
      apellido2?: string | null;
      cedula?: string | null;
      email?: string | null;
      jornada?: string | null;
      idPeriodoPago?: number | null;
      salarioBase?: number | null;
      monedaSalario?: string | null;
    }>
  >([]);
  const [payPeriods, setPayPeriods] = useState<CatalogPayPeriod[]>([]);
  const [movements, setMovements] = useState<PayrollMovementListItem[]>([]);
  const [absenceActionTypeId, setAbsenceActionTypeId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [companyId, setCompanyId] = useState<number | undefined>(defaultCompanyId);
  const [selectedEstados, setSelectedEstados] = useState<number[]>([1, 2, 3]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [paneSearch, setPaneSearch] = useState<Record<PaneKey, string>>({
    empresa: '',
    empleado: '',
    periodoPago: '',
    movimiento: '',
    remuneracion: '',
    estado: '',
  });
  const [paneSelections, setPaneSelections] = useState<Record<PaneKey, string[]>>({
    empresa: [],
    empleado: [],
    periodoPago: [],
    movimiento: [],
    remuneracion: [],
    estado: [],
  });
  const [paneOpen, setPaneOpen] = useState<Record<PaneKey, boolean>>({
    empresa: false,
    empleado: false,
    periodoPago: false,
    movimiento: false,
    remuneracion: false,
    estado: false,
  });

  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingRow, setEditingRow] = useState<AbsenceUiRow | null>(null);
  const [editingDraft, setEditingDraft] = useState<AbsenceFormDraft | undefined>(undefined);
  const [loadingEditDetail, setLoadingEditDetail] = useState(false);
  const [auditTrail, setAuditTrail] = useState<PersonalActionAuditTrailItem[]>([]);
  const [loadingAuditTrail, setLoadingAuditTrail] = useState(false);

  const clearPaneSelection = (key: PaneKey) => {
    setPaneSelections((prev) => ({ ...prev, [key]: [] }));
    setPaneSearch((prev) => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setSearch('');
    setSelectedEstados([1, 2, 3]);
    setCompanyId(defaultCompanyId);
    setPaneSearch({ empresa: '', empleado: '', periodoPago: '', movimiento: '', remuneracion: '', estado: '' });
    setPaneSelections({ empresa: [], empleado: [], periodoPago: [], movimiento: [], remuneracion: [], estado: [] });
    setPaneOpen({ empresa: false, empleado: false, periodoPago: false, movimiento: false, remuneracion: false, estado: false });
  };

  const openAllPanes = () => {
    setPaneOpen({ empresa: true, empleado: true, periodoPago: true, movimiento: true, remuneracion: true, estado: true });
  };

  const collapseAllPanes = () => {
    setPaneOpen({ empresa: false, empleado: false, periodoPago: false, movimiento: false, remuneracion: false, estado: false });
  };

  const loadRows = useCallback(async () => {
    if (!companyId) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchPersonalActions(String(companyId));
      const filtered = data.filter((item) => item.tipoAccion.trim().toLowerCase() === 'ausencia');
      setRows(filtered);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'No se pudieron cargar las ausencias.');
    } finally {
      setLoading(false);
    }
  }, [companyId, message]);

  const openEditModal = useCallback(async (row: AbsenceUiRow) => {
    const key = `absence-edit-load-${row.id}`;
    setEditingRow(row);
    setEditingDraft({
      idEmpresa: row.idEmpresa,
      idEmpleado: row.idEmpleado,
      observacion: row.descripcion ?? '',
      lines: [],
    });
    setMode('edit');
    setLoadingEditDetail(true);
    setAuditTrail([]);
    setOpenModal(true);
    message.loading({ content: 'Cargando detalle de ausencia...', key, duration: 0 });
    try {
      const detail = await fetchAbsenceDetail(row.id);
      setEditingDraft(createDraftFromAbsenceDetail(detail));
      message.destroy(key);
    } catch (error) {
      message.error({
        content: error instanceof Error ? error.message : 'No se pudo cargar el detalle de ausencia.',
        key,
      });
      setOpenModal(false);
      setEditingDraft(undefined);
      setEditingRow(null);
    } finally {
      setLoadingEditDetail(false);
    }
  }, [message]);

  const loadAbsenceAuditTrail = useCallback(async (id: number) => {
    setLoadingAuditTrail(true);
    try {
      const rowsAudit = await fetchAbsenceAuditTrail(id, 200);
      setAuditTrail(rowsAudit ?? []);
    } catch (error) {
      setAuditTrail([]);
      message.error(error instanceof Error ? error.message : 'Error al cargar bitacora de ausencia');
    } finally {
      setLoadingAuditTrail(false);
    }
  }, [message]);

  const loadEditingAbsenceAuditTrail = useCallback(async () => {
    if (!editingRow?.id) return;
    await loadAbsenceAuditTrail(editingRow.id);
  }, [editingRow?.id, loadAbsenceAuditTrail]);

  const loadCatalogs = useCallback(async () => {
    if (!companyId) {
      setEmployees([]);
      setMovements([]);
      setPayPeriods([]);
      setAbsenceActionTypeId(undefined);
      setLoadingEmployees(false);
      setLoadingMovements(false);
      return;
    }

    setLoadingEmployees(true);
    setLoadingMovements(true);
    try {
      const [employeesResp, movementsResp, payPeriodsResp] = await Promise.all([
        fetchAbsenceEmployeesCatalog(companyId),
        fetchAbsenceMovementsCatalog(companyId, 20),
        fetchPayPeriods().catch(() => []),
      ]);

      setEmployees(employeesResp);
      setMovements(
        movementsResp.map((movement) => ({
          id: movement.id,
          idEmpresa: movement.idEmpresa,
          nombre: movement.nombre,
          idArticuloNomina: 0,
          idTipoAccionPersonal: movement.idTipoAccionPersonal,
          idClase: null,
          idProyecto: null,
          descripcion: movement.descripcion ?? null,
          esMontoFijo: movement.esMontoFijo,
          montoFijo: movement.montoFijo,
          porcentaje: movement.porcentaje,
          formulaAyuda: movement.formulaAyuda ?? '--',
          esInactivo: movement.esInactivo,
        })),
      );
      setPayPeriods(payPeriodsResp);
      setAbsenceActionTypeId(undefined);
    } catch {
      setEmployees([]);
      setMovements([]);
      setPayPeriods([]);
      setAbsenceActionTypeId(undefined);
    } finally {
      setLoadingEmployees(false);
      setLoadingMovements(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadRows();
    void loadCatalogs();
  }, [loadRows, loadCatalogs]);

  const rowsWithEmployee = useMemo(() => {
    const map = new Map<number, string>();
    employees.forEach((employee) => {
      map.set(
        employee.id,
        `${[employee.apellido1, employee.apellido2, employee.nombre]
          .filter((part) => typeof part === 'string' && part.trim().length > 0)
          .join(' ')}`,
      );
    });

    return rows.map((row) => ({ ...row, employeeLabel: map.get(row.idEmpleado) }));
  }, [rows, employees]);

  const matchesGlobalSearch = useCallback(
    (row: AbsenceUiRow) => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      const companyName = companies.find((c) => Number(c.id) === row.idEmpresa)?.nombre ?? '';
      const text = `${row.id} ${row.idEmpleado} ${row.employeeLabel ?? ''} ${row.descripcion ?? ''} ${companyName} ${row.periodoPagoResumen ?? ''} ${row.movimientoResumen ?? ''}`.toLowerCase();
      return text.includes(term);
    },
    [companies, search],
  );

  const dataFilteredByPaneSelections = useCallback(
    (excludePane?: PaneKey) => {
      return rowsWithEmployee.filter((row) => {
        if (!matchesGlobalSearch(row)) return false;
        for (const pane of paneConfig) {
          if (pane.key === excludePane) continue;
          const selected = paneSelections[pane.key];
          if (selected.length === 0) continue;
          const value = getPaneValue(row, pane.key, companies);
          if (!selected.includes(value)) return false;
        }
        return true;
      });
    },
    [companies, matchesGlobalSearch, paneSelections, rowsWithEmployee],
  );

  const paneOptions = useMemo(() => {
    const result: Record<PaneKey, PaneOption[]> = {
      empresa: [],
      empleado: [],
      periodoPago: [],
      movimiento: [],
      remuneracion: [],
      estado: [],
    };
    for (const pane of paneConfig) {
      const filteredData = dataFilteredByPaneSelections(pane.key);
      const counter = new Map<string, number>();
      for (const row of filteredData) {
        const value = getPaneValue(row, pane.key, companies).trim();
        if (!value) continue;
        counter.set(value, (counter.get(value) ?? 0) + 1);
      }
      const paneTerm = paneSearch[pane.key].trim().toLowerCase();
      result[pane.key] = Array.from(counter.entries())
        .map(([value, count]) => ({ value, count }))
        .filter((item) => !paneTerm || item.value.toLowerCase().includes(paneTerm))
        .sort((a, b) => a.value.localeCompare(b.value));
    }
    return result;
  }, [companies, dataFilteredByPaneSelections, paneSearch]);

  const rowsFiltered = useMemo(() => {
    const base = dataFilteredByPaneSelections();
    if (!selectedEstados.length) return base;
    const selected = new Set(selectedEstados.map((item) => Number(item)));
    return base.filter((row) => selected.has(Number(row.estado)));
  }, [dataFilteredByPaneSelections, selectedEstados]);

  const columns: ColumnsType<AbsenceUiRow> = useMemo(() => [
    {
      title: 'EMPRESA',
      key: 'empresa',
      width: 240,
      render: (_, row) => companies.find((company) => Number(company.id) === row.idEmpresa)?.nombre ?? `Empresa #${row.idEmpresa}`,
    },
    {
      title: 'EMPLEADO',
      key: 'empleado',
      width: 260,
      render: (_, row) => row.employeeLabel ?? `Empleado #${row.idEmpleado}`,
    },
    {
      title: 'PERIODO DE PAGO',
      dataIndex: 'periodoPagoResumen',
      key: 'periodoPagoResumen',
      width: 320,
      render: (value) => summarizeCell(value),
    },
    {
      title: 'MOVIMIENTO',
      dataIndex: 'movimientoResumen',
      key: 'movimientoResumen',
      width: 280,
      render: (value) => summarizeCell(value),
    },
    {
      title: 'REMUNERADA',
      dataIndex: 'remuneracionResumen',
      key: 'remuneracionResumen',
      width: 140,
      render: (value: AbsenceUiRow['remuneracionResumen']) => {
        if (value === 'SI') return <Tag color="green">Sí</Tag>;
        if (value === 'NO') return <Tag color="red">No</Tag>;
        if (value === 'MIXTA') return <Tag color="gold">Mixta</Tag>;
        return '--';
      },
    },
    {
      title: 'ESTADO',
      dataIndex: 'estado',
      key: 'estado',
      width: 180,
      render: (value) => getEstadoTag(value),
    },
    {
      title: 'ACCIONES',
      key: 'acciones',
      width: 260,
      render: (_, row) => {
        const canInvalidate = canEdit && [1, 2, 3].includes(row.estado);
        const nextActionLabel = NEXT_STATE_ACTION_LABEL[row.estado];

        const onInvalidate = (e: MouseEvent<HTMLElement>) => {
          e.stopPropagation();
          modal.confirm({
            title: 'Confirmar invalidacion',
            content: 'Esta accion se marcara como invalidada y no seguira su flujo operativo. Desea continuar?',
            okText: 'Si, invalidar',
            cancelText: 'Cancelar',
            centered: true,
            width: 420,
            rootClassName: styles.companyConfirmModal,
            okButtonProps: { className: styles.companyConfirmOk, danger: true },
            cancelButtonProps: { className: styles.companyConfirmCancel },
            onOk: async () => {
              const key = `absence-invalidate-${row.id}`;
              message.loading({ content: 'Invalidando ausencia...', key, duration: 0 });
              try {
                await invalidateAbsence(row.id);
                message.success({ content: 'Ausencia invalidada correctamente.', key });
                await loadRows();
              } catch (error) {
                message.error({
                  content: error instanceof Error ? error.message : 'No se pudo invalidar la ausencia.',
                  key,
                });
              }
            },
          });
        };

        const invalidateBtn = (
          <Button danger size="small" disabled={!canInvalidate} onClick={onInvalidate}>
            Invalidar
          </Button>
        );

        const nextBtn = nextActionLabel ? (
          <Button
            type="primary"
            size="small"
            disabled={!(canApprove || canEdit)}
            onClick={(e) => {
              e.stopPropagation();
              modal.confirm({
                title: 'Confirmar cambio de estado',
                content: `Desea ejecutar la accion "${nextActionLabel}" para mover al siguiente estado?`,
                okText: 'Si, continuar',
                cancelText: 'Cancelar',
                centered: true,
                width: 420,
                rootClassName: styles.companyConfirmModal,
                okButtonProps: { className: styles.companyConfirmOk },
                cancelButtonProps: { className: styles.companyConfirmCancel },
                onOk: async () => {
                  const key = `absence-advance-${row.id}`;
                  message.loading({ content: 'Actualizando estado...', key, duration: 0 });
                  try {
                    await advanceAbsenceState(row.id);
                    message.success({ content: 'Estado actualizado correctamente.', key });
                    await loadRows();
                  } catch (error) {
                    message.error({
                      content: error instanceof Error ? error.message : 'No se pudo actualizar el estado.',
                      key,
                    });
                  }
                },
              });
            }}
          >
            {nextActionLabel}
          </Button>
        ) : null;

        return (
          <Flex gap={8} align="center" wrap="nowrap" className={styles.actionsCell}>
            {nextBtn ? <span className={styles.actionsCellFirst}>{nextBtn}</span> : null}
            <span className={!nextBtn ? styles.actionsCellFirst : undefined}>
              <Button
                icon={<EditOutlined />}
                size="small"
                disabled={!canView}
                onClick={(e) => {
                  e.stopPropagation();
                  void openEditModal(row);
                }}
              >
                Editar
              </Button>
            </span>
            {canInvalidate ? invalidateBtn : null}
          </Flex>
        );
      },
    },
  ], [canApprove, canEdit, canView, companies, loadRows, message, modal, openEditModal]);

  const modalTitle = mode === 'create' ? 'Crear Ausencia' : 'Editar Ausencia';

  const mapDraftToPayload = (draft: AbsenceFormDraft) => ({
    idEmpresa: draft.idEmpresa,
    idEmpleado: draft.idEmpleado,
    observacion: draft.observacion,
    lines: draft.lines.map((line) => ({
      payrollId: Number(line.payrollId),
      fechaEfecto: line.fechaEfecto?.format('YYYY-MM-DD') ?? '',
      movimientoId: Number(line.movimientoId),
      tipoAusencia: line.tipoAusencia,
      cantidad: Number(line.cantidad ?? 0),
      monto: Number(line.monto ?? 0),
      remuneracion: Boolean(line.remuneracion),
      formula: line.formula?.trim() || undefined,
    })),
  });

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link className={styles.pageBackLink} to="/dashboard">
            <ArrowLeftOutlined style={{ fontSize: 18 }} />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Ausencias</h1>
            <p className={styles.pageSubtitle}>Gestione ausencias por empresa con líneas de transacción por periodo</p>
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
                <h2 className={styles.gestionTitle}>Gestión de Ausencias</h2>
                <p className={styles.gestionDesc}>Encabezado de acción + múltiples líneas por planilla</p>
              </div>
            </Flex>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className={`${styles.actionButton} ${styles.btnPrimary}`}
              disabled={!canCreate}
              onClick={() => {
                setEditingRow(null);
                setEditingDraft(undefined);
                setLoadingEditDetail(false);
                setMode('create');
                setOpenModal(true);
              }}
            >
              Crear ausencia
            </Button>
          </Flex>
        </div>
      </Card>

      <Card className={styles.mainCard} style={{ marginBottom: 0 }}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={12} className={styles.registrosHeader}>
            <Flex align="center" gap={12} wrap="wrap">
              <Flex align="center" gap={8}>
                <FilterOutlined className={styles.registrosFilterIcon} />
                <h3 className={styles.registrosTitle}>Registros de Ausencias</h3>
              </Flex>
              <Flex align="center" gap={6}>
                <Select
                  value={pageSize}
                  onChange={(v) => setPageSize(Number(v))}
                  options={[10, 20, 50, 100].map((n) => ({ label: String(n), value: n }))}
                  style={{ width: 70 }}
                />
                <span style={{ color: '#6b7a85', fontSize: 14 }}>entries per page</span>
              </Flex>
            </Flex>
            <Flex align="center" gap={8} wrap="wrap">
              <Select
                showSearch
                optionFilterProp="label"
                style={{ minWidth: 220 }}
                placeholder="Filtrar por empresa"
                value={companyId}
                options={companies.map((c) => ({ value: Number(c.id), label: c.nombre }))}
                onChange={(v) => setCompanyId(Number(v))}
              />
              <Select
                mode="multiple"
                style={{ minWidth: 200 }}
                placeholder="Estados"
                value={selectedEstados}
                options={Object.entries(ESTADO_LABEL).map(([value, meta]) => ({ value: Number(value), label: meta.text }))}
                onChange={(values) => setSelectedEstados((values ?? []).map((item) => Number(item)))}
              />
              <Button icon={<ReloadOutlined />} onClick={() => void loadRows()}>Refrescar</Button>
            </Flex>
          </Flex>

          <Collapse
            activeKey={filtersExpanded ? ['filtros'] : []}
            onChange={(keys) => setFiltersExpanded((Array.isArray(keys) ? keys : [keys]).includes('filtros'))}
            className={styles.filtersCollapse}
          >
            <Collapse.Panel header="Filtros" key="filtros">
              <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
                <Input
                  placeholder="Search"
                  prefix={<SearchOutlined />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                {paneConfig.map((pane) => (
                  <Col xs={24} md={12} xl={8} key={pane.key}>
                    <div className={styles.paneCard}>
                      <Flex gap={6} align="center" wrap="wrap">
                        <Input
                          value={paneSearch[pane.key]}
                          onChange={(e) => setPaneSearch((prev) => ({ ...prev, [pane.key]: e.target.value }))}
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
            </Collapse.Panel>
          </Collapse>

          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={rowsFiltered}
            className={`${styles.configTable} ${styles.companiesTable}`}
            pagination={{
              pageSize,
              showSizeChanger: false,
              showTotal: (total, [start, end]) => `Mostrando ${start} a ${end} de ${total} registros`,
            }}
            onRow={(record) => ({
              onClick: () => {
                if (!canView) return;
                void openEditModal(record);
              },
              style: {
                cursor: canView ? 'pointer' : 'default',
              },
            })}
          />
        </div>
      </Card>

      <AbsenceTransactionModal
        open={openModal}
        mode={mode}
        title={modalTitle}
        companies={companies}
        employees={employees}
        payPeriods={payPeriods}
        movements={movements}
        actionTypeIdForAbsence={absenceActionTypeId}
        canViewEmployeeSensitive={canViewEmployeeSensitive}
        employeesLoading={loadingEmployees}
        movementsLoading={loadingMovements}
        loading={loadingEditDetail}
        readOnly={mode === 'edit' && !!editingRow && !isAbsenceEditableState(editingRow.estado)}
        readOnlyMessage={
          mode === 'edit' && !!editingRow && !isAbsenceEditableState(editingRow.estado)
            ? `Esta ausencia esta en estado "${ESTADO_LABEL[editingRow.estado]?.text ?? editingRow.estado}" y solo se puede consultar.`
            : undefined
        }
        showAudit={mode === 'edit' && !!editingRow}
        auditTrail={auditTrail}
        loadingAuditTrail={loadingAuditTrail}
        onLoadAuditTrail={
          mode === 'edit' && editingRow ? loadEditingAbsenceAuditTrail : undefined
        }
        initialCompanyId={companyId}
        initialDraft={editingDraft}
        onCancel={() => {
          setOpenModal(false);
          setEditingDraft(undefined);
          setEditingRow(null);
          setLoadingEditDetail(false);
          setAuditTrail([]);
          setLoadingAuditTrail(false);
        }}
        onSubmit={async (draft) => {
          if (mode === 'edit' && editingRow && !isAbsenceEditableState(editingRow.estado)) {
            message.warning('Esta ausencia esta en modo solo lectura.');
            return;
          }
          const payload = mapDraftToPayload(draft);
          const loadingKey = 'absence-save';
          message.loading({ content: 'Guardando ausencia...', key: loadingKey, duration: 0 });
          try {
            if (mode === 'edit' && editingRow) {
              await updateAbsence(editingRow.id, payload);
            } else {
              await createAbsence(payload);
            }
            message.success({
              content:
                mode === 'edit'
                  ? 'Ausencia actualizada correctamente.'
                  : 'Ausencia creada correctamente.',
              key: loadingKey,
            });
            setOpenModal(false);
            setEditingDraft(undefined);
            setEditingRow(null);
            setLoadingEditDetail(false);
            await loadRows();
          } catch (error) {
            message.error({
              content:
                error instanceof Error
                  ? error.message
                  : 'No se pudo guardar la ausencia.',
              key: loadingKey,
              duration: 5,
            });
          }
        }}
      />
    </div>
  );
}
