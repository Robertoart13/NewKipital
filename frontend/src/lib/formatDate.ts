/* =============================================================================
   MODULE: formatDate
   =============================================================================

   Formato de fecha y hora para la aplicacion.

   Responsabilidades:
   - formatDateTime12h: formato 12h AM/PM, locale es-ES

   ========================================================================== */

/**
 * ============================================================================
 * formatDateTime12h
 * ============================================================================
 *
 * Formato de fecha y hora en 12h (AM/PM). Locale es-ES.
 * Devuelve "-" para null, undefined o fecha invalida.
 *
 * ============================================================================
 */
export function formatDateTime12h(dateStr: string | Date | null | undefined): string {
  if (dateStr == null) return '-';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

