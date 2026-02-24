import { useState } from 'react';
import { Button, Modal, Form, Input, DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { EmployeeDetail } from '../../../../api/employees';

interface EmployeeActionsProps {
  employee: EmployeeDetail;
  canEdit: boolean;
  canInactivate: boolean;
  canReactivate: boolean;
  onInactivate: (id: number, motivo?: string) => void;
  onReactivate: (id: number) => void;
  onLiquidate: (id: number, fechaSalida: string, motivo?: string) => void;
  inactivatePending?: boolean;
  reactivatePending?: boolean;
  liquidatePending?: boolean;
}

export function EmployeeActions({
  employee,
  canEdit,
  canInactivate,
  canReactivate,
  onInactivate,
  onReactivate,
  onLiquidate,
  inactivatePending = false,
  reactivatePending = false,
  liquidatePending = false,
}: EmployeeActionsProps) {
  const [inactivateModal, setInactivateModal] = useState(false);
  const [liquidateModal, setLiquidateModal] = useState(false);
  const [inactivateForm] = Form.useForm();
  const [liquidateForm] = Form.useForm();

  const nombreCompleto = `${employee.nombre} ${employee.apellido1}${employee.apellido2 ? ` ${employee.apellido2}` : ''}`;
  const isActive = employee.estado === 1;

  const handleInactivateOk = () => {
    inactivateForm.validateFields().then((v) => {
      onInactivate(employee.id, v.motivo);
      setInactivateModal(false);
      inactivateForm.resetFields();
    });
  };

  const handleLiquidateOk = () => {
    liquidateForm.validateFields().then((v) => {
      onLiquidate(
        employee.id,
        dayjs(v.fechaSalida).format('YYYY-MM-DD'),
        v.motivo,
      );
      setLiquidateModal(false);
      liquidateForm.resetFields();
    });
  };

  if (!canEdit && !canInactivate && !canReactivate) return null;

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        {isActive && canInactivate && (
          <>
            <Button danger onClick={() => setInactivateModal(true)} loading={inactivatePending}>
              Inactivar
            </Button>
            <Button danger onClick={() => setLiquidateModal(true)} loading={liquidatePending}>
              Liquidar
            </Button>
          </>
        )}
        {!isActive && canReactivate && (
          <Button type="primary" onClick={() => onReactivate(employee.id)} loading={reactivatePending}>
            Reactivar
          </Button>
        )}
      </div>

      <Modal
        title={`¿Inactivar a ${nombreCompleto}?`}
        open={inactivateModal}
        onOk={handleInactivateOk}
        onCancel={() => { setInactivateModal(false); inactivateForm.resetFields(); }}
      >
        <p>Esta acción impedirá que el empleado aparezca en planillas futuras.</p>
        <Form form={inactivateForm} layout="vertical">
          <Form.Item name="motivo" label="Motivo">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`¿Liquidar a ${nombreCompleto}?`}
        open={liquidateModal}
        onOk={handleLiquidateOk}
        onCancel={() => { setLiquidateModal(false); liquidateForm.resetFields(); }}
      >
        <p>Esta acción registrará la salida definitiva del empleado.</p>
        <Form form={liquidateForm} layout="vertical">
          <Form.Item name="fechaSalida" label="Fecha de salida" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="motivo" label="Motivo">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
