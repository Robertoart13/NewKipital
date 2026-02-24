/**
 * Formato de fecha y hora en 12 horas (AM/PM) para toda la aplicación.
 * Locale es-ES para consistencia en español.
 *
 * @see docs/05-IntegracionAntDesign.md — Formato de fecha y hora (obligatorio)
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
