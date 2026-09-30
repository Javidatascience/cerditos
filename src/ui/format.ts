// Formato de números y tiempos en español. Ver docs/02-arquitectura.md §8.
// - < 1e6: separador de miles; decimales solo si el valor es < 100.
// - 1e6..1e27: sufijos de escala larga española (M, mil M, B, mil B, T, mil T, C, mil C).
// - >= 1e30 o notación "cientifica": notación científica "1,23e45".

import { D, Decimal } from '../core/num.ts';

export type Notation = 'es' | 'cientifica';

const SCALE: { exp: number; suffix: string }[] = [
  { exp: 27, suffix: 'mil C' },
  { exp: 24, suffix: 'C' },
  { exp: 21, suffix: 'mil T' },
  { exp: 18, suffix: 'T' },
  { exp: 15, suffix: 'mil B' },
  { exp: 12, suffix: 'B' },
  { exp: 9, suffix: 'mil M' },
  { exp: 6, suffix: 'M' },
];

function formatScientific(abs: Decimal): string {
  // abs.toExponential(2) da algo como "1.23e+45" (número normal) o "9.99e+308" (Decimal
  // internamente); normalizamos a la coma española y quitamos el "+" del exponente.
  const [mantissaPart, expPart] = abs.toExponential(2).split('e');
  const exponent = (expPart ?? '0').replace('+', '');
  return `${(mantissaPart ?? '0').replace('.', ',')}e${exponent}`;
}

function formatInt(value: number): string {
  return Math.round(value).toLocaleString('es-ES');
}

export function formatNumber(value: number | Decimal, notation: Notation = 'es'): string {
  const dec = value instanceof Decimal ? value : D(value);
  if (dec.eq(0)) return '0';

  const negative = dec.sign() < 0;
  const abs = dec.abs();
  const sign = negative ? '-' : '';
  const exponent = abs.exponent; // floor(log10(abs)) para abs != 0

  if (notation === 'cientifica' || exponent >= 30) {
    return sign + formatScientific(abs);
  }

  if (exponent < 6) {
    const num = abs.toNumber();
    if (num < 100) {
      const rounded = Math.round(num * 10) / 10;
      if (Number.isInteger(rounded)) return sign + formatInt(rounded);
      return sign + rounded.toFixed(1).replace('.', ',');
    }
    return sign + formatInt(num);
  }

  const scale = SCALE.find((s) => exponent >= s.exp);
  if (!scale) return sign + formatInt(abs.toNumber());
  const scaled = abs.div(Decimal.pow(10, scale.exp)).toNumber();
  return `${sign}${scaled.toFixed(2).replace('.', ',')} ${scale.suffix}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} s`;

  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(s / 3600);
  if (hours < 24) {
    const remMinutes = Math.floor((s % 3600) / 60);
    return remMinutes > 0 ? `${hours} h ${remMinutes} min` : `${hours} h`;
  }

  const days = Math.floor(s / 86400);
  const remHours = Math.floor((s % 86400) / 3600);
  return remHours > 0 ? `${days} d ${remHours} h` : `${days} d`;
}
