/**
 * Formulario inline de Retenciones para la planilla.
 * Réplica la lógica y estilo del módulo Acción de Personal > Retenciones.
 * Campos: Movimiento, Cantidad, Monto, Fórmula.
 * Contexto conocido: empleado, planilla, empresa.
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Collapse,
  Flex,
  Input,
  InputNumber,
  Row,
  Select,
  Tooltip,
} from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMoneyFieldFormatter } from '../../../hooks/useMoneyFieldFormatter';
import { useTransactionLines } from '../../../hooks/useTransactionLines';
import { EMPLOYEE_MONEY_MAX_DIGITS } from '../../../lib/moneyInputSanitizer';
import sharedStyles from '../configuration/UsersManagementPage.module.css';

import type {
  PayrollListItem,
  PayrollPreviewEmployeeRow,
} from '../../../api/payroll';
import type {
  AbsenceMovementCatalogItem,
  UpsertRetentionLinePayload,
} from '../../../api/personalActions';

function parseNonNegative(value: string | number | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function normalizeIntegerAmount(value: unknown, maxDigits: number): number {
  const raw = String(value ?? '');
  const onlyDigits = raw.replace(/\D+/g, '').slice(0, maxDigits);
  if (!onlyDigits) return 0;
  const parsed = Number.parseInt(onlyDigits, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

/** Salario por periodo según tipo de periodo (igual que RetentionTransactionModal). */
function calculateSalaryByPeriod(
  salaryBase: number,
  payPeriodId?: number | null,
  jornada?: string | null,
): number {
  const id = Number(payPeriodId);
  const isByHours = (jornada ?? '').trim().toLowerCase() === 'por horas';
  if (isByHours && (id === 8 || id === 11)) return 0;
  switch (id) {
    case 8:
      return salaryBase / 4;
    case 9:
      return salaryBase / 2;
    case 10:
      return salaryBase;
    case 11:
      return salaryBase / 2;
    case 12:
      return salaryBase / 30;
    case 13:
      return salaryBase * 3;
    case 14:
      return salaryBase * 6;
    case 15:
      return salaryBase * 12;
    default:
      return salaryBase;
  }
}

/** Línea del formulario de retención. */
export interface RetentionInlineLine {
  key: string;
  movimientoId?: number;
  movimientoLabel?: string;
  cantidad?: number;
  monto?: number;
  montoInput?: string;
  formula: string;
}

export interface RetentionInlineFormProps {
  idEmpresa: number;
  idEmpleado: number;
  payrollId: number;
  employeeRow: PayrollPreviewEmployeeRow;
  selectedPayroll: PayrollListItem;
  movements: AbsenceMovementCatalogItem[];
  loadingMovements: boolean;
  canViewSensitive: boolean;
  onSubmit: (lines: UpsertRetentionLinePayload[]) => Promise<void>;
  onSuccess: () => void;
}

function buildEmptyLine(): RetentionInlineLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    formula: '',
    montoInput: '',
  };
}

