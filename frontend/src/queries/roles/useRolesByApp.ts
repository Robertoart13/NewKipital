import { useQuery } from '@tanstack/react-query';
import { fetchRolesByApp } from '../../api/securityConfig';
import { roleKeys } from './keys';

export function useRolesByApp(appCode: 'timewise' | 'kpital' | null) {
  return useQuery({
    queryKey: roleKeys.byApp(appCode ?? 'timewise'),
    queryFn: () => fetchRolesByApp(appCode!),
    enabled: !!appCode,
  });
}
