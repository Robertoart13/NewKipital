import { useQuery } from '@tanstack/react-query';
import { employeeKeys } from './keys';
import { fetchEmployee } from '../../api/employees';

/**
 * Hook para detalle de empleado con relaciones (departamento, puesto, periodoPago, supervisor).
 */
export function useEmployee(id: number | string | null) {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return useQuery({
    queryKey: employeeKeys.detail(numId ?? 0),
    queryFn: () => fetchEmployee(numId!),
    enabled: numId != null && !isNaN(numId) && numId > 0,
  });
}
