import { describe, expect, it } from 'vitest';
import { formatEuroAmount, parseEuroAmount } from '../../src/renderer/utils/euroAmount';

describe('euroAmount utils', () => {
  it('parses plain numeric strings and numbers', () => {
    expect(parseEuroAmount('6')).toBe(6);
    expect(parseEuroAmount('6.5')).toBe(6.5);
    expect(parseEuroAmount(7)).toBe(7);
  });

  it('parses localized euro strings with comma decimals', () => {
    expect(parseEuroAmount('6,00 €')).toBe(6);
    expect(parseEuroAmount('6,5 €')).toBe(6.5);
    expect(parseEuroAmount('1.234,56 €')).toBe(1234.56);
  });

  it('parses dot-decimal strings with thousand commas', () => {
    expect(parseEuroAmount('1,234.56')).toBe(1234.56);
  });

  it('formats values in euro and can be round-tripped by parser', () => {
    const formatted = formatEuroAmount(6);
    expect(formatted).toMatch(/6,00/);
    expect(parseEuroAmount(formatted)).toBe(6);
  });

  it('returns 0 for invalid values', () => {
    expect(parseEuroAmount('abc')).toBe(0);
    expect(parseEuroAmount(undefined)).toBe(0);
    expect(parseEuroAmount(null)).toBe(0);
    expect(parseEuroAmount('')).toBe(0);
  });
});
