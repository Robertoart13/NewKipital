import { describe, expect, it } from 'vitest';
import { formatDateTime12h } from './formatDate';

describe('formatDateTime12h', () => {
  it('should format a valid date string', () => {
    const result = formatDateTime12h('2026-02-24T14:30:00');
    expect(result).toContain('2026');
    expect(result).toMatch(/[ap]\.?\s?m\.?/i);
  });

  it('should format a Date object', () => {
    const result = formatDateTime12h(new Date(2026, 0, 15, 9, 0));
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });

  it('should return "-" for null', () => {
    expect(formatDateTime12h(null)).toBe('-');
  });

  it('should return "-" for undefined', () => {
    expect(formatDateTime12h(undefined)).toBe('-');
  });

  it('should return "-" for invalid date string', () => {
    expect(formatDateTime12h('not-a-date')).toBe('-');
  });

  it('should return "-" for empty string', () => {
    expect(formatDateTime12h('')).toBe('-');
  });
});
