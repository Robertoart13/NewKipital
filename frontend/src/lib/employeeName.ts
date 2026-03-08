/* =============================================================================
   MODULE: employeeName
   =============================================================================

   Utilidades para nombres de empleados.

   Responsabilidades:
   - buildEmployeeDisplayName (apellido1 apellido2 nombre)
   - sortEmployeesByDisplayName

   ========================================================================== */

type EmployeeNameInput = {
  nombre?: string | null;
  apellido1?: string | null;
  apellido2?: string | null;
};

/**
 * ============================================================================
 * buildEmployeeDisplayName
 * ============================================================================
 *
 * Concatena apellido1, apellido2 y nombre.
 *
 * ============================================================================
 */
export function buildEmployeeDisplayName(employee: EmployeeNameInput): string {
  return [employee.apellido1, employee.apellido2, employee.nombre]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim();
}

/**
 * ============================================================================
 * sortEmployeesByDisplayName
 * ============================================================================
 *
 * Ordena empleados por nombre para display (locale es).
 *
 * ============================================================================
 */
export function sortEmployeesByDisplayName<T extends EmployeeNameInput>(employees: T[]): T[] {
  return [...employees].sort((left, right) =>
    buildEmployeeDisplayName(left).localeCompare(buildEmployeeDisplayName(right), 'es', {
      sensitivity: 'base',
    }),
  );
}
