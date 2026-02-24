import { useQuery } from '@tanstack/react-query';
import { companyKeys } from './keys';
import { fetchAllCompaniesForHistory } from '../../api/companies';

export function useAllCompaniesForHistory() {
  return useQuery({
    queryKey: companyKeys.allHistory(),
    queryFn: fetchAllCompaniesForHistory,
  });
}
