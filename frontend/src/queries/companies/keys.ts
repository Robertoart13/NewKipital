/**
 * Query keys para Companies.
 */
export const companyKeys = {
  all: ['companies'] as const,
  list: (includeInactive?: boolean) =>
    [...companyKeys.all, 'list', includeInactive] as const,
  detail: (id: number) => [...companyKeys.all, 'detail', id] as const,
};
