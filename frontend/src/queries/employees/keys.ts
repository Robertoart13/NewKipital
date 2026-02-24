import type { EmployeeFilters } from '../../api/employees';

/**
 * Query keys para el dominio Employees.
 * Patrón doc 23: all, list(companyId, filters), detail(id)
 */
export const employeeKeys = {
  all: (companyId: number | string) => ['employees', companyId] as const,
  lists: (companyId: number | string) => [...employeeKeys.all(companyId), 'list'] as const,
  list: (companyId: number | string, filters?: EmployeeFilters) =>
    ['employees', companyId, 'list', filters ?? {}] as const,
  detail: (id: number) => ['employee', id] as const,
  supervisors: () => ['employees', 'supervisors'] as const,
};
