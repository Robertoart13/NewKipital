import { useQuery } from '@tanstack/react-query';
import { fetchPositions } from '../../api/catalogs';
import { catalogKeys } from './keys';

export function usePositions() {
  return useQuery({
    queryKey: catalogKeys.positions(),
    queryFn: fetchPositions,
    enabled: true,
  });
}
