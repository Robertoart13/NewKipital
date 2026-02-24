import { Form, Input, Select, DatePicker, InputNumber, Switch } from 'antd';
import {
  GENERO_OPTIONS,
  ESTADO_CIVIL_OPTIONS,
  TIPO_CONTRATO_OPTIONS,
  JORNADA_OPTIONS,
  MONEDA_OPTIONS,
} from '../constants/employee-enums';
import type { SystemRole } from '../../../../api/securityConfig';
import dayjs from 'dayjs';
import {
  MAX_MONEY_AMOUNT,
  formatCurrencyInput,
  getCurrencySymbol,
  isMoneyOverMax,
  parseCurrencyInput,
} from '../../../../lib/currencyFormat';

interface EmployeeFormProps {
  form: ReturnType<typeof Form.useForm>[0];
  departments: { id: number; nombre: string }[];
  positions: { id: number; nombre: string }[];
  payPeriods: { id: number; nombre: string }[];
  supervisors: { id: number; nombre: string; apellido1: string }[];
  rolesTimewise?: SystemRole[];
  rolesKpital?: SystemRole[];
  readOnly?: boolean;
  /** En modo edición, código e id empresa son inmutables */
  editMode?: boolean;
}

export function EmployeeForm({
  form,
  departments,
  positions,
  payPeriods,
  supervisors,
  rolesTimewise = [],
  rolesKpital = [],
  readOnly = false,
  editMode = false,
}: EmployeeFormProps) {
  const crearAccesoTimewise = Form.useWatch('crearAccesoTimewise', form) ?? false;
  const crearAccesoKpital = Form.useWatch('crearAccesoKpital', form) ?? false;
  const monedaSalarioSeleccionada = (Form.useWatch('monedaSalario', form) as string | undefined) ?? 'CRC';
  const currencySymbol = getCurrencySymbol(monedaSalarioSeleccionada);
  const crearAcceso = crearAccesoTimewise || crearAccesoKpital;

  return (
    <Form form={form} layout="vertical" disabled={readOnly}>
      <Form.Item
        label="Sección 1 — Identificación"
        style={{ marginBottom: 8, fontWeight: 600 }}
      />
      <Form.Item name="codigo" label="Código" rules={[{ required: !editMode, max: 45 }]}>
        <Input placeholder="Ej: EMP001" maxLength={45} disabled={readOnly || editMode} />
      </Form.Item>
      <Form.Item name="cedula" label="Cédula" rules={[{ required: true, max: 30 }]}>
        <Input maxLength={30} />
      </Form.Item>
      <Form.Item name="nombre" label="Nombre" rules={[{ required: true, max: 100 }]}>
        <Input maxLength={100} />
      </Form.Item>
      <Form.Item name="apellido1" label="Apellido 1" rules={[{ required: true, max: 100 }]}>
        <Input maxLength={100} />
      </Form.Item>
      <Form.Item name="apellido2" label="Apellido 2">
        <Input maxLength={100} />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
        <Input type="email" />
      </Form.Item>

      <Form.Item
        label="Sección 2 — Datos Personales"
        style={{ marginBottom: 8, marginTop: 16, fontWeight: 600 }}
      />
      <Form.Item name="genero" label="Género">
        <Select
          allowClear
          options={GENERO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Form.Item>
      <Form.Item name="estadoCivil" label="Estado Civil">
        <Select
          allowClear
          options={ESTADO_CIVIL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Form.Item>
      <Form.Item name="cantidadHijos" label="Cantidad de Hijos" initialValue={0}>
        <InputNumber min={0} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="telefono" label="Teléfono">
        <Input maxLength={30} />
      </Form.Item>
      <Form.Item name="direccion" label="Dirección">
        <Input.TextArea />
      </Form.Item>

      <Form.Item
        label="Sección 3 — Organización"
        style={{ marginBottom: 8, marginTop: 16, fontWeight: 600 }}
      />
      <Form.Item name="idDepartamento" label="Departamento">
        <Select
          allowClear
          placeholder="Seleccionar"
          options={departments.map((d) => ({ value: d.id, label: d.nombre }))}
        />
      </Form.Item>
      <Form.Item name="idPuesto" label="Puesto">
        <Select
          allowClear
          placeholder="Seleccionar"
          options={positions.map((p) => ({ value: p.id, label: p.nombre }))}
        />
      </Form.Item>
      <Form.Item name="idSupervisor" label="Supervisor">
        <Select
          allowClear
          placeholder="Seleccionar"
          options={supervisors.map((e) => ({
            value: e.id,
            label: `${e.nombre} ${e.apellido1}`,
          }))}
        />
      </Form.Item>

      <Form.Item
        label="Sección 4 — Contrato y Pago"
        style={{ marginBottom: 8, marginTop: 16, fontWeight: 600 }}
      />
      <Form.Item
        name="fechaIngreso"
        label="Fecha Ingreso"
        rules={[
          { required: true },
          {
            validator: (_, v) =>
              !v || dayjs(v).isBefore(dayjs().add(1, 'day'))
                ? Promise.resolve()
                : Promise.reject('No puede ser futura'),
          },
        ]}
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="tipoContrato" label="Tipo Contrato">
        <Select
          allowClear
          options={TIPO_CONTRATO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Form.Item>
      <Form.Item name="jornada" label="Jornada">
        <Select
          allowClear
          options={JORNADA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </Form.Item>
      <Form.Item name="idPeriodoPago" label="Periodo de Pago">
        <Select
          allowClear
          placeholder="Seleccionar"
          options={payPeriods.map((p) => ({ value: p.id, label: p.nombre }))}
        />
      </Form.Item>
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
      <Form.Item name="monedaSalario" label="Moneda" initialValue="CRC">
        <Select options={MONEDA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
      </Form.Item>
      <Form.Item
        name="numeroCcss"
        label="CCSS"
        rules={[{ min: 4, message: 'Debe tener al menos 4 caracteres' }, { max: 30 }]}
      >
        <Input maxLength={30} />
      </Form.Item>
      <Form.Item name="cuentaBanco" label="Cuenta Banco">
        <Input maxLength={50} />
      </Form.Item>

      {!readOnly && !editMode && (
        <>
          <Form.Item
            label="Sección 5 — Acceso Digital"
            style={{ marginBottom: 8, marginTop: 16, fontWeight: 600 }}
          />
          <Form.Item name="crearAccesoTimewise" label="Crear acceso a TimeWise" valuePropName="checked">
            <Switch />
          </Form.Item>
          {crearAccesoTimewise && rolesTimewise.length > 0 && (
            <Form.Item name="idRolTimewise" label="Rol en TimeWise" rules={[{ required: true }]}>
              <Select
                allowClear
                placeholder="Seleccionar rol"
                options={rolesTimewise.map((r) => ({ value: r.id, label: r.nombre }))}
              />
            </Form.Item>
          )}
          <Form.Item name="crearAccesoKpital" label="Crear acceso a KPITAL" valuePropName="checked">
            <Switch />
          </Form.Item>
          {crearAccesoKpital && rolesKpital.length > 0 && (
            <Form.Item name="idRolKpital" label="Rol en KPITAL" rules={[{ required: true }]}>
              <Select
                allowClear
                placeholder="Seleccionar rol"
                options={rolesKpital.map((r) => ({ value: r.id, label: r.nombre }))}
              />
            </Form.Item>
          )}
          {crearAcceso && (
            <Form.Item
              name="passwordInicial"
              label="Contraseña inicial"
              rules={[{ min: 8, message: 'Mínimo 8 caracteres' }]}
            >
              <Input.Password placeholder="Mínimo 8 caracteres" />
            </Form.Item>
          )}
        </>
      )}
    </Form>
  );
}
