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
import { DeleteOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [auditRows, setAuditRows] = useState<DistributionRuleAuditItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const selectedCompany = Form.useWatch('idEmpresa', form);
  const isGlobal = Form.useWatch('esReglaGlobal', form);
  const detailLines = Form.useWatch('detalles', form) ?? [];

  const accountOptionsByAction = useMemo(() => {
    const map = new Map<number, OptionItem[]>();
    const companyId = toNumericId(selectedCompany);
    if (!companyId) return map;

    const companyAccounts = accountsByCompany[companyId] ?? [];
    for (const account of companyAccounts) {
      if (account.esInactivo !== 1) continue;
      const current = map.get(account.idTipoAccionPersonal) ?? [];
      current.push({
        value: account.id,
        label: `${account.codigo} - ${account.nombre}`,
      });
      map.set(account.idTipoAccionPersonal, current);
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
      if (accountsByCompany[companyId]) return;
      const accounts = await fetchAccountingAccounts(companyId, false, [companyId]);
      setAccountsByCompany((previous) => ({ ...previous, [companyId]: accounts }));
    },
    [accountsByCompany],
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

    form.setFieldsValue({
      idEmpresa: found.idEmpresa,
      esReglaGlobal: found.esReglaGlobal === 1,
      idDepartamento: found.idDepartamento ?? undefined,
      idPuesto: found.idPuesto ?? undefined,
      detalles:
        found.detalles.length > 0
          ? found.detalles.map((detail) => ({
              idTipoAccionPersonal: detail.idTipoAccionPersonal,
              idCuentaContable: detail.idCuentaContable,
            }))
          : [{ idTipoAccionPersonal: undefined, idCuentaContable: undefined }],
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
  }, [defaultCompanyId, form, loadAccountsByCompany, loadAudit, loadCatalogs, loadRule, message, mode]);

  useEffect(() => {
    const companyId = toNumericId(selectedCompany);
    if (!companyId) return;
    void loadAccountsByCompany(companyId);
  }, [loadAccountsByCompany, selectedCompany]);

  useEffect(() => {
    if (isGlobal) {
      form.setFieldsValue({ idDepartamento: undefined, idPuesto: undefined });
    }
  }, [form, isGlobal]);

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

  const actionTypeOptions = actionTypes.map((actionType) => ({
    value: actionType.id,
    label: `${actionType.nombre} (${actionType.codigo})`,
  }));

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={2}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {mode === 'create' ? 'Crear Regla de Distribucion' : 'Editar Regla de Distribucion'}
          </Typography.Title>
          <Typography.Text type="secondary">
            Defina reglas globales o especificas por departamento/puesto para asignar cuenta contable por tipo de accion personal.
          </Typography.Text>
          {rule ? (
            <Typography.Text type="secondary">
              Regla: <strong>{rule.publicId}</strong>
            </Typography.Text>
          ) : null}
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Card>
          <Form<RuleFormValues> form={form} layout="vertical" preserve={false}>
            <Form.Item label="Empresa *" name="idEmpresa" rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={companyOptions}
                disabled={mode === 'edit'}
                placeholder="Seleccionar empresa"
              />
            </Form.Item>

            <Form.Item name="esReglaGlobal" valuePropName="checked">
              <Checkbox>Aplicar a todos los empleados de la empresa</Checkbox>
            </Form.Item>

            <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
              {isGlobal
                ? 'Esta configuracion se aplicara a todos los empleados de la empresa.'
                : 'Defina departamento y puesto para una regla especifica.'}
            </Typography.Paragraph>

            {!isGlobal ? (
              <Space size={12} style={{ width: '100%' }} align="start" wrap>
                <Form.Item
                  label="Departamento *"
                  name="idDepartamento"
                  rules={[{ required: true, message: 'Debe seleccionar un departamento.' }]}
                  style={{ minWidth: 260 }}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={departments}
                    placeholder="Seleccione departamento"
                  />
                </Form.Item>

                <Form.Item label="Puesto" name="idPuesto" style={{ minWidth: 260 }}>
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

            <Divider />

            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Asignaciones por tipo de accion personal
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
              Solo puede existir una linea por cada tipo de accion personal.
            </Typography.Paragraph>

            <Form.List name="detalles">
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  {fields.map((field, index) => {
                    const selectedActionType = form.getFieldValue([
                      'detalles',
                      field.name,
                      'idTipoAccionPersonal',
                    ]);
                    const accountOptions =
                      accountOptionsByAction.get(Number(selectedActionType)) ?? [];

                    const selectedActionTypeIds = (detailLines ?? [])
                      .map((line, lineIndex) => (lineIndex === index ? null : line.idTipoAccionPersonal))
                      .filter((value): value is number => Number.isInteger(value));

                    return (
                      <Card key={field.key} size="small" title={`Asignacion #${index + 1}`}>
                        <Space style={{ width: '100%' }} align="start" wrap>
                          <Form.Item
                            {...field}
                            label="Tipo de Accion Personal *"
                            name={[field.name, 'idTipoAccionPersonal']}
                            rules={[{ required: true, message: 'Seleccione un tipo de accion.' }]}
                            style={{ minWidth: 320 }}
                          >
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder="Seleccione tipo de accion personal"
                              options={actionTypeOptions.filter(
                                (option) =>
                                  !selectedActionTypeIds.includes(option.value) ||
                                  option.value === selectedActionType,
                              )}
                              onChange={() => {
                                form.setFieldValue(['detalles', field.name, 'idCuentaContable'], undefined);
                              }}
                            />
                          </Form.Item>

                          <Form.Item
                            {...field}
                            label="Cuenta Contable *"
                            name={[field.name, 'idCuentaContable']}
                            rules={[{ required: true, message: 'Seleccione una cuenta contable.' }]}
                            style={{ minWidth: 420 }}
                            tooltip="Seleccione la cuenta contable para este tipo de accion"
                          >
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder={
                                selectedActionType
                                  ? 'Seleccione cuenta contable'
                                  : 'Primero seleccione un tipo de accion'
                              }
                              disabled={!selectedActionType}
                              options={accountOptions}
                              notFoundContent={
                                selectedActionType
                                  ? 'No hay cuentas contables activas para este tipo de accion en la empresa.'
                                  : 'Debe seleccionar primero un tipo de accion.'
                              }
                            />
                          </Form.Item>

                          <Tooltip title="Eliminar linea">
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(field.name)}
                              disabled={fields.length <= 1}
                            />
                          </Tooltip>
                        </Space>
                      </Card>
                    );
                  })}

                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => add({ idTipoAccionPersonal: undefined, idCuentaContable: undefined })}
                  >
                    Agregar linea
                  </Button>
                </Space>
              )}
            </Form.List>

            {detailDuplicateMessage ? (
              <Typography.Text type="danger">{detailDuplicateMessage}</Typography.Text>
            ) : null}

            <Divider />

            <Space>
              <Link to="/configuration/reglas-distribucion">
                <Button>Volver al listado</Button>
              </Link>
              <Button type="primary" loading={saving} onClick={() => void handleSubmit()} disabled={!canEdit}>
                {mode === 'create' ? 'Crear regla' : 'Guardar cambios'}
              </Button>
            </Space>
          </Form>
        </Card>

        {mode === 'edit' && canViewAudit ? (
          <Card style={{ marginTop: 16 }}>
            <Typography.Title level={5}>Bitacora</Typography.Title>
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
          </Card>
        ) : null}
      </Spin>
    </div>
  );
}
