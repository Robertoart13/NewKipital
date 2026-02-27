
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
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  CloseOutlined,
  DollarOutlined,
  DownOutlined,
  EditOutlined,
  FilterOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {
  canCreateAccountingAccount,
  canEditAccountingAccount,
  canInactivateAccountingAccount,
  canReactivateAccountingAccount,
  canViewAccountingAccountAudit,
  canViewAccountingAccounts,
} from '../../../store/selectors/permissions.selectors';
import { useAppSelector } from '../../../store/hooks';
import { formatDateTime12h } from '../../../lib/formatDate';
import { optionalNoSqlInjection, textRules } from '../../../lib/formValidation';
import {
  createAccountingAccount,
  fetchAccountingAccount,
  fetchAccountingAccountAuditTrail,
  fetchAccountingAccounts,
  fetchAccountingAccountTypes,
  fetchPersonalActionTypes,
  inactivateAccountingAccount,
  reactivateAccountingAccount,
  updateAccountingAccount,
  type AccountingAccountAuditTrailItem,
  type AccountingAccountListItem,
  type AccountingAccountPayload,
  type AccountingAccountType,
  type PersonalActionType,
} from '../../../api/accountingAccounts';
import styles from './UsersManagementPage.module.css';

interface AccountingAccountFormValues {
  idEmpresa?: number;
  nombre: string;
  descripcion?: string;
  codigo: string;
  idExternoNetsuite?: string;
  codigoExterno?: string;
  idTipoErp?: number;
  idTipoAccionPersonal?: number;
  idEmpresaCambio?: number;
  idTipoErpCambio?: number;
  idTipoAccionPersonalCambio?: number;
}

type PaneKey = 'empresa' | 'nombre' | 'codigo' | 'netsuite' | 'codigoExterno' | 'tipoCuenta' | 'tipoAccion' | 'estado';

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
  { key: 'nombre', title: 'Nombre Cuenta' },
  { key: 'codigo', title: 'Codigo Cuenta' },
  { key: 'netsuite', title: 'ID Externo Netsuite' },
  { key: 'codigoExterno', title: 'Codigo Externo' },
  { key: 'tipoCuenta', title: 'Tipo de Cuenta' },
  { key: 'tipoAccion', title: 'Tipo Accion Personal' },
  { key: 'estado', title: 'Estado Cuenta' },
];

function normalizePayload(values: AccountingAccountFormValues): AccountingAccountPayload {
  return {
    idEmpresa: values.idEmpresa!,
    nombre: values.nombre.trim(),
    descripcion: values.descripcion?.trim() || undefined,
    codigo: values.codigo.trim(),
    idExternoNetsuite: values.idExternoNetsuite?.trim() || undefined,
    codigoExterno: values.codigoExterno?.trim() || undefined,
    idTipoErp: values.idTipoErp!,
    idTipoAccionPersonal: values.idTipoAccionPersonal!,
  };
}

function formatAccountTypeLabel(type: AccountingAccountType): string {
  const externalId = type.idExterno?.trim();
  if (!externalId) return type.nombre;
  return `${type.nombre} (ext:${externalId})`;
}

function getAccountTypeSelectValue(type: AccountingAccountType): number {
  const externalId = Number(type.idExterno);
  if (Number.isFinite(externalId) && externalId > 0) {
    return externalId;
  }
  return type.id;
}

function getAccountTypeSortValue(type: AccountingAccountType): number {
  const externalId = Number(type.idExterno);
  if (Number.isFinite(externalId) && externalId > 0) {
    return externalId;
  }
  return type.id;
}

function selectFilterByLabel(input: string, option?: { label?: string | number | null }) {
  return String(option?.label ?? '').toLowerCase().includes(input.toLowerCase());
}

function getPaneValue(
  row: AccountingAccountListItem,
  key: PaneKey,
  companies: Array<{ id: number; nombre: string }>,
  tipoCuentaMap: Map<number, string>,
  tipoAccionMap: Map<number, string>,
): string {
  if (key === 'empresa') {
    const company = companies.find((c) => c.id === row.idEmpresa);
    return company?.nombre ?? `Empresa #${row.idEmpresa}`;
  }
  if (key === 'nombre') return row.nombre ?? '';
  if (key === 'codigo') return row.codigo ?? '';
  if (key === 'netsuite') return row.idExternoNetsuite ?? '';
  if (key === 'codigoExterno') return row.codigoExterno ?? '';
  if (key === 'tipoCuenta') return tipoCuentaMap.get(row.idTipoErp) ?? `Tipo #${row.idTipoErp}`;
  if (key === 'tipoAccion') return tipoAccionMap.get(row.idTipoAccionPersonal) ?? `Accion #${row.idTipoAccionPersonal}`;
  return row.esInactivo === 1 ? 'Inactivo' : 'Activo';
}

