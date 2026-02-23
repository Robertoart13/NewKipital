/**
 * Query keys para el dominio Payrolls.
 * Patrón: [entidad, companyId, ...filtros]
 */
export const payrollKeys = {
  all: ['payrolls'] as const,
  lists: () => [...payrollKeys.all, 'list'] as const,
  list: (companyId: string, period?: string) =>
    [...payrollKeys.lists(), companyId, period ?? ''] as const,
  details: () => [...payrollKeys.all, 'detail'] as const,
  detail: (companyId: string, id: string) =>
    [...payrollKeys.details(), companyId, id] as const,
};
