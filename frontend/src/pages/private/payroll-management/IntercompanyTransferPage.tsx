import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  SwapOutlined,
} from '@ant-design/icons';

import {
  App as AntdApp,
  Alert,
  Button,
  Card,
  Checkbox,
  Collapse,
  Flex,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'antd';

import dayjs from 'dayjs';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useSortableColumns } from '../../../hooks/useSortableColumns';
import { bustApiCache } from '../../../lib/apiCache';

import { buildEmployeeDisplayName } from '../../../lib/employeeName';

import { Link } from 'react-router-dom';

import { fetchPayPeriods, type CatalogPayPeriod } from '../../../api/catalogs';

import { fetchEmployees, type EmployeeListItem } from '../../../api/employees';

import {
  executeIntercompanyTransfer,
  simulateIntercompanyTransfer,
  type IntercompanyTransferSimulationResult,
} from '../../../api/payroll';

import { formatCurrencyInput } from '../../../lib/currencyFormat';

import { useAppSelector } from '../../../store/hooks';

import { canIntercompanyTransfer } from '../../../store/selectors/permissions.selectors';

import styles from '../configuration/UsersManagementPage.module.css';
import transferStyles from './IntercompanyTransferPage.module.css';

type SimulationMap = Record<number, IntercompanyTransferSimulationResult | undefined>;

type DestinationMap = Record<number, number | undefined>;

function buildEmployeeName(employee: EmployeeListItem): string {
  const displayName = buildEmployeeDisplayName(employee);

  if (!displayName) return `Empleado #${employee.id}`;

  return displayName;
}

function toDateString(value?: dayjs.Dayjs | null): string | undefined {
  if (!value) return undefined;

  return value.format('YYYY-MM-DD');
}

