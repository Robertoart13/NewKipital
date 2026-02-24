import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { App as AntdApp, Modal, Form, Input, Select, DatePicker, InputNumber, Switch, Tabs, Button, Flex, Row, Col } from 'antd';
import {
  UserOutlined,
  UserAddOutlined,
  IdcardOutlined,
  BankOutlined,
  DollarOutlined,
  TeamOutlined,
  HistoryOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppSelector } from '../../../../store/hooks';
import {
  canCreateEmployee,
  canAssignKpitalRoleOnEmployeeCreate,
  canAssignTimewiseRoleOnEmployeeCreate,
} from '../../../../store/selectors/permissions.selectors';
import { useCreateEmployee } from '../../../../queries/employees/useCreateEmployee';
import { useDepartments } from '../../../../queries/catalogs/useDepartments';
import { usePositions } from '../../../../queries/catalogs/usePositions';
import { usePayPeriods } from '../../../../queries/catalogs/usePayPeriods';
import { useAllCompaniesForHistory } from '../../../../queries/companies/useAllCompaniesForHistory';
import { useRolesByApp } from '../../../../queries/roles/useRolesByApp';
import { useSupervisors } from '../../../../queries/employees/useSupervisors';
import {
  GENERO_OPTIONS,
  ESTADO_CIVIL_OPTIONS,
  TIPO_CONTRATO_OPTIONS,
  JORNADA_OPTIONS,
  MONEDA_OPTIONS,
  TIENE_CONYUGE_OPTIONS,
} from '../constants/employee-enums';
import styles from '../../configuration/UsersManagementPage.module.css';
import { textRules, emailRules, optionalNoSqlInjection } from '../../../../lib/formValidation';
import {
  MAX_MONEY_AMOUNT,
  formatCurrencyInput,
  getCurrencySymbol,
  isMoneyOverMax,
  parseCurrencyInput,
} from '../../../../lib/currencyFormat';

interface EmployeeCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (employeeId: number) => void;
}

const defaultIdEmpresa = (companies: { id: number }[], activeId: string | undefined): number | undefined => {
  if (!companies.length) return undefined;
  const activeNum = activeId ? parseInt(activeId, 10) : NaN;
  const activeInList = !isNaN(activeNum) && companies.some((c) => c.id === activeNum);
  return activeInList ? activeNum : companies[0].id;
};

const disabledFutureDate = (current: dayjs.Dayjs) => current.isAfter(dayjs().endOf('day'));

