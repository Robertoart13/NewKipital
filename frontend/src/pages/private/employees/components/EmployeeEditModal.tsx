import { useEffect, useMemo, useCallback, useState } from 'react';
import { App as AntdApp, Modal, Form, Input, Select, DatePicker, InputNumber, Switch, Tabs, Button, Flex, Row, Col, Spin, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UserOutlined,
  EditOutlined,
  IdcardOutlined,
  BankOutlined,
  DollarOutlined,
  TeamOutlined,
  HistoryOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppSelector } from '../../../../store/hooks';
import {
  canEditEmployee,
  canInactivateEmployee,
  canReactivateEmployee,
  canViewEmployeeAudit,
} from '../../../../store/selectors/permissions.selectors';
import { useEmployee } from '../../../../queries/employees/useEmployee';
import { useUpdateEmployee } from '../../../../queries/employees/useUpdateEmployee';
import { useInactivateEmployee } from '../../../../queries/employees/useInactivateEmployee';
import { useReactivateEmployee } from '../../../../queries/employees/useReactivateEmployee';
import type { UpdateEmployeePayload } from '../../../../api/employees';
import type { EmployeeDetail, EmployeeAuditTrailItem } from '../../../../api/employees';
import { fetchEmployeeAuditTrail } from '../../../../api/employees';
import { useDepartments } from '../../../../queries/catalogs/useDepartments';
import { usePositions } from '../../../../queries/catalogs/usePositions';
import { usePayPeriods } from '../../../../queries/catalogs/usePayPeriods';
import { useSupervisors } from '../../../../queries/employees/useSupervisors';
import {
  GENERO_OPTIONS,
  ESTADO_CIVIL_OPTIONS,
  TIPO_CONTRATO_OPTIONS,
  JORNADA_OPTIONS,
  MONEDA_OPTIONS,
} from '../constants/employee-enums';
import styles from '../../configuration/UsersManagementPage.module.css';
import { textRules, emailRules, optionalNoSqlInjection } from '../../../../lib/formValidation';
import {
  getCurrencySymbol,
  isMoneyOverMax,
} from '../../../../lib/currencyFormat';
import { formatDateTime12h } from '../../../../lib/formatDate';
import {
  EMPLOYEE_MONEY_MAX_DIGITS,
  sanitizeMoneyDigits,
} from '../../../../lib/moneyInputSanitizer';
import { useMoneyFieldFormatter } from '../../../../hooks/useMoneyFieldFormatter';

