import {
  App as AntdApp,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  createDistributionRule,
  fetchDistributionRule,
  fetchDistributionRuleAuditTrail,
  updateDistributionRule,
  type DistributionRuleAuditItem,
  type DistributionRuleItem,
} from '../../../api/distributionRules';
import {
  fetchAccountingAccounts,
  fetchPersonalActionTypes,
  type AccountingAccountListItem,
  type PersonalActionType,
} from '../../../api/accountingAccounts';
import { fetchDepartmentsAdmin } from '../../../api/departments-admin';
import { fetchPositionsAdmin } from '../../../api/positions-admin';
import { formatDateTime12h } from '../../../lib/formatDate';
import { useAppSelector } from '../../../store/hooks';
import { hasPermission } from '../../../store/selectors/permissions.selectors';

import layoutStyles from './UsersManagementPage.module.css';
import ruleStyles from './DistributionRuleFormPage.module.css';

interface RuleLineForm {
  idTipoAccionPersonal?: number;
  idCuentaContable?: number;
}

interface RuleFormValues {
  idEmpresa?: number;
  esReglaGlobal: boolean;
  idDepartamento?: number;
  idPuesto?: number;
  detalles: RuleLineForm[];
}

interface OptionItem {
  value: number;
  label: string;
}

interface DistributionRuleFormPageProps {
  mode: 'create' | 'edit';
  publicId?: string;
}

