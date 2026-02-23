import { useEffect } from 'react';
import dayjs from 'dayjs';
import { Card, Form, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { useCreateEmployee } from '../../../queries/employees/useCreateEmployee';
import { useDepartments } from '../../../queries/catalogs/useDepartments';
import { usePositions } from '../../../queries/catalogs/usePositions';
import { usePayPeriods } from '../../../queries/catalogs/usePayPeriods';
import { useEmployees } from '../../../queries/employees/useEmployees';
import { EmployeeForm } from './components/EmployeeForm';

export function EmployeeCreatePage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const companyId = useAppSelector((s) => s.activeCompany.company?.id ?? null);
  const createMutation = useCreateEmployee();

  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();
  const { data: payPeriods = [] } = usePayPeriods();
  const { data: employeesData } = useEmployees({
    companyId,
    filters: { pageSize: 999, page: 1 },
  });
  const employees = (employeesData?.data ?? []).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    apellido1: e.apellido1,
  }));

  const crearAccesoTimewise = Form.useWatch('crearAccesoTimewise', form);
  const crearAccesoKpital = Form.useWatch('crearAccesoKpital', form);
  const crearAcceso = crearAccesoTimewise || crearAccesoKpital;

  useEffect(() => {
    if (crearAcceso) {
      form.setFieldValue('passwordRequired', true);
    } else {
      form.setFields([{ name: 'passwordInicial', errors: [] }]);
    }
  }, [crearAcceso, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (!companyId) return;

    const payload = {
      idEmpresa: parseInt(companyId, 10),
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
      numeroCcss: values.numeroCcss || undefined,
      cuentaBanco: values.cuentaBanco || undefined,
      crearAccesoTimewise: !!values.crearAccesoTimewise,
      crearAccesoKpital: !!values.crearAccesoKpital,
      passwordInicial: values.passwordInicial || undefined,
    };

    if (crearAcceso && !payload.passwordInicial) {
      form.setFields([{ name: 'passwordInicial', errors: ['Requerido cuando se crea acceso digital'] }]);
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: (res: { data?: { employee?: { id: number } } }) => {
        if (res?.data?.employee?.id) {
          navigate(`/employees/${res.data.employee.id}`);
        } else {
          navigate('/employees');
        }
      },
    });
  };

  if (!companyId) {
    return (
      <Card>
        <p>Seleccione una empresa primero.</p>
      </Card>
    );
  }

  return (
    <Card title="Nuevo Empleado">
      <EmployeeForm
        form={form}
        departments={departments}
        positions={positions}
        payPeriods={payPeriods}
        employees={employees}
      />
      <Form.Item style={{ marginTop: 16 }}>
        <Button type="primary" onClick={handleSubmit} loading={createMutation.isPending}>
          Guardar
        </Button>
      </Form.Item>
    </Card>
  );
}