interface EmployeeEditModalProps {
  employeeId: number | undefined;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/** Solo campos que devuelve la API del empleado (sin inventar fecha nacimiento, código postal, etc.) */
function mapEmployeeToFormValues(emp: EmployeeDetail) {
  const vacaciones = emp.vacacionesAcumuladas != null ? parseInt(emp.vacacionesAcumuladas, 10) : undefined;
  const cesantia = emp.cesantiaAcumulada != null ? parseFloat(emp.cesantiaAcumulada) : undefined;
  const salario = emp.salarioBase != null ? (typeof emp.salarioBase === 'string' ? parseFloat(emp.salarioBase) : emp.salarioBase) : undefined;
  return {
    nombre: emp.nombre ?? '',
    apellido1: emp.apellido1 ?? '',
    apellido2: emp.apellido2?.trim() || undefined,
    cedula: emp.cedula ?? '',
    email: emp.email ?? '',
    genero: emp.genero ?? undefined,
    estadoCivil: emp.estadoCivil ?? undefined,
    cantidadHijos: emp.cantidadHijos ?? 0,
    telefono: emp.telefono ?? undefined,
    direccion: emp.direccion ?? undefined,
    idEmpresa: emp.idEmpresa,
    idDepartamento: emp.idDepartamento ?? undefined,
    idPuesto: emp.idPuesto ?? undefined,
    idSupervisor: emp.idSupervisor ?? undefined,
    idDepartamentoCambio: undefined,
    idPuestoCambio: undefined,
    idPeriodoPagoCambio: undefined,
    fechaIngreso: emp.fechaIngreso ? dayjs(emp.fechaIngreso) : undefined,
    tipoContrato: emp.tipoContrato ?? undefined,
    idPeriodoPago: emp.idPeriodoPago ?? undefined,
    jornada: emp.jornada ?? undefined,
    codigo: emp.codigo ?? '',
    salarioBase: salario != null ? sanitizeMoneyDigits(salario) : '0',
    monedaSalario: emp.monedaSalario ?? 'CRC',
    numeroCcss: emp.numeroCcss ?? undefined,
    cuentaBanco: emp.cuentaBanco ?? undefined,
    vacacionesAcumuladas: Number.isFinite(vacaciones) ? vacaciones : 0,
    cesantiaAcumulada:
      Number.isFinite(cesantia) && cesantia != null
        ? sanitizeMoneyDigits(cesantia)
        : '0',
    activo: emp.estado === 1,
  };
}

export function EmployeeEditModal({ employeeId, open, onClose, onSuccess }: EmployeeEditModalProps) {
  const { modal, message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const formValues = Form.useWatch([], form);
  const companies = useAppSelector((s) => s.auth.companies);
  const canEdit = useAppSelector(canEditEmployee);
  const canInactivate = useAppSelector(canInactivateEmployee);
  const canReactivate = useAppSelector(canReactivateEmployee);
  const canViewAudit = useAppSelector(canViewEmployeeAudit);

  const { data: employee, isLoading: loadingEmployee } = useEmployee(open && employeeId != null ? employeeId! : null);
  const updateMutation = useUpdateEmployee();
  const inactivateMutation = useInactivateEmployee();
  const reactivateMutation = useReactivateEmployee();

  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();
  const { data: payPeriods = [] } = usePayPeriods();
  const activeCompanyIds = useMemo(() => new Set(companies.map((c) => c.id)), [companies]);
  const activeDepartmentIds = useMemo(() => new Set(departments.map((d: { id: number }) => d.id)), [departments]);
  const activePositionIds = useMemo(() => new Set(positions.map((p: { id: number }) => p.id)), [positions]);
  const activePayPeriodIds = useMemo(() => new Set(payPeriods.map((p: { id: number }) => p.id)), [payPeriods]);

  const [activeTabKey, setActiveTabKey] = useState('personal');
  const [auditTrail, setAuditTrail] = useState<EmployeeAuditTrailItem[]>([]);
  const [loadingAuditTrail, setLoadingAuditTrail] = useState(false);
  const [auditLoadedForId, setAuditLoadedForId] = useState<number | null>(null);

  const activo = Form.useWatch('activo', form) ?? true;
  const canToggleActivo = (activo && canInactivate) || (!activo && canReactivate);
  const monedaSalarioSeleccionada = (Form.useWatch('monedaSalario', form) as string | undefined) ?? 'CRC';
  const currencySymbol = getCurrencySymbol(monedaSalarioSeleccionada);
  const moneyField = useMoneyFieldFormatter(EMPLOYEE_MONEY_MAX_DIGITS);
  const { data: supervisors = [] } = useSupervisors();

  const canSubmit = useMemo(() => {
    const v = formValues ?? {};
    const empresaValue = v.idEmpresa;
    const departamentoValue = v.idDepartamentoCambio ?? v.idDepartamento;
    const puestoValue = v.idPuestoCambio ?? v.idPuesto;
    const periodoValue = v.idPeriodoPagoCambio ?? v.idPeriodoPago;
    return !!(
      v.nombre?.trim() &&
      v.apellido1?.trim() &&
      v.cedula?.trim() &&
      v.email?.trim() &&
      v.codigo?.trim() &&
      v.fechaIngreso &&
      empresaValue &&
      departamentoValue &&
      puestoValue &&
      periodoValue
    );
  }, [formValues]);

  useEffect(() => {
    if (!open) form.resetFields();
  }, [open, form]);

  // Llenar el formulario cuando ya tenemos datos del empleado (para que se vean al abrir)
  useEffect(() => {
    if (open && employee != null && employeeId != null) {
      form.setFieldsValue(mapEmployeeToFormValues(employee));
    }
  }, [open, employeeId, employee, form]);

  useEffect(() => {
    if (open) setActiveTabKey('personal');
  }, [open]);

  useEffect(() => {
    if (open) {
      setAuditTrail([]);
      setLoadingAuditTrail(false);
      setAuditLoadedForId(null);
    }
  }, [open, employeeId]);

  const loadAuditTrail = useCallback(async (id: number) => {
    if (!canViewAudit) {
      setAuditTrail([]);
      setLoadingAuditTrail(false);
      setAuditLoadedForId(id);
      return;
    }
    setLoadingAuditTrail(true);
    try {
      const rows = await fetchEmployeeAuditTrail(id, 200);
      setAuditTrail(rows ?? []);
    } catch (error) {
      setAuditTrail([]);
      message.error(error instanceof Error ? error.message : 'Error al cargar bitacora');
    } finally {
      setLoadingAuditTrail(false);
      setAuditLoadedForId(id);
    }
  }, [canViewAudit, message]);

  // Carga diferida de bitácora al abrir el tab Bitácora
  useEffect(() => {
    if (!open || activeTabKey !== 'bitacora' || !employeeId) return;
    if (!canViewAudit) return;
    if (auditLoadedForId === employeeId) return;
    void loadAuditTrail(employeeId);
  }, [open, activeTabKey, employeeId, canViewAudit, auditLoadedForId, loadAuditTrail]);

  const handleSubmit = async () => {
    if (!canEdit || employeeId == null) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      modal.confirm({
        title: 'Confirmar actualización',
        content: '¿Guardar los cambios del empleado?',
        icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
        okText: 'Sí, guardar',
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
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    const resolvedDepartamento = values.idDepartamentoCambio ?? values.idDepartamento;
    const resolvedPuesto = values.idPuestoCambio ?? values.idPuesto;
    const resolvedPeriodoPago = values.idPeriodoPagoCambio ?? values.idPeriodoPago;

    const activoChanged = employee != null && (values.activo ?? true) !== (employee.estado === 1);
    const doClose = () => {
      onClose();
      onSuccess?.();
    };

    if (activoChanged) {
      if (values.activo) {
        reactivateMutation.mutate({ id: employeeId! }, { onSuccess: doClose });
      } else {
        inactivateMutation.mutate({ id: employeeId! }, { onSuccess: doClose });
      }
      return;
    }

    const payload: UpdateEmployeePayload = {
      cedula: values.cedula?.trim() ?? undefined,
      nombre: values.nombre?.trim() ?? undefined,
      apellido1: values.apellido1?.trim() ?? undefined,
      apellido2: values.apellido2?.trim() || undefined,
      email: values.email?.trim() ?? undefined,
      genero: values.genero || undefined,
      estadoCivil: values.estadoCivil || undefined,
      cantidadHijos: values.cantidadHijos ?? undefined,
      telefono: values.telefono || undefined,
      direccion: values.direccion || undefined,
      idDepartamento: resolvedDepartamento || undefined,
      idPuesto: resolvedPuesto || undefined,
      idSupervisor: values.idSupervisor ?? undefined,
      tipoContrato: values.tipoContrato || undefined,
      jornada: values.jornada || undefined,
      idPeriodoPago: resolvedPeriodoPago || undefined,
      salarioBase: moneyField.parse(values.salarioBase),
      monedaSalario: values.monedaSalario || undefined,
      numeroCcss: values.numeroCcss?.trim() || undefined,
      cuentaBanco: values.cuentaBanco || undefined,
      vacacionesAcumuladas: values.vacacionesAcumuladas != null ? String(values.vacacionesAcumuladas) : undefined,
      cesantiaAcumulada:
        moneyField.parse(values.cesantiaAcumulada) != null
          ? String(moneyField.parse(values.cesantiaAcumulada))
          : undefined,
    };
    delete payload.vacacionesAcumuladas;

    updateMutation.mutate(
      { id: employeeId, payload },
      {
        onSuccess: () => {
          onClose();
          onSuccess?.();
        },
      },
    );
  };

  const auditColumns: ColumnsType<EmployeeAuditTrailItem> = useMemo(() => [
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
  ], []);

  const tabItems = [
    {
      key: 'personal',
      label: (
        <span>
          <UserOutlined style={{ marginRight: 8, fontSize: 16 }} />
          Información Personal
        </span>
      ),
      children: (
        <Row gutter={[12, 12]} className={styles.companyFormGrid}>
          <Col span={12}>
            <Form.Item name="nombre" label="Nombre *" rules={textRules({ required: true, max: 100 })}>
              <Input maxLength={100} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="apellido1" label="Apellido *" rules={textRules({ required: true, max: 100 })}>
              <Input maxLength={100} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="apellido2" label="Segundo apellido" rules={textRules({ max: 100 })}>
              <Input maxLength={100} placeholder="Opcional" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="cedula" label="Cédula *" rules={textRules({ required: true, max: 30 })}>
              <Input maxLength={30} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="genero" label="Género">
              <Select allowClear placeholder="Seleccionar" options={GENERO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="estadoCivil" label="Estado Civil">
              <Select allowClear placeholder="Seleccionar" options={ESTADO_CIVIL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="cantidadHijos" label="Cantidad Hijos">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'contacto',
      label: (
        <span>
          <IdcardOutlined style={{ marginRight: 8, fontSize: 16 }} />
          Información de Contacto
        </span>
      ),
      children: (
        <Row gutter={[12, 12]} className={styles.companyFormGrid}>
          <Col span={12}>
            <Form.Item name="telefono" label="Teléfono" rules={[{ validator: optionalNoSqlInjection }]}>
              <Input maxLength={30} placeholder="00000000" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="email" label="Correo Electrónico *" rules={emailRules(true)}>
              <Input type="email" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="direccion" label="Dirección" rules={[{ validator: optionalNoSqlInjection }]}>
              <Input placeholder="No especifica" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'laboral',
      label: (
        <span>
          <BankOutlined style={{ marginRight: 8, fontSize: 16 }} />
          Información Laboral
        </span>
      ),
      children: (
        <Row gutter={[12, 12]} className={styles.companyFormGrid}>
          {employee?.idEmpresa && !activeCompanyIds.has(employee.idEmpresa) ? (
            <Col span={12}>
              <Form.Item name="idEmpresa" hidden>
                <Input />
              </Form.Item>
              <Form.Item label="Empresa actual">
                <Flex align="center" gap={8}>
                  <Input value={`Empresa #${employee.idEmpresa}`} disabled />
                  <Tag className={styles.tagInactivo}>Inactivo</Tag>
                </Flex>
              </Form.Item>
            </Col>
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
                  disabled
                  showSearch
                  placeholder="Empresa"
                  options={companies.map((c) => ({ value: c.id, label: c.nombre }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          )}
          <Col span={8}>
            {employee?.idDepartamento && !activeDepartmentIds.has(employee.idDepartamento) ? (
              <>
                <Form.Item name="idDepartamento" hidden>
                  <Input />
                </Form.Item>
                <Form.Item label="Departamento actual">
                  <Flex align="center" gap={8}>
                    <Input value={employee.departamento?.nombre ?? `Departamento #${employee.idDepartamento}`} disabled />
                    <Tag className={styles.tagInactivo}>Inactivo</Tag>
                  </Flex>
                </Form.Item>
                <Form.Item name="idDepartamentoCambio" label="Cambiar a departamento activo">
                  <Select
                    placeholder="Seleccionar"
                    options={departments.map((d: { id: number; nombre: string }) => ({ value: d.id, label: d.nombre }))}
                  />
                </Form.Item>
              </>
            ) : (
              <Form.Item name="idDepartamento" label="Departamento *" rules={[{ required: true }]}>
                <Select
                  placeholder="Seleccionar"
                  options={departments.map((d: { id: number; nombre: string }) => ({ value: d.id, label: d.nombre }))}
                />
              </Form.Item>
            )}
          </Col>
          <Col span={8}>
            {employee?.idPuesto && !activePositionIds.has(employee.idPuesto) ? (
              <>
                <Form.Item name="idPuesto" hidden>
                  <Input />
                </Form.Item>
                <Form.Item label="Puesto actual">
                  <Flex align="center" gap={8}>
                    <Input value={employee.puesto?.nombre ?? `Puesto #${employee.idPuesto}`} disabled />
                    <Tag className={styles.tagInactivo}>Inactivo</Tag>
                  </Flex>
                </Form.Item>
                <Form.Item name="idPuestoCambio" label="Cambiar a puesto activo">
                  <Select
                    placeholder="Seleccionar"
                    options={positions.map((p: { id: number; nombre: string }) => ({ value: p.id, label: p.nombre }))}
                  />
                </Form.Item>
              </>
            ) : (
              <Form.Item name="idPuesto" label="Puesto *" rules={[{ required: true }]}>
                <Select
                  placeholder="Seleccionar"
                  options={positions.map((p: { id: number; nombre: string }) => ({ value: p.id, label: p.nombre }))}
                />
              </Form.Item>
            )}
          </Col>
          <Col span={8}>
            <Form.Item
              name="fechaIngreso"
              label="Fecha de Ingreso *"
              extra="No editable en actualización"
            >
              <DatePicker placeholder="dd/mm/aaaa" format="DD/MM/YYYY" style={{ width: '100%' }} disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="tipoContrato" label="Tipo de Contrato">
              <Select allowClear placeholder="Seleccionar" options={TIPO_CONTRATO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            {employee?.idPeriodoPago && !activePayPeriodIds.has(employee.idPeriodoPago) ? (
              <>
                <Form.Item name="idPeriodoPago" hidden>
                  <Input />
                </Form.Item>
                <Form.Item label="Periodo de Pago actual">
                  <Flex align="center" gap={8}>
                    <Input value={employee.periodoPago?.nombre ?? `Periodo #${employee.idPeriodoPago}`} disabled />
                    <Tag className={styles.tagInactivo}>Inactivo</Tag>
                  </Flex>
                </Form.Item>
                <Form.Item name="idPeriodoPagoCambio" label="Cambiar a periodo activo">
                  <Select
                    placeholder="Seleccionar"
                    options={payPeriods.map((p: { id: number; nombre: string }) => ({ value: p.id, label: p.nombre }))}
                  />
                </Form.Item>
              </>
            ) : (
              <Form.Item name="idPeriodoPago" label="Periodo de Pago *" rules={[{ required: true }]}> 
                <Select
                  placeholder="Seleccionar"
                  options={payPeriods.map((p: { id: number; nombre: string }) => ({ value: p.id, label: p.nombre }))}
                />
              </Form.Item>
            )}
          </Col>
          <Col span={8}>
            <Form.Item name="jornada" label="Tipo de Jornada">
              <Select allowClear placeholder="Seleccionar" options={JORNADA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="codigo"
              label="Código de Empleado (sufijo) *"
              rules={textRules({ required: true, max: 45 })}
              extra="No editable. Formato: S00000 (ej: S00887)"
            >
              <Input placeholder="S00000" maxLength={45} disabled />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'financiera',
      label: (
        <span>
          <DollarOutlined style={{ marginRight: 8, fontSize: 16 }} />
          Información Financiera
        </span>
      ),
      children: (
        <Row gutter={[12, 12]} className={styles.companyFormGrid}>
          <Col span={12}>
            <Form.Item
              name="salarioBase"
              label="Salario Base"
              validateTrigger={['onBlur', 'onSubmit']}
              rules={[
                {
                  validator: (_, v) => {
                    const n = moneyField.parse(v);
                    if (n == null) return Promise.resolve();
                    if (isNaN(n) || n <= 0) return Promise.reject(new Error('El salario debe ser mayor a cero'));
                    if (isMoneyOverMax(n)) return Promise.reject(new Error('Monto demasiado alto'));
                    return Promise.resolve();
                  },
                },
              ]}
              getValueFromEvent={moneyField.getFormValueFromEvent}
              getValueProps={moneyField.getFormValueProps}
            >
              <Input
                style={{ width: '100%' }}
                maxLength={moneyField.maxInputLength}
                inputMode="numeric"
                placeholder={`${currencySymbol} 0`}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="monedaSalario" label="Moneda">
              <Select options={MONEDA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="numeroCcss"
              label="Número CCSS"
              rules={[
                { validator: optionalNoSqlInjection },
                {
                  validator: (_, v) => {
                    const s = (v ?? '').toString().trim();
                    if (!s) return Promise.resolve();
                    return s.length >= 4 && s.length <= 30 ? Promise.resolve() : Promise.reject(new Error('4 a 30 caracteres'));
                  },
                },
              ]}
            >
              <Input maxLength={30} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="cuentaBanco" label="Cuenta bancaria" rules={[{ validator: optionalNoSqlInjection }]}>
              <Input placeholder="CRC-" maxLength={50} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'autogestion',
      label: (
        <span>
          <TeamOutlined style={{ marginRight: 8, fontSize: 16 }} />
          Autogestión
        </span>
      ),
      children: (
        <>
          <Row gutter={[12, 12]} className={styles.companyFormGrid}>
            <Col span={24}>
              <Form.Item name="idSupervisor" label="Supervisor" extra="Empleados con rol Supervisor, Supervisor Global o Master en TimeWise (según empresa del empleado).">
                <Select
                  allowClear
                  placeholder="Seleccionar"
                  options={supervisors.map((s: { id: number; nombre: string; apellido1: string }) => ({
                    value: s.id,
                    label: `${s.nombre} ${s.apellido1}`.trim(),
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            La gestión de acceso al sistema (TimeWise / KPITAL) y roles se realiza desde la sección de usuarios o desde la creación del empleado.
          </p>
        </>
      ),
    },
    {
      key: 'historico',
      label: (
        <span>
          <HistoryOutlined style={{ marginRight: 8, fontSize: 16 }} />
          Histórico Laboral
        </span>
      ),
      children: (
        <div className={styles.historicoSection}>
          <Row gutter={[12, 12]} className={styles.companyFormGrid}>
            <Col span={12}>
              <Form.Item
                name="vacacionesAcumuladas"
                label="Días Iniciales de Vacaciones"
                rules={[
                  {
                    validator: (_, value) => {
                      if (value == null || value === '') return Promise.resolve();
                      const numericValue = Number(value);
                      if (Number.isNaN(numericValue) || numericValue < 0 || !Number.isInteger(numericValue)) {
                        return Promise.reject(new Error('Debe ser un número entero de 0 o mayor'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
                extra="Solo lectura. El saldo inicial no es editable."
              >
                <InputNumber
                  min={0}
                  max={99999}
                  precision={0}
                  step={1}
                  disabled
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cesantiaAcumulada"
                label="Cesantía Acumulada"
                validateTrigger={['onBlur', 'onSubmit']}
                rules={[
                  {
                    validator: (_, value) => {
                      const numericValue = moneyField.parse(value);
                      if (numericValue == null) return Promise.resolve();
                      if (Number.isNaN(numericValue) || numericValue < 0) {
                        return Promise.reject(new Error('Solo montos positivos o cero'));
                      }
                      if (isMoneyOverMax(numericValue)) {
                        return Promise.reject(new Error('Monto demasiado alto'));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
                getValueFromEvent={moneyField.getFormValueFromEvent}
                getValueProps={moneyField.getFormValueProps}
                extra="Monto en moneda, 0 o mayor"
              >
                <Input
                  style={{ width: '100%' }}
                  maxLength={moneyField.maxInputLength}
                  inputMode="numeric"
                  placeholder={`${currencySymbol} 0`}
                />
              </Form.Item>
            </Col>
          </Row>
          <p className={styles.sectionDescription} style={{ marginTop: 16 }}>
            La provisión de aguinaldo por empresa se gestiona en la creación del empleado. Para cambios posteriores contacte al administrador.
          </p>
        </div>
      ),
    },
    ...(employeeId != null && canViewAudit
      ? [
          {
            key: 'bitacora',
            label: (
              <span>
                <SearchOutlined style={{ marginRight: 8, fontSize: 16 }} />
                Bitácora
              </span>
            ),
            children: (
              <div className={styles.historicoSection}>
                <p className={styles.sectionTitle}>Historial de cambios del empleado</p>
                <p className={styles.sectionDescription} style={{ marginBottom: 16 }}>
                  Muestra quién hizo el cambio, cuándo lo hizo y el detalle registrado en bitácora.
                </p>
                <Table<EmployeeAuditTrailItem>
                  rowKey="id"
                  size="small"
                  loading={loadingAuditTrail}
                  columns={auditColumns}
                  dataSource={auditTrail}
                  className={`${styles.configTable} ${styles.auditTableCompact}`}
                  pagination={{
                    pageSize: 8,
                    showSizeChanger: true,
                    showTotal: (total) => `${total} registro(s)`,
                  }}
                  locale={{ emptyText: 'No hay registros de bitácora para este empleado.' }}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  const loading = loadingEmployee && open && employeeId != null;
  const showForm = open && !loading && employee != null && employeeId != null;

  return (
    <Modal
      className={styles.companyModal}
      open={open}
      onCancel={onClose}
      closable={false}
      footer={null}
      width={1120}
      destroyOnHidden
      styles={{
        header: { marginBottom: 0, padding: 0 },
        body: { padding: 24, maxHeight: '70vh', overflowY: 'auto' },
      }}
      title={
        <Flex justify="space-between" align="center" wrap="nowrap" style={{ width: '100%', gap: 16 }}>
          <div className={styles.companyModalHeader}>
            <div className={styles.companyModalHeaderIcon}>
              <EditOutlined />
            </div>
            <span>Editar Empleado</span>
          </div>
          <Flex align="center" gap={12} className={styles.companyModalHeaderRight}>
            <div className={styles.companyModalEstadoPaper}>
              <span style={{ fontWeight: 500, fontSize: 14, color: activo ? '#20638d' : '#64748b' }}>
                {activo ? 'Activo' : 'Inactivo'}
              </span>
              <Switch
                checked={activo}
                onChange={(v) => form.setFieldValue('activo', v)}
                disabled={!canToggleActivo}
              />
            </div>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
              aria-label="Cerrar"
              className={styles.companyModalCloseBtn}
            />
          </Flex>
        </Flex>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
          <Spin size="large" description="Cargando empleado..." />
        </div>
      ) : showForm ? (
        <Form
          key={employeeId}
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          preserve={false}
          initialValues={mapEmployeeToFormValues(employee!)}
          className={styles.companyFormContent}
        >
          <Tabs
            activeKey={activeTabKey}
            onChange={setActiveTabKey}
            items={tabItems}
            animated={{ inkBar: true, tabPane: false }}
            tabBarGutter={24}
            tabBarStyle={{ padding: '10px 12px 6px', background: 'transparent' }}
            className={`${styles.tabsWrapper} ${styles.companyModalTabs} ${styles.employeeModalTabsScroll}`}
          />
          <div className={styles.companyModalFooter}>
            <Button onClick={onClose} className={styles.companyModalBtnCancel}>
              Cancelar
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<EditOutlined />}
              loading={updateMutation.isPending}
              disabled={!canEdit || !canSubmit}
              className={styles.companyModalBtnSubmit}
            >
              Guardar cambios
            </Button>
          </div>
        </Form>
      ) : open && !loading && employeeId != null ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
          No se pudo cargar el empleado. Cierre e intente de nuevo.
        </div>
      ) : null}
    </Modal>
  );
}
