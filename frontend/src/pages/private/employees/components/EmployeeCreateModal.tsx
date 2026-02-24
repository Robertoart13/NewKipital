import { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, InputNumber, Switch, Tabs, Button } from 'antd';
import styles from './EmployeeCreateModal.module.css';
import {
  UserOutlined,
  UserAddOutlined,
  IdcardOutlined,
  BankOutlined,
  DollarOutlined,
  TeamOutlined,
  HistoryOutlined,
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
import {
  GENERO_OPTIONS,
  ESTADO_CIVIL_OPTIONS,
  TIPO_CONTRATO_OPTIONS,
  JORNADA_OPTIONS,
  MONEDA_OPTIONS,
  TIENE_CONYUGE_OPTIONS,
} from '../constants/employee-enums';

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

export function EmployeeCreateModal({ open, onClose, onSuccess }: EmployeeCreateModalProps) {
  const [form] = Form.useForm();
  const companies = useAppSelector((s) => s.auth.companies);
  const activeCompany = useAppSelector((s) => s.activeCompany.company);
  const canCreate = useAppSelector(canCreateEmployee);
  const canAssignKpitalRole = useAppSelector(canAssignKpitalRoleOnEmployeeCreate);
  const canAssignTimewiseRole = useAppSelector(canAssignTimewiseRoleOnEmployeeCreate);

  const createMutation = useCreateEmployee();
  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();
  const { data: payPeriods = [] } = usePayPeriods();

  const crearAccesoTimewise = Form.useWatch('crearAccesoTimewise', form) ?? false;
  const crearAccesoKpital = Form.useWatch('crearAccesoKpital', form) ?? false;
  const crearAcceso = crearAccesoTimewise || crearAccesoKpital;
  const activo = Form.useWatch('activo', form) ?? false;
  const estadoInactivo = !activo;

  useEffect(() => {
    if (!open) {
      form.resetFields();
    } else if (companies.length) {
      const def = defaultIdEmpresa(companies, activeCompany?.id);
      form.setFieldValue('idEmpresa', def);
    }
  }, [open, form, companies, activeCompany?.id]);

  const handleSubmit = async () => {
    if (!canCreate) return;
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
          <UserOutlined /> Información Personal
        </span>
      ),
      children: (
        <>
          <div className={styles.sectionTitle}>
            <UserOutlined /> Información Personal
          </div>
          <div className={styles.formGrid}>
            <Form.Item name="nombre" label="Nombre *" rules={[{ required: true, max: 100 }]}>
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="apellido1" label="Apellido *" rules={[{ required: true, max: 100 }]}>
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="cedula" label="Cédula *" rules={[{ required: true, max: 30 }]}>
              <Input maxLength={30} />
            </Form.Item>
            <Form.Item name="fechaNacimiento" label="Fecha Nacimiento">
              <DatePicker placeholder="dd/mm/aaaa" format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="genero" label="Género" initialValue="Otro">
              <Select options={GENERO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
            <Form.Item name="estadoCivil" label="Estado Civil" initialValue="Soltero">
              <Select options={ESTADO_CIVIL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
            <Form.Item name="cantidadHijos" label="Cantidad Hijos" initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="tieneConyuge" label="Tiene Cónyuge" initialValue="No">
              <Select options={TIENE_CONYUGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
          </div>
        </>
      ),
    },
    {
      key: 'contacto',
      label: (
        <span>
          <IdcardOutlined /> Información de Contacto
        </span>
      ),
      children: (
        <>
          <div className={styles.sectionTitle}>
            <IdcardOutlined /> Información de Contacto
          </div>
          <div className={styles.formGrid2}>
            <Form.Item name="telefono" label="Teléfono">
              <Input maxLength={30} placeholder="00000000" />
            </Form.Item>
            <Form.Item name="email" label="Correo Electrónico *" rules={[{ required: true, type: 'email' }]}>
              <Input type="email" />
            </Form.Item>
            <Form.Item name="direccion" label="Dirección" style={{ gridColumn: '1 / -1' }}>
              <Input placeholder="No especifica" />
            </Form.Item>
            <Form.Item name="codigoPostal" label="Código Postal">
              <Input placeholder="0" maxLength={20} />
            </Form.Item>
          </div>
        </>
      ),
    },
    {
      key: 'laboral',
      label: (
        <span>
          <BankOutlined /> Información Laboral
        </span>
      ),
      children: (
        <>
          <div className={styles.sectionTitle}>
            <BankOutlined /> Información Laboral
          </div>
          <div className={styles.formGrid}>
            {companies.length === 1 ? (
              <Form.Item label="Empresa *">
                <Input value={companies[0].nombre} disabled />
              </Form.Item>
            ) : (
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
            )}
            <Form.Item name="idDepartamento" label="Departamento *" rules={[{ required: true }]}>
              <Select placeholder="Seleccionar" options={departments.map((d: { id: number; nombre: string }) => ({ value: d.id, label: d.nombre }))} />
            </Form.Item>
            <Form.Item name="idPuesto" label="Puesto *" rules={[{ required: true }]}>
              <Select placeholder="Seleccionar" options={positions.map((p: { id: number; nombre: string }) => ({ value: p.id, label: p.nombre }))} />
            </Form.Item>
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
            <Form.Item name="tipoContrato" label="Tipo de Contrato">
              <Select allowClear placeholder="Seleccionar" options={TIPO_CONTRATO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
            <Form.Item name="idPeriodoPago" label="Periodo de Pago *" rules={[{ required: true }]}>
              <Select placeholder="Seleccionar" options={payPeriods.map((p: { id: number; nombre: string }) => ({ value: p.id, label: p.nombre }))} />
            </Form.Item>
            <Form.Item name="jornada" label="Tipo de Jornada">
              <Select allowClear placeholder="Seleccionar" options={JORNADA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
            <Form.Item
              name="codigo"
              label="Código de Empleado (sufijo) *"
              rules={[{ required: true, max: 45 }]}
              style={{ gridColumn: 'span 2' }}
              extra="Formato: S00000 (ej: S00887). Se generará KP{id}-{sufijo}"
            >
              <Input placeholder="S00000" maxLength={45} />
            </Form.Item>
          </div>
        </>
      ),
    },
    {
      key: 'financiera',
      label: (
        <span>
          <DollarOutlined /> Información Financiera
        </span>
      ),
      children: (
        <>
          <div className={styles.sectionTitle}>
            <DollarOutlined /> Información Financiera
          </div>
          <div className={styles.formGrid}>
            <Form.Item name="salarioBase" label="Salario Base" initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="monedaSalario" label="Moneda" initialValue="CRC">
              <Select options={MONEDA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </Form.Item>
            <Form.Item
              name="numeroCcss"
              label="Número CCSS"
              rules={[{ min: 4, message: 'Debe tener al menos 4 caracteres' }, { max: 30 }]}
            >
              <Input maxLength={30} />
            </Form.Item>
            <Form.Item name="cuentaBanco" label="Cuenta bancaria" style={{ gridColumn: '1 / -1' }}>
              <Input placeholder="CRC-" maxLength={50} />
            </Form.Item>
          </div>
        </>
      ),
    },
    {
      key: 'autogestion',
      label: (
        <span>
          <TeamOutlined /> Autogestión
        </span>
      ),
      children: (
        <>
          <div className={styles.sectionTitle}>
            <TeamOutlined /> Autogestión
          </div>
          {estadoInactivo && (
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: 16 }}>
              Para habilitar el acceso al sistema, active primero el empleado en la sección "Estado del Empleado" (arriba del formulario).
            </p>
          )}
          <div className={styles.formCompact}>
            <Form.Item name="crearAccesoTimewise" label="Crear acceso a TimeWise" valuePropName="checked">
              <Switch disabled={estadoInactivo || !canAssignTimewiseRole} />
            </Form.Item>
            {!canAssignTimewiseRole && (
              <p style={{ color: '#64748b', fontSize: '12px', marginTop: -8, marginBottom: 8 }}>
                Sin permiso para asignar roles TimeWise al crear empleado.
              </p>
            )}
            <Form.Item name="crearAccesoKpital" label="Crear acceso a KPITAL" valuePropName="checked">
              <Switch disabled={estadoInactivo || !canAssignKpitalRole} />
            </Form.Item>
            {!canAssignKpitalRole && (
              <p style={{ color: '#64748b', fontSize: '12px', marginTop: -8, marginBottom: 8 }}>
                Sin permiso para asignar roles KPITAL al crear empleado.
              </p>
            )}
            {crearAcceso && !estadoInactivo && (
              <Form.Item
                name="passwordInicial"
                label="Contraseña inicial"
                rules={[{ min: 8, message: 'Mínimo 8 caracteres' }]}
              >
                <Input.Password placeholder="Mínimo 8 caracteres" />
              </Form.Item>
            )}
          </div>
        </>
      ),
    },
    {
      key: 'historico',
      label: (
        <span>
          <HistoryOutlined /> Histórico Laboral
        </span>
      ),
      children: (
        <>
          <div className={styles.sectionTitle}>
            <HistoryOutlined /> Histórico Laboral
          </div>
          <p style={{ color: '#8c8c8c', margin: 0 }}>Se registrará al crear el empleado.</p>
        </>
      ),
    },
  ];

  return (
    <Modal
      className={styles.modal}
      title={
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.headerIcon}>
              <UserAddOutlined style={{ color: '#246BA3', fontSize: 24 }} />
            </div>
            <span>Crear Nuevo Empleado</span>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{ maxWidth: 1400 }}
      styles={{
        header: { marginBottom: 0, padding: 0 },
        body: { maxHeight: '70vh', overflowY: 'auto', padding: '24px' },
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <div className={styles.estadoSection}>
          <div>
            <div className={styles.estadoTitle}>Estado del Empleado</div>
            <div className={styles.estadoDesc}>
              {estadoInactivo
                ? 'El empleado está inactivo y no tendrá acceso al sistema'
                : 'El empleado está activo y puede tener acceso al sistema'}
            </div>
          </div>
          <div className={styles.estadoSwitch}>
            <span style={{ fontWeight: 500, color: estadoInactivo ? '#64748b' : '#2e7d32' }}>
              {estadoInactivo ? 'Inactivo' : 'Activo'}
            </span>
            <Form.Item
              name="activo"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
              initialValue={true}
            >
              <Switch />
            </Form.Item>
          </div>
        </div>

        <Tabs items={tabItems} size="large" className={styles.tabs} />

        <div className={styles.footer}>
          <Button onClick={onClose} className={styles.btnCancel}>
            Cancelar
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<UserAddOutlined />}
            loading={createMutation.isPending}
            disabled={!canCreate}
            className={styles.btnCreate}
          >
            Crear Empleado
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
