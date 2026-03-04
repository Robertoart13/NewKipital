import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  App as AntdApp,
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  Row,
  Select,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useAppSelector } from '../../../store/hooks';
import { canIntercompanyTransfer } from '../../../store/selectors/permissions.selectors';
import { fetchEmployees, type EmployeeListItem } from '../../../api/employees';
import { fetchPayPeriods, type CatalogPayPeriod } from '../../../api/catalogs';
import {
  executeIntercompanyTransfer,
  simulateIntercompanyTransfer,
  type IntercompanyTransferSimulationResult,
} from '../../../api/payroll';
import { formatCurrencyInput } from '../../../lib/currencyFormat';
import styles from '../configuration/UsersManagementPage.module.css';

const { Text } = Typography;

type SimulationMap = Record<number, IntercompanyTransferSimulationResult | undefined>;
type DestinationMap = Record<number, number | undefined>;

function buildEmployeeName(employee: EmployeeListItem): string {
  const parts = [employee.nombre, employee.apellido1, employee.apellido2]
    .filter((item) => typeof item === 'string' && item.trim().length > 0);
  if (parts.length === 0) return `Empleado #${employee.id}`;
  return parts.join(' ');
}

function toDateString(value?: Dayjs | null): string | undefined {
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
  const effectiveDate = Form.useWatch('effectiveDate', form) as Dayjs | undefined;
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
    () => periods.map((period) => ({ label: `${period.nombre} (${period.dias} dias)`, value: period.id })),
    [periods],
  );

  const employeesFiltered = useMemo(() => {
    if (!periodId) return [];
    return employees.filter((employee) => Number(employee.idPeriodoPago) === Number(periodId));
  }, [employees, periodId]);

  const selectionSummary = useMemo(() => {
    const selectedEmployees = selectedRowKeys.filter((id) =>
      employeesFiltered.some((emp) => emp.id === id),
    );
    const eligible = selectedEmployees.filter((id) => simulationByEmployee[id]?.eligible);
    const blocked = selectedEmployees.filter(
      (id) => simulationByEmployee[id] && !simulationByEmployee[id]?.eligible,
    );
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
  }, [effectiveDate, globalDestinationId, reason, applyAll]);

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
      return [{
        destinationId: Number(globalDestinationId),
        employeeIds: [...selectedRowKeys],
      }];
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
    if (!effectiveDate) {
      message.warning('Seleccione una fecha efectiva antes de simular.');
      return;
    }
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

    const dateValue = toDateString(effectiveDate);
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
          if (failed === 0) {
            message.success(`Traslados ejecutados: ${executed}`);
          } else {
            message.warning(`Ejecutados: ${executed}. Fallidos: ${failed}.`);
          }
          resetSelections();
          void loadEmployees();
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Error al ejecutar traslados');
        } finally {
          setExecuting(false);
        }
      },
    });
  };

  const columns: ColumnsType<EmployeeListItem> = [
    {
      title: 'Empleado',
      key: 'nombre',
      width: 280,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#2f3b45' }}>{buildEmployeeName(record)}</div>
          <div style={{ fontSize: 12, color: '#7a8691' }}>{record.codigo || `ID ${record.id}`}</div>
        </div>
      ),
    },
    {
      title: 'Cedula',
      dataIndex: 'cedula',
      key: 'cedula',
      width: 160,
      render: (value) => value || 'â€”',
    },
    {
      title: 'Periodo Pago',
      key: 'periodo',
      width: 140,
      render: (_, record) => record.idPeriodoPago ?? 'â€”',
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
      title: 'Estado validacion',
      key: 'estado',
      width: 240,
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
      render: (_, record) => {
        const simulation = simulationByEmployee[record.id];
        if (!simulation) return null;
        if (simulation.eligible && simulation.aguinaldoProvision) {
          return (
            <div style={{ fontSize: 12 }}>
              <div>Total bruto: {formatCurrencyInput(simulation.aguinaldoProvision.totalBruto, 'CRC')}</div>
              <div>Provision aguinaldo: {formatCurrencyInput(simulation.aguinaldoProvision.montoProvisionado, 'CRC')}</div>
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
  ];

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link to="/dashboard" className={styles.pageBackLink}>
            <ArrowLeftOutlined style={{ fontSize: 18 }} />
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

      <Card className={styles.mainCard} style={{ marginBottom: 20 }}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" gap={16} wrap="wrap">
            <Flex align="center" gap={12}>
              <div className={styles.gestionIconWrap}>
                <SwapOutlined className={styles.gestionIcon} />
              </div>
              <div>
                <p className={styles.gestionTitle}>Configuracion de traslado</p>
                <p className={styles.gestionDesc}>
                  Seleccione periodo, empresa origen y fecha efectiva para iniciar la simulacion.
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
            initialValues={{
              originCompanyId: activeCompanyId,
              effectiveDate: dayjs().startOf('day'),
            }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} md={12} xl={8}>
                <Form.Item name="periodId" label="Tipo de Periodo de Pago *" rules={[{ required: true }]}>
                  <Select
                    loading={loadingPeriods}
                    placeholder="Seleccione periodo"
                    options={periodOptions}
                    showSearch
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={8}>
                <Form.Item name="originCompanyId" label="Empresa Origen *" rules={[{ required: true }]}>
                  <Select
                    placeholder="Seleccione empresa origen"
                    options={companies.map((company) => ({
                      label: company.nombre,
                      value: company.id,
                    }))}
                    showSearch
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={8}>
                <Form.Item name="effectiveDate" label="Fecha efectiva *" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} xl={8}>
                <Form.Item name="reason" label="Motivo del traslado">
                  <Input.TextArea placeholder="Opcional" rows={2} maxLength={255} showCount />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <Checkbox
                checked={applyAll}
                onChange={(event) => handleApplyAllToggle(event.target.checked)}
              >
                Opcion de traslado: aplicar para todos los empleados seleccionados
              </Checkbox>
            </div>

            {applyAll && (
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12} xl={8}>
                  <Form.Item
                    name="destinationCompanyId"
                    label="Empresa destino (aplica a todos)"
                    rules={[{ required: true }]}
                  >
                    <Select
                      placeholder="Seleccione empresa destino"
                      options={destinationCompanyOptions}
                      showSearch
                      optionFilterProp="label"
                      filterOption={(input, option) =>
                        String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </Form>

          <div className={styles.registrosHeader} style={{ marginTop: 12 }}>
            <Flex align="center" gap={8} wrap="wrap">
              <Text strong>Empleados disponibles</Text>
              <Text type="secondary">
                {employeesFiltered.length} empleados en el periodo seleccionado
              </Text>
            </Flex>
            <Flex align="center" gap={8} wrap="wrap">
              <Tooltip title="Recargar empleados">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => void loadEmployees()}
                  disabled={!originCompanyId}
                />
              </Tooltip>
              <Button
                type="primary"
                loading={simulating}
                onClick={() => void runSimulation()}
                disabled={!canTransfer}
              >
                Simular seleccionados
              </Button>
              <Button
                type="primary"
                danger
                loading={executing}
                onClick={() => void handleExecute()}
                disabled={!canTransfer || selectionSummary.eligible === 0}
              >
                Ejecutar traslado
              </Button>
            </Flex>
          </div>

          <div style={{ margin: '12px 0' }}>
            <Tag color="blue">Seleccionados: {selectionSummary.total}</Tag>
            <Tag color="green">Aptos: {selectionSummary.eligible}</Tag>
            <Tag color="red">Bloqueados: {selectionSummary.blocked}</Tag>
          </div>

          <Spin spinning={loadingEmployees}>
            <Table<EmployeeListItem>
              rowKey="id"
              columns={columns}
              dataSource={employeesFiltered}
              className={`${styles.configTable} ${styles.companiesTable}`}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              rowSelection={{
                selectedRowKeys,
                onChange: handleRowSelectionChange,
                getCheckboxProps: () => ({
                  disabled: !canTransfer,
                }),
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
