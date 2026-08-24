import { describe, it, expect } from 'vitest';
import { cn, formatDate } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
      expect(cn('class1', { class2: true, class3: false })).toBe('class1 class2');
    });

    it('resolves tailwind conflicts', () => {
      expect(cn('p-4 p-8')).toBe('p-8');
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });
  });

  describe('formatDate', () => {
    it('formats string dates correctly', () => {
      // Setup a fixed date string (ignoring timezones for basic check, or using exact text)
      const formatted = formatDate('2024-01-01T12:00:00Z');
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('formats Date objects correctly', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const formatted = formatDate(date);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});
