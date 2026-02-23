import { useQuery } from '@tanstack/react-query';
import { payrollKeys } from './keys';
import { fetchPayroll } from '../../api/payroll';

/**
 * Hook para detalle de una planilla.
 * Usa GET /api/payroll/:id real con credentials.
 */
export function usePayroll(id: number | string | null, companyId?: string) {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return useQuery({
    queryKey: companyId ? payrollKeys.detail(companyId, String(numId)) : [...payrollKeys.details(), numId],
    queryFn: () => fetchPayroll(numId!),
    enabled: numId != null && !isNaN(numId),
  });
}
