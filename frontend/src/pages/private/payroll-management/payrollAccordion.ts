export function resolveAccordionExpandedKeys(expanded: boolean, employeeId: number): number[] {
  if (!expanded) return [];
  if (!Number.isInteger(employeeId) || employeeId <= 0) return [];
  return [employeeId];
}

export function sanitizeAccordionExpandedKeys(
  expandedKeys: number[],
  visibleEmployeeIds: number[],
): number[] {
  if (!Array.isArray(expandedKeys) || expandedKeys.length === 0) return [];
  const visibleSet = new Set(
    visibleEmployeeIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0),
  );
  for (const key of expandedKeys) {
    const parsed = Number(key);
    if (visibleSet.has(parsed)) return [parsed];
  }
  return [];
}
