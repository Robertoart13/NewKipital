import { useCallback } from 'react';
import {
  EMPLOYEE_MONEY_MAX_DIGITS,
  formatGroupedIntegerDisplay,
  parseSanitizedMoney,
  sanitizeMoneyDigits,
} from '../lib/moneyInputSanitizer';

function resolveGroupedMaxLength(maxDigits: number): number {
  return maxDigits + Math.floor((maxDigits - 1) / 3);
}

export function useMoneyFieldFormatter(maxDigits = EMPLOYEE_MONEY_MAX_DIGITS) {
  const maxInputLength = resolveGroupedMaxLength(maxDigits);

  const sanitize = useCallback(
    (value: unknown) => sanitizeMoneyDigits(value, maxDigits),
    [maxDigits],
  );

  const parse = useCallback(
    (value: unknown) => parseSanitizedMoney(value, maxDigits),
    [maxDigits],
  );

  const formatDisplay = useCallback(
    (value: unknown) => formatGroupedIntegerDisplay(value, maxDigits),
    [maxDigits],
  );

  const getFormValueFromEvent = useCallback(
    (event?: { target?: { value?: unknown } }) =>
      sanitize(event?.target?.value),
    [sanitize],
  );

  const getFormValueProps = useCallback(
    (value: unknown) => ({ value: formatDisplay(value) }),
    [formatDisplay],
  );

  return {
    maxDigits,
    maxInputLength,
    sanitize,
    parse,
    formatDisplay,
    getFormValueFromEvent,
    getFormValueProps,
  };
}