export function IntercompanyTransferPage() {
  const { message, modal } = AntdApp.useApp();

  const [form] = Form.useForm();

  const canTransfer = useAppSelector(canIntercompanyTransfer);

  const companies = useAppSelector((state) => state.auth.companies);

  const activeCompany = useAppSelector((state) => state.activeCompany.company);

  const [periods, setPeriods] = useState<CatalogPayPeriod[]>([]);

  const [loadingPeriods, setLoadingPeriods] = useState(false);

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);

  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  const [destinationByEmployee, setDestinationByEmployee] = useState<DestinationMap>({});

  const [simulationByEmployee, setSimulationByEmployee] = useState<SimulationMap>({});

  const [simulating, setSimulating] = useState(false);

  const [executing, setExecuting] = useState(false);

  const [applyAll, setApplyAll] = useState(false);

  const originCompanyId = Form.useWatch('originCompanyId', form);

  const periodId = Form.useWatch('periodId', form);

  const globalDestinationId = Form.useWatch('destinationCompanyId', form);

  const reason = Form.useWatch('reason', form) as string | undefined;

  const activeCompanyId = Number(activeCompany?.id ?? 0) || undefined;

  const destinationCompanyOptions = useMemo(
    () =>
      companies

        .filter((company) => Number(company.id) !== Number(originCompanyId))

        .map((company) => ({ label: company.nombre, value: company.id })),

    [companies, originCompanyId],
  );

  const periodOptions = useMemo(
    () =>
      periods.map((period) => ({
        label: `${period.nombre} (${period.dias} dias)`,

        value: period.id,
      })),

    [periods],
  );

  const periodLabelById = useMemo(() => {
    const map = new Map<number, string>();
    periods.forEach((period) => {
      map.set(Number(period.id), String(period.nombre ?? ''));
    });
    return map;
  }, [periods]);

  const employeesFiltered = useMemo(() => {
    if (!periodId) return [];

    return employees.filter((employee) => Number(employee.idPeriodoPago) === Number(periodId));
  }, [employees, periodId]);

  const selectionSummary = useMemo(() => {
    const selectedEmployees = selectedRowKeys.filter((id) => employeesFiltered.some((emp) => emp.id === id));

    const eligible = selectedEmployees.filter((id) => simulationByEmployee[id]?.eligible);

    const blocked = selectedEmployees.filter((id) => simulationByEmployee[id] && !simulationByEmployee[id]?.eligible);

    return {
      total: selectedEmployees.length,

      eligible: eligible.length,

      blocked: blocked.length,
    };
  }, [employeesFiltered, selectedRowKeys, simulationByEmployee]);

  const resetSelections = useCallback(() => {
    setSelectedRowKeys([]);

    setDestinationByEmployee({});

    setSimulationByEmployee({});
  }, []);

  // Carga de catalogos de periodos de pago.

  const loadPeriods = useCallback(async () => {
    setLoadingPeriods(true);

    try {
      const data = await fetchPayPeriods();

      setPeriods(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar periodos de pago');
    } finally {
      setLoadingPeriods(false);
    }
  }, [message]);

  // Carga de empleados por empresa origen.

  const loadEmployees = useCallback(async () => {
    if (!originCompanyId) {
      setEmployees([]);

      return;
    }

    setLoadingEmployees(true);

    try {
      const response = await fetchEmployees(String(originCompanyId), {
        page: 1,

        pageSize: 200,

        includeInactive: false,

        estado: 1,
      });

      setEmployees(response.data ?? []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al cargar empleados');

      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, [message, originCompanyId]);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    if (!originCompanyId) {
      setEmployees([]);

      resetSelections();

      return;
    }

    void loadEmployees();

    resetSelections();
  }, [loadEmployees, originCompanyId, resetSelections]);

  useEffect(() => {
    resetSelections();
  }, [periodId, resetSelections]);

  useEffect(() => {
    setSimulationByEmployee({});
  }, [globalDestinationId, reason, applyAll]);

  useEffect(() => {
    if (!originCompanyId && activeCompanyId) {
      form.setFieldValue('originCompanyId', activeCompanyId);
    }
  }, [activeCompanyId, form, originCompanyId]);

  const handleRowSelectionChange = (nextKeys: React.Key[]) => {
    setSelectedRowKeys(nextKeys.map((key) => Number(key)));

    setSimulationByEmployee((current) => {
      const next = { ...current };

      for (const key of Object.keys(next)) {
        if (!nextKeys.includes(Number(key))) {
          delete next[Number(key)];
        }
      }

      return next;
    });
  };

  const handleDestinationChange = (employeeId: number, companyId?: number) => {
    setDestinationByEmployee((current) => ({
      ...current,

      [employeeId]: companyId,
    }));

    setSimulationByEmployee((current) => ({ ...current, [employeeId]: undefined }));
  };

  const handleApplyAllToggle = (checked: boolean) => {
    setApplyAll(checked);

    setDestinationByEmployee({});

    setSimulationByEmployee({});

    if (!checked) {
      form.setFieldValue('destinationCompanyId', undefined);
    }
  };

  const buildSimulationPayloads = (): Array<{
    destinationId: number;

    employeeIds: number[];
  }> => {
    if (applyAll) {
      return [
        {
          destinationId: Number(globalDestinationId),

          employeeIds: [...selectedRowKeys],
        },
      ];
    }

    const grouped = new Map<number, number[]>();

    selectedRowKeys.forEach((employeeId) => {
      const destinationId = destinationByEmployee[employeeId];

      if (!destinationId) return;

      const list = grouped.get(destinationId) ?? [];

      list.push(employeeId);

      grouped.set(destinationId, list);
    });

    return Array.from(grouped.entries()).map(([destinationId, employeeIds]) => ({
      destinationId,

      employeeIds,
    }));
  };

  // Ejecuta simulacion con los empleados seleccionados.

  const runSimulation = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Seleccione al menos un empleado para simular.');

      return;
    }

    if (applyAll && !globalDestinationId) {
      message.warning('Seleccione la empresa destino para todos los empleados.');

      return;
    }

    const payloadGroups = buildSimulationPayloads();

    if (payloadGroups.length === 0) {
      message.warning('Seleccione empresa destino para los empleados seleccionados.');

      return;
    }

    const dateValue = toDateString(dayjs().startOf('day'));

    if (!dateValue) {
      message.warning('Fecha efectiva invalida.');

      return;
    }

    setSimulating(true);

    try {
      const results: IntercompanyTransferSimulationResult[] = [];

      for (const group of payloadGroups) {
        const response = await simulateIntercompanyTransfer({
          idEmpresaDestino: group.destinationId,

          fechaEfectiva: dateValue,

          empleados: group.employeeIds.map((id) => ({ idEmpleado: id })),

          motivo: reason?.trim() || undefined,
        });

        results.push(...response);
      }

      const nextMap: SimulationMap = {};

      results.forEach((item) => {
        nextMap[item.employeeId] = item;
      });

      setSimulationByEmployee(nextMap);

      message.success('Simulacion completada.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error al simular traslados');
    } finally {
      setSimulating(false);
    }
  };

  // Ejecuta los traslados elegibles ya simulados.

  const handleExecute = async () => {
    const transferIds = selectedRowKeys

      .map((id) => simulationByEmployee[id]?.transferId)

      .filter((id): id is number => typeof id === 'number' && id > 0);

    if (transferIds.length === 0) {
      message.warning('No hay traslados elegibles para ejecutar.');

      return;
    }

    modal.confirm({
      title: 'Confirmar traslado interempresas',

      content: `Se ejecutaran ${transferIds.length} traslados. Esta accion no se puede deshacer.`,

      okText: 'Ejecutar',

      cancelText: 'Cancelar',

      onOk: async () => {
        setExecuting(true);

        try {
          const response = await executeIntercompanyTransfer({ transferIds });

          const executed = response.filter((item) => item.status === 'EXECUTED').length;

          const failed = response.filter((item) => item.status === 'FAILED').length;
          const executedTransferIds = new Set(
            response.filter((item) => item.status === 'EXECUTED').map((item) => item.transferId),
          );
          const executedEmployeeIds = selectedRowKeys.filter((employeeId) => {
            const transferId = simulationByEmployee[employeeId]?.transferId;
            return typeof transferId === 'number' && executedTransferIds.has(transferId);
          });
          if (executedEmployeeIds.length > 0) {
            setEmployees((current) => current.filter((employee) => !executedEmployeeIds.includes(employee.id)));
          }

          if (failed === 0) {
            message.success(`Traslados ejecutados: ${executed}`);
          } else {
            message.warning(`Ejecutados: ${executed}. Fallidos: ${failed}.`);
          }

          resetSelections();
          bustApiCache();
          window.setTimeout(() => {
            void loadEmployees();
          }, 300);
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Error al ejecutar traslados');
        } finally {
          setExecuting(false);
        }
      },
    });
  };

  const columns = useSortableColumns<EmployeeListItem>([
    {
      title: 'Empleado',
      key: 'nombre',
      width: 280,
      ellipsis: true,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#2f3b45' }}>{buildEmployeeName(record)}</div>

          <div style={{ fontSize: 12, color: '#7a8691' }}>{record.codigo || `ID ${record.id}`}</div>
        </div>
      ),
    },

    {
      title: 'Cédula',
      dataIndex: 'cedula',
      key: 'cedula',
      width: 120,
      ellipsis: true,
      render: (value) => value || '-',
    },

    {
      title: 'Periodo',
      key: 'periodo',
      width: 90,
      align: 'center',
      render: (_, record) => {
        if (!record.idPeriodoPago) return '-';
        return periodLabelById.get(Number(record.idPeriodoPago)) ?? `#${record.idPeriodoPago}`;
      },
    },

    {
      title: 'Empresa destino',
      key: 'destino',
      width: 220,
      render: (_, record) => {
        if (applyAll) {
          const label = destinationCompanyOptions.find((c) => Number(c.value) === Number(globalDestinationId))?.label;

          return <Tag color="blue">{label ?? 'Sin destino'}</Tag>;
        }

        return (
          <Select
            placeholder="Seleccionar empresa"
            disabled={!selectedRowKeys.includes(record.id)}
            value={destinationByEmployee[record.id]}
            onChange={(value) => handleDestinationChange(record.id, Number(value))}
            options={destinationCompanyOptions}
            style={{ width: '100%' }}
          />
        );
      },
    },

    {
      title: 'Estado',
      key: 'estado',
      width: 140,
      render: (_, record) => {
        if (!selectedRowKeys.includes(record.id)) {
          return <Tag>Sin seleccionar</Tag>;
        }

        const simulation = simulationByEmployee[record.id];

        if (!simulation) {
          return <Tag color="default">Pendiente simulacion</Tag>;
        }

        if (simulation.eligible) {
          return (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Apto
            </Tag>
          );
        }

        return (
          <Tag color="red" icon={<CloseCircleOutlined />}>
            Bloqueado
          </Tag>
        );
      },
    },

    {
      title: 'Detalle',
      key: 'detalle',
      width: 240,
      render: (_, record) => {
        const simulation = simulationByEmployee[record.id];

        if (!simulation) return null;

        if (simulation.eligible) {
          return (
            <div className={transferStyles.detailMetrics}>
              {simulation.aguinaldoProvision && (
                <>
                  <div>
                    <span className={transferStyles.detailLabel}>Total bruto:</span>{' '}
                    {formatCurrencyInput(simulation.aguinaldoProvision.totalBruto, 'CRC')}
                  </div>
                  <div>
                    <span className={transferStyles.detailLabel}>Provision aguinaldo:</span>{' '}
                    {formatCurrencyInput(simulation.aguinaldoProvision.montoProvisionado, 'CRC')}
                  </div>
                </>
              )}
              {simulation.vacationBalance && (
                <div>
                  <span className={transferStyles.detailLabel}>Saldo vacaciones a trasladar:</span>{' '}
                  {simulation.vacationBalance.movedDays} dias
                </div>
              )}
            </div>
          );
        }

        if (!simulation.eligible) {
          return (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#a03b2a' }}>
              {simulation.blockingReasons.map((reason) => (
                <li key={`${record.id}-${reason.code}`}>{reason.message}</li>
              ))}
            </ul>
          );
        }

        return null;
      },
    },
  ]);

  const [paramsExpanded, setParamsExpanded] = useState(true);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link to="/dashboard" className={styles.pageBackLink}>
            <ArrowLeftOutlined />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Traslado interempresas</h1>
            <p className={styles.pageSubtitle}>
              Simule y ejecute traslados entre empresas con validaciones de planilla y acciones de personal
            </p>
          </div>
        </div>
      </div>

      {!canTransfer && (
        <Alert
          type="warning"
          showIcon
          message="No tiene permiso para trasladar empleados entre empresas."
          style={{ marginBottom: 16 }}
        />
      )}
      <Card className={`${styles.mainCard} ${transferStyles.heroCard}`} style={{ marginBottom: 20 }}>
        <div className={`${styles.mainCardBody} ${transferStyles.heroBody}`}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={16}>
            <Flex align="center" gap={16}>
              <div className={styles.gestionIconWrap}>
                <SwapOutlined className={styles.gestionIcon} />
              </div>
              <div>
                <h2 className={`${styles.gestionTitle} ${transferStyles.heroTitle}`}>Configuracion de traslado</h2>
                <p className={styles.gestionDesc}>
                  Seleccione periodo, empresa origen y motivo para iniciar la simulacion
                </p>
              </div>
            </Flex>
          </Flex>
        </div>
      </Card>

      <Card className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          <Form
            form={form}
            layout="vertical"
            disabled={!canTransfer}
            initialValues={{ originCompanyId: activeCompanyId }}
            className={styles.companyFormContent}
          >
            <Collapse
              className={styles.filtersCollapse}
              activeKey={paramsExpanded ? ['params'] : []}
              onChange={(keys) => setParamsExpanded((Array.isArray(keys) ? keys : [keys]).includes('params'))}
              items={[
                {
                  key: 'params',
                  label: <span className={transferStyles.paramsTitle}>Parametros del traslado</span>,
                  children: (
                    <>
                      <div className={transferStyles.paramsGrid}>
                        <div className={transferStyles.paramsItem}>
                          <span className={styles.filterLabel}>Tipo de periodo de pago</span>
                          <Form.Item name="periodId" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                            <Select
                              allowClear
                              loading={loadingPeriods}
                              placeholder="Seleccione periodo"
                              options={periodOptions}
                              showSearch
                              optionFilterProp="label"
                              filterOption={(input, option) =>
                                String(option?.label ?? '')
                                  .toLowerCase()
                                  .includes(input.toLowerCase())
                              }
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </div>
                        <div className={transferStyles.paramsItem}>
                          <span className={styles.filterLabel}>Empresa origen</span>
                          <Form.Item name="originCompanyId" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                            <Select
                              allowClear
                              placeholder="Seleccione empresa origen"
                              options={companies.map((c) => ({ label: c.nombre, value: c.id }))}
                              showSearch
                              optionFilterProp="label"
                              filterOption={(input, option) =>
                                String(option?.label ?? '')
                                  .toLowerCase()
                                  .includes(input.toLowerCase())
                              }
                              style={{ width: '100%' }}
                            />
                          </Form.Item>
                        </div>
                        <div className={transferStyles.paramsItemWide}>
                          <span className={styles.filterLabel}>Motivo del traslado (opcional)</span>
                          <Form.Item name="reason" style={{ marginBottom: 0 }}>
                            <Input
                              placeholder="Ej. Reorganizacion, cambio de sede, fusion..."
                              maxLength={255}
                              showCount
                              allowClear
                            />
                          </Form.Item>
                        </div>
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <Checkbox checked={applyAll} onChange={(e) => handleApplyAllToggle(e.target.checked)}>
                          Mismo destino para todos los empleados seleccionados
                        </Checkbox>
                        {applyAll && (
                          <div style={{ marginTop: 12, maxWidth: 320 }}>
                            <Form.Item
                              name="destinationCompanyId"
                              label="Empresa destino"
                              rules={[{ required: true, message: 'Seleccione la empresa destino' }]}
                            >
                              <Select
                                allowClear
                                placeholder="Seleccione empresa destino"
                                options={destinationCompanyOptions}
                                showSearch
                                optionFilterProp="label"
                                filterOption={(input, option) =>
                                  String(option?.label ?? '')
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                                }
                              />
                            </Form.Item>
                          </div>
                        )}
                      </div>
                    </>
                  ),
                },
              ]}
            />
          </Form>

          <Flex align="center" justify="space-between" wrap="wrap" gap={12} className={styles.registrosHeader}>
            <Flex align="center" gap={8} wrap="wrap">
              <FilterOutlined className={styles.registrosFilterIcon} />
              <h3 className={styles.registrosTitle}>Empleados disponibles</h3>
              <span style={{ color: '#6b7a85', fontSize: 13 }}>
                {periodId ? `${employeesFiltered.length} empleados en el periodo` : 'Seleccione periodo para cargar'}
              </span>
              <Space size={8}>
                <Tag color="blue" className={transferStyles.summaryTag}>
                  Seleccionados: {selectionSummary.total}
                </Tag>
                <Tag color="green" icon={<CheckCircleOutlined />} className={transferStyles.summaryTag}>
                  Aptos: {selectionSummary.eligible}
                </Tag>
                <Tag color="red" icon={<CloseCircleOutlined />} className={transferStyles.summaryTag}>
                  Bloqueados: {selectionSummary.blocked}
                </Tag>
              </Space>
            </Flex>
            <Flex align="center" gap={8} wrap="wrap" className={transferStyles.actionGroup}>
              <Tooltip title="Recargar empleados">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    bustApiCache();
                    void loadEmployees();
                  }}
                  disabled={!originCompanyId}
                >
                  Refrescar
                </Button>
              </Tooltip>
              <Button
                type="primary"
                loading={simulating}
                onClick={() => void runSimulation()}
                disabled={!canTransfer}
                className={`${styles.btnPrimary} ${transferStyles.simulateButton}`}
              >
                Simular seleccion
              </Button>
              <Button
                type="primary"
                danger
                loading={executing}
                onClick={() => void handleExecute()}
                disabled={!canTransfer || selectionSummary.eligible === 0}
                className={transferStyles.executeButton}
              >
                Ejecutar traslado
              </Button>
            </Flex>
          </Flex>

          <Spin spinning={loadingEmployees}>
            <Table<EmployeeListItem>
              rowKey="id"
              columns={columns}
              dataSource={employeesFiltered}
              size="middle"
              className={`${styles.configTable} ${styles.companiesTable} ${transferStyles.transferTable}`}
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} empleados` }}
              rowSelection={{
                selectedRowKeys,
                onChange: handleRowSelectionChange,
                getCheckboxProps: () => ({ disabled: !canTransfer }),
              }}
              locale={{
                emptyText: periodId
                  ? 'No hay empleados para este periodo de pago.'
                  : 'Seleccione el periodo de pago para ver empleados.',
              }}
            />
          </Spin>
        </div>
      </Card>
    </div>
  );
}

