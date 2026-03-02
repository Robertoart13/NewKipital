const DEFAULT_MAX_DIGITS = 10;

export function sanitizeMoneyDigits(
  value: unknown,
  maxDigits = DEFAULT_MAX_DIGITS,
): string {
  const raw = String(value ?? '');
  return raw.replace(/\D+/g, '').slice(0, maxDigits);
}

export function parseSanitizedMoney(
  value: unknown,
  maxDigits = DEFAULT_MAX_DIGITS,
): number | undefined {
  const sanitized = sanitizeMoneyDigits(value, maxDigits);
  if (!sanitized) return undefined;
  const parsed = Number.parseInt(sanitized, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

export function formatGroupedIntegerDisplay(
  value: unknown,
  maxDigits = DEFAULT_MAX_DIGITS,
): string {
  const sanitized = sanitizeMoneyDigits(value, maxDigits);
  if (!sanitized) return '';
  return sanitized.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export const EMPLOYEE_MONEY_MAX_DIGITS = DEFAULT_MAX_DIGITS;
export const EMPLOYEE_GROUPED_MAX_LENGTH =
  DEFAULT_MAX_DIGITS + Math.floor((DEFAULT_MAX_DIGITS - 1) / 3);
