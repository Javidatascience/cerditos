// Formato de números y tiempos en español.
// - < 10.000: número entero con separador de miles (con un decimal si es < 100).
// - >= 10.000: sufijos de escala corta (K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc) con 3 cifras
//   significativas: 12,3 K · 123 K · 1,23 M…
// - >= 1e36 o notación "cientifica": notación científica "1,23e45".

import { D, Decimal } from '../core/num.ts';

export type Notation = 'es' | 'cientifica';

const SUFFIXES = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
const SUFFIX_FROM = 1e4;
const SCIENTIFIC_FROM_EXPONENT = 36;

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

/** 3 cifras significativas: 1,23 · 12,3 · 123. */
function threeDigits(scaled: number): string {
  const text = scaled < 10 ? scaled.toFixed(2) : scaled < 100 ? scaled.toFixed(1) : String(Math.round(scaled));
  return text.replace('.', ',');
}

export function formatNumber(value: number | Decimal, notation: Notation = 'es'): string {
  const dec = value instanceof Decimal ? value : D(value);
  if (dec.eq(0)) return '0';

  const negative = dec.sign() < 0;
  const abs = dec.abs();
  const sign = negative ? '-' : '';
  const exponent = abs.exponent; // floor(log10(abs)) para abs != 0

  if (notation === 'cientifica' || exponent >= SCIENTIFIC_FROM_EXPONENT) {
    return sign + formatScientific(abs);
  }

  if (abs.lt(SUFFIX_FROM)) {
    const num = abs.toNumber();
    if (num < 100) {
      const rounded = Math.round(num * 10) / 10;
      if (Number.isInteger(rounded)) return sign + formatInt(rounded);
      return sign + rounded.toFixed(1).replace('.', ',');
    }
    return sign + formatInt(num);
  }

  const group = Math.floor(exponent / 3); // 1 = K, 2 = M…
  const suffix = SUFFIXES[group - 1] ?? '';
  const scaled = abs.div(Decimal.pow(10, group * 3)).toNumber();
  return `${sign}${threeDigits(scaled)} ${suffix}`;
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
