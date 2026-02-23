/**
 * Contrato base para todos los workflows del sistema.
 *
 * Un workflow:
 * - Orquesta acciones entre múltiples módulos
 * - Reacciona a eventos del dominio
 * - No contiene lógica de negocio primaria
 * - No reemplaza services
 * - No accede directamente a la base de datos sin pasar por servicios
 *
 * Un workflow es ORQUESTADOR, no EJECUTOR.
 */
export interface WorkflowResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
