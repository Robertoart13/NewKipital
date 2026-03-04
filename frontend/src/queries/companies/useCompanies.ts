import { useQuery } from '@tanstack/react-query';

import { fetchCompanies } from '../../api/companies';

import { companyKeys } from './keys';

/**
 * Hook para listar empresas disponibles.
 * Usa GET /api/companies real con credentials.
 */
export function useCompanies(includeInactive = false) {
  return useQuery({
    queryKey: companyKeys.list(includeInactive),
    queryFn: () => fetchCompanies(includeInactive),
  });
}
