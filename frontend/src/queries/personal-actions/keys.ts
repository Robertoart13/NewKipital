/**
 * Query keys para el dominio Personal Actions.
 * Patrón: [entidad, companyId, ...filtros]
 */
export const personalActionKeys = {
  all: ['personal-actions'] as const,
  lists: () => [...personalActionKeys.all, 'list'] as const,
  list: (companyId: string, status?: string) =>
    [...personalActionKeys.lists(), companyId, status ?? ''] as const,
  details: () => [...personalActionKeys.all, 'detail'] as const,
  detail: (companyId: string, id: string) =>
    [...personalActionKeys.details(), companyId, id] as const,
};
