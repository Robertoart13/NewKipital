import { describe, expect, it } from 'vitest';

import {
  resolveAccordionExpandedKeys,
  sanitizeAccordionExpandedKeys,
} from '../payrollAccordion';

describe('payrollAccordion helpers', () => {
  it('resolveAccordionExpandedKeys mantiene un solo expandido cuando abre', () => {
    expect(resolveAccordionExpandedKeys(true, 15)).toEqual([15]);
  });

  it('resolveAccordionExpandedKeys cierra todos cuando colapsa', () => {
    expect(resolveAccordionExpandedKeys(false, 15)).toEqual([]);
  });

  it('sanitizeAccordionExpandedKeys conserva solo el primero visible', () => {
    expect(sanitizeAccordionExpandedKeys([9, 12, 20], [12, 33, 44])).toEqual([12]);
  });

  it('sanitizeAccordionExpandedKeys limpia expansion cuando no hay filas visibles', () => {
    expect(sanitizeAccordionExpandedKeys([9], [])).toEqual([]);
  });
});
