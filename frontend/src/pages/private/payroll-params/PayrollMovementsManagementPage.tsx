import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Form,
  Input,
  Modal,
  Row,
  Select,
  Spin,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CloseOutlined,
  DownOutlined,
  EditOutlined,
  FilterOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  HistoryOutlined,
  DollarOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {
  canCreatePayrollMovement,
  canEditPayrollMovement,
  canInactivatePayrollMovement,
  canReactivatePayrollMovement,
  canViewPayrollMovementAudit,
  canViewPayrollMovements,
} from '../../../store/selectors/permissions.selectors';
import { useAppSelector } from '../../../store/hooks';
import { formatDateTime12h } from '../../../lib/formatDate';
import { noSqlInjection, textRules } from '../../../lib/formValidation';
import {
  createPayrollMovement,
  fetchPayrollMovement,
  fetchPayrollMovementArticles,
  fetchPayrollMovementAuditTrail,
  fetchPayrollMovementClasses,
  fetchPayrollMovementPersonalActionTypes,
  fetchPayrollMovementProjects,
  fetchPayrollMovements,
  inactivatePayrollMovement,
  reactivatePayrollMovement,
  updatePayrollMovement,
  type PayrollMovementActionTypeOption,
  type PayrollMovementArticleOption,
  type PayrollMovementAuditTrailItem,
  type PayrollMovementClassOption,
  type PayrollMovementListItem,
  type PayrollMovementPayload,
  type PayrollMovementProjectOption,
} from '../../../api/payrollMovements';
import styles from '../configuration/UsersManagementPage.module.css';

interface PayrollMovementFormValues {
  idEmpresa?: number;
  nombre: string;
  idArticuloNomina?: number;
  idTipoAccionPersonal?: number;
  idClase?: number | null;
  idProyecto?: number | null;
  descripcion?: string;
  esMontoFijo: number;
  montoFijo: string;
  porcentaje: string;
  formulaAyuda?: string;
}

type PaneKey = 'empresa' | 'nombre' | 'articulo' | 'tipoAccion' | 'tipoCalculo' | 'estado';

interface PaneConfig {
  key: PaneKey;
  title: string;
}

interface PaneOption {
  value: string;
  count: number;
}

function selectFilterByLabel(input: string, option?: { label?: string | number | null }) {
  return String(option?.label ?? '').toLowerCase().includes(input.toLowerCase());
}

const paneConfig: PaneConfig[] = [
  { key: 'empresa', title: 'Empresa' },
  { key: 'nombre', title: 'Nombre Movimiento' },
  { key: 'articulo', title: 'Articulo Nomina' },
  { key: 'tipoAccion', title: 'Tipo Accion' },
  { key: 'tipoCalculo', title: 'Tipo Calculo' },
  { key: 'estado', title: 'Estado' },
];

function isNonNegativeNumeric(raw: string): boolean {
  return /^\d+(\.\d+)?$/.test(raw.trim());
}

function normalizePayload(values: PayrollMovementFormValues): PayrollMovementPayload {
  const esMontoFijo = Number(values.esMontoFijo) === 1 ? 1 : 0;
  return {
    idEmpresa: values.idEmpresa!,
    nombre: values.nombre.trim(),
    idArticuloNomina: values.idArticuloNomina!,
    idTipoAccionPersonal: values.idTipoAccionPersonal!,
    idClase: values.idClase ?? null,
    idProyecto: values.idProyecto ?? null,
    descripcion: values.descripcion?.trim() || '--',
    esMontoFijo,
    montoFijo: esMontoFijo === 1 ? values.montoFijo.trim() : '0',
    porcentaje: esMontoFijo === 1 ? '0' : values.porcentaje.trim(),
    formulaAyuda: values.formulaAyuda?.trim() || '--',
  };
}

function parseCompanyId(value: number | string | null | undefined): number | undefined {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) return undefined;
  return id;
}

function optionalNoSqlAllowDashDash(_: unknown, value: unknown) {
  if (value == null) return Promise.resolve();
  const s = String(value).trim();
  if (!s || s === '--') return Promise.resolve();
  return noSqlInjection(_, value);
}

