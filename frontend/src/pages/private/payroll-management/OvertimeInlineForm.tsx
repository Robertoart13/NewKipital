/**
 * Formulario inline de Horas Extras para la planilla.
 * Réplica la lógica y estilo del módulo Acción de Personal > Horas Extras.
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Card, Col, Collapse, DatePicker, Flex, Input, InputNumber, Row, Select, Tooltip } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useMoneyFieldFormatter } from '../../../hooks/useMoneyFieldFormatter';
import { useTransactionLines } from '../../../hooks/useTransactionLines';
import { EMPLOYEE_MONEY_MAX_DIGITS } from '../../../lib/moneyInputSanitizer';
import sharedStyles from '../configuration/UsersManagementPage.module.css';

import type {
  PayrollListItem,
  PayrollPreviewEmployeeRow,
} from '../../../api/payroll';
import type { AbsenceMovementCatalogItem, OvertimeShiftType, UpsertOvertimeLinePayload } from '../../../api/personalActions';

const OVERTIME_SHIFT_OPTIONS: Array<{ value: OvertimeShiftType; label: string }> = [
  { value: '6', label: 'Nocturna (6 horas)' },
  { value: '7', label: 'Mixta (7 horas)' },
  { value: '8', label: 'Diurna (8 horas)' },
];

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

export interface OvertimeInlineLine {
  key: string;
  movimientoId?: number;
  movimientoLabel?: string;
  tipoJornadaHorasExtras: OvertimeShiftType;
  fechaInicioHoraExtra?: Dayjs;
  fechaFinHoraExtra?: Dayjs;
  cantidad?: number;
  monto?: number;
  montoInput?: string;
  formula: string;
}

export interface OvertimeInlineFormProps {
  idEmpresa: number;
  idEmpleado: number;
  payrollId: number;
  employeeRow: PayrollPreviewEmployeeRow;
  selectedPayroll: PayrollListItem;
  movements: AbsenceMovementCatalogItem[];
  loadingMovements: boolean;
  canViewSensitive: boolean;
  onSubmit: (lines: UpsertOvertimeLinePayload[]) => Promise<void>;
  onSuccess: () => void;
}

function buildEmptyLine(): OvertimeInlineLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipoJornadaHorasExtras: '8',
    formula: '',
    montoInput: '',
  };
}

export function OvertimeInlineForm({
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
}: OvertimeInlineFormProps) {
  const { message } = AntdApp.useApp();
  const moneyField = useMoneyFieldFormatter(EMPLOYEE_MONEY_MAX_DIGITS);

  const salarioBase = parseNonNegative(employeeRow.salarioBase);
  const idPeriodoPago = selectedPayroll.idPeriodoPago;
  const employeeCurrency = (selectedPayroll.moneda ?? 'CRC').toUpperCase();

  const isLineComplete = useCallback((line: OvertimeInlineLine): boolean => {
    const hasMovement = !!line.movimientoId;
    const hasCantidad = line.cantidad != null && Number(line.cantidad) > 0;
    const hasMonto = line.monto != null && Number(line.monto) >= 0;
    const hasFechaInicio = !!line.fechaInicioHoraExtra;
    const hasFechaFin = !!line.fechaFinHoraExtra;
    const hasTipoJornada = !!line.tipoJornadaHorasExtras;
    return hasMovement && hasCantidad && hasMonto && hasFechaInicio && hasFechaFin && hasTipoJornada;
  }, []);

  const { lines, activeLineKeys, setActiveLineKeys, updateLine, addLine, removeLine } =
    useTransactionLines<OvertimeInlineLine>({
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

  const filteredMovements = useMemo(() => {
    let list = movements.filter((m) => Number(m.idEmpresa) === idEmpresa);
    list = list.filter((m) => m.idTipoAccionPersonal === 11);
    const selectedIds = new Set(lines.map((line) => line.movimientoId).filter(Boolean));
    list = list.filter((movement) => movement.esInactivo === 1 || selectedIds.has(movement.id));
    return list;
  }, [movements, idEmpresa, lines]);

  const calculateLineAmount = useCallback(
    (line: OvertimeInlineLine, movimientoId?: number, cantidadValue?: number) => {
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
          formula: `Monto fijo: ${montoFijo} x ${cantidad}`,
        };
      }

      if (porcentaje > 0) {
        const payPeriodId = Number(idPeriodoPago);
        const jornadaHoras = Number(line.tipoJornadaHorasExtras || '8');
        const porcentajeDecimal = porcentaje / 100;
        const baseTxt = canViewSensitive ? String(round2(salarioBase)) : '***';

        if (payPeriodId === 8 || payPeriodId === 11) {
          const monto = round2(salarioBase * porcentajeDecimal * cantidad);
          const montoCalculado = normalizeIntegerAmount(Math.round(monto), EMPLOYEE_MONEY_MAX_DIGITS);
          return {
            monto: montoCalculado,
            montoInput: String(montoCalculado),
            formula: `${baseTxt} x ${porcentaje}% x ${cantidad}`,
          };
        }

        const salarioPorDia = salarioBase / 30;
        const horas = Number.isFinite(jornadaHoras) && jornadaHoras > 0 ? jornadaHoras : 8;
        const valorHora = salarioPorDia / horas;
        const monto = round2(valorHora * porcentajeDecimal * cantidad);
        const montoCalculado = normalizeIntegerAmount(Math.round(monto), EMPLOYEE_MONEY_MAX_DIGITS);
        return {
          monto: montoCalculado,
          montoInput: String(montoCalculado),
          formula: `(${baseTxt}/30)/${horas} x ${porcentaje}% x ${cantidad}`,
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
      const movement = filteredMovements.find((m) => m.id === movimientoId);
      const cleaned = {
        movimientoId,
        movimientoLabel: movement?.nombre,
        monto: 0,
        montoInput: '0',
        formula: '',
      };
      const calculated = calculateLineAmount(currentLine, movimientoId, currentLine.cantidad);
      updateLine(lineKey, { ...cleaned, ...calculated });
    },
    [lines, filteredMovements, calculateLineAmount, updateLine],
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

  const handleTipoJornadaChange = useCallback(
    (lineKey: string, tipoJornadaHorasExtras: OvertimeShiftType) => {
      const currentLine = lines.find((l) => l.key === lineKey);
      if (!currentLine) return;
      const calculated = calculateLineAmount(
        { ...currentLine, tipoJornadaHorasExtras },
        currentLine.movimientoId,
        currentLine.cantidad,
      );
      updateLine(lineKey, { tipoJornadaHorasExtras, ...calculated });
    },
    [lines, calculateLineAmount, updateLine],
  );

  const handleFechaInicioChange = useCallback(
    (lineKey: string, value?: Dayjs) => {
      const currentLine = lines.find((l) => l.key === lineKey);
      if (!currentLine) return;
      if (value && currentLine.fechaFinHoraExtra && value.isAfter(currentLine.fechaFinHoraExtra, 'day')) {
        message.error('La fecha inicio no puede ser mayor que la fecha fin.');
        return;
      }
      updateLine(lineKey, {
        fechaInicioHoraExtra: value,
        fechaFinHoraExtra: currentLine.fechaFinHoraExtra ?? value,
      });
    },
    [lines, message, updateLine],
  );

  const handleFechaFinChange = useCallback(
    (lineKey: string, value?: Dayjs) => {
      const currentLine = lines.find((l) => l.key === lineKey);
      if (
        currentLine &&
        value &&
        currentLine.fechaInicioHoraExtra &&
        value.isBefore(currentLine.fechaInicioHoraExtra, 'day')
      ) {
        message.error('La fecha fin no puede ser menor que la fecha inicio.');
        return;
      }
      updateLine(lineKey, { fechaFinHoraExtra: value });
    },
    [lines, message, updateLine],
  );

  const disableFutureDate = (current: Dayjs) => current.isAfter(dayjs().endOf('day'));
  const disableStartDate = (line: OvertimeInlineLine) => (current: Dayjs) => {
    if (disableFutureDate(current)) return true;
    if (line.fechaFinHoraExtra && current.isAfter(line.fechaFinHoraExtra, 'day')) return true;
    return false;
  };
  const disableEndDate = (line: OvertimeInlineLine) => (current: Dayjs) => {
    if (disableFutureDate(current)) return true;
    if (line.fechaInicioHoraExtra && current.isBefore(line.fechaInicioHoraExtra, 'day')) return true;
    return false;
  };

  const buildPayloadLines = useCallback((): UpsertOvertimeLinePayload[] => {
    const fechaEfecto =
      selectedPayroll.fechaFinPeriodo ?? selectedPayroll.fechaInicioPeriodo ?? dayjs().format('YYYY-MM-DD');
    const fechaEfectoStr = typeof fechaEfecto === 'string' ? fechaEfecto : dayjs(fechaEfecto).format('YYYY-MM-DD');

    return lines.map((line) => ({
      payrollId,
      fechaEfecto: fechaEfectoStr,
      movimientoId: line.movimientoId!,
      fechaInicioHoraExtra: line.fechaInicioHoraExtra!.format('YYYY-MM-DD'),
      fechaFinHoraExtra: line.fechaFinHoraExtra!.format('YYYY-MM-DD'),
      tipoJornadaHorasExtras: line.tipoJornadaHorasExtras,
      cantidad: line.cantidad ?? 0,
      monto: line.monto ?? 0,
      remuneracion: true,
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

  const handleMontoInputChange = useCallback(
    (lineKey: string, raw: string) => {
      const onlyDigits = moneyField.sanitize(raw);
      const monto = onlyDigits.length > 0 ? (moneyField.parse(onlyDigits) ?? 0) : 0;
      updateLine(lineKey, { montoInput: onlyDigits, monto });
    },
    [moneyField, updateLine],
  );

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
      <div style={{ fontWeight: 600, marginBottom: 12, color: '#3d4f5c' }}>Acción de Horas Extras</div>
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
                  <div className={sharedStyles.filterLabel}>2. Tipo de jornada *</div>
                  <Tooltip title={!line.movimientoId ? 'Seleccione primero el movimiento' : undefined}>
                    <Select
                      style={{ width: '100%' }}
                      disabled={!line.movimientoId}
                      placeholder={!line.movimientoId ? 'Seleccione movimiento primero' : 'Seleccione jornada'}
                      value={line.tipoJornadaHorasExtras}
                      onChange={(value: OvertimeShiftType) => handleTipoJornadaChange(line.key, value)}
                      options={OVERTIME_SHIFT_OPTIONS}
                    />
                  </Tooltip>
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <div className={sharedStyles.filterLabel}>3. Fecha inicio hora extra *</div>
                  <DatePicker
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                    value={line.fechaInicioHoraExtra}
                    disabled={!line.movimientoId}
                    disabledDate={disableStartDate(line)}
                    onChange={(value) => handleFechaInicioChange(line.key, value ?? undefined)}
                  />
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <div className={sharedStyles.filterLabel}>4. Fecha fin hora extra *</div>
                  <DatePicker
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                    value={line.fechaFinHoraExtra}
                    disabled={!line.movimientoId}
                    disabledDate={disableEndDate(line)}
                    onChange={(value) => handleFechaFinChange(line.key, value ?? undefined)}
                  />
                </Col>
                <Col xs={24} md={12} lg={8}>
                  <div className={sharedStyles.filterLabel}>5. Cantidad *</div>
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
                  <div className={sharedStyles.filterLabel}>6. Monto ({employeeCurrency}) *</div>
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
                    Fórmula (calculado automáticamente)
                  </div>
                  <Input value={line.formula || '---'} disabled readOnly style={{ background: '#f8f9fa' }} />
                </Col>
              </Row>
            </div>
          ),
        }))}
      />
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          type="default"
          icon={<PlusOutlined />}
          onClick={() => addLine()}
        >
          Agregar Línea
        </Button>
        <Button type="primary" loading={submitting} disabled={!canSubmit} onClick={() => void doSubmit()}>
          Agregar Transacción
        </Button>
      </div>
    </Card>
  );
}
