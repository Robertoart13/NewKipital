/**
 * Query keys para Companies.
 */
export const companyKeys = {
  all: ['companies'] as const,
  list: (includeInactive?: boolean) =>
    [...companyKeys.all, 'list', includeInactive] as const,
  allHistory: () => [...companyKeys.all, 'all-history'] as const,
  detail: (id: number) => [...companyKeys.all, 'detail', id] as const,
};
