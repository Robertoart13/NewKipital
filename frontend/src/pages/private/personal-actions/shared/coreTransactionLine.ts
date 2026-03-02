export interface CoreTransactionLine {
  payrollId?: number;
  fechaEfecto?: unknown;
  movimientoId?: number;
  cantidad?: number;
  monto?: number;
  montoInput?: string;
  formula?: string;
}

export function isCoreTransactionLineComplete(
  line: CoreTransactionLine,
): boolean {
  const hasPayroll = !!line.payrollId;
  const hasFecha = !!line.fechaEfecto;
  const hasMovement = !!line.movimientoId;
  const hasCantidad = line.cantidad != null && Number(line.cantidad) > 0;
  const hasMonto =
    (line.montoInput ?? '').trim().length > 0 &&
    line.monto != null &&
    Number(line.monto) >= 0;
  const hasFormula = (line.formula ?? '').trim().length > 0;

  return (
    hasPayroll &&
    hasFecha &&
    hasMovement &&
    hasCantidad &&
    hasMonto &&
    hasFormula
  );
}

