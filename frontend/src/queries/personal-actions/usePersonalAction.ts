import { useQuery } from '@tanstack/react-query';
import { personalActionKeys } from './keys';
import { fetchPersonalAction } from '../../api/personalActions';

/**
 * Hook para detalle de una acción de personal.
 * Usa GET /api/personal-actions/:id real con credentials.
 */
export function usePersonalAction(id: number | string | null, companyId?: string) {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return useQuery({
    queryKey: companyId
      ? personalActionKeys.detail(companyId, String(numId))
      : [...personalActionKeys.details(), numId],
    queryFn: () => fetchPersonalAction(numId!),
    enabled: numId != null && !isNaN(numId),
  });
}
