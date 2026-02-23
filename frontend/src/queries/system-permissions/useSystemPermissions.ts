import { useQuery } from '@tanstack/react-query';
import { fetchSystemPermissions } from '../../api/permissions';
import { systemPermissionKeys } from './keys';

export interface UseSystemPermissionsFilters {
  modulo?: string;
  includeInactive?: boolean;
}

export function useSystemPermissions(filters?: UseSystemPermissionsFilters) {
  return useQuery({
    queryKey: systemPermissionKeys.list(filters),
    queryFn: () => fetchSystemPermissions(filters),
    enabled: true,
  });
}
