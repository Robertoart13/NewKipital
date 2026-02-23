import { useQuery } from '@tanstack/react-query';
import { fetchDepartments } from '../../api/catalogs';
import { catalogKeys } from './keys';

export function useDepartments() {
  return useQuery({
    queryKey: catalogKeys.departments(),
    queryFn: fetchDepartments,
    enabled: true,
  });
}
