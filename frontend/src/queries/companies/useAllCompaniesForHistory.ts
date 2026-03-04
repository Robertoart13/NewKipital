import { useQuery } from '@tanstack/react-query';

import { fetchAllCompaniesForHistory } from '../../api/companies';

import { companyKeys } from './keys';

export function useAllCompaniesForHistory() {
  return useQuery({
    queryKey: companyKeys.allHistory(),
    queryFn: fetchAllCompaniesForHistory,
  });
}
