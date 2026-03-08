/* =============================================================================
   MODULE: payrollHolidays
   =============================================================================

   Capa de acceso a datos para el modulo de Feriados de Nomina.

   Responsabilidades:
   - Consultar la lista global de feriados configurados en el sistema
   - Crear nuevos feriados
   - Actualizar feriados existentes
   - Eliminar feriados (eliminacion fisica, ya que no afectan integridad referencial)

   Decisiones de diseno:
   - Los feriados son globales: no estan ligados a empresa ni a periodo de nomina
   - `deletePayrollHoliday` usa DELETE fisico porque el modelo no usa soft-delete
   - `parseError` normaliza los errores de validacion de NestJS (string | string[])
   - `payrollHolidayTypeLabel` es una funcion pura auxiliar para presentacion en UI

   ============================================================================= */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Payroll Holiday Item
 * ============================================================================
 *
 * Representa un feriado registrado en el sistema de nomina.
 *
 * El campo `tipo` determina el tratamiento salarial:
 * - OBLIGATORIO_PAGO_DOBLE  = dia feriado con derecho a pago doble
 * - OBLIGATORIO_PAGO_SIMPLE = dia feriado con pago simple
 * - MOVIBLE                 = feriado que puede trasladarse
 * - NO_OBLIGATORIO          = feriado no obligatorio
 *
 * ============================================================================
 */
export interface PayrollHolidayItem {
  /** Identificador unico del feriado. */
  id: number;

  /** Nombre del feriado (ej: "Dia de la Independencia"). */
  nombre: string;

  /**
   * Tipo del feriado segun clasificacion legal.
   * Determina el calculo de horas y montos en nomina.
   */
  tipo: 'OBLIGATORIO_PAGO_DOBLE' | 'OBLIGATORIO_PAGO_SIMPLE' | 'MOVIBLE' | 'NO_OBLIGATORIO';

  /** Fecha de inicio del feriado en formato ISO 8601 (YYYY-MM-DD). */
  fechaInicio: string;

  /** Fecha de fin del feriado en formato ISO 8601. Puede ser igual a fechaInicio para feriados de un dia. */
  fechaFin: string;

  /** Descripcion opcional del feriado; puede ser nula. */
  descripcion?: string | null;
}

/**
 * ============================================================================
 * Payroll Holiday Payload
 * ============================================================================
 *
 * Payload para crear o actualizar un feriado de nomina.
 *
 * Excluye el campo `id`, que es asignado por el servidor al crear.
 * Todos los campos del `PayrollHolidayItem` son requeridos salvo `descripcion`.
 *
 * ============================================================================
 */
export interface PayrollHolidayPayload {
  /** Nombre visible del feriado. */
  nombre: string;

  /** Tipo del feriado; reutiliza la union de tipos de `PayrollHolidayItem`. */
  tipo: PayrollHolidayItem['tipo'];

  /** Fecha de inicio en formato ISO 8601. */
  fechaInicio: string;

  /** Fecha de fin en formato ISO 8601. */
  fechaFin: string;

  /** Descripcion adicional; opcional. */
  descripcion?: string;
}

/* =============================================================================
   FUNCIONES AUXILIARES
   ============================================================================= */

/**
 * ============================================================================
 * Parse Error
 * ============================================================================
 *
 * Extrae el mensaje de error de una respuesta HTTP fallida.
 *
 * Soporta `message` como `string` o `string[]` para compatibilidad
 * con las respuestas de validacion de NestJS (class-validator).
 *
 * @param res      - Respuesta HTTP no exitosa.
 * @param fallback - Mensaje de respaldo si el body no contiene mensaje util.
 *
 * @returns Mensaje de error listo para presentar al usuario.
 *
 * ============================================================================
 */
async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join('. ');
    if (typeof body.message === 'string' && body.message.trim()) return body.message;
  } catch {
    // no-op
  }
  return fallback;
}

