export const MAX_MONEY_AMOUNT = 999999999999.99;

export type CurrencyCode = 'CRC' | 'USD';

export function getCurrencySymbol(currency?: string): string {
  return currency === 'USD' ? '$' : 'CRC';
}

export function formatCurrencyInput(
  value: string | number | null | undefined,
  currencyOrSymbol?: string,
): string {
  if (value == null || value === '') return '';
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return '';

  const symbol = currencyOrSymbol === 'USD' || currencyOrSymbol === '$'
    ? '$'
    : currencyOrSymbol === 'CRC' || currencyOrSymbol == null
      ? 'CRC'
      : currencyOrSymbol;

  if (!Number.isFinite(numericValue)) {
    return `${symbol} ${numericValue}`;
  }

  return `${symbol} ${numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseCurrencyInput(value?: string): number {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  if (/^[+-]?infinity$/i.test(raw)) return 0;

  const withoutSymbols = raw
    .replace(/\s+/g, '')
    .replace(/crc|usd|\$/gi, '');
  if (!withoutSymbols) return 0;

  if (/^[+-]?(?:\d+\.?\d*|\d*\.?\d+)e[+-]?\d+$/i.test(withoutSymbols)) {
    const scientificValue = Number(withoutSymbols);
    return Number.isNaN(scientificValue) ? 0 : scientificValue;
  }

  const hasComma = withoutSymbols.includes(',');
  const hasDot = withoutSymbols.includes('.');
  let normalized = withoutSymbols;

  if (hasComma && hasDot) {
    const lastComma = withoutSymbols.lastIndexOf(',');
    const lastDot = withoutSymbols.lastIndexOf('.');
    if (lastComma > lastDot) {
      normalized = withoutSymbols.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = withoutSymbols.replace(/,/g, '');
    }
  } else if (hasComma) {
    const commaCount = (withoutSymbols.match(/,/g) ?? []).length;
    const thousandsPattern = /^[+-]?\d{1,3}(,\d{3})+$/;
    normalized = commaCount > 1 || thousandsPattern.test(withoutSymbols)
      ? withoutSymbols.replace(/,/g, '')
      : withoutSymbols.replace(',', '.');
  } else if (hasDot) {
    const dotCount = (withoutSymbols.match(/\./g) ?? []).length;
    const thousandsPattern = /^[+-]?\d{1,3}(\.\d{3})+$/;
    if (dotCount > 1 && thousandsPattern.test(withoutSymbols)) {
      normalized = withoutSymbols.replace(/\./g, '');
    }
  }

  const numericValue = Number(normalized);
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

export function isMoneyOverMax(value: unknown): boolean {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return false;
  return numericValue > MAX_MONEY_AMOUNT;
}
