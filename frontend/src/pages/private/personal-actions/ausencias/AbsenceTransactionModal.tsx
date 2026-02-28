import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { CalendarOutlined, CloseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { PayrollListItem } from '../../../../api/payroll';
import type { PayrollMovementListItem } from '../../../../api/payrollMovements';
import sharedStyles from '../../configuration/UsersManagementPage.module.css';

export type AbsenceType = 'JUSTIFICADA' | 'NO_JUSTIFICADA';
const { Text } = Typography;

export interface AbsenceTransactionLine {
  key: string;
  payrollId?: number;
  fechaEfecto?: Dayjs;
  movimientoId?: number;
  tipoAusencia: AbsenceType;
  cantidad?: number;
  monto?: number;
  remuneracion: boolean;
  formula: string;
}

export interface AbsenceFormDraft {
  idEmpresa: number;
  idEmpleado: number;
  observacion?: string;
  lines: AbsenceTransactionLine[];
}

interface AbsenceTransactionModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  title: string;
  companies: Array<{ id: number | string; nombre: string }>;
  employees: Array<{
    id: number;
    idEmpresa: number;
    codigo: string;
    nombre: string;
    apellido1: string;
    apellido2?: string | null;
    idPeriodoPago?: number | null;
    monedaSalario?: string | null;
  }>;
  payrolls: PayrollListItem[];
  movements: PayrollMovementListItem[];
  actionTypeIdForAbsence?: number;
  initialCompanyId?: number;
  initialDraft?: AbsenceFormDraft;
  onCancel: () => void;
  onSubmit: (payload: AbsenceFormDraft) => void;
}

interface HeaderValues {
  idEmpresa?: number;
  idEmpleado?: number;
  observacion?: string;
}

function buildEmptyLine(): AbsenceTransactionLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipoAusencia: 'JUSTIFICADA',
    remuneracion: true,
    formula: '',
  };
}