export function RetentionInlineForm({
  idEmpresa,
  idEmpleado,
  payrollId,
  employeeRow,
  selectedPayroll,
  movements,
  loadingMovements,
  canViewSensitive,
  onSubmit,
  onSuccess,
}: RetentionInlineFormProps) {
  const { message } = AntdApp.useApp();
  const moneyField = useMoneyFieldFormatter(EMPLOYEE_MONEY_MAX_DIGITS);

  const salarioBase = parseNonNegative(employeeRow.salarioBase);
  const idPeriodoPago = selectedPayroll.idPeriodoPago;
  const employeeCurrency = (selectedPayroll.moneda ?? 'CRC').toUpperCase();

  const isLineComplete = useCallback((line: RetentionInlineLine): boolean => {
    const hasMovement = !!line.movimientoId;
    const hasCantidad = line.cantidad != null && Number(line.cantidad) > 0;
    const hasMonto = line.monto != null && Number(line.monto) >= 0;
    return hasMovement && hasCantidad && hasMonto;
  }, []);

  const { lines, activeLineKeys, setActiveLineKeys, updateLine, addLine, removeLine } =
    useTransactionLines<RetentionInlineLine>({
      buildEmptyLine,
      isLineComplete,
      onIncompleteLine: () => {
        message.warning('Complete la línea actual antes de agregar una nueva.');
      },
    });

  useEffect(() => {
    if (activeLineKeys.length === 0 && lines.length > 0) {
      setActiveLineKeys([lines[0].key]);
    }
  }, [activeLineKeys.length, lines, setActiveLineKeys]);

  /** Filtra movimientos por empresa y tipo retención (5); mantiene activos (esInactivo===1) o ya seleccionados. */
  const filteredMovements = useMemo(() => {
    let list = movements.filter((m) => Number(m.idEmpresa) === idEmpresa);
    list = list.filter((m) => m.idTipoAccionPersonal === 5);
    const selectedIds = new Set(lines.map((line) => line.movimientoId).filter(Boolean));
    list = list.filter((movement) => movement.esInactivo === 1 || selectedIds.has(movement.id));
    return list;
  }, [movements, idEmpresa, lines]);

  /**
   * Calcula monto según movimiento: monto fijo × cantidad o base × porcentaje% × cantidad.
   * Igual que RetentionTransactionModal.
   */
  const calculateLineAmount = useCallback(
    (line: RetentionInlineLine, movimientoId?: number, cantidadValue?: number) => {
      const movement = filteredMovements.find((m) => m.id === (movimientoId ?? line.movimientoId));
      const cantidad = parseNonNegative(cantidadValue ?? line.cantidad ?? 0);

      if (!movement) {
        return { monto: 0, montoInput: '0', formula: 'Seleccione un movimiento para calcular' };
      }

      const montoFijo = parseNonNegative(movement.montoFijo);
      const porcentaje = parseNonNegative(movement.porcentaje);

      if (movement.esMontoFijo === 1 && montoFijo > 0) {
        const montoCalculado = normalizeIntegerAmount(Math.round(montoFijo * cantidad), EMPLOYEE_MONEY_MAX_DIGITS);
        return {
          monto: montoCalculado,
          montoInput: String(montoCalculado),
          formula: `Monto fijo: ${montoFijo} × ${cantidad}`,
        };
      }

      if (porcentaje > 0) {
        const baseCalculo = calculateSalaryByPeriod(salarioBase, idPeriodoPago, undefined);
        const porcentajeDecimal = porcentaje / 100;
        const monto = round2(baseCalculo * porcentajeDecimal * cantidad);
        const baseTxt = canViewSensitive ? String(round2(baseCalculo)) : '***';
        const montoCalculado = normalizeIntegerAmount(Math.round(monto), EMPLOYEE_MONEY_MAX_DIGITS);
        return {
          monto: montoCalculado,
          montoInput: String(montoCalculado),
          formula: `${baseTxt} × ${porcentaje}% × ${cantidad}`,
        };
      }

      return { monto: 0, montoInput: '0', formula: 'Sin configuración de cálculo' };
    },
    [filteredMovements, salarioBase, idPeriodoPago, canViewSensitive],
  );

  const handleMovimientoChange = useCallback(
    (lineKey: string, movimientoId?: number) => {
      const currentLine = lines.find((l) => l.key === lineKey);
      if (!currentLine) return;
      const cleaned = {
        movimientoId,
        monto: 0,
        montoInput: '0',
        formula: '',
      };
      const calculated = calculateLineAmount(currentLine, movimientoId, currentLine.cantidad);
      updateLine(lineKey, { ...cleaned, ...calculated });
    },
    [lines, calculateLineAmount, updateLine],
  );

  const handleCantidadChange = useCallback(
    (lineKey: string, cantidad?: number) => {
      const currentLine = lines.find((l) => l.key === lineKey);
      if (!currentLine) return;
      const calculated = calculateLineAmount(currentLine, currentLine.movimientoId, cantidad);
      updateLine(lineKey, { cantidad, ...calculated });
    },
    [lines, calculateLineAmount, updateLine],
  );

  const handleMontoInputChange = useCallback(
    (lineKey: string, raw: string) => {
      const onlyDigits = moneyField.sanitize(raw);
      const monto = onlyDigits.length > 0 ? (moneyField.parse(onlyDigits) ?? 0) : 0;
      updateLine(lineKey, { montoInput: onlyDigits, monto });
    },
    [moneyField, updateLine],
  );

  const buildPayloadLines = useCallback((): UpsertRetentionLinePayload[] => {
    const fechaEfecto =
      selectedPayroll.fechaFinPeriodo ?? selectedPayroll.fechaInicioPeriodo ?? dayjs().format('YYYY-MM-DD');
    const fechaEfectoStr = typeof fechaEfecto === 'string' ? fechaEfecto : dayjs(fechaEfecto).format('YYYY-MM-DD');

    return lines.map((line) => ({
      payrollId,
      fechaEfecto: fechaEfectoStr,
      movimientoId: line.movimientoId!,
      cantidad: line.cantidad ?? 0,
      monto: line.monto ?? 0,
      formula: line.formula || undefined,
    }));
  }, [lines, payrollId, selectedPayroll]);

  const handleSubmit = useCallback(async () => {
    if (lines.length === 0 || !lines.every(isLineComplete)) {
      message.error('Complete todas las líneas antes de agregar la transacción.');
      return;
    }
    const payloadLines = buildPayloadLines();
    await onSubmit(payloadLines);
    onSuccess();
  }, [lines, isLineComplete, message, buildPayloadLines, onSubmit, onSuccess]);

  const canSubmit = lines.length > 0 && lines.every(isLineComplete);
  const [submitting, setSubmitting] = useState(false);

  const doSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await handleSubmit();
    } finally {
      setSubmitting(false);
    }
  }, [handleSubmit]);

  return (
    <Card
      size="small"
      style={{
        border: '1px solid #e8ecf0',
        borderRadius: 8,
        marginTop: 12,
      }}
      bodyStyle={{ padding: 16 }}
    >
      <div style={{ fontWeight: 600, marginBottom: 12, color: '#3d4f5c' }}>Acción de Retenciones</div>
      <Collapse
        className={sharedStyles.lineCollapse}
        activeKey={activeLineKeys}
        onChange={(keys) => {
          const next = Array.isArray(keys) ? keys : keys ? [keys] : [];
          setActiveLineKeys(next);
        }}
        items={lines.map((line, index) => ({
          key: line.key,
          label: (
            <Flex justify="space-between" align="center" style={{ width: '100%', paddingRight: 8 }}>
              <span style={{ fontWeight: 600, color: '#3d4f5c' }}>Línea {index + 1}</span>
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  removeLine(line.key);
                }}
                disabled={lines.length <= 1}
              >
                Eliminar
              </Button>
            </Flex>
          ),
          children: (
            <div>
              <Row gutter={[16, 12]}>
                <Col xs={24} md={12} lg={8}>
                  <div className={sharedStyles.filterLabel}>1. Movimiento *</div>
                  <Select
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="label"
                    loading={loadingMovements}
                    value={line.movimientoId}
                    placeholder="Seleccione movimiento"
                    options={filteredMovements.map((m) => ({
                      value: m.id,
                      label: `${m.nombre} (${m.esMontoFijo === 1 ? 'Monto' : '%'})`,
                    }))}
                    onChange={(value) => handleMovimientoChange(line.key, value)}
                  />
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <div className={sharedStyles.filterLabel}>2. Cantidad *</div>
                  <Tooltip title={!line.movimientoId ? 'Seleccione primero el movimiento' : undefined}>
                    <InputNumber
                      min={1}
                      precision={0}
                      step={1}
                      style={{ width: '100%' }}
                      disabled={!line.movimientoId}
                      placeholder={!line.movimientoId ? '-' : undefined}
                      value={line.cantidad}
                      onChange={(value) => handleCantidadChange(line.key, value ?? undefined)}
                    />
                  </Tooltip>
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <div className={sharedStyles.filterLabel}>3. Monto ({employeeCurrency}) *</div>
                  <Tooltip title={!line.movimientoId ? 'Seleccione primero el movimiento' : undefined}>
                    <Input
                      style={{ width: '100%' }}
                      placeholder={!line.movimientoId ? '-' : undefined}
                      maxLength={moneyField.maxInputLength}
                      inputMode="numeric"
                      value={moneyField.formatDisplay(line.montoInput)}
                      disabled={!line.movimientoId}
                      onChange={(event) => handleMontoInputChange(line.key, event.target.value ?? '')}
                    />
                  </Tooltip>
                </Col>
                <Col xs={24} md={12}>
                  <div className={sharedStyles.filterLabel} style={{ color: '#94a3b8' }}>
                    4. Fórmula (calculado automáticamente)
                  </div>
                  <Input
                    value={line.formula || '---'}
                    disabled
                    readOnly
                    style={{ background: '#f8f9fa' }}
                    placeholder="Derivado del movimiento"
                  />
                </Col>
              </Row>
            </div>
          ),
        }))}
      />
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button type="default" icon={<PlusOutlined />} onClick={() => addLine()}>
          Agregar Línea
        </Button>
        <Button type="primary" loading={submitting} disabled={!canSubmit} onClick={() => void doSubmit()}>
          Agregar Transacción
        </Button>
      </div>
    </Card>
  );
}
