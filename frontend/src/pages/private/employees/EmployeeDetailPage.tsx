import { useState } from 'react';
import { Card, Breadcrumb, Descriptions, Button, Form } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppSelector } from '../../../store/hooks';
import {
  canEditEmployee,
  canInactivateEmployee,
  canReactivateEmployee,
} from '../../../store/selectors/permissions.selectors';
import { useEmployee } from '../../../queries/employees/useEmployee';
import {
  useUpdateEmployee,
  useInactivateEmployee,
  useLiquidateEmployee,
  useReactivateEmployee,
} from '../../../queries/employees';
import { useDepartments } from '../../../queries/catalogs/useDepartments';
import { usePositions } from '../../../queries/catalogs/usePositions';
import { usePayPeriods } from '../../../queries/catalogs/usePayPeriods';
import { useSupervisors } from '../../../queries/employees/useSupervisors';
import { EmployeeStatusBadge } from './components/EmployeeStatusBadge';
import { EmployeeForm } from './components/EmployeeForm';
import { EmployeeActions } from './components/EmployeeActions';

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const companyId = useAppSelector((s) => s.activeCompany.company?.id ?? null);
  const canEdit = useAppSelector(canEditEmployee);
  const canInactivate = useAppSelector(canInactivateEmployee);
  const canReactivate = useAppSelector(canReactivateEmployee);

  const { data: employee, isLoading } = useEmployee(id ? parseInt(id, 10) : null);
  const updateMutation = useUpdateEmployee();
  const inactivateMutation = useInactivateEmployee();
  const liquidateMutation = useLiquidateEmployee();
  const reactivateMutation = useReactivateEmployee();

  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();
  const { data: payPeriods = [] } = usePayPeriods();
  const { data: supervisorsRaw = [] } = useSupervisors();
  const supervisors = supervisorsRaw.filter((e) => e.id !== employee?.id);

  const handleSaveEdit = async () => {
    const values = await form.validateFields();
    if (!employee) return;

    updateMutation.mutate(
      {
        id: employee.id,
        payload: {
          cedula: values.cedula,
          nombre: values.nombre,
          apellido1: values.apellido1,
          apellido2: values.apellido2,
          email: values.email,
          genero: values.genero,
          estadoCivil: values.estadoCivil,
          cantidadHijos: values.cantidadHijos,
          telefono: values.telefono,
          direccion: values.direccion,
          idDepartamento: values.idDepartamento,
          idPuesto: values.idPuesto,
          idSupervisor: values.idSupervisor,
          fechaIngreso: values.fechaIngreso
            ? dayjs(values.fechaIngreso).format('YYYY-MM-DD')
            : undefined,
          tipoContrato: values.tipoContrato,
          jornada: values.jornada,
          idPeriodoPago: values.idPeriodoPago,
          salarioBase: values.salarioBase,
          monedaSalario: values.monedaSalario,
          numeroCcss: values.numeroCcss,
          cuentaBanco: values.cuentaBanco,
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  if (!employee && !isLoading) {
    return (
      <Card>
        <p>Empleado no encontrado.</p>
      </Card>
    );
  }

  if (isLoading || !employee) {
    return <Card loading />;
  }

  const nombreCompleto = `${employee.nombre} ${employee.apellido1}${employee.apellido2 ? ` ${employee.apellido2}` : ''}`;

  return (
    <div>
      <Breadcrumb
        items={[
          { title: <Link to="/dashboard">Inicio</Link> },
          { title: <Link to="/employees">Empleados</Link> },
          { title: nombreCompleto },
        ]}
        style={{ marginBottom: 16 }}
      />

      <Card
        title={
          <span>
            {nombreCompleto} <EmployeeStatusBadge estado={employee.estado} />
          </span>
        }
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {!editing && canEdit && employee.estado === 1 && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  form.setFieldsValue({
                    ...employee,
                    fechaIngreso: employee.fechaIngreso ? dayjs(employee.fechaIngreso) : null,
                  });
                  setEditing(true);
                }}
              >
                Editar
              </Button>
            )}
            {editing && (
              <>
                <Button onClick={() => setEditing(false)}>Cancelar</Button>
                <Button type="primary" onClick={handleSaveEdit} loading={updateMutation.isPending}>
                  Guardar
                </Button>
              </>
            )}
            {!editing && (
              <EmployeeActions
                employee={employee}
                canEdit={canEdit}
                canInactivate={canInactivate}
                canReactivate={canReactivate}
                onInactivate={(id, motivo) => inactivateMutation.mutate({ id, motivo })}
                onReactivate={(id) => reactivateMutation.mutate({ id })}
                onLiquidate={(id, fecha, motivo) =>
                  liquidateMutation.mutate({ id, fechaSalida: fecha, motivo })
                }
                inactivatePending={inactivateMutation.isPending}
                reactivatePending={reactivateMutation.isPending}
                liquidatePending={liquidateMutation.isPending}
              />
            )}
          </div>
        }
      >
        {editing ? (
          <EmployeeForm
            form={form}
            departments={departments}
            positions={positions}
            payPeriods={payPeriods}
            supervisors={supervisors}
            editMode
          />
        ) : (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Código">{employee.codigo}</Descriptions.Item>
            <Descriptions.Item label="Cédula">{employee.cedula}</Descriptions.Item>
            <Descriptions.Item label="Nombre">{employee.nombre}</Descriptions.Item>
            <Descriptions.Item label="Apellido 1">{employee.apellido1}</Descriptions.Item>
            <Descriptions.Item label="Apellido 2">{employee.apellido2 ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{employee.email}</Descriptions.Item>
            <Descriptions.Item label="Departamento">
              {employee.departamento?.nombre ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Puesto">{employee.puesto?.nombre ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Supervisor">
              {employee.supervisor
                ? `${employee.supervisor.nombre} ${employee.supervisor.apellido1}`
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Periodo de Pago">
              {employee.periodoPago?.nombre ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Fecha Ingreso">
              {employee.fechaIngreso
                ? dayjs(employee.fechaIngreso).format('DD/MM/YYYY')
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Acceso Digital">
              {employee.idUsuario ? 'Sí' : 'No'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    </div>
  );
}
