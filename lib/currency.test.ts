import { describe, it, expect } from 'vitest';
import { formatINR, formatINRPdf, formatSAR } from './currency';

describe('currency formatter', () => {
  it('formats INR correctly without fractional digits for integers', () => {
    expect(formatINR(1000)).toMatch(/1,000/);
  });

  it('formats PDF-safe INR currency with Rs. prefix', () => {
    expect(formatINRPdf(1000)).toContain('Rs.');
    expect(formatINRPdf(1000)).not.toContain('₹');
  });

  it('formats SAR correctly', () => {
    expect(formatSAR(1000)).toMatch(/1,000/);
  });
});
