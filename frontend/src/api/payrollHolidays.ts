import { httpFetch } from '../interceptors/httpInterceptor';

export interface PayrollHolidayItem {
  id: number;
  nombre: string;
  tipo: 'OBLIGATORIO_PAGO_DOBLE' | 'OBLIGATORIO_PAGO_SIMPLE' | 'MOVIBLE' | 'NO_OBLIGATORIO';
  fechaInicio: string;
  fechaFin: string;
  descripcion?: string | null;
}

export interface PayrollHolidayPayload {
  nombre: string;
  tipo: PayrollHolidayItem['tipo'];
  fechaInicio: string;
  fechaFin: string;
  descripcion?: string;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json() as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join('. ');
    if (typeof body.message === 'string' && body.message.trim()) return body.message;
  } catch {
    // no-op
  }
  return fallback;
}

export async function fetchPayrollHolidays(): Promise<PayrollHolidayItem[]> {
  const res = await httpFetch('/payroll-holidays');
  if (!res.ok) throw new Error(await parseError(res, 'No se pudieron cargar los feriados.'));
  return res.json();
}

export async function createPayrollHoliday(payload: PayrollHolidayPayload): Promise<PayrollHolidayItem> {
  const res = await httpFetch('/payroll-holidays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'No se pudo crear el feriado.'));
  return res.json();
}

export async function updatePayrollHoliday(id: number, payload: Partial<PayrollHolidayPayload>): Promise<PayrollHolidayItem> {
  const res = await httpFetch(`/payroll-holidays/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, 'No se pudo actualizar el feriado.'));
  return res.json();
}

export async function deletePayrollHoliday(id: number): Promise<void> {
  const res = await httpFetch(`/payroll-holidays/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res, 'No se pudo eliminar el feriado.'));
}

export function payrollHolidayTypeLabel(tipo: PayrollHolidayItem['tipo']): string {
  const map: Record<PayrollHolidayItem['tipo'], string> = {
    OBLIGATORIO_PAGO_DOBLE: 'Obligatorio Pago Doble',
    OBLIGATORIO_PAGO_SIMPLE: 'Obligatorio Pago Simple',
    MOVIBLE: 'Movible',
    NO_OBLIGATORIO: 'No Obligatorio',
  };
  return map[tipo] ?? tipo;
}

