import { describe, it, expect } from 'vitest';
import {
  getCurrencySymbol,
  formatCurrencyInput,
  parseCurrencyInput,
  isMoneyOverMax,
  MAX_MONEY_AMOUNT,
} from './currencyFormat';

describe('currencyFormat', () => {
  describe('getCurrencySymbol', () => {
    it('should return $ for USD', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
    });

    it('should return CRC for CRC', () => {
      expect(getCurrencySymbol('CRC')).toBe('CRC');
    });

    it('should return CRC for undefined', () => {
      expect(getCurrencySymbol(undefined)).toBe('CRC');
    });

    it('should return CRC for other currencies', () => {
      expect(getCurrencySymbol('EUR')).toBe('CRC');
      expect(getCurrencySymbol('GBP')).toBe('CRC');
    });

    it('should return CRC for empty string', () => {
      expect(getCurrencySymbol('')).toBe('CRC');
    });
  });

  describe('formatCurrencyInput', () => {
    it('should format number with CRC by default', () => {
      expect(formatCurrencyInput(1000)).toBe('CRC 1,000.00');
    });

    it('should format number with USD symbol', () => {
      expect(formatCurrencyInput(1000, 'USD')).toBe('$ 1,000.00');
    });

    it('should format number with $ symbol', () => {
      expect(formatCurrencyInput(1000, '$')).toBe('$ 1,000.00');
    });

    it('should format string number', () => {
      expect(formatCurrencyInput('2500')).toBe('CRC 2,500.00');
    });

    it('should format decimal numbers with 2 decimal places', () => {
      expect(formatCurrencyInput(1234.56)).toBe('CRC 1,234.56');
    });

    it('should round to 2 decimal places', () => {
      expect(formatCurrencyInput(1234.567)).toBe('CRC 1,234.57');
    });

    it('should format zero', () => {
      expect(formatCurrencyInput(0)).toBe('CRC 0.00');
    });

    it('should format large numbers with thousand separators', () => {
      expect(formatCurrencyInput(1000000)).toBe('CRC 1,000,000.00');
    });

    it('should return empty string for null', () => {
      expect(formatCurrencyInput(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatCurrencyInput(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(formatCurrencyInput('')).toBe('');
    });

    it('should return empty string for NaN', () => {
      expect(formatCurrencyInput('not a number')).toBe('');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrencyInput(-500)).toBe('CRC -500.00');
    });

    it('should format very small decimal numbers', () => {
      expect(formatCurrencyInput(0.01)).toBe('CRC 0.01');
    });

    it('should format numbers with trailing zeros', () => {
      expect(formatCurrencyInput(100.1)).toBe('CRC 100.10');
    });

    it('should handle custom currency symbol', () => {
      expect(formatCurrencyInput(100, 'EUR')).toBe('EUR 100.00');
    });
  });

  describe('parseCurrencyInput', () => {
    it('should parse simple number string', () => {
      expect(parseCurrencyInput('1000')).toBe(1000);
    });

    it('should parse number with thousand separators', () => {
      expect(parseCurrencyInput('1,000')).toBe(1000);
    });

    it('should parse number with multiple thousand separators', () => {
      expect(parseCurrencyInput('1,000,000')).toBe(1000000);
    });

    it('should parse number with decimal point', () => {
      expect(parseCurrencyInput('1000.50')).toBe(1000.50);
    });

    it('should parse number with comma as decimal separator', () => {
      expect(parseCurrencyInput('1000,50')).toBe(1000.50);
    });

    it('should parse formatted currency string with CRC', () => {
      expect(parseCurrencyInput('CRC 1,000.00')).toBe(1000);
    });

    it('should parse formatted currency string with $', () => {
      expect(parseCurrencyInput('$ 1,234.56')).toBe(1234.56);
    });

    it('should remove currency symbols and spaces', () => {
      expect(parseCurrencyInput('USD 500')).toBe(500);
    });

    it('should return 0 for empty string', () => {
      expect(parseCurrencyInput('')).toBe(0);
    });

    it('should return 0 for undefined', () => {
      expect(parseCurrencyInput(undefined)).toBe(0);
    });

    it('should return 0 for null', () => {
      expect(parseCurrencyInput(null as any)).toBe(0);
    });

    it('should return 0 for invalid string', () => {
      expect(parseCurrencyInput('abc')).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(parseCurrencyInput('-500.50')).toBe(-500.50);
    });

    it('should handle strings with only symbols', () => {
      expect(parseCurrencyInput('$')).toBe(0);
      expect(parseCurrencyInput('CRC')).toBe(0);
    });

    it('should parse decimal numbers correctly', () => {
      expect(parseCurrencyInput('0.01')).toBe(0.01);
      expect(parseCurrencyInput('.50')).toBe(0.50);
    });

    it('should handle mixed separators', () => {
      expect(parseCurrencyInput('1.000,50')).toBe(1000.50);
    });

    it('should parse very large numbers', () => {
      expect(parseCurrencyInput('999,999,999.99')).toBe(999999999.99);
    });
  });

  describe('isMoneyOverMax', () => {
    it('should return false for valid amounts', () => {
      expect(isMoneyOverMax(1000)).toBe(false);
      expect(isMoneyOverMax(100000)).toBe(false);
      expect(isMoneyOverMax(1000000)).toBe(false);
    });

    it('should return false for MAX_MONEY_AMOUNT', () => {
      expect(isMoneyOverMax(MAX_MONEY_AMOUNT)).toBe(false);
    });

    it('should return true for amounts over MAX_MONEY_AMOUNT', () => {
      expect(isMoneyOverMax(MAX_MONEY_AMOUNT + 0.01)).toBe(true);
      expect(isMoneyOverMax(MAX_MONEY_AMOUNT + 1000)).toBe(true);
    });

    it('should return false for zero', () => {
      expect(isMoneyOverMax(0)).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(isMoneyOverMax(-1000)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(isMoneyOverMax(NaN)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isMoneyOverMax(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isMoneyOverMax(undefined)).toBe(false);
    });

    it('should return false for non-numeric strings', () => {
      expect(isMoneyOverMax('abc')).toBe(false);
    });

    it('should handle string numbers', () => {
      expect(isMoneyOverMax('1000')).toBe(false);
      expect(isMoneyOverMax((MAX_MONEY_AMOUNT + 1).toString())).toBe(true);
    });

    it('should validate against the correct MAX_MONEY_AMOUNT', () => {
      expect(MAX_MONEY_AMOUNT).toBe(999999999999.99);
    });
  });

  describe('Edge Cases', () => {
    it('should handle Infinity', () => {
      expect(formatCurrencyInput(Infinity)).toBe('CRC Infinity');
      expect(parseCurrencyInput('Infinity')).toBe(0);
      expect(isMoneyOverMax(Infinity)).toBe(true);
    });

    it('should handle -Infinity', () => {
      expect(formatCurrencyInput(-Infinity)).toBe('CRC -Infinity');
      expect(isMoneyOverMax(-Infinity)).toBe(false);
    });

    it('should handle very precise decimals', () => {
      expect(formatCurrencyInput(123.456789)).toBe('CRC 123.46');
      expect(parseCurrencyInput('123.456789')).toBe(123.456789);
    });

    it('should handle scientific notation strings', () => {
      expect(parseCurrencyInput('1e6')).toBe(1000000);
      expect(parseCurrencyInput('1.5e3')).toBe(1500);
    });

    it('should handle whitespace', () => {
      expect(parseCurrencyInput('  1000  ')).toBe(1000);
      expect(parseCurrencyInput('CRC   1,000.00  ')).toBe(1000);
    });

    it('should handle multiple decimal points', () => {
      // parseCurrencyInput should handle this gracefully
      const result = parseCurrencyInput('1.000.50');
      expect(typeof result).toBe('number');
    });
  });

  describe('Integration Tests', () => {
    it('should format and parse round-trip correctly', () => {
      const original = 1234.56;
      const formatted = formatCurrencyInput(original, 'USD');
      const parsed = parseCurrencyInput(formatted);
      expect(parsed).toBe(original);
    });

    it('should handle CRC round-trip', () => {
      const original = 50000.75;
      const formatted = formatCurrencyInput(original, 'CRC');
      const parsed = parseCurrencyInput(formatted);
      expect(parsed).toBe(original);
    });

    it('should handle zero round-trip', () => {
      const original = 0;
      const formatted = formatCurrencyInput(original);
      const parsed = parseCurrencyInput(formatted);
      expect(parsed).toBe(original);
    });

    it('should validate MAX_MONEY_AMOUNT workflow', () => {
      expect(isMoneyOverMax(MAX_MONEY_AMOUNT)).toBe(false);
      expect(isMoneyOverMax(MAX_MONEY_AMOUNT + 0.01)).toBe(true);

      const formatted = formatCurrencyInput(MAX_MONEY_AMOUNT);
      const parsed = parseCurrencyInput(formatted);
      expect(isMoneyOverMax(parsed)).toBe(false);
    });
  });
});