export function AccountingAccountsManagementPage() {
  const { message, modal } = AntdApp.useApp();
  const [form] = Form.useForm<AccountingAccountFormValues>();

  const canView = useAppSelector(canViewAccountingAccounts);
  const canCreate = useAppSelector(canCreateAccountingAccount);
  const canEdit = useAppSelector(canEditAccountingAccount);
  const canInactivate = useAppSelector(canInactivateAccountingAccount);
  const canReactivate = useAppSelector(canReactivateAccountingAccount);
  const canViewAudit = useAppSelector(canViewAccountingAccountAudit);
  const activeCompany = useAppSelector((s) => s.activeCompany.company);
  const companies = useAppSelector((s) => s.auth.companies);
  const activeCompanyIds = useMemo(() => new Set(companies.map((c) => c.id)), [companies]);
  const defaultCompanyId = activeCompany?.id ?? companies[0]?.id;

  const [rows, setRows] = useState<AccountingAccountListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>(
    defaultCompanyId ? [defaultCompanyId] : [],
  );
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<AccountingAccountListItem | null>(null);
  const editingId = editing?.id ?? null;
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('principal');
  const [auditTrail, setAuditTrail] = useState<AccountingAccountAuditTrailItem[]>([]);
  const [loadingAuditTrail, setLoadingAuditTrail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [paneSearch, setPaneSearch] = useState<Record<PaneKey, string>>({
    empresa: '',
    nombre: '',
    codigo: '',
    netsuite: '',
    codigoExterno: '',
    tipoCuenta: '',
    tipoAccion: '',
    estado: '',
  });
  const [paneSelections, setPaneSelections] = useState<Record<PaneKey, string[]>>({
    empresa: [],
    nombre: [],
    codigo: [],
    netsuite: [],
    codigoExterno: [],
    tipoCuenta: [],
    tipoAccion: [],
    estado: [],
  });
  const [paneOpen, setPaneOpen] = useState<Record<PaneKey, boolean>>({
    empresa: false,
    nombre: false,
    codigo: false,
    netsuite: false,
    codigoExterno: false,
    tipoCuenta: false,
    tipoAccion: false,
    estado: false,
  });

  const [accountTypes, setAccountTypes] = useState<AccountingAccountType[]>([]);
  const [actionTypes, setActionTypes] = useState<PersonalActionType[]>([]);
  const activeAccountTypeIds = useMemo(
    () => new Set(accountTypes.filter((t) => t.status === 1).map((t) => t.id)),
    [accountTypes],
  );
  const activeActionTypeIds = useMemo(
    () => new Set(actionTypes.filter((t) => t.estado === 1).map((t) => t.id)),
    [actionTypes],
  );
  const activeAccountTypes = useMemo(
    () => accountTypes.filter((t) => t.status === 1),
    [accountTypes],
  );
  const activeAccountTypesSorted = useMemo(
    () => [...activeAccountTypes].sort((a, b) => getAccountTypeSortValue(a) - getAccountTypeSortValue(b)),
    [activeAccountTypes],
  );
  const activeActionTypes = useMemo(
    () => actionTypes.filter((t) => t.estado === 1),
    [actionTypes],
  );

  const accountTypeMap = useMemo(
    () => new Map(accountTypes.map((t) => [t.id, formatAccountTypeLabel(t)])),
    [accountTypes],
  );
  const accountTypeInternalToSelectMap = useMemo(
    () => new Map(accountTypes.map((t) => [t.id, getAccountTypeSelectValue(t)])),
    [accountTypes],
  );
  const accountTypeSelectToInternalMap = useMemo(
    () => new Map(accountTypes.map((t) => [getAccountTypeSelectValue(t), t.id])),
    [accountTypes],
  );
  const actionTypeMap = useMemo(() => new Map(actionTypes.map((t) => [t.id, t.nombre])), [actionTypes]);
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
      const data = await fetchAccountingAccounts(targetCompanyIds[0], showInactive, targetCompanyIds);
      setRows(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar cuentas contables');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [defaultCompanyId, message, selectedCompanyIds, showInactive]);

  const loadCatalogs = useCallback(async () => {
    try {
      const [types, actions] = await Promise.all([
        fetchAccountingAccountTypes(),
        fetchPersonalActionTypes(),
      ]);
      setAccountTypes(types);
      setActionTypes(actions);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar catalogos contables');
      setAccountTypes([]);
      setActionTypes([]);
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

  const matchesGlobalSearch = useCallback((row: AccountingAccountListItem) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      (row.nombre ?? '').toLowerCase().includes(term)
      || (row.codigo ?? '').toLowerCase().includes(term)
      || (row.idExternoNetsuite ?? '').toLowerCase().includes(term)
      || (row.codigoExterno ?? '').toLowerCase().includes(term)
      || (companies.find((c) => c.id === row.idEmpresa)?.nombre ?? '').toLowerCase().includes(term)
      || (accountTypeMap.get(row.idTipoErp) ?? '').toLowerCase().includes(term)
      || (actionTypeMap.get(row.idTipoAccionPersonal) ?? '').toLowerCase().includes(term)
    );
  }, [search, companies, accountTypeMap, actionTypeMap]);

  const dataFilteredByPaneSelections = useCallback((excludePane?: PaneKey) => {
    return rows.filter((row) => {
      if (!matchesGlobalSearch(row)) return false;
      for (const pane of paneConfig) {
        if (pane.key === excludePane) continue;
        const selected = paneSelections[pane.key];
        if (selected.length === 0) continue;
        const value = getPaneValue(row, pane.key, companies, accountTypeMap, actionTypeMap);
        if (!selected.includes(value)) return false;
      }
      return true;
    });
  }, [companies, matchesGlobalSearch, paneSelections, rows, accountTypeMap, actionTypeMap]);

  const paneOptions = useMemo(() => {
    const result: Record<PaneKey, PaneOption[]> = {
      empresa: [],
      nombre: [],
      codigo: [],
      netsuite: [],
      codigoExterno: [],
      tipoCuenta: [],
      tipoAccion: [],
      estado: [],
    };

    for (const pane of paneConfig) {
      const filteredData = dataFilteredByPaneSelections(pane.key);
      const counter = new Map<string, number>();
      for (const row of filteredData) {
        const value = getPaneValue(row, pane.key, companies, accountTypeMap, actionTypeMap).trim();
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
  }, [companies, dataFilteredByPaneSelections, paneSearch, accountTypeMap, actionTypeMap]);

  const filteredRows = useMemo(() => dataFilteredByPaneSelections(), [dataFilteredByPaneSelections]);

  const clearAllFilters = () => {
    setSearch('');
    setPaneSearch({
      empresa: '',
      nombre: '',
      codigo: '',
      netsuite: '',
      codigoExterno: '',
      tipoCuenta: '',
      tipoAccion: '',
      estado: '',
    });
    setPaneSelections({
      empresa: [],
      nombre: [],
      codigo: [],
      netsuite: [],
      codigoExterno: [],
      tipoCuenta: [],
      tipoAccion: [],
      estado: [],
    });
    setPaneOpen({
      empresa: false,
      nombre: false,
      codigo: false,
      netsuite: false,
      codigoExterno: false,
      tipoCuenta: false,
      tipoAccion: false,
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
      codigo: true,
      netsuite: true,
      codigoExterno: true,
      tipoCuenta: true,
      tipoAccion: true,
      estado: true,
    });
  };

  const collapseAllPanes = () => {
    setPaneOpen({
      empresa: false,
      nombre: false,
      codigo: false,
      netsuite: false,
      codigoExterno: false,
      tipoCuenta: false,
      tipoAccion: false,
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
    }
    setOpenModal(true);
  };

  const applyAccountToForm = useCallback((row: AccountingAccountListItem) => {
    form.setFieldsValue({
      idEmpresa: row.idEmpresa,
      nombre: row.nombre ?? '',
      descripcion: row.descripcion ?? '',
      codigo: row.codigo ?? '',
      idExternoNetsuite: row.idExternoNetsuite ?? '',
      codigoExterno: row.codigoExterno ?? '',
      idTipoErp: accountTypeInternalToSelectMap.get(row.idTipoErp) ?? row.idTipoErp,
      idTipoAccionPersonal: row.idTipoAccionPersonal,
      idEmpresaCambio: undefined,
      idTipoErpCambio: undefined,
      idTipoAccionPersonalCambio: undefined,
    });
  }, [form, accountTypeInternalToSelectMap]);

  const openEditModal = (row: AccountingAccountListItem) => {
    if (!canEdit) return;
    setEditing(row);
    setActiveTab('principal');
    setLoadingDetail(true);
    form.resetFields();
    setOpenModal(true);
    void loadAccountDetail(row.id);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    setAuditTrail([]);
    setLoadingDetail(false);
    form.resetFields();
  };

  const loadAccountDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchAccountingAccount(id);
      setEditing(detail);
      applyAccountToForm(detail);
    } catch {
      // Keep current form values if detail fetch fails
    } finally {
      setLoadingDetail(false);
    }
  }, [applyAccountToForm]);


  const loadAccountingAuditTrail = useCallback(async (id: number) => {
    if (!canViewAudit) {
      setAuditTrail([]);
      setLoadingAuditTrail(false);
      return;
    }
    setLoadingAuditTrail(true);
    try {
      const rowsAudit = await fetchAccountingAccountAuditTrail(id, 200);
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
    void loadAccountingAuditTrail(editingId);
  }, [openModal, editingId, activeTab, canViewAudit, loadAccountingAuditTrail]);

  const submitAccount = async () => {
    try {
      if (!editing && !canCreate) {
        message.error('No tiene permiso para crear cuentas contables.');
        return;
      }
      if (editing && !canEdit) {
        message.error('No tiene permiso para editar cuentas contables.');
        return;
      }

      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: editing ? 'Confirmar edicion de cuenta contable' : 'Confirmar creacion de cuenta contable',
          content: editing ? 'Se guardaran los cambios.' : 'Se creara la nueva cuenta contable.',
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
      const resolvedTipoCuentaRaw = values.idTipoErpCambio ?? values.idTipoErp;
      const resolvedTipoCuenta = resolvedTipoCuentaRaw
        ? (accountTypeInternalToSelectMap.get(resolvedTipoCuentaRaw) ?? resolvedTipoCuentaRaw)
        : undefined;
      const resolvedTipoCuentaInternal = resolvedTipoCuenta
        ? (accountTypeSelectToInternalMap.get(resolvedTipoCuenta) ?? resolvedTipoCuenta)
        : undefined;
      const resolvedTipoAccion = values.idTipoAccionPersonalCambio ?? values.idTipoAccionPersonal;
      const payload = normalizePayload({
        ...values,
        idEmpresa: resolvedEmpresa,
        idTipoErp: resolvedTipoCuenta,
        idTipoAccionPersonal: resolvedTipoAccion,
      });
      const selectedEmpresa = resolvedEmpresa;
      if (!editing && !selectedEmpresa) {
        message.error('Debe seleccionar una empresa activa para gestionar cuentas contables.');
        return;
      }
      if (!resolvedTipoCuenta) {
        message.error('Debe seleccionar el tipo de cuenta.');
        return;
      }
      if (!resolvedTipoAccion) {
        message.error('Debe seleccionar el tipo de accion personal.');
        return;
      }
      setSaving(true);

      if (editing) {
        const updatePayload: Partial<AccountingAccountPayload> = { ...payload };
        if (resolvedEmpresa && resolvedEmpresa !== editing.idEmpresa) {
          updatePayload.idEmpresa = resolvedEmpresa;
        }
        if (resolvedTipoCuentaInternal && resolvedTipoCuentaInternal !== editing.idTipoErp) {
          updatePayload.idTipoErp = resolvedTipoCuenta;
        }
        if (resolvedTipoCuentaInternal && resolvedTipoCuentaInternal === editing.idTipoErp) {
          delete updatePayload.idTipoErp;
        }
        if (resolvedTipoAccion && resolvedTipoAccion !== editing.idTipoAccionPersonal) {
          updatePayload.idTipoAccionPersonal = resolvedTipoAccion;
        }
        await updateAccountingAccount(editing.id, updatePayload);
        message.success('Cuenta contable actualizada correctamente');
      } else {
        await createAccountingAccount({ ...payload, idEmpresa: selectedEmpresa });
        message.success('Cuenta contable creada correctamente');
        if (selectedEmpresa) {
          setSelectedCompanyIds([selectedEmpresa]);
        }
      }

      closeModal();
      setLoading(true);
      const nextCompanyIds = selectedEmpresa ? [selectedEmpresa] : selectedCompanyIds;
      await loadRows(nextCompanyIds);
    } catch (error) {
      if (error instanceof Error && error.message) {
        message.error(error.message);
      }
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };

  const handleInactivate = async (row: AccountingAccountListItem) => {
    if (!canInactivate) {
      message.error('No tiene permiso para inactivar cuentas contables.');
      return;
    }
    await inactivateAccountingAccount(row.id);
    message.success(`Cuenta contable ${row.nombre} inactivada`);
    await loadRows();
  };

  const handleReactivate = async (row: AccountingAccountListItem) => {
    if (!canReactivate) {
      message.error('No tiene permiso para reactivar cuentas contables.');
      return;
    }
    await reactivateAccountingAccount(row.id);
    message.success(`Cuenta contable ${row.nombre} reactivada`);
    await loadRows();
  };

  const columns: ColumnsType<AccountingAccountListItem> = [
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
        <Space>
          <DollarOutlined />
          <span>{row.nombre}</span>
        </Space>
      ),
    },
    {
      title: 'Codigo',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 160,
    },
    {
      title: 'ID Externo Netsuite',
      dataIndex: 'idExternoNetsuite',
      key: 'idExternoNetsuite',
      width: 180,
      render: (value) => value || '-',
    },
    {
      title: 'Codigo Externo',
      dataIndex: 'codigoExterno',
      key: 'codigoExterno',
      width: 180,
      render: (value) => value || '-',
    },
    {
      title: 'Tipo Cuenta',
      dataIndex: 'idTipoErp',
      key: 'idTipoErp',
      width: 200,
      render: (value: number) => accountTypeMap.get(value) ?? `Tipo #${value}`,
    },
    {
      title: 'Tipo Accion',
      dataIndex: 'idTipoAccionPersonal',
      key: 'idTipoAccionPersonal',
      width: 200,
      render: (value: number) => actionTypeMap.get(value) ?? `Accion #${value}`,
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

  const auditColumns: ColumnsType<AccountingAccountAuditTrailItem> = [
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
        <Flex gap={6} wrap="wrap">
          <Tag className={styles.tagInactivo}>{row.modulo}</Tag>
          <Tag className={styles.tagActivo}>{row.accion}</Tag>
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

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link className={styles.pageBackLink} to="/configuration">
            <ArrowLeftOutlined />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Listado de Cuentas Contables</h1>
            <p className={styles.pageSubtitle}>
              Visualice y gestione todas las cuentas contables registradas en el sistema
            </p>
          </div>
        </div>
      </div>

      <Card className={styles.mainCard} style={{ marginBottom: 20 }}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={16}>
            <Flex align="center" gap={16}>
              <div className={styles.gestionIconWrap}>
                <DollarOutlined className={styles.gestionIcon} />
              </div>
              <div>
                <h2 className={styles.gestionTitle}>Gestion de Cuentas Contables</h2>
                <p className={styles.gestionDesc}>
                  Administre y consulte todas las cuentas contables registradas en el sistema
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
                Crear Cuenta
              </Button>
            ) : null}
          </Flex>
        </div>
      </Card>

      <Card className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={12} className={styles.registrosHeader}>
            <Flex align="center" gap={12} wrap="wrap">
              <Flex align="center" gap={8}>
                <FilterOutlined className={styles.registrosFilterIcon} />
                <h3 className={styles.registrosTitle}>Registros de Cuentas Contables</h3>
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
            <Flex align="center" gap={8}>
              <span style={{ color: '#6b7a85', fontSize: 14 }}>Mostrar inactivas</span>
              <Switch checked={showInactive} onChange={setShowInactive} size="small" />
              <Select
                mode="multiple"
                allowClear
                placeholder="Filtrar por empresa(s)"
                value={selectedCompanyIds}
                onChange={(values) => {
                  const next = values as number[];
                  setSelectedCompanyIds(next);
                }}
                options={companies.map((company) => ({
                  value: company.id,
                  label: company.nombre,
                }))}
                style={{ minWidth: 220 }}
              />
            </Flex>
          </Flex>

          <Collapse
            activeKey={filtersExpanded ? ['filtros'] : []}
            onChange={(keys) => setFiltersExpanded(keys.includes('filtros'))}
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
            dataSource={filteredRows}
            className={`${styles.configTable} ${styles.companiesTable}`}
            pagination={{
              pageSize,
              showSizeChanger: false,
              showTotal: (total, range) => `Mostrando ${range[0]} a ${range[1]} de ${total} registros`,
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
        title={(
          <Flex justify="space-between" align="center" wrap="nowrap" style={{ width: '100%', gap: 16 }}>
            <div className={styles.companyModalHeader}>
              <div className={styles.companyModalHeaderIcon}>
                <DollarOutlined />
              </div>
              <span>{editing ? 'Editar Cuenta Contable' : 'Crear Cuenta Contable'}</span>
            </div>
            <Flex align="center" gap={12} className={styles.companyModalHeaderRight}>
              {editing ? (
                <div className={styles.companyModalEstadoPaper}>
                  <span style={{ fontWeight: 500, fontSize: 14, color: editing.esInactivo === 1 ? '#64748b' : '#20638d' }}>
                    {editing.esInactivo === 1 ? 'Inactivo' : 'Activo'}
                  </span>
                  <Switch
                    checked={editing.esInactivo === 0}
                    disabled={editing.esInactivo === 0 ? !canInactivate : !canReactivate}
                    onChange={(checked) => {
                      if (!editing) return;
                      modal.confirm({
                        title: checked ? 'Reactivar cuenta contable' : 'Inactivar cuenta contable',
                        content: checked
                          ? 'La cuenta contable volvera a estar disponible.'
                          : 'La cuenta contable quedara inactiva.',
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
                            await handleReactivate(editing);
                          } else {
                            await handleInactivate(editing);
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
        <Form form={form} layout="vertical" onFinish={submitAccount} preserve={false} className={styles.companyFormContent}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className={`${styles.tabsWrapper} ${styles.companyModalTabs}`}
            items={[
              {
                key: 'principal',
                label: (
                  <span>
                    <DollarOutlined style={{ marginRight: 8, fontSize: 16 }} />
                    Informacion Principal
                  </span>
                ),
                children: (
                  <Spin spinning={loadingDetail}>
                    <Row gutter={[12, 12]} className={styles.companyFormGrid}>
                      {editing?.idEmpresa && !activeCompanyIds.has(editing.idEmpresa) ? (
                        <>
                          <Col span={12}>
                            <Form.Item name="idEmpresa" hidden>
                              <Input />
                            </Form.Item>
                            <Form.Item label="Empresa actual">
                              <Flex align="center" gap={8}>
                                <Input value={`Empresa #${editing.idEmpresa}`} disabled />
                                <Tag className={styles.tagInactivo}>Inactivo</Tag>
                              </Flex>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="idEmpresaCambio" label="Cambiar a empresa activa">
                              <Select
                                showSearch
                                optionFilterProp="label"
                                filterOption={selectFilterByLabel}
                                placeholder="Seleccionar"
                                options={companies.map((c) => ({ value: c.id, label: c.nombre }))}
                              />
                            </Form.Item>
                          </Col>
                        </>
                      ) : companies.length === 1 ? (
                        <Col span={12}>
                          <Form.Item name="idEmpresa" label="Empresa *" rules={[{ required: true }]}>
                            <Input value={companies[0].nombre} disabled />
                          </Form.Item>
                        </Col>
                      ) : (
                        <Col span={12}>
                          <Form.Item name="idEmpresa" label="Empresa *" rules={[{ required: true }]}>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              filterOption={selectFilterByLabel}
                              disabled={!!editing}
                              placeholder="Seleccionar"
                              options={companies.map((c) => ({ value: c.id, label: c.nombre }))}
                            />
                          </Form.Item>
                        </Col>
                      )}
                      <Col span={12}>
                        <Form.Item name="nombre" label="Nombre Cuenta *" rules={textRules({ required: true, max: 255 })}>
                          <Input placeholder="Nombre cuenta" maxLength={255} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="codigo" label="Codigo Cuenta *" rules={textRules({ required: true, max: 50 })}>
                          <Input placeholder="Codigo cuenta" maxLength={50} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="idExternoNetsuite" label="ID Externo Netsuite" rules={[{ validator: optionalNoSqlInjection }]}>
                          <Input placeholder="ID Externo Netsuite" maxLength={50} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="codigoExterno" label="Codigo Externo" rules={[{ validator: optionalNoSqlInjection }]}>
                          <Input placeholder="Codigo Externo" maxLength={50} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        {editing?.idTipoErp && !activeAccountTypeIds.has(editing.idTipoErp) ? (
                          <>
                            <Form.Item name="idTipoErp" hidden>
                              <Input />
                            </Form.Item>
                            <Form.Item label="Tipo de cuenta actual">
                              <Flex align="center" gap={8}>
                                <Input value={accountTypeMap.get(editing.idTipoErp) ?? `Tipo #${editing.idTipoErp}`} disabled />
                                <Tag className={styles.tagInactivo}>Inactivo</Tag>
                              </Flex>
                            </Form.Item>
                            <Form.Item name="idTipoErpCambio" label="Cambiar a tipo activo">
                              <Select
                                showSearch
                                optionFilterProp="label"
                                filterOption={selectFilterByLabel}
                                placeholder="Seleccionar"
                                options={activeAccountTypesSorted.map((t) => ({ value: getAccountTypeSelectValue(t), label: formatAccountTypeLabel(t) }))}
                              />
                            </Form.Item>
                          </>
                        ) : (
                          <Form.Item name="idTipoErp" label="Tipo de Cuenta *" rules={[{ required: true }]}>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              filterOption={selectFilterByLabel}
                              placeholder="Seleccionar"
                              options={activeAccountTypesSorted.map((t) => ({ value: getAccountTypeSelectValue(t), label: formatAccountTypeLabel(t) }))}
                            />
                          </Form.Item>
                        )}
                      </Col>
                      <Col span={12}>
                        {editing?.idTipoAccionPersonal && !activeActionTypeIds.has(editing.idTipoAccionPersonal) ? (
                          <>
                            <Form.Item name="idTipoAccionPersonal" hidden>
                              <Input />
                            </Form.Item>
                            <Form.Item label="Tipo accion actual">
                              <Flex align="center" gap={8}>
                                <Input value={actionTypeMap.get(editing.idTipoAccionPersonal) ?? `Accion #${editing.idTipoAccionPersonal}`} disabled />
                                <Tag className={styles.tagInactivo}>Inactivo</Tag>
                              </Flex>
                            </Form.Item>
                            <Form.Item name="idTipoAccionPersonalCambio" label="Cambiar a tipo activo">
                              <Select
                                showSearch
                                optionFilterProp="label"
                                filterOption={selectFilterByLabel}
                                placeholder="Seleccionar"
                                options={activeActionTypes.map((t) => ({ value: t.id, label: t.nombre }))}
                              />
                            </Form.Item>
                          </>
                        ) : (
                          <Form.Item name="idTipoAccionPersonal" label="Tipo Accion Personal *" rules={[{ required: true }]}>
                            <Select
                              showSearch
                              optionFilterProp="label"
                              filterOption={selectFilterByLabel}
                              placeholder="Seleccionar"
                              options={activeActionTypes.map((t) => ({ value: t.id, label: t.nombre }))}
                            />
                          </Form.Item>
                        )}
                      </Col>
                      <Col span={24}>
                        <Form.Item name="descripcion" label="Descripcion Cuenta" rules={[{ validator: optionalNoSqlInjection }]}>
                          <Input.TextArea rows={3} placeholder="Descripcion" maxLength={1000} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Spin>
                ),
              },
              {
                key: 'bitacora',
                label: (
                  <span>
                    <SearchOutlined style={{ marginRight: 8, fontSize: 16 }} />
                    Bitacora
                  </span>
                ),
                children: (
                  <Spin spinning={loadingAuditTrail}>
                    <div style={{ paddingTop: 8 }}>
                      <p className={styles.sectionTitle}>Historial de cambios de la cuenta contable</p>
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
                        locale={{ emptyText: 'No hay registros de bitacora para esta cuenta contable.' }}
                      />
                    </div>
                  </Spin>
                ),
                disabled: !canViewAudit || !editingId,
              },
            ]}
          />
          <div className={styles.companyModalFooter}>
            <Button onClick={closeModal} className={styles.companyModalBtnCancel}>
              Cancelar
            </Button>
            {(editing ? canEdit : canCreate) && (
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={editing ? <EditOutlined /> : <PlusOutlined />}
                className={styles.companyModalBtnSubmit}
              >
                {editing ? 'Guardar cambios' : 'Crear Cuenta'}
              </Button>
            )}
          </div>
        </Form>
      </Modal>
    </div>
  );
}
