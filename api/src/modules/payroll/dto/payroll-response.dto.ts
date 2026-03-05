/**
 * Respuesta estandar de planilla para evitar desfases de zona horaria en la UI.
 * Todas las fechas se serializan como YYYY-MM-DD.
 */
export interface PayrollCalendarResponse {
  id: number;
  idEmpresa: number;
  idPeriodoPago: number;
  idTipoPlanilla: number | null;
  nombrePlanilla: string | null;
  tipoPlanilla: string;
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;
  fechaCorte: string | null;
  fechaInicioPago: string;
  fechaFinPago: string;
  fechaPagoProgramada: string | null;
  moneda: string;
  estado: number;
  esInactivo: number;
  requiresRecalculation: number;
  fechaAplicacion: string | null;
  descripcionEvento: string | null;
  etiquetaColor: string | null;
}