export function AbsenceTransactionModal({
  open,
  mode,
  title,
  companies,
  employees,
  payrolls,
  movements,
  actionTypeIdForAbsence,
  initialCompanyId,
  initialDraft,
  onCancel,
  onSubmit,
}: AbsenceTransactionModalProps) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<HeaderValues>();
  const [lines, setLines] = useState<AbsenceTransactionLine[]>([buildEmptyLine()]);
  const [employeePayrollConfig, setEmployeePayrollConfig] = useState<{
    idPeriodoPago?: number;
    moneda?: string;
  } | null>(null);
  const lastLineRef = useRef<HTMLDivElement>(null);
  const prevEmployeeIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;

    if (initialDraft) {
      form.setFieldsValue({
        idEmpresa: initialDraft.idEmpresa,
        idEmpleado: initialDraft.idEmpleado,
        observacion: initialDraft.observacion,
      });
      setLines(initialDraft.lines.length > 0 ? initialDraft.lines : [buildEmptyLine()]);
      return;
    }

    form.setFieldsValue({ idEmpresa: initialCompanyId });
    setLines([buildEmptyLine()]);
  }, [open, initialDraft, initialCompanyId, form]);

  const selectedCompanyId = Form.useWatch('idEmpresa', form);
  const selectedEmployeeId = Form.useWatch('idEmpleado', form);

  // Al cambiar de empleado se reinician las líneas porque cada empleado tiene planillas distintas
  useEffect(() => {
    if (!open) {
      prevEmployeeIdRef.current = undefined;
      return;
    }
    const prev = prevEmployeeIdRef.current;
    const current = selectedEmployeeId;
    if (prev !== undefined && prev !== current) {
      setLines([buildEmptyLine()]);
    }
    prevEmployeeIdRef.current = current;
  }, [open, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId || !selectedCompanyId) {
      setEmployeePayrollConfig(null);
      return;
    }
    const employee = employees.find(
      (item) => item.id === selectedEmployeeId && item.idEmpresa === selectedCompanyId,
    );
    if (!employee) {
      setEmployeePayrollConfig(null);
      return;
    }
    setEmployeePayrollConfig({
      idPeriodoPago: employee.idPeriodoPago ?? undefined,
      moneda: (employee.monedaSalario ?? '').toUpperCase() || undefined,
    });
  }, [selectedCompanyId, selectedEmployeeId, employees]);

  const employeesByCompany = useMemo(() => {
    if (!selectedCompanyId) return [];
    return employees.filter((employee) => employee.idEmpresa === selectedCompanyId);
  }, [employees, selectedCompanyId]);

  const payrollsByCompany = useMemo(() => {
    if (!selectedCompanyId) return [];
    let list = payrolls.filter((payroll) => payroll.idEmpresa === selectedCompanyId);
    if (employeePayrollConfig?.idPeriodoPago) {
      list = list.filter(
        (payroll) => Number(payroll.idPeriodoPago) === Number(employeePayrollConfig.idPeriodoPago),
      );
    }
    if (employeePayrollConfig?.moneda) {
      list = list.filter(
        (payroll) => (payroll.moneda ?? '').toUpperCase() === employeePayrollConfig.moneda,
      );
    }
    return list;
  }, [payrolls, selectedCompanyId, employeePayrollConfig]);

  const filteredMovements = useMemo(() => {
    if (!selectedCompanyId) return [];
    let list = movements.filter((movement) => movement.idEmpresa === selectedCompanyId);

    if (actionTypeIdForAbsence) {
      list = list.filter((movement) => movement.idTipoAccionPersonal === actionTypeIdForAbsence);
    }

    const selectedIds = new Set(lines.map((line) => line.movimientoId).filter(Boolean));
    list = list.filter((movement) => movement.esInactivo === 0 || selectedIds.has(movement.id));

    return list;
  }, [movements, selectedCompanyId, actionTypeIdForAbsence, lines]);

  const isLineComplete = (line: AbsenceTransactionLine): boolean => {
    const hasPayroll = !!line.payrollId;
    const hasFecha = !!line.fechaEfecto;
    const hasMovement = !!line.movimientoId;
    const hasCantidad = line.cantidad != null && Number(line.cantidad) > 0;
    const hasMonto = line.monto != null && Number(line.monto) >= 0;
    const hasFormula = line.formula.trim().length > 0;
    return hasPayroll && hasFecha && hasMovement && hasCantidad && hasMonto && hasFormula;
  };

  const updateLine = (lineKey: string, changes: Partial<AbsenceTransactionLine>) => {
    setLines((prev) => prev.map((line) => (line.key === lineKey ? { ...line, ...changes } : line)));
  };

  const handlePayrollChange = (lineKey: string, payrollId?: number) => {
    const payroll = payrollsByCompany.find((item) => item.id === payrollId);
    updateLine(lineKey, {
      payrollId,
      fechaEfecto: payroll?.fechaFinPeriodo ? dayjs(payroll.fechaFinPeriodo) : undefined,
    });
  };

  const handleMovimientoChange = (lineKey: string, movimientoId?: number) => {
    const movement = filteredMovements.find((m) => m.id === movimientoId);
    updateLine(lineKey, {
      movimientoId,
      formula: movement?.formulaAyuda ?? movement?.descripcion ?? '',
    });
  };

  const addLine = () => {
    const lastLine = lines[lines.length - 1];
    if (!lastLine || !isLineComplete(lastLine)) {
      message.warning('Complete la linea actual antes de agregar una nueva.');
      return;
    }
    setLines((prev) => [...prev, buildEmptyLine()]);
    setTimeout(() => {
      lastLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const removeLine = (lineKey: string) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((line) => line.key !== lineKey);
    });
  };

  const handleAccept = async () => {
    const values = await form.validateFields();
    if (lines.length === 0 || !lines.every(isLineComplete)) {
      message.error('Complete todas las lineas antes de crear/guardar la ausencia.');
      return;
    }
    onSubmit({
      idEmpresa: values.idEmpresa!,
      idEmpleado: values.idEmpleado!,
      observacion: values.observacion,
      lines,
    });
  };

  const canSubmit =
    !!selectedCompanyId &&
    !!selectedEmployeeId &&
    lines.length > 0 &&
    lines.every(isLineComplete);

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      className={sharedStyles.companyModal}
      closable={false}
      footer={null}
      width={1180}
      destroyOnClose
      title={(
        <Flex justify="space-between" align="center" wrap="nowrap" style={{ width: '100%', gap: 16 }}>
          <div className={sharedStyles.companyModalHeader}>
            <div className={sharedStyles.companyModalHeaderIcon}>
              <CalendarOutlined />
            </div>
            <span>{title}</span>
          </div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onCancel}
            aria-label="Cerrar"
            className={sharedStyles.companyModalCloseBtn}
          />
        </Flex>
      )}
    >
      <Form form={form} layout="vertical" className={sharedStyles.companyFormContent}>
        <Card size="small" style={{ marginBottom: 16, border: '1px solid #e8ecf0', borderRadius: 10 }}>
          <Flex gap={12} wrap="wrap">
            <Form.Item
              style={{ flex: '1 1 300px', marginBottom: 0 }}
              name="idEmpresa"
              label="Empresa"
              rules={[{ required: true, message: 'Seleccione la empresa' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Seleccione empresa"
                options={companies.map((company) => ({
                  value: Number(company.id),
                  label: company.nombre,
                }))}
              />
            </Form.Item>

            {selectedCompanyId ? (
              <Form.Item
                style={{ flex: '1 1 380px', marginBottom: 0 }}
                name="idEmpleado"
                label="Empleado"
                rules={[{ required: true, message: 'Seleccione el empleado' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Seleccione empleado"
                  options={employeesByCompany.map((employee) => ({
                    value: employee.id,
                    label: `${employee.nombre} ${employee.apellido1} (${employee.codigo})`,
                  }))}
                />
              </Form.Item>
            ) : null}
          </Flex>

          <Form.Item name="observacion" label="Observacion" style={{ marginTop: 12, marginBottom: 0 }}>
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Card>

        {selectedCompanyId && selectedEmployeeId ? (
          <Card
            size="small"
            title="Líneas de Transacción"
            style={{ border: '1px solid #e8ecf0', borderRadius: 10 }}
          >
            <div style={{ maxHeight: 420, overflowY: 'auto', marginTop: 8 }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              {lines.map((line, index) => {
                const selectedMovement = filteredMovements.find((movement) => movement.id === line.movimientoId);

                return (
                  <div key={line.key} ref={index === lines.length - 1 ? lastLineRef : undefined}>
                  <Card
                    size="small"
                    title={`Línea ${index + 1}`}
                    style={{ border: '1px solid #e8ecf0', borderRadius: 8 }}
                    extra={(
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length <= 1}
                      >
                        Eliminar
                      </Button>
                    )}
                  >
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <Row gutter={[16, 12]}>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>1. Periodo de pago (Planilla)</div>
                          <Select
                            style={{ width: '100%' }}
                            showSearch
                            optionFilterProp="label"
                            value={line.payrollId}
                            placeholder="Seleccione planilla"
                            options={payrollsByCompany.map((payroll) => ({
                              value: payroll.id,
                              label: payroll.nombrePlanilla ?? `Planilla #${payroll.id}`,
                            }))}
                            onChange={(value) => handlePayrollChange(line.key, value)}
                          />
                          {payrollsByCompany.length === 0 ? (
                            <Alert
                              type="error"
                              showIcon
                              message="No hay planillas que coincidan con empresa, periodo de pago y moneda del empleado."
                              className={`${sharedStyles.infoBanner} ${sharedStyles.dangerType}`}
                              style={{ marginTop: 10 }}
                            />
                          ) : null}
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>2. Movimiento</div>
                          <Tooltip title={!line.payrollId ? 'Seleccione primero el periodo de pago' : undefined}>
                            <Select
                              style={{ width: '100%' }}
                              showSearch
                              optionFilterProp="label"
                              disabled={!line.payrollId}
                              placeholder={!line.payrollId ? 'Seleccione planilla primero' : 'Seleccione movimiento'}
                              value={line.movimientoId}
                              onChange={(value) => handleMovimientoChange(line.key, value)}
                              options={filteredMovements.map((movement) => ({
                                value: movement.id,
                                label: `${movement.nombre}${movement.esInactivo === 1 ? ' (Inactivo)' : ''}`,
                                disabled: movement.esInactivo === 1 && movement.id !== line.movimientoId,
                              }))}
                            />
                          </Tooltip>
                          {selectedMovement?.esInactivo === 1 ? (
                            <Tag color="orange" style={{ marginTop: 6 }}>Inactivo</Tag>
                          ) : null}
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>3. Tipo de Ausencia</div>
                          <Tooltip title={!line.movimientoId ? 'Seleccione primero el movimiento' : undefined}>
                            <Select
                              style={{ width: '100%' }}
                              disabled={!line.movimientoId}
                              placeholder={!line.movimientoId ? 'Seleccione movimiento primero' : 'Seleccione tipo'}
                              value={line.tipoAusencia}
                              onChange={(value) => updateLine(line.key, { tipoAusencia: value })}
                              options={[
                                { value: 'JUSTIFICADA', label: 'Justificada' },
                                { value: 'NO_JUSTIFICADA', label: 'No justificada' },
                              ]}
                            />
                          </Tooltip>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>4. Cantidad</div>
                          <Tooltip title={!line.movimientoId ? 'Seleccione primero el movimiento' : undefined}>
                            <InputNumber
                              min={0}
                              precision={0}
                              step={1}
                              style={{ width: '100%' }}
                              disabled={!line.movimientoId}
                              placeholder={!line.movimientoId ? '-' : undefined}
                              value={line.cantidad}
                              onChange={(value) => updateLine(line.key, { cantidad: value ?? undefined })}
                            />
                          </Tooltip>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>
                            {`5. Monto (${employeePayrollConfig?.moneda ?? 'MONEDA'})`}
                          </div>
                          <Tooltip title={!line.movimientoId ? 'Seleccione primero el movimiento' : undefined}>
                            <InputNumber
                              min={0}
                              precision={2}
                              step={0.01}
                              style={{ width: '100%' }}
                              disabled={!line.movimientoId}
                              placeholder={!line.movimientoId ? '-' : undefined}
                              value={line.monto}
                              formatter={(value) => {
                                if (value == null) return '';
                                const n = Number(value);
                                if (Number.isNaN(n)) return '';
                                return new Intl.NumberFormat('es-CR', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                }).format(n);
                              }}
                              parser={(value) => {
                                if (!value) return 0;
                                const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
                                return Number.isNaN(parsed) ? 0 : parsed;
                              }}
                              onChange={(value) => updateLine(line.key, { monto: value ?? undefined })}
                            />
                          </Tooltip>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                          <div className={sharedStyles.filterLabel}>6. Remuneracion</div>
                          <Tooltip title={!line.movimientoId ? 'Seleccione primero el movimiento' : undefined}>
                            <div style={{ paddingTop: 4 }}>
                              <Switch
                                checked={line.remuneracion}
                                disabled={!line.movimientoId}
                                onChange={(value) => updateLine(line.key, { remuneracion: value })}
                                checkedChildren="Si"
                                unCheckedChildren="No"
                              />
                            </div>
                          </Tooltip>
                        </Col>
                      </Row>

                      <div style={{ borderTop: '1px solid #e8ecf0', paddingTop: 16, marginTop: 4 }}>
                        <Row gutter={[16, 12]}>
                          <Col xs={24} md={12}>
                            <div className={sharedStyles.filterLabel} style={{ color: '#94a3b8' }}>Fecha Efecto</div>
                            <DatePicker
                              style={{ width: '100%' }}
                              value={line.fechaEfecto}
                              format="YYYY-MM-DD"
                              disabled
                            />
                          </Col>
                          <Col xs={24} md={12}>
                            <div className={sharedStyles.filterLabel} style={{ color: '#94a3b8' }}>Formula</div>
                            <Input
                              value={line.formula}
                              disabled
                              readOnly
                              placeholder="Derivado del movimiento"
                            />
                          </Col>
                        </Row>
                      </div>
                    </Space>
                  </Card>
                  </div>
                );
              })}
            </Space>
            </div>
            <Flex justify="center" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e8ecf0' }}>
              <Button type="dashed" icon={<PlusOutlined />} onClick={addLine}>
                Agregar línea de transacción
              </Button>
            </Flex>
          </Card>
        ) : null}

        <div className={sharedStyles.companyModalFooter}>
          <Button onClick={onCancel} className={sharedStyles.companyModalBtnCancel}>
            Cancelar
          </Button>
          <Button
            type="primary"
            className={sharedStyles.companyModalBtnSubmit}
            disabled={!canSubmit}
            onClick={() => void handleAccept()}
            icon={mode === 'create' ? <PlusOutlined /> : undefined}
          >
            {mode === 'create' ? 'Crear ausencia' : 'Guardar cambios'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
