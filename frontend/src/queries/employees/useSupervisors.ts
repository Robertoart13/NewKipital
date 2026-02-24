import { useQuery } from '@tanstack/react-query';
import { fetchSupervisors } from '../../api/employees';
import { employeeKeys } from './keys';

/** Lista de supervisores (rol Supervisor / Supervisor Global / Master) de todas las empresas del usuario. */
export function useSupervisors() {
  return useQuery({
    queryKey: employeeKeys.supervisors(),
    queryFn: fetchSupervisors,
    enabled: true,
  });
}