function getPaneValue(
  row: PayrollMovementListItem,
  key: PaneKey,
  companies: Array<{ id: number; nombre: string }>,
  articleMap: Map<number, PayrollMovementArticleOption>,
  actionTypeMap: Map<number, PayrollMovementActionTypeOption>,
): string {
  if (key === 'empresa') {
    return companies.find((company) => company.id === row.idEmpresa)?.nombre ?? `Empresa #${row.idEmpresa}`;
  }
  if (key === 'nombre') return row.nombre ?? '';
  if (key === 'articulo') return articleMap.get(row.idArticuloNomina)?.nombre ?? `Articulo #${row.idArticuloNomina}`;
  if (key === 'tipoAccion') return actionTypeMap.get(row.idTipoAccionPersonal)?.nombre ?? `Accion #${row.idTipoAccionPersonal}`;
  if (key === 'tipoCalculo') return row.esMontoFijo === 1 ? 'Monto fijo' : 'Porcentaje';
  return row.esInactivo === 1 ? 'Inactivo' : 'Activo';
}

export function PayrollMovementsManagementPage() {
  const { message, modal } = AntdApp.useApp();
  const [form] = Form.useForm<PayrollMovementFormValues>();
  const esMontoFijo = Form.useWatch('esMontoFijo', form) ?? 1;
  const selectedEmpresa = Form.useWatch('idEmpresa', form);
  const selectedArticulo = Form.useWatch('idArticuloNomina', form);

  const canView = useAppSelector(canViewPayrollMovements);
  const canCreate = useAppSelector(canCreatePayrollMovement);
  const canEdit = useAppSelector(canEditPayrollMovement);
  const canInactivate = useAppSelector(canInactivatePayrollMovement);
  const canReactivate = useAppSelector(canReactivatePayrollMovement);
  const canViewAudit = useAppSelector(canViewPayrollMovementAudit);
  const activeCompany = useAppSelector((s) => s.activeCompany.company);
  const companies = useAppSelector((s) => s.auth.companies);
  const defaultCompanyId = parseCompanyId(activeCompany?.id) ?? companies[0]?.id;

  const [rows, setRows] = useState<PayrollMovementListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>(defaultCompanyId ? [defaultCompanyId] : []);
  const [search, setSearch] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [paneSearch, setPaneSearch] = useState<Record<PaneKey, string>>({
    empresa: '',
    nombre: '',
    articulo: '',
    tipoAccion: '',
    tipoCalculo: '',
    estado: '',
  });
  const [paneSelections, setPaneSelections] = useState<Record<PaneKey, string[]>>({
    empresa: [],
    nombre: [],
    articulo: [],
    tipoAccion: [],
    tipoCalculo: [],
    estado: [],
  });
  const [paneOpen, setPaneOpen] = useState<Record<PaneKey, boolean>>({
    empresa: false,
    nombre: false,
    articulo: false,
    tipoAccion: false,
    tipoCalculo: false,
    estado: false,
  });
  const [pageSize, setPageSize] = useState(10);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<PayrollMovementListItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('principal');
  const [auditTrail, setAuditTrail] = useState<PayrollMovementAuditTrailItem[]>([]);
  const [loadingAuditTrail, setLoadingAuditTrail] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingCompanyCatalogs, setLoadingCompanyCatalogs] = useState(false);

  const [articleOptions, setArticleOptions] = useState<PayrollMovementArticleOption[]>([]);
  const [actionTypeOptions, setActionTypeOptions] = useState<PayrollMovementActionTypeOption[]>([]);
  const [classOptions, setClassOptions] = useState<PayrollMovementClassOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<PayrollMovementProjectOption[]>([]);

  const articleMap = useMemo(
    () => new Map(articleOptions.map((option) => [option.id, option])),
    [articleOptions],
  );
  const actionTypeMap = useMemo(
    () => new Map(actionTypeOptions.map((option) => [option.id, option])),
    [actionTypeOptions],
  );
  const loadRows = useCallback(async (companyIds?: number[]) => {
    setLoading(true);
    try {
      const targetCompanyIds = companyIds && companyIds.length > 0
        ? companyIds
        : selectedCompanyIds.length > 0
          ? selectedCompanyIds
          : defaultCompanyId
            ? [defaultCompanyId]
            : [];
      if (targetCompanyIds.length === 0) {
        setRows([]);
        return;
      }
      const data = await fetchPayrollMovements(targetCompanyIds[0], showInactive, targetCompanyIds);
      setRows(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar movimientos de nomina');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [defaultCompanyId, message, selectedCompanyIds, showInactive]);

  const loadBaseCatalogs = useCallback(async () => {
    setLoadingCatalogs(true);
    try {
      const [actions, classes] = await Promise.all([
        fetchPayrollMovementPersonalActionTypes(true),
        fetchPayrollMovementClasses(true),
      ]);
      setActionTypeOptions(actions);
      setClassOptions(classes);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar catalogos de movimientos');
      setActionTypeOptions([]);
      setClassOptions([]);
    } finally {
      setLoadingCatalogs(false);
    }
  }, [message]);

  const loadCompanyCatalogs = useCallback(async (idEmpresa?: number) => {
    if (!idEmpresa) {
      setArticleOptions([]);
      setProjectOptions([]);
      return;
    }
    setLoadingCompanyCatalogs(true);
    try {
      const [articles, projects] = await Promise.all([
        fetchPayrollMovementArticles(idEmpresa, true),
        fetchPayrollMovementProjects(idEmpresa, true),
      ]);
      setArticleOptions(articles);
      setProjectOptions(projects);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar articulos/proyectos');
      setArticleOptions([]);
      setProjectOptions([]);
    } finally {
      setLoadingCompanyCatalogs(false);
    }
  }, [message]);

  useEffect(() => {
    void loadRows();
  }, [loadRows, showInactive, selectedCompanyIds]);

  const openCreateModal = () => {
    setEditing(null);
    setActiveTab('principal');
    setAuditTrail([]);
    form.resetFields();
    form.setFieldsValue({
      idEmpresa: defaultCompanyId,
      esMontoFijo: 1,
      montoFijo: '0',
      porcentaje: '0',
      formulaAyuda: '--',
      descripcion: '--',
    });
    setOpenModal(true);
    void loadBaseCatalogs();
    if (defaultCompanyId) {
      void loadCompanyCatalogs(defaultCompanyId);
    }
  };

  const applyMovementToForm = useCallback((row: PayrollMovementListItem) => {
    form.setFieldsValue({
      idEmpresa: row.idEmpresa,
      nombre: row.nombre,
      idArticuloNomina: row.idArticuloNomina,
      idTipoAccionPersonal: row.idTipoAccionPersonal,
      idClase: row.idClase,
      idProyecto: row.idProyecto,
      descripcion: row.descripcion ?? '--',
      esMontoFijo: row.esMontoFijo === 1 ? 1 : 0,
      montoFijo: row.montoFijo ?? '0',
      porcentaje: row.porcentaje ?? '0',
      formulaAyuda: row.formulaAyuda ?? '--',
    });
  }, [form]);

  const openEditModal = (row: PayrollMovementListItem) => {
    if (!canEdit) return;
    setEditing(row);
    setActiveTab('principal');
    setAuditTrail([]);
    setOpenModal(true);
    applyMovementToForm(row);
    void loadBaseCatalogs();
    void loadCompanyCatalogs(row.idEmpresa);
    void (async () => {
      setLoadingDetail(true);
      try {
        const detail = await fetchPayrollMovement(row.id);
        setEditing(detail);
        applyMovementToForm(detail);
      } finally {
        setLoadingDetail(false);
      }
    })();
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    setAuditTrail([]);
    form.resetFields();
  };

  useEffect(() => {
    if (!openModal) return;
    const idEmpresa = parseCompanyId(selectedEmpresa);
    void loadCompanyCatalogs(idEmpresa);
  }, [loadCompanyCatalogs, openModal, selectedEmpresa]);

  useEffect(() => {
    if (!selectedArticulo) return;
    const article = articleMap.get(selectedArticulo);
    if (!article) return;
    form.setFieldValue('idTipoAccionPersonal', article.idTipoAccionPersonal);
  }, [articleMap, form, selectedArticulo]);

  useEffect(() => {
    if (!openModal || activeTab !== 'bitacora' || !editing?.id || !canViewAudit) return;
    setLoadingAuditTrail(true);
    void fetchPayrollMovementAuditTrail(editing.id)
      .then((items) => setAuditTrail(items))
      .catch((error) => {
        message.error(error instanceof Error ? error.message : 'Error al cargar bitacora');
        setAuditTrail([]);
      })
      .finally(() => setLoadingAuditTrail(false));
  }, [activeTab, canViewAudit, editing?.id, message, openModal]);

  const onFormValuesChange = (changed: Partial<PayrollMovementFormValues>) => {
    if (changed.esMontoFijo !== undefined) {
      if (Number(changed.esMontoFijo) === 1) {
        form.setFieldsValue({ porcentaje: '0' });
      } else {
        form.setFieldsValue({ montoFijo: '0' });
      }
    }
    if (changed.idEmpresa !== undefined) {
      form.setFieldsValue({
        idArticuloNomina: undefined,
        idTipoAccionPersonal: undefined,
        idProyecto: undefined,
      });
    }
    if (changed.idArticuloNomina !== undefined && !changed.idArticuloNomina) {
      form.setFieldValue('idTipoAccionPersonal', undefined);
    }
  };

  const submitMovement = async () => {
    try {
      const values = await form.validateFields();
      const payload = normalizePayload(values);
      setSaving(true);
      if (editing) {
        await updatePayrollMovement(editing.id, payload);
        message.success('Movimiento actualizado correctamente');
      } else {
        await createPayrollMovement(payload);
        message.success('Movimiento creado correctamente');
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

  const handleSubmit = async () => {
    if (!editing && !canCreate) {
      message.error('No tiene permiso para crear movimientos de nomina.');
      return;
    }
    if (editing && !canEdit) {
      message.error('No tiene permiso para editar movimientos de nomina.');
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      modal.confirm({
        title: editing ? 'Confirmar edicion de movimiento de nomina' : 'Confirmar creacion de movimiento de nomina',
        content: editing ? 'Se guardaran los cambios.' : 'Se creara el nuevo movimiento de nomina.',
        icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
        okText: editing ? 'Guardar cambios' : 'Crear',
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

    await submitMovement();
  };

  const onInactivate = async (row: PayrollMovementListItem) => {
    await inactivatePayrollMovement(row.id);
    message.success('Movimiento inactivado correctamente');
    if (editing?.id === row.id) {
      setEditing((current) => (current ? { ...current, esInactivo: 1 } : current));
    }
    await loadRows();
  };

  const onReactivate = async (row: PayrollMovementListItem) => {
    await reactivatePayrollMovement(row.id);
    message.success('Movimiento reactivado correctamente');
    if (editing?.id === row.id) {
      setEditing((current) => (current ? { ...current, esInactivo: 0 } : current));
    }
    await loadRows();
  };

  const matchesGlobalSearch = useCallback((row: PayrollMovementListItem) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const companyName = companies.find((company) => company.id === row.idEmpresa)?.nombre ?? '';
    const articleName = articleMap.get(row.idArticuloNomina)?.nombre ?? '';
    const actionName = actionTypeMap.get(row.idTipoAccionPersonal)?.nombre ?? '';
    return (
      row.nombre.toLowerCase().includes(term)
      || companyName.toLowerCase().includes(term)
      || articleName.toLowerCase().includes(term)
      || actionName.toLowerCase().includes(term)
    );
  }, [actionTypeMap, articleMap, companies, rows, search]);

  const dataFilteredByPaneSelections = useCallback((excludePane?: PaneKey) => {
    return rows.filter((row) => {
      if (!matchesGlobalSearch(row)) return false;
      for (const pane of paneConfig) {
        if (pane.key === excludePane) continue;
        const selected = paneSelections[pane.key];
        if (selected.length === 0) continue;
        const value = getPaneValue(row, pane.key, companies, articleMap, actionTypeMap);
        if (!selected.includes(value)) return false;
      }
      return true;
    });
  }, [actionTypeMap, articleMap, companies, matchesGlobalSearch, paneSelections, rows]);

  const paneOptions = useMemo(() => {
    const result: Record<PaneKey, PaneOption[]> = {
      empresa: [],
      nombre: [],
      articulo: [],
      tipoAccion: [],
      tipoCalculo: [],
      estado: [],
    };

    for (const pane of paneConfig) {
      const filteredData = dataFilteredByPaneSelections(pane.key);
      const counter = new Map<string, number>();
      for (const row of filteredData) {
        const value = getPaneValue(row, pane.key, companies, articleMap, actionTypeMap).trim();
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
  }, [actionTypeMap, articleMap, companies, dataFilteredByPaneSelections, paneSearch]);

  const rowsFiltered = useMemo(() => dataFilteredByPaneSelections(), [dataFilteredByPaneSelections]);

  const clearPaneSelection = (key: PaneKey) => {
    setPaneSelections((prev) => ({ ...prev, [key]: [] }));
    setPaneSearch((prev) => ({ ...prev, [key]: '' }));
  };

  const clearAllFilters = () => {
    setSearch('');
    setPaneSearch({ empresa: '', nombre: '', articulo: '', tipoAccion: '', tipoCalculo: '', estado: '' });
    setPaneSelections({ empresa: [], nombre: [], articulo: [], tipoAccion: [], tipoCalculo: [], estado: [] });
    setPaneOpen({ empresa: false, nombre: false, articulo: false, tipoAccion: false, tipoCalculo: false, estado: false });
  };

  const openAllPanes = () => {
    setPaneOpen({ empresa: true, nombre: true, articulo: true, tipoAccion: true, tipoCalculo: true, estado: true });
  };

  const collapseAllPanes = () => {
    setPaneOpen({ empresa: false, nombre: false, articulo: false, tipoAccion: false, tipoCalculo: false, estado: false });
  };

  const columns = useMemo<ColumnsType<PayrollMovementListItem>>(() => [
    {
      title: 'EMPRESA',
      dataIndex: 'idEmpresa',
      width: 180,
      render: (idEmpresa: number) => companies.find((company) => company.id === idEmpresa)?.nombre ?? `Empresa #${idEmpresa}`,
    },
    {
      title: 'NOMBRE',
      dataIndex: 'nombre',
      width: 220,
    },
    {
      title: 'ARTICULO',
      dataIndex: 'idArticuloNomina',
      width: 220,
      render: (idArticuloNomina: number) => articleMap.get(idArticuloNomina)?.nombre ?? `Articulo #${idArticuloNomina}`,
    },
    {
      title: 'TIPO ACCION',
      dataIndex: 'idTipoAccionPersonal',
      width: 180,
      render: (idTipoAccionPersonal: number) => actionTypeMap.get(idTipoAccionPersonal)?.nombre ?? `Accion #${idTipoAccionPersonal}`,
    },
    {
      title: 'TIPO CALCULO',
      dataIndex: 'esMontoFijo',
      width: 140,
      render: (esMontoFijo: number) => esMontoFijo === 1 ? 'Monto fijo' : 'Porcentaje',
    },
    {
      title: 'MONTO FIJO',
      dataIndex: 'montoFijo',
      width: 140,
    },
    {
      title: 'PORCENTAJE',
      dataIndex: 'porcentaje',
      width: 140,
    },
    {
      title: 'ESTADO',
      dataIndex: 'esInactivo',
      width: 110,
      render: (esInactivo: number) => (
        <Tag className={esInactivo === 1 ? styles.tagInactivo : styles.tagActivo}>
          {esInactivo === 1 ? 'Inactivo' : 'Activo'}
        </Tag>
      ),
    },
    {
      title: 'ULTIMA MODIFICACION',
      dataIndex: 'fechaModificacion',
      width: 210,
      render: (value?: string) => formatDateTime12h(value),
    },
  ], [actionTypeMap, articleMap, companies]);

  const auditColumns = useMemo<ColumnsType<PayrollMovementAuditTrailItem>>(
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
        render: (_, row) => {
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
        render: (_, row) => (
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Tag className={styles.tagInactivo}>{row.modulo}</Tag>
            <Tag className={styles.tagActivo}>{row.accion}</Tag>
          </span>
        ),
      },
      {
        title: 'Detalle',
        dataIndex: 'descripcion',
        key: 'descripcion',
        render: (value: string, row) => {
          const changes = row.cambios ?? [];
          const tooltipContent = (
            <div style={{ maxWidth: 520 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{value}</div>
              {changes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
              <div className={styles.auditDetailCell}>{value}</div>
            </Tooltip>
          );
        },
      },
    ],
    [],
  );

  const singleCompany = companies.length === 1 ? companies[0] : null;
  const selectedArticleObj = selectedArticulo ? articleMap.get(selectedArticulo) : null;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link className={styles.pageBackLink} to="/payroll-params">
            <ArrowLeftOutlined style={{ fontSize: 18 }} />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Movimientos de Nomina</h1>
            <p className={styles.pageSubtitle}>
              Visualice y gestione los movimientos de nomina configurados por empresa
            </p>
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
                <h2 className={styles.gestionTitle}>Gestion de Movimientos de Nomina</h2>
                <p className={styles.gestionDesc}>
                  Administre y consulte todos los movimientos de nomina configurados para las empresas
                </p>
              </div>
            </Flex>
            {canCreate ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className={`${styles.actionButton} ${styles.btnPrimary}`}
                onClick={openCreateModal}
              >
                Nuevo Movimiento
              </Button>
            ) : null}
          </Flex>
        </div>
      </Card>

      <Card className={styles.mainCard} styles={{ body: { padding: 0 } }}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={12} className={styles.registrosHeader}>
            <Flex align="center" gap={12} wrap="wrap">
              <Flex align="center" gap={8}>
                <FilterOutlined className={styles.registrosFilterIcon} />
                <h3 className={styles.registrosTitle}>Registros de Movimientos de Nomina</h3>
              </Flex>
              <Flex align="center" gap={6}>
                <Select
                  value={pageSize}
                  onChange={setPageSize}
                  options={[10, 20, 50, 100].map((n) => ({ label: String(n), value: n }))}
                  style={{ width: 70 }}
                />
                <span style={{ color: '#6b7a85', fontSize: 14 }}>entries per page</span>
              </Flex>
            </Flex>
            <Flex align="center" gap={8} wrap="wrap">
              <span style={{ color: '#6b7a85', fontSize: 14 }}>Mostrar inactivas</span>
              <Switch checked={showInactive} onChange={setShowInactive} size="small" />
              <Select
                mode="multiple"
                allowClear
                placeholder="Filtrar por empresa(s)"
                value={selectedCompanyIds}
                onChange={(values) => setSelectedCompanyIds(values as number[])}
                options={companies.map((company) => ({ value: company.id, label: company.nombre }))}
                style={{ minWidth: 220 }}
              />
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
                {paneConfig.map((pane) => (
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
        width={860}
        destroyOnHidden
        styles={{
          header: { marginBottom: 0, padding: 0 },
          body: { padding: 24, maxHeight: '70vh', overflowY: 'auto' },
        }}
        title={(
          <Flex justify="space-between" align="center" wrap="nowrap" style={{ width: '100%', gap: 16 }}>
            <div className={styles.companyModalHeader}>
              <div className={styles.companyModalHeaderIcon}>
                <AppstoreOutlined />
              </div>
              <span>{editing ? 'Editar Movimiento de Nomina' : 'Crear Movimiento de Nomina'}</span>
            </div>
            <Flex align="center" gap={12} className={styles.companyModalHeaderRight}>
              {editing ? (
                <div className={styles.companyModalEstadoPaper}>
                  <span
                    style={{
                      fontWeight: 500,
                      fontSize: 14,
                      color: editing.esInactivo === 1 ? '#64748b' : '#20638d',
                    }}
                  >
                    {editing.esInactivo === 1 ? 'Inactivo' : 'Activo'}
                  </span>
                  <Switch
                    checked={editing.esInactivo === 0}
                    disabled={editing.esInactivo === 0 ? !canInactivate : !canReactivate}
                    onChange={(checked) => {
                      if (!editing) return;
                      modal.confirm({
                        title: checked ? 'Reactivar movimiento' : 'Inactivar movimiento',
                        content: checked
                          ? 'El movimiento volvera a estar disponible.'
                          : 'El movimiento quedara inactivo.',
                        okText: checked ? 'Reactivar' : 'Inactivar',
                        cancelText: 'Cancelar',
                        centered: true,
                        width: 420,
                        rootClassName: styles.companyConfirmModal,
                        okButtonProps: { className: styles.companyConfirmOk },
                        cancelButtonProps: { className: styles.companyConfirmCancel },
                        icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
                        onOk: async () => {
                          if (checked) {
                            await onReactivate(editing);
                          } else {
                            await onInactivate(editing);
                          }
                          closeModal();
                        },
                      });
                    }}
                  />
                </div>
              ) : null}
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={closeModal}
                aria-label="Cerrar"
                className={styles.companyModalCloseBtn}
              />
            </Flex>
          </Flex>
        )}
      >
        <Spin spinning={loadingDetail || loadingCatalogs || loadingCompanyCatalogs}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            onFinishFailed={(info) => {
              const firstField = info.errorFields?.[0]?.name?.[0];
              if (firstField && ['esMontoFijo', 'montoFijo', 'porcentaje', 'formulaAyuda'].includes(String(firstField))) {
                setActiveTab('calculo');
              } else {
                setActiveTab('principal');
              }
              message.error('Complete los campos requeridos para continuar.');
            }}
            onValuesChange={onFormValuesChange}
            className={styles.companyFormContent}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              className={`${styles.tabsWrapper} ${styles.companyModalTabs} ${styles.employeeModalTabsScroll}`}
              items={[
                {
                  key: 'principal',
                  label: (
                    <span>
                      <AppstoreOutlined style={{ marginRight: 8, fontSize: 16 }} />
                      Informacion Principal
                    </span>
                  ),
                  children: (
                    <Row gutter={[12, 12]} className={styles.companyFormGrid}>
                      {singleCompany ? (
                        <Col span={12}>
                          <Form.Item name="idEmpresa" hidden>
                            <Input />
                          </Form.Item>
                          <Form.Item label="Empresa *">
                            <Input value={singleCompany.nombre} disabled />
                          </Form.Item>
                        </Col>
                      ) : (
                        <Col span={12}>
                          <Form.Item name="idEmpresa" label="Empresa *" rules={[{ required: true }]}>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              filterOption={selectFilterByLabel}
                              placeholder="Seleccionar"
                              options={companies.map((company) => ({
                                value: company.id,
                                label: company.nombre,
                              }))}
                            />
                          </Form.Item>
                        </Col>
                      )}
                      <Col span={12}>
                        <Form.Item name="nombre" label="Nombre Movimiento *" rules={textRules({ required: true, max: 200 })}>
                          <Input placeholder="Nombre movimiento" maxLength={200} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="idArticuloNomina" label="Articulo de Nomina *" rules={[{ required: true }]}>
                          <Select
                            showSearch
                            optionFilterProp="label"
                            filterOption={selectFilterByLabel}
                            placeholder={selectedEmpresa ? 'Seleccionar' : 'Seleccione empresa primero'}
                            disabled={!selectedEmpresa}
                            options={articleOptions.map((article) => ({
                              value: article.id,
                              label: article.esInactivo === 1 ? `${article.nombre} (Inactivo)` : article.nombre,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="idTipoAccionPersonal"
                          label="Tipo Accion Personal *"
                          rules={[{ required: true }]}
                          tooltip={{
                            title: 'Se autocompleta segun el articulo de nomina seleccionado.',
                            icon: <QuestionCircleOutlined />,
                          }}
                        >
                          <Select
                            showSearch
                            optionFilterProp="label"
                            filterOption={selectFilterByLabel}
                            placeholder="Autocompletado por articulo"
                            disabled
                            options={actionTypeOptions.map((actionType) => ({
                              value: actionType.id,
                              label: actionType.estado === 1 ? actionType.nombre : `${actionType.nombre} (Inactivo)`,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="idClase" label="Clase">
                          <Select
                            showSearch
                            optionFilterProp="label"
                            filterOption={selectFilterByLabel}
                            allowClear
                            placeholder="Seleccionar"
                            options={classOptions.map((item) => ({
                              value: item.id,
                              label: item.esInactivo === 1 ? `${item.nombre} (Inactivo)` : item.nombre,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="idProyecto" label="Proyecto">
                          <Select
                            showSearch
                            optionFilterProp="label"
                            filterOption={selectFilterByLabel}
                            allowClear
                            placeholder={selectedEmpresa ? 'Seleccionar' : 'Seleccione empresa primero'}
                            disabled={!selectedEmpresa}
                            options={projectOptions.map((item) => ({
                              value: item.id,
                              label: item.esInactivo === 1 ? `${item.nombre} (Inactivo)` : item.nombre,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item name="descripcion" label="Descripcion" rules={[{ validator: optionalNoSqlAllowDashDash }]}>
                          <Input.TextArea rows={3} placeholder="Descripcion" maxLength={2000} />
                        </Form.Item>
                      </Col>
                      {selectedArticleObj?.esInactivo === 1 && (
                        <Col span={24}>
                          <Tag className={styles.tagInactivo}>El articulo seleccionado esta inactivo.</Tag>
                        </Col>
                      )}
                    </Row>
                  ),
                },
                {
                  key: 'calculo',
                  label: (
                    <span>
                      <DollarOutlined style={{ marginRight: 8, fontSize: 16 }} />
                      Tipo de Calculo
                    </span>
                  ),
                  children: (
                    <Row gutter={[12, 12]} className={styles.companyFormGrid}>
                      <Col span={24}>
                        <div className={styles.sectionCard}>
                          <div className={styles.sectionCardBody}>
                            <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                              <div>
                                <p className={styles.sectionTitle}>Tipo de Calculo</p>
                                <p className={styles.sectionDescription}>
                                  {esMontoFijo === 1
                                    ? 'El movimiento se calculara con un monto fijo.'
                                    : 'El movimiento se calculara por porcentaje.'}
                                </p>
                              </div>
                              <Flex align="center" gap={8}>
                                <span style={{ color: '#6b7a85' }}>
                                  {esMontoFijo === 1 ? 'Monto Fijo' : 'Porcentaje'}
                                </span>
                                <Switch
                                  checked={esMontoFijo === 1}
                                  onChange={(checked) => {
                                    form.setFieldValue('esMontoFijo', checked ? 1 : 0);
                                  }}
                                />
                              </Flex>
                            </Flex>
                          </div>
                        </div>
                      </Col>
                      <Form.Item name="esMontoFijo" hidden>
                        <Input />
                      </Form.Item>
                      <Col span={12}>
                        <Form.Item
                          name="montoFijo"
                          label="Monto Fijo *"
                          rules={[
                            { required: true, message: 'Monto fijo es requerido' },
                            {
                              validator: async (_, value) => {
                                if (!value || !isNonNegativeNumeric(String(value))) {
                                  throw new Error('Monto fijo debe ser un numero no negativo');
                                }
                              },
                            },
                          ]}
                        >
                          <Input disabled={esMontoFijo !== 1} placeholder="0" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="porcentaje"
                          label="Porcentaje *"
                          rules={[
                            { required: true, message: 'Porcentaje es requerido' },
                            {
                              validator: async (_, value) => {
                                if (!value || !isNonNegativeNumeric(String(value))) {
                                  throw new Error('Porcentaje debe ser un numero no negativo');
                                }
                              },
                            },
                          ]}
                        >
                          <Input disabled={esMontoFijo === 1} placeholder="0" suffix="%" />
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item
                          name="formulaAyuda"
                          label="Formula de Ayuda"
                          rules={[{ max: 2000, message: 'Maximo 2000 caracteres' }]}
                        >
                          <Input placeholder="Formula de ayuda" maxLength={2000} />
                        </Form.Item>
                      </Col>
                    </Row>
                  ),
                },
                ...(canViewAudit && editing
                  ? [
                    {
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
                            <p className={styles.sectionTitle}>Historial de cambios del movimiento de nomina</p>
                            <p className={styles.sectionDescription}>
                              Muestra quien hizo el cambio, cuando lo hizo y el detalle registrado en bitacora.
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
                              locale={{ emptyText: 'No hay registros de bitacora para este movimiento de nomina.' }}
                            />
                          </div>
                        </Spin>
                      ),
                    },
                  ]
                  : []),
              ]}
            />
          </Form>
        </Spin>

        <div className={styles.companyModalFooter}>
          <Button onClick={closeModal} className={styles.companyModalBtnCancel}>
            Cancelar
          </Button>
          <Button
            type="primary"
            className={styles.companyModalBtnSubmit}
            loading={saving}
            icon={editing ? <EditOutlined /> : <PlusOutlined />}
            disabled={!(editing ? canEdit : canCreate)}
            onClick={() => {
              void form.submit();
            }}
          >
            {editing ? 'Guardar cambios' : 'Crear Movimiento'}
          </Button>
        </div>
      </Modal>

      {!canView && (
        <Card className={styles.mainCard}>
          <p>No tiene permisos para visualizar movimientos de nomina.</p>
        </Card>
      )}
    </div>
  );
}
