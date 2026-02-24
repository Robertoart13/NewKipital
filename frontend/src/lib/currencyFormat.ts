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

  return `${symbol} ${numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseCurrencyInput(value?: string): number {
  const cleaned = (value ?? '').replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return 0;

  const normalized = cleaned.includes('.')
    ? cleaned.replace(/,/g, '')
    : cleaned.replace(',', '.');

  const numericValue = Number(normalized);
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

export function isMoneyOverMax(value: unknown): boolean {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return false;
  return numericValue > MAX_MONEY_AMOUNT;
}