/* =============================================================================
   API: OPERACIONES CRUD
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Payroll Holidays
 * ============================================================================
 *
 * Obtiene la lista completa de feriados de nomina configurados en el sistema.
 *
 * No recibe filtros: retorna todos los feriados independientemente de empresa
 * o periodo, ya que son de caracter global.
 *
 * @returns Lista de feriados de nomina.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPayrollHolidays(): Promise<PayrollHolidayItem[]> {
  const res = await httpFetch('/payroll-holidays');
  if (!res.ok) throw new Error(await parseError(res, 'No se pudieron cargar los feriados.'));
  return res.json();
}

/**
 * ============================================================================
 * Create Payroll Holiday
 * ============================================================================
 *
 * Registra un nuevo feriado en el sistema de nomina.
 *
 * @param payload - Datos del nuevo feriado.
 *
 * @returns El feriado creado con su `id` asignado por el servidor.
 *
 * @throws {Error} Si la validacion falla o la peticion no es exitosa.
 *
 * ============================================================================
 */
export async function createPayrollHoliday(payload: PayrollHolidayPayload): Promise<PayrollHolidayItem> {
  const res = await httpFetch('/payroll-holidays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'No se pudo crear el feriado.'));
  return res.json();
}

/**
 * ============================================================================
 * Update Payroll Holiday
 * ============================================================================
 *
 * Actualiza parcialmente un feriado existente.
 *
 * @param id      - Identificador del feriado a actualizar.
 * @param payload - Campos a modificar.
 *
 * @returns El feriado actualizado.
 *
 * @throws {Error} Si la validacion falla o la peticion no es exitosa.
 *
 * ============================================================================
 */
export async function updatePayrollHoliday(
  id: number,
  payload: Partial<PayrollHolidayPayload>,
): Promise<PayrollHolidayItem> {
  const res = await httpFetch(`/payroll-holidays/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'No se pudo actualizar el feriado.'));
  return res.json();
}

/**
 * ============================================================================
 * Delete Payroll Holiday
 * ============================================================================
 *
 * Elimina fisicamente un feriado del sistema.
 *
 * A diferencia de otras entidades del sistema, los feriados usan eliminacion
 * fisica (DELETE HTTP) porque no tienen dependencias de integridad referencial
 * con nominas o acciones personales aplicadas.
 *
 * @param id - Identificador del feriado a eliminar.
 *
 * @throws {Error} Si la operacion falla.
 *
 * ============================================================================
 */
export async function deletePayrollHoliday(id: number): Promise<void> {
  const res = await httpFetch(`/payroll-holidays/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res, 'No se pudo eliminar el feriado.'));
}

/* =============================================================================
   UTILIDADES DE PRESENTACION
   ============================================================================= */

/**
 * ============================================================================
 * Payroll Holiday Type Label
 * ============================================================================
 *
 * Funcion pura que convierte el valor interno del tipo de feriado
 * en una etiqueta legible para mostrar en la interfaz de usuario.
 *
 * Retorna el valor original si el tipo no esta mapeado, como mecanismo
 * de seguridad ante nuevos tipos agregados en el backend.
 *
 * @param tipo - Codigo del tipo de feriado.
 *
 * @returns Etiqueta en espanol para mostrar al usuario.
 *
 * ============================================================================
 */
export function payrollHolidayTypeLabel(tipo: PayrollHolidayItem['tipo']): string {
  const map: Record<PayrollHolidayItem['tipo'], string> = {
    OBLIGATORIO_PAGO_DOBLE: 'Obligatorio Pago Doble',
    OBLIGATORIO_PAGO_SIMPLE: 'Obligatorio Pago Simple',
    MOVIBLE: 'Movible',
    NO_OBLIGATORIO: 'No Obligatorio',
  };
  /** Retorna el tipo sin transformar si no existe en el mapa, evitando errores silenciosos. */
  return map[tipo] ?? tipo;
}
