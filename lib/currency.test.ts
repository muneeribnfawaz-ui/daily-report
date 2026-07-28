import { describe, it, expect } from 'vitest';
import { formatINR, formatSAR } from './currency';

describe('currency formatter', () => {
  it('formats INR correctly without fractional digits for integers', () => {
    expect(formatINR(1000)).toMatch(/1,000/);
  });

  it('formats SAR correctly', () => {
    expect(formatSAR(1000)).toMatch(/1,000/);
  });
});