function toNumericId(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function getUniqueError(lines: RuleLineForm[]): string | null {
  const ids = lines.map((line) => line.idTipoAccionPersonal).filter((id): id is number => Number.isInteger(id));
  return new Set(ids).size === ids.length
    ? null
    : 'No se permite repetir el mismo tipo de accion personal dentro de la regla.';
}

export function DistributionRuleFormPage({ mode, publicId }: DistributionRuleFormPageProps) {
  const { message, modal } = AntdApp.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<RuleFormValues>();

  const canEdit = useAppSelector((state) => hasPermission(state, 'config:reglas-distribucion:edit'));
  const canViewAudit = useAppSelector((state) =>
    hasPermission(state, 'config:reglas-distribucion:audit'),
  );

  const companies = useAppSelector((state) => state.auth.companies);
  const activeCompany = useAppSelector((state) => state.activeCompany.company);

  const defaultCompanyId =
    toNumericId(activeCompany?.id) ?? toNumericId(companies[0]?.id) ?? undefined;

  const companyOptions: OptionItem[] = useMemo(
    () =>
      companies
        .map((company) => {
          const id = toNumericId(company.id);
          if (!id) return null;
          return { value: id, label: company.nombre };
        })
        .filter((option): option is OptionItem => option != null),
    [companies],
  );

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [rule, setRule] = useState<DistributionRuleItem | null>(null);
  const [actionTypes, setActionTypes] = useState<PersonalActionType[]>([]);
  const [departments, setDepartments] = useState<OptionItem[]>([]);
  const [positions, setPositions] = useState<OptionItem[]>([]);
  const [accountsByCompany, setAccountsByCompany] = useState<Record<number, AccountingAccountListItem[]>>({});
  const accountsByCompanyRef = useRef<Record<number, AccountingAccountListItem[]>>({});
  const [auditRows, setAuditRows] = useState<DistributionRuleAuditItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const previousSelectedCompanyRef = useRef<number | undefined>(undefined);

  const selectedCompany = Form.useWatch('idEmpresa', form);
  const isGlobal = Form.useWatch('esReglaGlobal', form);
  const detailLines = Form.useWatch('detalles', form) ?? [];

  const persistedActionTypeOptions = useMemo(() => {
    const options = new Map<number, OptionItem>();
    for (const detail of rule?.detalles ?? []) {
      const actionTypeId = toNumericId(detail.idTipoAccionPersonal);
      if (!actionTypeId || options.has(actionTypeId)) continue;
      const code = detail.codigoTipoAccionPersonal?.trim() ?? '';
      const name = detail.nombreTipoAccionPersonal?.trim() ?? '';
      const label = code ? `${name} (${code})` : name || `Tipo #${actionTypeId}`;
      options.set(actionTypeId, { value: actionTypeId, label });
    }
    return options;
  }, [rule]);

  const persistedAccountOptionsByAction = useMemo(() => {
    const map = new Map<number, OptionItem[]>();
    for (const detail of rule?.detalles ?? []) {
      const actionTypeId = toNumericId(detail.idTipoAccionPersonal);
      const accountId = toNumericId(detail.idCuentaContable);
      if (!actionTypeId || !accountId) continue;
      const code = detail.codigoCuentaContable?.trim() ?? '';
      const name = detail.nombreCuentaContable?.trim() ?? '';
      const label = code ? `${code} - ${name}` : name || `Cuenta #${accountId}`;
      const current = map.get(actionTypeId) ?? [];
      if (!current.some((option) => option.value === accountId)) {
        current.push({ value: accountId, label });
        map.set(actionTypeId, current);
      }
    }
    return map;
  }, [rule]);

  const accountOptionsByAction = useMemo(() => {
    const map = new Map<number, OptionItem[]>();
    const companyId = toNumericId(selectedCompany);
    if (!companyId) return map;

    const companyAccounts = accountsByCompany[companyId] ?? [];
    for (const account of companyAccounts) {
      if (account.esInactivo !== 1) continue;
      const accountId = toNumericId(account.id);
      const actionTypeId = toNumericId(account.idTipoAccionPersonal);
      if (!accountId || !actionTypeId) continue;
      const current = map.get(actionTypeId) ?? [];
      current.push({
        value: accountId,
        label: `${account.codigo} - ${account.nombre}`,
      });
      map.set(actionTypeId, current);
    }

    for (const [actionType, options] of map.entries()) {
      map.set(
        actionType,
        [...options].sort((a, b) => a.label.localeCompare(b.label)),
      );
    }

    return map;
  }, [accountsByCompany, selectedCompany]);

  const loadAccountsByCompany = useCallback(
    async (companyId: number) => {
      if (accountsByCompanyRef.current[companyId]) return;
      const accounts = await fetchAccountingAccounts(companyId, false, [companyId]);
      accountsByCompanyRef.current = { ...accountsByCompanyRef.current, [companyId]: accounts };
      setAccountsByCompany(accountsByCompanyRef.current);
    },
    [],
  );

  const loadCatalogs = useCallback(async () => {
    const [departmentRows, positionRows, actionTypeRows] = await Promise.all([
      fetchDepartmentsAdmin(false),
      fetchPositionsAdmin(false),
      fetchPersonalActionTypes(),
    ]);

    setDepartments(
      departmentRows
        .filter((department) => department.estado === 1)
        .map((department) => ({
          value: department.id,
          label: department.nombre,
        })),
    );
    setPositions(
      positionRows
        .filter((position) => position.estado === 1)
        .map((position) => ({ value: position.id, label: position.nombre })),
    );
    setActionTypes(actionTypeRows.filter((actionType) => actionType.estado === 1));
  }, []);

  const loadRule = useCallback(async () => {
    if (mode !== 'edit' || !publicId) return;
    const found = await fetchDistributionRule(publicId);
    setRule(found);

    const normalizedDetails =
      found.detalles.length > 0
        ? found.detalles.map((detail) => ({
            idTipoAccionPersonal: toNumericId(detail.idTipoAccionPersonal) ?? undefined,
            idCuentaContable: toNumericId(detail.idCuentaContable) ?? undefined,
          }))
        : [{ idTipoAccionPersonal: undefined, idCuentaContable: undefined }];

    form.resetFields();
    form.setFieldsValue({
      idEmpresa: found.idEmpresa,
      esReglaGlobal: found.esReglaGlobal === 1,
      idDepartamento: found.idDepartamento ?? undefined,
      idPuesto: found.idPuesto ?? undefined,
      detalles: normalizedDetails,
    });

    await loadAccountsByCompany(found.idEmpresa);
  }, [form, loadAccountsByCompany, mode, publicId]);

  const loadAudit = useCallback(async () => {
    if (mode !== 'edit' || !publicId || !canViewAudit) return;
    setLoadingAudit(true);
    try {
      setAuditRows(await fetchDistributionRuleAuditTrail(publicId, 200));
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar bitacora');
      setAuditRows([]);
    } finally {
      setLoadingAudit(false);
    }
  }, [canViewAudit, message, mode, publicId]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([loadCatalogs(), loadRule(), loadAudit()])
      .catch((error) => {
        if (!mounted) return;
        message.error(
          error instanceof Error ? error.message : 'No fue posible cargar la vista de reglas.',
        );
      })
      .finally(() => {
        if (!mounted) return;
        if (mode === 'create') {
          form.setFieldsValue({
            idEmpresa: defaultCompanyId,
            esReglaGlobal: true,
            detalles: [{ idTipoAccionPersonal: undefined, idCuentaContable: undefined }],
          });
          if (defaultCompanyId) {
            void loadAccountsByCompany(defaultCompanyId);
          }
        }
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [defaultCompanyId, form, loadAccountsByCompany, loadAudit, loadCatalogs, loadRule, message, mode, publicId]);

  useEffect(() => {
    const companyId = toNumericId(selectedCompany);
    if (!companyId) return;

    void loadAccountsByCompany(companyId);

    // Solo en modo crear: si el usuario cambia empresa manualmente,
    // limpiar asignaciones para evitar cruces de cuentas entre empresas.
    if (mode !== 'create') {
      previousSelectedCompanyRef.current = companyId;
      return;
    }

    if (previousSelectedCompanyRef.current == null) {
      previousSelectedCompanyRef.current = companyId;
      return;
    }

    if (previousSelectedCompanyRef.current !== companyId) {
      form.setFieldsValue({
        detalles: [{ idTipoAccionPersonal: undefined, idCuentaContable: undefined }],
      });
      previousSelectedCompanyRef.current = companyId;
    }
  }, [form, loadAccountsByCompany, mode, selectedCompany]);

  useEffect(() => {
    if (isGlobal) {
      form.setFieldsValue({ idDepartamento: undefined, idPuesto: undefined });
    }
  }, [form, isGlobal]);

  useEffect(() => {
    if (mode !== 'edit' || !rule) return;
    if (!rule.detalles || rule.detalles.length === 0) return;

    const currentDetails = (form.getFieldValue('detalles') as RuleLineForm[] | undefined) ?? [];
    const hasHydratedDetail = currentDetails.some(
      (detail) =>
        toNumericId(detail?.idTipoAccionPersonal) != null &&
        toNumericId(detail?.idCuentaContable) != null,
    );
    if (hasHydratedDetail) return;

    const fallbackDetails: RuleLineForm[] = rule.detalles.map((detail) => ({
      idTipoAccionPersonal: toNumericId(detail.idTipoAccionPersonal),
      idCuentaContable: toNumericId(detail.idCuentaContable),
    }));

    form.setFieldValue(
      'detalles',
      fallbackDetails.length > 0
        ? fallbackDetails
        : [{ idTipoAccionPersonal: undefined, idCuentaContable: undefined }],
    );
  }, [form, mode, rule]);

  const detailDuplicateMessage = getUniqueError(detailLines);

  const handleSubmit = async () => {
    if (!canEdit) {
      message.error('No tiene permiso para guardar reglas de distribucion.');
      return;
    }

    try {
      const values = await form.validateFields();
      const duplicateMessage = getUniqueError(values.detalles ?? []);
      if (duplicateMessage) {
        message.warning(duplicateMessage);
        return;
      }

      const details = (values.detalles ?? []).map((detail) => ({
        idTipoAccionPersonal: Number(detail.idTipoAccionPersonal),
        idCuentaContable: Number(detail.idCuentaContable),
      }));

      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title:
            mode === 'create'
              ? 'Confirmar creacion de regla de distribucion'
              : 'Confirmar actualizacion de regla de distribucion',
          content:
            mode === 'create'
              ? 'Se creara la regla y sus asignaciones contables.'
              : 'Se actualizara el ambito y las asignaciones contables de la regla.',
          icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
          okText: mode === 'create' ? 'Crear regla' : 'Guardar cambios',
          cancelText: 'Cancelar',
          centered: true,
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (!confirmed) return;

      setSaving(true);

      if (mode === 'create') {
        const created = await createDistributionRule({
          idEmpresa: Number(values.idEmpresa),
          esReglaGlobal: Boolean(values.esReglaGlobal),
          idDepartamento: values.esReglaGlobal ? null : (values.idDepartamento ?? null),
          idPuesto: values.esReglaGlobal ? null : (values.idPuesto ?? null),
          detalles: details,
        });
        message.success('Regla de distribucion creada correctamente.');
        navigate(`/configuration/reglas-distribucion/editar/${created.publicId}`);
        return;
      }

      if (!publicId) return;

      await updateDistributionRule(publicId, {
        esReglaGlobal: Boolean(values.esReglaGlobal),
        idDepartamento: values.esReglaGlobal ? null : (values.idDepartamento ?? null),
        idPuesto: values.esReglaGlobal ? null : (values.idPuesto ?? null),
        detalles: details,
      });
      message.success('Regla de distribucion actualizada correctamente.');
      await loadRule();
      await loadAudit();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        message.warning('Revise los campos requeridos antes de guardar.');
        return;
      }
      message.error(
        error instanceof Error ? error.message : 'No fue posible guardar la regla de distribucion.',
      );
    } finally {
      setSaving(false);
    }
  };

  const actionTypeOptions = useMemo(() => {
    const options = new Map<number, OptionItem>();

    for (const actionType of actionTypes) {
      const id = toNumericId(actionType.id);
      if (!id) continue;
      options.set(id, {
        value: id,
        label: `${actionType.nombre} (${actionType.codigo})`,
      });
    }

    for (const [id, option] of persistedActionTypeOptions.entries()) {
      if (!options.has(id)) {
        options.set(id, option);
      }
    }

    return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [actionTypes, persistedActionTypeOptions]);

  return (
    <div className={layoutStyles.pageWrapper}>
      <div className={ruleStyles.formPageHeader}>
        <div className={ruleStyles.formHeaderLeft}>
          <div className={ruleStyles.formTitleIcon}>
            <AppstoreOutlined />
          </div>
          <div className={ruleStyles.formTitleBlock}>
            <h1 className={ruleStyles.formPageTitle}>
              {mode === 'create' ? 'Crear Regla de Distribución' : 'Editar Regla de Distribución'}
            </h1>
            <p className={ruleStyles.formPageSubtitle}>
              Configure las reglas de distribución contable para asignar cuentas contables según el
              tipo de acción personal, departamento y puesto de los empleados.
            </p>
          </div>
        </div>
        <div className={ruleStyles.formHeaderRight}>
          {rule ? (
            <>
              <Tag color={mode === 'create' ? 'green' : 'blue'}>
                {mode === 'create' ? 'Nueva' : 'Edición'}
              </Tag>
              <Typography.Text type="secondary" className={ruleStyles.formRuleId}>
                ID: <strong>{rule.publicId}</strong>
              </Typography.Text>
            </>
          ) : null}
          <Link to="/configuration/reglas-distribucion">
            <Button icon={<ArrowLeftOutlined />} className={ruleStyles.btnVolverLista}>
              Volver a la Lista
            </Button>
          </Link>
        </div>
      </div>

      <Spin spinning={loading}>
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Card className={`${layoutStyles.mainCard} ${ruleStyles.stepCard}`}>
            <div className={layoutStyles.mainCardBody}>
              <div className={ruleStyles.stepHeader}>
                <div className={ruleStyles.stepBadge}>1</div>
                <div>
                  <Typography.Title level={5} className={ruleStyles.stepTitle}>
                    Seleccionar Empresa
                  </Typography.Title>
                  <Typography.Paragraph type="secondary" className={ruleStyles.stepSubtitle}>
                    Seleccione la empresa para la cual desea configurar las reglas de distribución
                    contable.
                  </Typography.Paragraph>
                </div>
              </div>

              <Form<RuleFormValues> form={form} layout="vertical">
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  <Form.Item
                    label="Empresa *"
                    name="idEmpresa"
                    rules={[{ required: true }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={companyOptions}
                      disabled={mode === 'edit'}
                      placeholder="Seleccione la empresa"
                    />
                  </Form.Item>

                  <Form.Item name="esReglaGlobal" valuePropName="checked">
                    <Checkbox>Aplicar a todos los empleados de la empresa</Checkbox>
                  </Form.Item>

                  <Typography.Paragraph type="secondary" className={ruleStyles.explanatoryText}>
                    {isGlobal
                      ? 'Esta configuración se aplicará a todos los empleados de la empresa sin distinción de departamento o puesto.'
                      : 'Defina departamento y puesto para una regla específica.'}
                  </Typography.Paragraph>

                  {!isGlobal ? (
                    <Space size={12} style={{ width: '100%' }} align="start" wrap>
                      <Form.Item
                        label="Departamento *"
                        name="idDepartamento"
                        rules={[
                          {
                            required: true,
                            message: 'Debe seleccionar un departamento.',
                          },
                        ]}
                        style={{ minWidth: 260, flex: 1 }}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          options={departments}
                          placeholder="Seleccione departamento"
                        />
                      </Form.Item>

                      <Form.Item
                        label="Puesto"
                        name="idPuesto"
                        style={{ minWidth: 260, flex: 1 }}
                      >
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          options={positions}
                          placeholder="Seleccione puesto (opcional)"
                        />
                      </Form.Item>
                    </Space>
                  ) : null}
                </Space>

                <Divider />

                <div className={ruleStyles.stepHeader}>
                  <div className={ruleStyles.stepBadge}>2</div>
                  <div>
                    <Typography.Title level={5} className={ruleStyles.stepTitle}>
                      Configurar Cuenta Contable por Tipo de Acción
                    </Typography.Title>
                    <Typography.Paragraph
                      type="secondary"
                      className={ruleStyles.stepSubtitle}
                    >
                      Asigne la cuenta contable según el tipo de acción personal. Esta configuración
                      se aplicará a todos los empleados de la empresa.
                    </Typography.Paragraph>
                  </div>
                </div>

                <Form.List name="detalles">
                  {(fields, { add, remove }) => (
                    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
                      {fields.map(({ key, name, ...restField }, index) => {
                        const selectedActionType = form.getFieldValue([
                          'detalles',
                          name,
                          'idTipoAccionPersonal',
                        ]);
                        const selectedActionTypeId = toNumericId(selectedActionType);
                        const selectedAccountId = toNumericId(
                          form.getFieldValue(['detalles', name, 'idCuentaContable']),
                        );
                        const accountOptions = [
                          ...(accountOptionsByAction.get(Number(selectedActionType)) ?? []),
                        ];
                        const persistedOptions =
                          selectedActionTypeId != null
                            ? persistedAccountOptionsByAction.get(selectedActionTypeId) ?? []
                            : [];
                        for (const option of persistedOptions) {
                          if (!accountOptions.some((current) => current.value === option.value)) {
                            accountOptions.push(option);
                          }
                        }
                        if (
                          selectedActionTypeId != null &&
                          selectedAccountId != null &&
                          !accountOptions.some((current) => current.value === selectedAccountId)
                        ) {
                          accountOptions.push({
                            value: selectedAccountId,
                            label: `Cuenta #${selectedAccountId}`,
                          });
                        }

                        const selectedActionTypeIds = (detailLines ?? [])
                          .map((line, lineIndex) =>
                            lineIndex === index ? null : line.idTipoAccionPersonal,
                          )
                          .filter(
                            (value): value is number => Number.isInteger(value),
                          );

                        return (
                          <div key={key} className={ruleStyles.assignmentBlock}>
                            <div className={ruleStyles.assignmentNumber}>{index + 1}</div>
                            <div className={ruleStyles.assignmentFields}>
                              <Form.Item
                                {...restField}
                                label="Tipo de Acción Personal *"
                                name={[name, 'idTipoAccionPersonal']}
                                rules={[
                                  {
                                    required: true,
                                    message: 'Seleccione un tipo de acción.',
                                  },
                                ]}
                                className={ruleStyles.assignmentFormItem}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  placeholder="Seleccione el tipo de acción personal"
                                  options={actionTypeOptions.filter(
                                    (option) =>
                                      !selectedActionTypeIds.includes(option.value) ||
                                      option.value === selectedActionType,
                                  )}
                                  onChange={() => {
                                    form.setFieldValue(
                                      ['detalles', name, 'idCuentaContable'],
                                      undefined,
                                    );
                                  }}
                                />
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                label="Cuenta Contable *"
                                name={[name, 'idCuentaContable']}
                                rules={[
                                  {
                                    required: true,
                                    message: 'Seleccione una cuenta contable.',
                                  },
                                ]}
                                className={ruleStyles.assignmentFormItem}
                                tooltip="Seleccione la cuenta contable correspondiente"
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  placeholder={
                                    selectedActionType
                                      ? 'Seleccione la cuenta contable correspondiente'
                                      : 'Primero seleccione un tipo de acción'
                                  }
                                  disabled={!selectedActionType}
                                  options={accountOptions}
                                  notFoundContent={
                                    selectedActionType
                                      ? 'No hay cuentas contables activas para este tipo en la empresa.'
                                      : 'Debe seleccionar primero un tipo de acción.'
                                  }
                                />
                              </Form.Item>

                              <div className={ruleStyles.assignmentDelete}>
                                <Tooltip title="Eliminar asignación">
                                  <Button
                                    danger
                                    type="text"
                                    icon={<DeleteOutlined />}
                                    onClick={() => remove(name)}
                                    disabled={fields.length <= 1}
                                    className={ruleStyles.btnDeleteAssignment}
                                  />
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <Button
                        type="default"
                        icon={<PlusOutlined />}
                        onClick={() =>
                          add({
                            idTipoAccionPersonal: undefined,
                            idCuentaContable: undefined,
                          })
                        }
                        className={ruleStyles.btnAgregarLinea}
                      >
                        Agregar otra asignación de cuenta contable
                      </Button>
                    </Space>
                  )}
                </Form.List>

                {detailDuplicateMessage ? (
                  <Typography.Text type="danger">
                    {detailDuplicateMessage}
                  </Typography.Text>
                ) : null}

                <Divider />

                <div className={ruleStyles.formActions}>
                  <Link to="/configuration/reglas-distribucion">
                    <Button>Volver al listado</Button>
                  </Link>
                  <Button
                    type="primary"
                    loading={saving}
                    onClick={() => void handleSubmit()}
                    disabled={!canEdit}
                    className={ruleStyles.btnPrimarySubmit}
                  >
                    {mode === 'create' ? 'Crear regla' : 'Guardar cambios'}
                  </Button>
                </div>
              </Form>
            </div>
          </Card>

          {mode === 'edit' && canViewAudit ? (
            <Card className={`${layoutStyles.mainCard} ${ruleStyles.stepCard}`}>
              <div className={layoutStyles.mainCardBody}>
                <div className={ruleStyles.stepHeader}>
                  <div className={ruleStyles.stepBadge}>3</div>
                  <div>
                    <Typography.Title level={5} className={ruleStyles.stepTitle}>
                      Bitacora de cambios
                    </Typography.Title>
                    <Typography.Paragraph
                      type="secondary"
                      className={ruleStyles.stepSubtitle}
                    >
                      Revise quien ha creado o modificado esta regla y el detalle de cada cambio.
                    </Typography.Paragraph>
                  </div>
                </div>
                <Table<DistributionRuleAuditItem>
                  rowKey="id"
                  loading={loadingAudit}
                  dataSource={auditRows}
                  pagination={{
                    pageSize: 8,
                    showSizeChanger: false,
                    showTotal: (total) => `${total} registro(s)`,
                  }}
                  columns={[
                    {
                      title: 'Fecha y hora',
                      dataIndex: 'fechaCreacion',
                      key: 'fechaCreacion',
                      width: 180,
                      render: (value: string | null) => formatDateTime12h(value),
                    },
                    {
                      title: 'Accion',
                      key: 'accion',
                      width: 120,
                      render: (_, row) => <Tag>{row.accion}</Tag>,
                    },
                    {
                      title: 'Descripcion',
                      dataIndex: 'descripcion',
                      key: 'descripcion',
                    },
                  ]}
                />
              </div>
            </Card>
          ) : null}
        </Space>
      </Spin>
    </div>
  );
}