export function EmployeeCreateModal({ open, onClose, onSuccess }: EmployeeCreateModalProps) {
  const { modal } = AntdApp.useApp();
  const [form] = Form.useForm();
  const formValues = Form.useWatch([], form);
  const companies = useAppSelector((s) => s.auth.companies);
  const activeCompany = useAppSelector((s) => s.activeCompany.company);
  const canCreate = useAppSelector(canCreateEmployee);
  const canAssignKpitalRole = useAppSelector(canAssignKpitalRoleOnEmployeeCreate);
  const canAssignTimewiseRole = useAppSelector(canAssignTimewiseRoleOnEmployeeCreate);

  const createMutation = useCreateEmployee();
  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();
  const { data: payPeriods = [] } = usePayPeriods();
  const { data: rolesTimewise = [] } = useRolesByApp('timewise');
  const { data: rolesKpital = [] } = useRolesByApp('kpital');
  const { data: allCompanies = [] } = useAllCompaniesForHistory();
  const historialCompanies = allCompanies.length
    ? allCompanies
    : companies.map((company) => ({ id: company.id, nombre: company.nombre }));

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [activeTabKey, setActiveTabKey] = useState('personal');

  const scrollActiveTabIntoView = useCallback(() => {
    setTimeout(() => {
      const activeEl = tabsContainerRef.current?.querySelector('.ant-tabs-tab-active');
      activeEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 50);
  }, []);

  const crearAccesoTimewise = Form.useWatch('crearAccesoTimewise', form) ?? false;
  const crearAccesoKpital = Form.useWatch('crearAccesoKpital', form) ?? false;
  const crearAcceso = crearAccesoTimewise || crearAccesoKpital;
  const activo = Form.useWatch('activo', form) ?? true;
  const monedaSalarioSeleccionada = (Form.useWatch('monedaSalario', form) as string | undefined) ?? 'CRC';
  const currencySymbol = getCurrencySymbol(monedaSalarioSeleccionada);
  const empresaLaboralSeleccionada = Form.useWatch('idEmpresa', form) as number | undefined;
  const estadoInactivo = !activo;
  const { data: supervisors = [] } = useSupervisors();
  const empresaLaboralActual =
    companies.length === 1 ? companies[0]?.id : empresaLaboralSeleccionada;

  const canSubmit = useMemo(() => {
    const v = formValues ?? {};
    const base = !!(
      v.nombre?.trim() &&
      v.apellido1?.trim() &&
      v.cedula?.trim() &&
      v.email?.trim() &&
      v.codigo?.trim() &&
      v.fechaIngreso &&
      v.idDepartamento &&
      v.idPuesto &&
      v.idPeriodoPago
    );
    if (!base) return false;
    const idEmp = companies.length === 1 ? companies[0].id : v.idEmpresa;
    if (!idEmp) return false;
    if (!estadoInactivo && crearAcceso && !v.passwordInicial?.trim()) return false;
    if (!estadoInactivo && crearAccesoTimewise && canAssignTimewiseRole && !v.idRolTimewise) return false;
    if (!estadoInactivo && crearAccesoKpital && canAssignKpitalRole && !v.idRolKpital) return false;
    return true;
  }, [
    formValues,
    companies,
    estadoInactivo,
    crearAcceso,
    crearAccesoTimewise,
    crearAccesoKpital,
    canAssignTimewiseRole,
    canAssignKpitalRole,
  ]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
    } else if (companies.length) {
      const def = defaultIdEmpresa(companies, activeCompany?.id);
      form.setFieldValue('idEmpresa', def);
    }
  }, [open, form, companies, activeCompany?.id]);

  useEffect(() => {
    if (open) setActiveTabKey('personal');
  }, [open]);

  const handleSubmit = async () => {
    if (!canCreate) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      modal.confirm({
        title: 'Confirmar creación de empleado',
        content: '¿Está seguro de crear este empleado?',
        icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
        okText: 'Sí, crear',
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
    const idEmpresa =
      companies.length === 1 ? companies[0].id : (values?.idEmpresa as number | undefined);
    if (!values || idEmpresa == null) return;

    const payload = {
      idEmpresa,
      codigo: values.codigo?.trim() ?? '',
      cedula: values.cedula ?? '',
      nombre: values.nombre ?? '',
      apellido1: values.apellido1 ?? '',
      apellido2: values.apellido2 || undefined,
      email: values.email ?? '',
      genero: values.genero || undefined,
      estadoCivil: values.estadoCivil || undefined,
      cantidadHijos: values.cantidadHijos ?? 0,
      telefono: values.telefono || undefined,
      direccion: values.direccion || undefined,
      idDepartamento: values.idDepartamento || undefined,
      idPuesto: values.idPuesto || undefined,
      idSupervisor: values.idSupervisor || undefined,
      fechaIngreso: values.fechaIngreso
        ? dayjs(values.fechaIngreso).format('YYYY-MM-DD')
        : '',
      tipoContrato: values.tipoContrato || undefined,
      jornada: values.jornada || undefined,
      idPeriodoPago: values.idPeriodoPago || undefined,
      salarioBase: values.salarioBase ?? undefined,
      monedaSalario: values.monedaSalario || 'CRC',
      numeroCcss: values.numeroCcss?.trim() || undefined,
      cuentaBanco: values.cuentaBanco || undefined,
      vacacionesAcumuladas: values.vacacionesAcumuladas != null ? String(values.vacacionesAcumuladas) : undefined,
      cesantiaAcumulada: values.cesantiaAcumulada != null ? String(values.cesantiaAcumulada) : undefined,
      provisionesAguinaldo: (values.provisionesAguinaldo ?? []).map((item: {
        idEmpresa: number;
        montoProvisionado: number;
        fechaInicioLaboral: dayjs.Dayjs;
        fechaFinLaboral?: dayjs.Dayjs;
        registroEmpresa?: string;
        estado?: 1 | 2;
      }) => ({
        idEmpresa: item.idEmpresa,
        montoProvisionado: Number(item.montoProvisionado ?? 0),
        fechaInicioLaboral: dayjs(item.fechaInicioLaboral).format('YYYY-MM-DD'),
        fechaFinLaboral: item.fechaFinLaboral ? dayjs(item.fechaFinLaboral).format('YYYY-MM-DD') : undefined,
        registroEmpresa: item.registroEmpresa?.trim() || undefined,
        estado: item.estado ?? 1,
      })),
      crearAccesoTimewise: !estadoInactivo && !!values.crearAccesoTimewise,
      crearAccesoKpital: !estadoInactivo && !!values.crearAccesoKpital,
      idRolTimewise: canAssignTimewiseRole ? values.idRolTimewise || undefined : undefined,
      idRolKpital: canAssignKpitalRole ? values.idRolKpital || undefined : undefined,
      passwordInicial: values.passwordInicial || undefined,
    };

    if (!estadoInactivo && crearAcceso && !payload.passwordInicial) {
      form.setFields([{ name: 'passwordInicial', errors: ['Requerido cuando se crea acceso digital'] }]);
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: (res: { data?: { employee?: { id: number } } }) => {
        onClose();
        if (res?.data?.employee?.id) {
          onSuccess?.(res.data.employee.id);
        }
      },
    });
  };

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
            <Form.Item name="fechaNacimiento" label="Fecha Nacimiento">
              <DatePicker placeholder="dd/mm/aaaa" format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="genero" label="Género" initialValue="Otro">
              <Select options={GENERO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="estadoCivil" label="Estado Civil" initialValue="Soltero">
              <Select options={ESTADO_CIVIL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="cantidadHijos" label="Cantidad Hijos" initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="tieneConyuge" label="Tiene Cónyuge" initialValue="No">
              <Select options={TIENE_CONYUGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
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
          <Col span={12}>
            <Form.Item name="codigoPostal" label="Código Postal" rules={[{ validator: optionalNoSqlInjection }]}>
              <Input placeholder="0" maxLength={20} />
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
          {companies.length === 1 ? (
            <Col span={12}>
              <Form.Item label="Empresa *">
                <Input value={companies[0].nombre} disabled />
              </Form.Item>
            </Col>
          ) : (
            <Col span={12}>
              <Form.Item
                name="idEmpresa"
                label="Empresa *"
                rules={[{ required: true }]}
                initialValue={defaultIdEmpresa(companies, activeCompany?.id)}
              >
                <Select
                  showSearch
                  placeholder="Escribir o seleccionar empresa"
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
            <Form.Item name="idDepartamento" label="Departamento *" rules={[{ required: true }]}>
              <Select placeholder="Seleccionar" options={departments.map((d: { id: number; nombre: string }) => ({ value: d.id, label: d.nombre }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="idPuesto" label="Puesto *" rules={[{ required: true }]}>
              <Select placeholder="Seleccionar" options={positions.map((p: { id: number; nombre: string }) => ({ value: p.id, label: p.nombre }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="fechaIngreso"
              label="Fecha de Ingreso *"
              rules={[
                { required: true },
                {
                  validator: (_, v) =>
                    !v || dayjs(v).isBefore(dayjs().add(1, 'day')) ? Promise.resolve() : Promise.reject('No puede ser futura'),
                },
              ]}
            >
              <DatePicker placeholder="dd/mm/aaaa" format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="tipoContrato" label="Tipo de Contrato">
              <Select allowClear placeholder="Seleccionar" options={TIPO_CONTRATO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="idPeriodoPago" label="Periodo de Pago *" rules={[{ required: true }]}>
              <Select placeholder="Seleccionar" options={payPeriods.map((p: { id: number; nombre: string }) => ({ value: p.id, label: p.nombre }))} />
            </Form.Item>
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
              extra="Formato: S00000 (ej: S00887). Se generará KP{id}-{sufijo}"
            >
              <Input placeholder="S00000" maxLength={45} />
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
                initialValue={0}
                rules={[
                { validator: (_, v) => {
                  if (v == null || v === '') return Promise.resolve();
                  const n = Number(v);
                  if (isNaN(n) || n <= 0) return Promise.reject(new Error('El salario debe ser mayor a cero'));
                  if (isMoneyOverMax(n)) return Promise.reject(new Error('Monto demasiado alto'));
                  return Promise.resolve();
                } },
                ]}
              >
                <InputNumber
                  min={0.01}
                  max={MAX_MONEY_AMOUNT}
                  precision={2}
                  formatter={(value) => formatCurrencyInput(value, currencySymbol)}
                  parser={parseCurrencyInput}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          <Col span={12}>
            <Form.Item name="monedaSalario" label="Moneda" initialValue="CRC">
              <Select options={MONEDA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="numeroCcss"
              label="Número CCSS"
              rules={[
                { validator: optionalNoSqlInjection },
                { validator: (_, v) => { const s = (v ?? '').toString().trim(); if (!s) return Promise.resolve(); return (s.length >= 4 && s.length <= 30) ? Promise.resolve() : Promise.reject(new Error('4 a 30 caracteres')); } },
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
              <Form.Item name="idSupervisor" label="Supervisor" extra="Empleados con rol Supervisor, Supervisor Global o Master en TimeWise (según empresa seleccionada).">
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
          {estadoInactivo && (
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: 16 }}>
              Para habilitar el acceso al sistema, active primero el empleado en el bloque Estado (arriba).
            </p>
          )}
          <Row gutter={[12, 12]} className={styles.companyFormGrid}>
            <Col span={12}>
              <Form.Item name="crearAccesoTimewise" label="Crear acceso a TimeWise" valuePropName="checked">
                <Switch disabled={estadoInactivo || !canAssignTimewiseRole} />
              </Form.Item>
              {!canAssignTimewiseRole && (
                <p style={{ color: '#64748b', fontSize: '12px', marginTop: -8, marginBottom: 0 }}>
                  Sin permiso para asignar roles TimeWise.
                </p>
              )}
              {crearAccesoTimewise && !estadoInactivo && canAssignTimewiseRole && (
                <Form.Item name="idRolTimewise" label="Rol en TimeWise *" rules={[{ required: true, message: 'Seleccione rol TimeWise' }]}>
                  <Select
                    allowClear
                    placeholder="Seleccionar rol TimeWise"
                    options={rolesTimewise.map((role) => ({ value: role.id, label: role.nombre }))}
                  />
                </Form.Item>
              )}
            </Col>
            <Col span={12}>
              <Form.Item name="crearAccesoKpital" label="Crear acceso a KPITAL" valuePropName="checked">
                <Switch disabled={estadoInactivo || !canAssignKpitalRole} />
              </Form.Item>
              {!canAssignKpitalRole && (
                <p style={{ color: '#64748b', fontSize: '12px', marginTop: -8, marginBottom: 0 }}>
                  Sin permiso para asignar roles KPITAL.
                </p>
              )}
              {crearAccesoKpital && !estadoInactivo && canAssignKpitalRole && (
                <Form.Item name="idRolKpital" label="Rol en KPITAL *" rules={[{ required: true, message: 'Seleccione rol KPITAL' }]}>
                  <Select
                    allowClear
                    placeholder="Seleccionar rol KPITAL"
                    options={rolesKpital.map((role) => ({ value: role.id, label: role.nombre }))}
                  />
                </Form.Item>
              )}
            </Col>
            {crearAcceso && !estadoInactivo && (
              <Col span={24}>
                <Form.Item
                  name="passwordInicial"
                  label="Contraseña inicial *"
                  rules={textRules({ required: true, min: 8, max: 128 })}
                >
                  <Input.Password placeholder="Mínimo 8 caracteres" />
                </Form.Item>
              </Col>
            )}
          </Row>
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
                label="Vacaciones Acumuladas"
                initialValue={0}
                rules={[
                  {
                    validator: (_, value) => {
                      if (value == null || value === '') return Promise.resolve();
                      const numericValue = Number(value);
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
                extra="Monto en moneda, 0 o mayor"
              >
                <InputNumber
                  min={0}
                  max={MAX_MONEY_AMOUNT}
                  precision={2}
                  formatter={(value) => formatCurrencyInput(value, currencySymbol)}
                  parser={parseCurrencyInput}
                  style={{ width: '100%' }}
                  placeholder={`${currencySymbol} 0.00`}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cesantiaAcumulada"
                label="Cesantía Acumulada"
                initialValue={0}
                rules={[
                  {
                    validator: (_, value) => {
                      if (value == null || value === '') return Promise.resolve();
                      const numericValue = Number(value);
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
                extra="Monto en moneda, 0 o mayor"
              >
                <InputNumber
                  min={0}
                  max={MAX_MONEY_AMOUNT}
                  precision={2}
                  formatter={(value) => formatCurrencyInput(value, currencySymbol)}
                  parser={parseCurrencyInput}
                  style={{ width: '100%' }}
                  placeholder={`${currencySymbol} 0.00`}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.List name="provisionesAguinaldo">
            {(fields, { add, remove }) => (
              <div className={styles.historicoProvisionBlock}>
                <p className={styles.sectionTitle}>Provisión de Aguinaldo del Empleado</p>
                <p className={styles.sectionDescription}>
                  Agregue los registros de provisión de aguinaldo por empresa (traslados, montos y fechas laborales).
                </p>
                {fields.length > 0 && (
                  <div className={styles.historicoTableWrap}>
                    <div className={`${styles.historicoTableRow} ${styles.historicoTableHeader}`}>
                      <div>Empresa</div>
                      <div>Monto Provisionado</div>
                      <div>Fecha Inicio Laboral</div>
                      <div>Fecha Fin Laboral</div>
                      <div>Registro de Empresa</div>
                      <div>Estado</div>
                      <div className={styles.historicoActionHeader}>Acciones</div>
                    </div>
                    {fields.map((field) => (
                      <div key={field.key} className={styles.historicoTableRow}>
                        <Form.Item
                          className={styles.historicoCellItem}
                          name={[field.name, 'idEmpresa']}
                          rules={[
                            { required: true, message: 'Seleccione empresa' },
                            {
                              validator: (_, value) => {
                                if (!value || !empresaLaboralActual) return Promise.resolve();
                                if (Number(value) === Number(empresaLaboralActual)) {
                                  return Promise.reject(new Error('Debe ser distinta a la empresa laboral actual'));
                                }
                                return Promise.resolve();
                              },
                            },
                          ]}
                        >
                          <Select
                            showSearch
                            placeholder="Seleccione empresa *"
                            options={historialCompanies
                              .filter((company) => company.id !== empresaLaboralActual)
                              .map((company) => ({ value: company.id, label: company.nombre }))}
                            filterOption={(input, option) =>
                              (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                            optionFilterProp="label"
                          />
                        </Form.Item>

                        <Form.Item
                          className={styles.historicoCellItem}
                          name={[field.name, 'montoProvisionado']}
                          initialValue={0}
                          rules={[
                            { required: true, message: 'Monto requerido' },
                            {
                              validator: (_, value) => {
                              if (value == null || value === '') return Promise.resolve();
                              const numericValue = Number(value);
                              if (numericValue < 0) return Promise.reject(new Error('No puede ser negativo'));
                              if (isMoneyOverMax(numericValue)) return Promise.reject(new Error('Monto demasiado alto'));
                              return Promise.resolve();
                            },
                          },
                        ]}
                      >
                          <InputNumber
                            min={0}
                            max={MAX_MONEY_AMOUNT}
                            precision={2}
                            formatter={(value) => formatCurrencyInput(value, currencySymbol)}
                            parser={parseCurrencyInput}
                            style={{ width: '100%' }}
                            placeholder={`${currencySymbol} 0.00`}
                          />
                        </Form.Item>

                        <Form.Item
                          className={styles.historicoCellItem}
                          name={[field.name, 'fechaInicioLaboral']}
                          rules={[{ required: true, message: 'Fecha inicio requerida' }]}
                        >
                          <DatePicker
                            placeholder="dd/mm/aaaa"
                            format="DD/MM/YYYY"
                            style={{ width: '100%' }}
                            disabledDate={disabledFutureDate}
                          />
                        </Form.Item>

                        <Form.Item
                          className={styles.historicoCellItem}
                          name={[field.name, 'fechaFinLaboral']}
                          dependencies={[['provisionesAguinaldo', field.name, 'fechaInicioLaboral']]}
                          rules={[
                            {
                              validator: (_, value) => {
                                if (!value) return Promise.resolve();
                                const fechaInicio = form.getFieldValue(['provisionesAguinaldo', field.name, 'fechaInicioLaboral']);
                                if (dayjs(value).isAfter(dayjs(), 'day')) {
                                  return Promise.reject(new Error('No puede ser futura'));
                                }
                                if (fechaInicio && dayjs(value).isBefore(dayjs(fechaInicio), 'day')) {
                                  return Promise.reject(new Error('Debe ser igual o posterior al inicio'));
                                }
                                return Promise.resolve();
                              },
                            },
                          ]}
                        >
                          <DatePicker
                            placeholder="dd/mm/aaaa"
                            format="DD/MM/YYYY"
                            style={{ width: '100%' }}
                            disabledDate={disabledFutureDate}
                          />
                        </Form.Item>

                        <Form.Item className={styles.historicoCellItem} name={[field.name, 'registroEmpresa']} rules={textRules({ max: 500 })}>
                          <Input placeholder="Traslado de empresa" maxLength={500} />
                        </Form.Item>

                        <Form.Item
                          className={styles.historicoCellItem}
                          name={[field.name, 'estado']}
                          initialValue={1}
                          rules={[{ required: true, message: 'Seleccione estado' }]}
                        >
                          <Select
                            options={[
                              { value: 1, label: 'Pendiente' },
                              { value: 2, label: 'Pagado' },
                            ]}
                          />
                        </Form.Item>

                        <div className={styles.historicoActionCell}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                            aria-label="Eliminar registro"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {fields.length === 0 && (
                  <p className={styles.historicoEmptyHint}>
                    No hay registros de provisión de aguinaldo.
                  </p>
                )}
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  className={styles.historicoAddBtn}
                  onClick={() => add({ montoProvisionado: 0, estado: 1, registroEmpresa: 'Traslado de empresa' })}
                >
                  Agregar Registro
                </Button>
              </div>
            )}
          </Form.List>
        </div>
      ),
    },
  ];

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
              <UserAddOutlined />
            </div>
            <span>Crear Nuevo Empleado</span>
          </div>
          <Flex align="center" gap={12} className={styles.companyModalHeaderRight}>
            <div className={styles.companyModalEstadoPaper}>
              <span style={{ fontWeight: 500, fontSize: 14, color: activo ? '#20638d' : '#64748b' }}>
                {activo ? 'Activo' : 'Inactivo'}
              </span>
              <Switch checked={activo} onChange={(v) => form.setFieldValue('activo', v)} />
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
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        preserve={false}
        initialValues={{ activo: true }}
        className={styles.companyFormContent}
      >
        <div ref={tabsContainerRef}>
          <Tabs
            activeKey={activeTabKey}
            onChange={(key) => {
              setActiveTabKey(key);
              scrollActiveTabIntoView();
            }}
            items={tabItems}
            className={`${styles.tabsWrapper} ${styles.companyModalTabs} ${styles.employeeModalTabsScroll}`}
          />
        </div>
        <div className={styles.companyModalFooter}>
          <Button onClick={onClose} className={styles.companyModalBtnCancel}>
            Cancelar
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<UserAddOutlined />}
            loading={createMutation.isPending}
            disabled={!canCreate || !canSubmit}
            className={styles.companyModalBtnSubmit}
          >
            Crear Empleado
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
