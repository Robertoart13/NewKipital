type EmployeeLabelInput = {
  nombre?: string | null;
  apellido1?: string | null;
  apellido2?: string | null;
  codigo?: string | null;
};

const MAX_EMPLOYEE_LABEL_LENGTH = 48;

function truncateLabel(value: string): string {
  if (value.length <= MAX_EMPLOYEE_LABEL_LENGTH) return value;
  return `${value.slice(0, MAX_EMPLOYEE_LABEL_LENGTH - 3).trimEnd()}...`;
}

export function formatEmployeeLabel(employee: EmployeeLabelInput, canViewEmployeeSensitive = true): string {
  if (!canViewEmployeeSensitive) {
    const fallback = (employee.codigo ?? '').trim() || 'Empleado sin codigo';
    return truncateLabel(fallback);
  }

  const fullName = `${[employee.nombre, employee.apellido1, employee.apellido2]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' ')}`.trim();

  const fallback = (employee.codigo ?? '').trim() || 'Empleado sin nombre';
  return truncateLabel(fullName || fallback);
}
