import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  App as AntdApp,
  Button,
  Card,
  Flex,
  Form,
  Spin,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import {
  canCreatePayrollArticle,
  canEditPayrollArticle,
  canInactivatePayrollArticle,
  canReactivatePayrollArticle,
  canViewPayrollArticleAudit,
  canViewPayrollArticles,
} from '../../../store/selectors/permissions.selectors';
import { useAppSelector } from '../../../store/hooks';
import { formatDateTime12h } from '../../../lib/formatDate';
import {
  createPayrollArticle,
  fetchPayrollArticle,
  fetchPayrollArticleAccounts,
  fetchPayrollArticleAuditTrail,
  fetchPayrollArticles,
  fetchPayrollArticleTypes,
  fetchPersonalActionTypes,
  inactivatePayrollArticle,
  reactivatePayrollArticle,
  updatePayrollArticle,
  type AccountingAccountOption,
  type PayrollArticleAuditTrailItem,
  type PayrollArticleListItem,
  type PayrollArticlePayload,
  type PayrollArticleType,
  type PersonalActionType,
} from '../../../api/payrollArticles';
import styles from '../configuration/UsersManagementPage.module.css';
import { PayrollArticleModal } from './components/PayrollArticleModal';
import { PayrollArticlesFiltersPanel } from './components/PayrollArticlesFiltersPanel';
import { PayrollArticlesTable } from './components/PayrollArticlesTable';
import { PANE_CONFIG, PAYROLL_ARTICLE_TYPE_META } from './payrollArticles.constants';
import type { PaneKey, PaneOption, PayrollArticleFormValues } from './payrollArticles.types';
import { formatAccountLabel, getPaneValue } from './payrollArticles.utils';

/**
 * @param values - Valores del formulario.
 * @returns Payload normalizado para API.
 */
function normalizePayload(values: PayrollArticleFormValues): PayrollArticlePayload {
  return {
    idEmpresa: values.idEmpresa!,
    nombre: values.nombre.trim(),
    descripcion: values.descripcion?.trim() || undefined,
    idTipoAccionPersonal: values.idTipoAccionPersonal!,
    idTipoArticuloNomina: values.idTipoArticuloNomina!,
    idCuentaGasto: values.idCuentaGasto!,
    idCuentaPasivo: values.idCuentaPasivo ?? null,
  };
}

/**
 * @param value - Identificador potencialmente mixto.
 * @returns Id numerico valido o undefined.
 */
function normalizeCompanyId(value: number | string | null | undefined): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

/**
 * @returns Vista principal de articulos de nomina.
 */
