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

function buildFullName(employee: EmployeeLabelInput): string {
  return [employee.apellido1, employee.apellido2, employee.nombre]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim();
}

export function formatEmployeeLabel(employee: EmployeeLabelInput, canViewEmployeeSensitive = true): string {
  if (!canViewEmployeeSensitive) {
    const fallback = (employee.codigo ?? '').trim() || 'Empleado sin codigo';
    return truncateLabel(fallback);
  }

  const fullName = buildFullName(employee);

  const fallback = (employee.codigo ?? '').trim() || 'Empleado sin nombre';
  return truncateLabel(fullName || fallback);
}
