import { useQuery } from '@tanstack/react-query';
import { fetchSupervisors } from '../../api/employees';
import { employeeKeys } from './keys';

export function useSupervisors(companyId: string | null) {
  return useQuery({
    queryKey: employeeKeys.supervisors(companyId ?? ''),
    queryFn: () => fetchSupervisors(companyId!),
    enabled: !!companyId,
  });
}
