import { useQuery } from '@tanstack/react-query';
import { payrollKeys } from './keys';
import { fetchPayrolls } from '../../api/payroll';

interface UsePayrollsParams {
  companyId: string;
  includeInactive?: boolean;
  period?: string;
}

/**
 * Hook para listar planillas de una empresa.
 * Usa GET /api/payroll?idEmpresa=N real con credentials.
 */
export function usePayrolls({ companyId, includeInactive = false, period }: UsePayrollsParams) {
  return useQuery({
    queryKey: payrollKeys.list(companyId, period),
    queryFn: () => fetchPayrolls(companyId, includeInactive),
    enabled: !!companyId,
  });
}
