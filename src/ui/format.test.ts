import { describe, expect, it } from 'vitest';
import { D } from '../core/num.ts';
import { formatDuration, formatNumber } from './format.ts';

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [12.5, '12,5'],
    [42, '42'],
    [999, '999'],
    [9999, '9999'],
    [10_000, '10,0 K'],
    [12_345, '12,3 K'],
    [123_456, '123 K'],
    [1_230_000, '1,23 M'],
    [1_230_000_000, '1,23 B'],
    [1_230_000_000_000, '1,23 T'],
    [4.5e15, '4,50 Qa'],
  ])('%s → %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it('usa notación científica a partir de 1e36', () => {
    expect(formatNumber(D('1e30'))).toBe('1,00 No');
    expect(formatNumber(D('1e36'))).toMatch(/^1(,00)?e36$/);
  });

  it('respeta la notación "cientifica" aunque el número sea pequeño', () => {
    expect(formatNumber(1234, 'cientifica')).toMatch(/^1,23e3$/);
  });

  it('acepta tanto number como Decimal con el mismo resultado', () => {
    expect(formatNumber(123456)).toBe(formatNumber(D(123456)));
  });

  it('nunca lanza para números negativos', () => {
    expect(formatNumber(-42)).toBe('-42');
  });
});

describe('formatDuration', () => {
  it.each([
    [45, '45 s'],
    [0, '0 s'],
    [720, '12 min'],
    [12000, '3 h 20 min'],
    [187200, '2 d 4 h'],
    [7200, '2 h'],
    [172800, '2 d'],
  ])('%s s → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it('nunca da segundos negativos', () => {
    expect(formatDuration(-5)).toBe('0 s');
  });
});