export function PayrollArticlesManagementPage() {
  const { message, modal } = AntdApp.useApp();
  const [form] = Form.useForm<PayrollArticleFormValues>();

  const canView = useAppSelector(canViewPayrollArticles);
  const canCreate = useAppSelector(canCreatePayrollArticle);
  const canEdit = useAppSelector(canEditPayrollArticle);
  const canInactivate = useAppSelector(canInactivatePayrollArticle);
  const canReactivate = useAppSelector(canReactivatePayrollArticle);
  const canViewAudit = useAppSelector(canViewPayrollArticleAudit);
  const activeCompany = useAppSelector((s) => s.activeCompany.company);
  const companies = useAppSelector((s) => s.auth.companies);
  const activeCompanyIds = useMemo(() => new Set(companies.map((c) => c.id)), [companies]);
  const defaultCompanyId = normalizeCompanyId(activeCompany?.id) ?? companies[0]?.id;

  const [rows, setRows] = useState<PayrollArticleListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>(
    defaultCompanyId ? [defaultCompanyId] : [],
  );
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<PayrollArticleListItem | null>(null);
  const editingId = editing?.id ?? null;
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('principal');
  const [auditTrail, setAuditTrail] = useState<PayrollArticleAuditTrailItem[]>([]);
  const [loadingAuditTrail, setLoadingAuditTrail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [paneSearch, setPaneSearch] = useState<Record<PaneKey, string>>({
    empresa: '',
    nombre: '',
    tipoArticulo: '',
    tipoAccion: '',
    cuentaPrincipal: '',
    cuentaPasivo: '',
    estado: '',
  });
  const [paneSelections, setPaneSelections] = useState<Record<PaneKey, string[]>>({
    empresa: [],
    nombre: [],
    tipoArticulo: [],
    tipoAccion: [],
    cuentaPrincipal: [],
    cuentaPasivo: [],
    estado: [],
  });
  const [paneOpen, setPaneOpen] = useState<Record<PaneKey, boolean>>({
    empresa: false,
    nombre: false,
    tipoArticulo: false,
    tipoAccion: false,
    cuentaPrincipal: false,
    cuentaPasivo: false,
    estado: false,
  });

  const [articleTypes, setArticleTypes] = useState<PayrollArticleType[]>([]);
  const [actionTypes, setActionTypes] = useState<PersonalActionType[]>([]);
  const [formAccounts, setFormAccounts] = useState<AccountingAccountOption[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [loadingFormAccounts, setLoadingFormAccounts] = useState(false);
  const [resolvedCompanyId, setResolvedCompanyId] = useState<number | undefined>(defaultCompanyId);
  const [resolvedTipoArticuloId, setResolvedTipoArticuloId] = useState<number | undefined>(undefined);
  const [companyAccountMap, setCompanyAccountMap] = useState<Record<number, AccountingAccountOption[]>>({});

  const activeArticleTypeIds = useMemo(
    () => new Set(articleTypes.filter((t) => t.esInactivo === 0).map((t) => t.id)),
    [articleTypes],
  );
  const activeActionTypeIds = useMemo(
    () => new Set(actionTypes.filter((t) => t.estado === 1).map((t) => t.id)),
    [actionTypes],
  );
  const activeArticleTypes = useMemo(
    () => articleTypes.filter((t) => t.esInactivo === 0),
    [articleTypes],
  );
  const activeActionTypes = useMemo(
    () => actionTypes.filter((t) => t.estado === 1),
    [actionTypes],
  );

  const tipoArticuloMap = useMemo(() => new Map(articleTypes.map((t) => [t.id, t.nombre])), [articleTypes]);
  const tipoAccionMap = useMemo(() => new Map(actionTypes.map((t) => [t.id, t.nombre])), [actionTypes]);

  const accountLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    Object.values(companyAccountMap).forEach((accounts) => {
      accounts.forEach((account) => {
        if (!map.has(account.id)) {
          map.set(account.id, formatAccountLabel(account));
        }
      });
    });
    formAccounts.forEach((account) => {
      if (!map.has(account.id)) {
        map.set(account.id, formatAccountLabel(account));
      }
    });
    return map;
  }, [companyAccountMap, formAccounts]);

  const activeFormAccounts = useMemo(
    () => formAccounts.filter((account) => account.esInactivo === 0),
    [formAccounts],
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
      const data = await fetchPayrollArticles(targetCompanyIds[0], showInactive, targetCompanyIds);
      setRows(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar articulos de nomina');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [defaultCompanyId, message, selectedCompanyIds, showInactive]);

  const loadCatalogs = useCallback(async () => {
    setLoadingCatalogs(true);
    try {
      const [types, actions] = await Promise.all([
        fetchPayrollArticleTypes(),
        fetchPersonalActionTypes(),
      ]);
      setArticleTypes(types);
      setActionTypes(actions);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar catalogos de nomina');
      setArticleTypes([]);
      setActionTypes([]);
    } finally {
      setLoadingCatalogs(false);
    }
  }, [message]);

  const loadAccountsForCompanies = useCallback(async (companyIds: number[]) => {
    if (companyIds.length === 0) {
      setCompanyAccountMap({});
      return;
    }
    try {
      const results = await Promise.all(
        companyIds.map(async (companyId) => ({
          companyId,
          accounts: await fetchPayrollArticleAccounts(companyId, [], true),
        })),
      );
      const nextMap: Record<number, AccountingAccountOption[]> = {};
      results.forEach((result) => {
        nextMap[result.companyId] = result.accounts;
      });
      setCompanyAccountMap(nextMap);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar cuentas contables');
      setCompanyAccountMap({});
    }
  }, [message]);

  const loadFormAccounts = useCallback(async (companyId?: number, tipoId?: number, includeInactive?: boolean) => {
    // Regla de negocio: no cargar cuentas hasta tener Empresa + Tipo Articulo.
    if (!companyId || !tipoId) {
      setFormAccounts([]);
      return;
    }
    const idsReferencia = PAYROLL_ARTICLE_TYPE_META[tipoId]?.idsReferencia ?? [];
    setLoadingFormAccounts(true);
    try {
      const accounts = await fetchPayrollArticleAccounts(companyId, idsReferencia, includeInactive ?? false);
      setFormAccounts(accounts);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar cuentas contables');
      setFormAccounts([]);
    } finally {
      setLoadingFormAccounts(false);
    }
  }, [message]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    if (!defaultCompanyId) return;
    setSelectedCompanyIds((current) => (current.length > 0 ? current : [defaultCompanyId]));
  }, [defaultCompanyId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows, selectedCompanyIds, showInactive]);

  useEffect(() => {
    void loadAccountsForCompanies(selectedCompanyIds);
  }, [loadAccountsForCompanies, selectedCompanyIds]);

  useEffect(() => {
    void loadFormAccounts(resolvedCompanyId, resolvedTipoArticuloId, !!editing);
  }, [loadFormAccounts, resolvedCompanyId, resolvedTipoArticuloId, editing]);

  const matchesGlobalSearch = useCallback((row: PayrollArticleListItem) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      (row.nombre ?? '').toLowerCase().includes(term)
      || (companies.find((c) => c.id === row.idEmpresa)?.nombre ?? '').toLowerCase().includes(term)
      || (tipoArticuloMap.get(row.idTipoArticuloNomina) ?? '').toLowerCase().includes(term)
      || (tipoAccionMap.get(row.idTipoAccionPersonal) ?? '').toLowerCase().includes(term)
      || (accountLabelMap.get(row.idCuentaGasto) ?? '').toLowerCase().includes(term)
      || (row.idCuentaPasivo ? (accountLabelMap.get(row.idCuentaPasivo) ?? '').toLowerCase().includes(term) : false)
    );
  }, [search, companies, tipoArticuloMap, tipoAccionMap, accountLabelMap]);

  const dataFilteredByPaneSelections = useCallback((excludePane?: PaneKey) => {
    return rows.filter((row) => {
      if (!matchesGlobalSearch(row)) return false;
      for (const pane of PANE_CONFIG) {
        if (pane.key === excludePane) continue;
        const selected = paneSelections[pane.key];
        if (selected.length === 0) continue;
        const value = getPaneValue(row, pane.key, companies, tipoArticuloMap, tipoAccionMap, accountLabelMap);
        if (!selected.includes(value)) return false;
      }
      return true;
    });
  }, [companies, matchesGlobalSearch, paneSelections, rows, tipoArticuloMap, tipoAccionMap, accountLabelMap]);

  const paneOptions = useMemo(() => {
    const result: Record<PaneKey, PaneOption[]> = {
      empresa: [],
      nombre: [],
      tipoArticulo: [],
      tipoAccion: [],
      cuentaPrincipal: [],
      cuentaPasivo: [],
      estado: [],
    };

    for (const pane of PANE_CONFIG) {
      const filteredData = dataFilteredByPaneSelections(pane.key);
      const counter = new Map<string, number>();
      for (const row of filteredData) {
        const value = getPaneValue(row, pane.key, companies, tipoArticuloMap, tipoAccionMap, accountLabelMap).trim();
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
  }, [companies, dataFilteredByPaneSelections, paneSearch, tipoArticuloMap, tipoAccionMap, accountLabelMap]);

  const filteredRows = useMemo(() => dataFilteredByPaneSelections(), [dataFilteredByPaneSelections]);

  const clearAllFilters = () => {
    setSearch('');
    setPaneSearch({
      empresa: '',
      nombre: '',
      tipoArticulo: '',
      tipoAccion: '',
      cuentaPrincipal: '',
      cuentaPasivo: '',
      estado: '',
    });
    setPaneSelections({
      empresa: [],
      nombre: [],
      tipoArticulo: [],
      tipoAccion: [],
      cuentaPrincipal: [],
      cuentaPasivo: [],
      estado: [],
    });
    setPaneOpen({
      empresa: false,
      nombre: false,
      tipoArticulo: false,
      tipoAccion: false,
      cuentaPrincipal: false,
      cuentaPasivo: false,
      estado: false,
    });
    setSelectedCompanyIds(defaultCompanyId ? [defaultCompanyId] : []);
  };

  const clearPaneSelection = (key: PaneKey) => {
    setPaneSelections((prev) => ({ ...prev, [key]: [] }));
    setPaneSearch((prev) => ({ ...prev, [key]: '' }));
  };

  const openAllPanes = () => {
    setPaneOpen({
      empresa: true,
      nombre: true,
      tipoArticulo: true,
      tipoAccion: true,
      cuentaPrincipal: true,
      cuentaPasivo: true,
      estado: true,
    });
  };

  const collapseAllPanes = () => {
    setPaneOpen({
      empresa: false,
      nombre: false,
      tipoArticulo: false,
      tipoAccion: false,
      cuentaPrincipal: false,
      cuentaPasivo: false,
      estado: false,
    });
  };

  const openCreateModal = () => {
    setEditing(null);
    setActiveTab('principal');
    setLoadingDetail(false);
    form.resetFields();
    if (defaultCompanyId) {
      form.setFieldsValue({ idEmpresa: defaultCompanyId });
      setResolvedCompanyId(defaultCompanyId);
    }
    setResolvedTipoArticuloId(undefined);
    setOpenModal(true);
  };

  const applyArticleToForm = useCallback((row: PayrollArticleListItem) => {
    form.setFieldsValue({
      idEmpresa: row.idEmpresa,
      nombre: row.nombre ?? '',
      descripcion: row.descripcion ?? '',
      idTipoAccionPersonal: row.idTipoAccionPersonal,
      idTipoArticuloNomina: row.idTipoArticuloNomina,
      idCuentaGasto: row.idCuentaGasto,
      idCuentaPasivo: row.idCuentaPasivo ?? null,
      idEmpresaCambio: undefined,
      idTipoAccionPersonalCambio: undefined,
      idTipoArticuloNominaCambio: undefined,
      idCuentaGastoCambio: undefined,
      idCuentaPasivoCambio: undefined,
    });
    setResolvedCompanyId(row.idEmpresa);
    setResolvedTipoArticuloId(row.idTipoArticuloNomina);
  }, [form]);

  const openEditModal = (row: PayrollArticleListItem) => {
    if (!canEdit) return;
    setEditing(row);
    setActiveTab('principal');
    setLoadingDetail(true);
    form.resetFields();
    setOpenModal(true);
    void loadArticleDetail(row.id);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    setAuditTrail([]);
    setLoadingDetail(false);
    form.resetFields();
  };

  const loadArticleDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchPayrollArticle(id);
      setEditing(detail);
      applyArticleToForm(detail);
    } catch {
      // Keep current form values if detail fetch fails
    } finally {
      setLoadingDetail(false);
    }
  }, [applyArticleToForm]);

  const loadPayrollAuditTrail = useCallback(async (id: number) => {
    if (!canViewAudit) {
      setAuditTrail([]);
      setLoadingAuditTrail(false);
      return;
    }
    setLoadingAuditTrail(true);
    try {
      const rowsAudit = await fetchPayrollArticleAuditTrail(id, 200);
      setAuditTrail(rowsAudit ?? []);
    } catch (error) {
      setAuditTrail([]);
      message.error(error instanceof Error ? error.message : 'Error al cargar bitacora');
    } finally {
      setLoadingAuditTrail(false);
    }
  }, [canViewAudit, message]);

  useEffect(() => {
    if (!openModal || !editingId) return;
    if (activeTab !== 'bitacora') return;
    if (!canViewAudit) return;
    void loadPayrollAuditTrail(editingId);
  }, [openModal, editingId, activeTab, canViewAudit, loadPayrollAuditTrail]);

  const onFormValuesChange = (changed: Partial<PayrollArticleFormValues>) => {
    const nextEmpresa = changed.idEmpresaCambio ?? changed.idEmpresa ?? form.getFieldValue('idEmpresaCambio') ?? form.getFieldValue('idEmpresa');
    if (nextEmpresa !== undefined) {
      setResolvedCompanyId(nextEmpresa);
    }

    const nextTipo = changed.idTipoArticuloNominaCambio ?? changed.idTipoArticuloNomina
      ?? form.getFieldValue('idTipoArticuloNominaCambio')
      ?? form.getFieldValue('idTipoArticuloNomina');
    if (nextTipo !== undefined) {
      setResolvedTipoArticuloId(nextTipo);
      const meta = PAYROLL_ARTICLE_TYPE_META[nextTipo];
      if (!meta?.allowsPasivo) {
        form.setFieldsValue({ idCuentaPasivo: undefined, idCuentaPasivoCambio: undefined });
      }
    }

    if ('idEmpresa' in changed || 'idEmpresaCambio' in changed || 'idTipoArticuloNomina' in changed || 'idTipoArticuloNominaCambio' in changed) {
      form.setFieldsValue({ idCuentaGasto: undefined, idCuentaGastoCambio: undefined, idCuentaPasivo: undefined, idCuentaPasivoCambio: undefined });
    }
  };

  const submitArticle = async () => {
    try {
      if (!editing && !canCreate) {
        message.error('No tiene permiso para crear articulos de nomina.');
        return;
      }
      if (editing && !canEdit) {
        message.error('No tiene permiso para editar articulos de nomina.');
        return;
      }

      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: editing ? 'Confirmar edicion de articulo de nomina' : 'Confirmar creacion de articulo de nomina',
          content: editing ? 'Se guardaran los cambios.' : 'Se creara el nuevo articulo de nomina.',
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

      const values = await form.validateFields();
      const resolvedEmpresa = values.idEmpresaCambio ?? values.idEmpresa ?? defaultCompanyId;
      const resolvedTipoArticulo = values.idTipoArticuloNominaCambio ?? values.idTipoArticuloNomina;
      const resolvedTipoAccion = values.idTipoAccionPersonalCambio ?? values.idTipoAccionPersonal;
      const resolvedCuentaGasto = values.idCuentaGastoCambio ?? values.idCuentaGasto;
      const resolvedCuentaPasivo = values.idCuentaPasivoCambio ?? values.idCuentaPasivo;
      const meta = resolvedTipoArticulo ? PAYROLL_ARTICLE_TYPE_META[resolvedTipoArticulo] : undefined;
      const allowsPasivo = meta?.allowsPasivo ?? false;

      if (!resolvedEmpresa) {
        message.error('Debe seleccionar una empresa activa para gestionar articulos de nomina.');
        return;
      }
      if (!resolvedTipoArticulo) {
        message.error('Debe seleccionar el tipo de articulo de nomina.');
        return;
      }
      if (!resolvedTipoAccion) {
        message.error('Debe seleccionar el tipo de accion personal.');
        return;
      }
      if (!resolvedCuentaGasto) {
        message.error(`Debe seleccionar ${meta?.primaryLabel ?? 'la cuenta principal'}.`);
        return;
      }
      if (!resolvedEmpresa || !resolvedTipoArticulo) {
        message.error('Debe seleccionar Empresa y Tipo Articulo para habilitar cuentas contables.');
        return;
      }

      const isPrimaryAccountValidForSelection = formAccounts.some((account) => account.id === resolvedCuentaGasto);
      if (!isPrimaryAccountValidForSelection) {
        message.error('La cuenta principal no pertenece a la empresa y tipo de articulo seleccionados.');
        return;
      }
      if (allowsPasivo && resolvedCuentaPasivo) {
        const isPasivoAccountValidForSelection = formAccounts.some((account) => account.id === resolvedCuentaPasivo);
        if (!isPasivoAccountValidForSelection) {
          message.error('La cuenta pasivo no pertenece a la empresa y tipo de articulo seleccionados.');
          return;
        }
      }

      const payload = normalizePayload({
        ...values,
        idEmpresa: resolvedEmpresa,
        idTipoArticuloNomina: resolvedTipoArticulo,
        idTipoAccionPersonal: resolvedTipoAccion,
        idCuentaGasto: resolvedCuentaGasto,
        idCuentaPasivo: allowsPasivo ? (resolvedCuentaPasivo ?? null) : null,
      });

      setSaving(true);
      if (editing) {
        const updatePayload: Partial<PayrollArticlePayload> = { ...payload };
        if (resolvedEmpresa && resolvedEmpresa !== editing.idEmpresa) {
          updatePayload.idEmpresa = resolvedEmpresa;
        }
        if (resolvedTipoArticulo && resolvedTipoArticulo !== editing.idTipoArticuloNomina) {
          updatePayload.idTipoArticuloNomina = resolvedTipoArticulo;
        }
        if (resolvedTipoAccion && resolvedTipoAccion !== editing.idTipoAccionPersonal) {
          updatePayload.idTipoAccionPersonal = resolvedTipoAccion;
        }
        if (resolvedCuentaGasto && resolvedCuentaGasto !== editing.idCuentaGasto) {
          updatePayload.idCuentaGasto = resolvedCuentaGasto;
        }
        if (allowsPasivo) {
          updatePayload.idCuentaPasivo = resolvedCuentaPasivo ?? null;
        } else {
          updatePayload.idCuentaPasivo = null;
        }
        await updatePayrollArticle(editing.id, updatePayload);
        message.success('Articulo de nomina actualizado correctamente');
      } else {
        await createPayrollArticle({ ...payload, idEmpresa: resolvedEmpresa });
        message.success('Articulo de nomina creado correctamente');
        setSelectedCompanyIds([resolvedEmpresa]);
      }

      closeModal();
      setLoading(true);
      await loadRows([resolvedEmpresa]);
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  const handleInactivate = async (row: PayrollArticleListItem) => {
    if (!canInactivate) {
      message.error('No tiene permiso para inactivar articulos de nomina.');
      return;
    }
    await inactivatePayrollArticle(row.id);
    message.success(`Articulo ${row.nombre} inactivado`);
    await loadRows();
  };

  const handleReactivate = async (row: PayrollArticleListItem) => {
    if (!canReactivate) {
      message.error('No tiene permiso para reactivar articulos de nomina.');
      return;
    }
    await reactivatePayrollArticle(row.id);
    message.success(`Articulo ${row.nombre} reactivado`);
    await loadRows();
  };

  const columns: ColumnsType<PayrollArticleListItem> = [
    {
      title: 'Empresa',
      dataIndex: 'idEmpresa',
      key: 'empresa',
      width: 220,
      render: (value: number) => {
        const company = companies.find((c) => c.id === value);
        return company?.nombre ?? `Empresa #${value}`;
      },
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (_, row) => (
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TagsOutlined />
          {row.nombre}
        </span>
      ),
    },
    {
      title: 'Tipo Articulo',
      dataIndex: 'idTipoArticuloNomina',
      key: 'idTipoArticuloNomina',
      width: 200,
      render: (value: number) => tipoArticuloMap.get(value) ?? `Tipo #${value}`,
    },
    {
      title: 'Tipo Accion',
      dataIndex: 'idTipoAccionPersonal',
      key: 'idTipoAccionPersonal',
      width: 200,
      render: (value: number) => tipoAccionMap.get(value) ?? `Accion #${value}`,
    },
    {
      title: 'Cuenta Principal',
      dataIndex: 'idCuentaGasto',
      key: 'idCuentaGasto',
      width: 240,
      render: (value: number) => accountLabelMap.get(value) ?? `Cuenta #${value}`,
    },
    {
      title: 'Cuenta Pasivo',
      dataIndex: 'idCuentaPasivo',
      key: 'idCuentaPasivo',
      width: 240,
      render: (value: number | null) => value ? (accountLabelMap.get(value) ?? `Cuenta #${value}`) : '-',
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 120,
      render: (_, row) => (
        <Tag className={row.esInactivo === 1 ? styles.tagInactivo : styles.tagActivo}>
          {row.esInactivo === 1 ? 'Inactivo' : 'Activo'}
        </Tag>
      ),
    },
    {
      title: 'Ultima Modificacion',
      dataIndex: 'fechaModificacion',
      key: 'fechaModificacion',
      width: 220,
      render: (value) => formatDateTime12h(value),
    },
  ];

  const auditColumns: ColumnsType<PayrollArticleAuditTrailItem> = [
    {
      title: 'Fecha y hora',
      dataIndex: 'fechaCreacion',
      key: 'fechaCreacion',
      width: 160,
      render: (value: string | null) => formatDateTime12h(value),
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
  ];

  if (!canView) {
    return (
      <div className={styles.pageWrapper}>
        <Spin />
      </div>
    );
  }

  const resolvedMeta = resolvedTipoArticuloId ? PAYROLL_ARTICLE_TYPE_META[resolvedTipoArticuloId] : undefined;
  const canLoadAccountOptions = Boolean(resolvedCompanyId && resolvedTipoArticuloId);
  const primaryLabel = resolvedMeta?.primaryLabel ?? 'Cuenta Principal';
  const secondaryLabel = resolvedMeta?.secondaryLabel ?? 'Cuenta Pasivo';
  const allowsPasivo = resolvedMeta?.allowsPasivo ?? false;

  const selectedPrimaryAccountId = openModal ? form.getFieldValue('idCuentaGasto') : undefined;
  const selectedPasivoAccountId = openModal ? form.getFieldValue('idCuentaPasivo') : undefined;
  const currentPrimaryAccount = formAccounts.find((account) => account.id === selectedPrimaryAccountId)
    ?? formAccounts.find((account) => account.id === editing?.idCuentaGasto);
  const currentPasivoAccount = formAccounts.find((account) => account.id === selectedPasivoAccountId)
    ?? formAccounts.find((account) => account.id === editing?.idCuentaPasivo);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link className={styles.pageBackLink} to="/payroll-params">
            <ArrowLeftOutlined />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Articulos de Nomina</h1>
            <p className={styles.pageSubtitle}>
              Visualice y gestione los articulos de nomina configurados por empresa
            </p>
          </div>
        </div>
      </div>

      <Card className={styles.mainCard} style={{ marginBottom: 20 }}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={16}>
            <Flex align="center" gap={16}>
              <div className={styles.gestionIconWrap}>
                <TagsOutlined className={styles.gestionIcon} />
              </div>
              <div>
                <h2 className={styles.gestionTitle}>Gestion de Articulos de Nomina</h2>
                <p className={styles.gestionDesc}>
                  Administre y consulte todos los articulos de nomina configurados para las empresas
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
                Nuevo Articulo
              </Button>
            ) : null}
          </Flex>
        </div>
      </Card>

      <Card className={styles.mainCard}>
        <PayrollArticlesTable
          rows={filteredRows}
          columns={columns}
          loading={loading}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          showInactive={showInactive}
          onShowInactiveChange={setShowInactive}
          selectedCompanyIds={selectedCompanyIds}
          onCompanyIdsChange={setSelectedCompanyIds}
          companies={companies}
          canEdit={canEdit}
          onRowClick={openEditModal}
          totalLabel={(total, range) => `Mostrando ${range[0]} a ${range[1]} de ${total} registros`}
          filters={(
            <PayrollArticlesFiltersPanel
              filtersExpanded={filtersExpanded}
              onToggleFilters={setFiltersExpanded}
              search={search}
              onSearchChange={setSearch}
              paneConfig={PANE_CONFIG}
              paneSearch={paneSearch}
              onPaneSearchChange={(key, value) => setPaneSearch((prev) => ({ ...prev, [key]: value }))}
              paneOptions={paneOptions}
              paneSelections={paneSelections}
              onPaneSelectionsChange={(key, selections) => setPaneSelections((prev) => ({ ...prev, [key]: selections }))}
              paneOpen={paneOpen}
              onPaneToggle={(key, open) => setPaneOpen((prev) => ({ ...prev, [key]: open }))}
              onClearPane={clearPaneSelection}
              onOpenAll={openAllPanes}
              onCollapseAll={collapseAllPanes}
              onClearAll={clearAllFilters}
            />
          )}
        />
      </Card>

      <PayrollArticleModal
        open={openModal}
        editing={editing}
        canInactivate={canInactivate}
        canReactivate={canReactivate}
        canCreate={canCreate}
        canEdit={canEdit}
        canViewAudit={canViewAudit}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        loadingDetail={loadingDetail}
        loadingCatalogs={loadingCatalogs}
        loadingFormAccounts={loadingFormAccounts}
        form={form}
        onSubmit={submitArticle}
        onValuesChange={onFormValuesChange}
        auditTrail={auditTrail}
        loadingAuditTrail={loadingAuditTrail}
        auditColumns={auditColumns}
        onClose={closeModal}
        onInactivate={handleInactivate}
        onReactivate={handleReactivate}
        companies={companies}
        activeCompanyIds={activeCompanyIds}
        activeArticleTypes={activeArticleTypes}
        activeActionTypes={activeActionTypes}
        activeArticleTypeIds={activeArticleTypeIds}
        activeActionTypeIds={activeActionTypeIds}
        tipoArticuloMap={tipoArticuloMap}
        tipoAccionMap={tipoAccionMap}
        activeFormAccounts={activeFormAccounts}
        currentPrimaryAccount={currentPrimaryAccount}
        currentPasivoAccount={currentPasivoAccount}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
        allowsPasivo={allowsPasivo}
        canLoadAccountOptions={canLoadAccountOptions}
        saving={saving}
      />
    </div>
  );
}
