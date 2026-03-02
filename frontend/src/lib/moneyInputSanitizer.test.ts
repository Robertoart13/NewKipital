import { describe, expect, it } from 'vitest';
import {
  EMPLOYEE_MONEY_MAX_DIGITS,
  formatGroupedIntegerDisplay,
  parseSanitizedMoney,
  sanitizeMoneyDigits,
} from './moneyInputSanitizer';

describe('moneyInputSanitizer', () => {
  it('sanitizes malicious symbols and keeps only digits', () => {
    expect(sanitizeMoneyDigits('CRC 12,345.67')).toBe('1234567');
    expect(sanitizeMoneyDigits('DROP TABLE 99;')).toBe('99');
    expect(sanitizeMoneyDigits('<script>alert(1)</script>')).toBe('1');
  });

  it('blocks scientific notation and minus sign tricks', () => {
    expect(sanitizeMoneyDigits('1e9')).toBe('19');
    expect(sanitizeMoneyDigits('-5000')).toBe('5000');
    expect(parseSanitizedMoney('1e9')).toBe(19);
    expect(parseSanitizedMoney('-5000')).toBe(5000);
  });

  it('enforces max digits to avoid huge payloads', () => {
    const attackValue = '9'.repeat(200);
    const sanitized = sanitizeMoneyDigits(attackValue, EMPLOYEE_MONEY_MAX_DIGITS);
    expect(sanitized.length).toBe(EMPLOYEE_MONEY_MAX_DIGITS);
    expect(sanitized).toBe('9'.repeat(EMPLOYEE_MONEY_MAX_DIGITS));
  });

  it('returns undefined for empty or non-numeric inputs', () => {
    expect(parseSanitizedMoney('')).toBeUndefined();
    expect(parseSanitizedMoney(null)).toBeUndefined();
    expect(parseSanitizedMoney(undefined)).toBeUndefined();
    expect(parseSanitizedMoney('abc')).toBeUndefined();
  });

  it('formats grouped integer display with thousands separator commas', () => {
    expect(formatGroupedIntegerDisplay('1520')).toBe('1,520');
    expect(formatGroupedIntegerDisplay('1111111111')).toBe('1,111,111,111');
    expect(formatGroupedIntegerDisplay('')).toBe('');
  });
});
