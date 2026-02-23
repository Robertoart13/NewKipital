import { useQuery } from '@tanstack/react-query';
import { employeeKeys } from './keys';
import { fetchEmployees } from '../../api/employees';
import type { EmployeeFilters } from '../../api/employees';

interface UseEmployeesParams {
  companyId: string | null;
  filters?: EmployeeFilters;
}

/**
 * Hook para listar empleados con paginación y filtros.
 * Usa GET /api/employees con formato { data, total, page, pageSize }.
 */
export function useEmployees({ companyId, filters }: UseEmployeesParams) {
  return useQuery({
    queryKey: employeeKeys.list(companyId ?? 'all', filters),
    queryFn: () => fetchEmployees(companyId, filters),
  });
}
