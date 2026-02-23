import { useQuery } from '@tanstack/react-query';
import { personalActionKeys } from './keys';
import { fetchPersonalActions } from '../../api/personalActions';

interface UsePersonalActionsParams {
  companyId: string;
  /** 1=Pendiente, 2=Aprobada, 3=Rechazada */
  estado?: number;
}

/**
 * Hook para listar acciones de personal de una empresa.
 * Usa GET /api/personal-actions?idEmpresa=N real con credentials.
 */
export function usePersonalActions({ companyId, estado }: UsePersonalActionsParams) {
  return useQuery({
    queryKey: personalActionKeys.list(companyId, estado != null ? String(estado) : undefined),
    queryFn: () => fetchPersonalActions(companyId, estado),
    enabled: !!companyId,
  });
}
