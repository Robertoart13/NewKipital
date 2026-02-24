import { useQuery } from '@tanstack/react-query';
import { employeeKeys } from './keys';
import { fetchEmployees } from '../../api/employees';
import type { EmployeeFilters } from '../../api/employees';

interface UseEmployeesParams {
  companyKey: string;
  filters?: EmployeeFilters;
  enabled?: boolean;
}

/**
 * Hook para listar empleados con paginación y filtros.
 * Usa GET /api/employees con formato { data, total, page, pageSize }.
 */
export function useEmployees({ companyKey, filters, enabled = true }: UseEmployeesParams) {
  return useQuery({
    queryKey: employeeKeys.list(companyKey, filters),
    queryFn: () => fetchEmployees(undefined, filters),
    staleTime: 0,
    refetchOnMount: 'always',
    enabled,
  });
}
