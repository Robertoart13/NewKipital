type EmployeeNameInput = {
  nombre?: string | null;
  apellido1?: string | null;
  apellido2?: string | null;
};

export function buildEmployeeDisplayName(employee: EmployeeNameInput): string {
  return [employee.apellido1, employee.apellido2, employee.nombre]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim();
}

export function sortEmployeesByDisplayName<T extends EmployeeNameInput>(employees: T[]): T[] {
  return [...employees].sort((left, right) =>
    buildEmployeeDisplayName(left).localeCompare(buildEmployeeDisplayName(right), 'es', {
      sensitivity: 'base',
    }),
  );
}
