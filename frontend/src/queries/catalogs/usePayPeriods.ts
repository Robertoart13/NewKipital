import { useQuery } from '@tanstack/react-query';
import { fetchPayPeriods } from '../../api/catalogs';
import { catalogKeys } from './keys';

export function usePayPeriods() {
  return useQuery({
    queryKey: catalogKeys.payPeriods(),
    queryFn: fetchPayPeriods,
    enabled: true,
  });
}
