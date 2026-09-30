// Helpers numéricos. break_infinity.js: rango enorme, precisión de `number` (no arbitraria).
// Se usa para todo lo que puede crecer sin límite (moneda, producción, plumas).
// Ver docs/02-arquitectura.md §1 (por qué break_infinity y no decimal.js) y docs/03-economia.md §2.

export { default as Decimal } from 'break_infinity.js';
import Decimal from 'break_infinity.js';

/** Atajo para construir un Decimal a partir de number, string u otro Decimal. */
export function D(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

/**
 * Coste de comprar `k` unidades empezando en la unidad `n` (0-indexado), con coste base
 * `base` y crecimiento `r` por unidad: base·r^n + base·r^(n+1) + … + base·r^(n+k-1).
 * = base·r^n · (r^k − 1)/(r − 1)   (r ≠ 1; en la práctica r siempre es > 1 en este juego).
 * Ver docs/03-economia.md §2 "Compra en bloque".
 */
export function bulkCost(base: Decimal | number, r: number, n: number, k: number): Decimal {
  if (k <= 0) return D(0);
  // Decimal.sumGeometricSeries(numItems, priceStart, priceRatio, currentOwned) sabe hacer esto
  // (biblioteca break_infinity.js), evitando reimplementar la suma geométrica a mano.
  return Decimal.sumGeometricSeries(k, base, r, n);
}

/**
 * Máximo número de unidades que se pueden comprar con `money` empezando en la unidad `n`,
 * con coste base `base` y crecimiento `r`. Fórmula cerrada de docs/03-economia.md §2.
 */
export function maxAffordable(money: Decimal | number, base: Decimal | number, r: number, n: number): number {
  const m = D(money);
  if (m.lte(0)) return 0;
  const affordable = Decimal.affordGeometricSeries(m, base, r, n);
  return Math.max(0, Math.floor(affordable.toNumber()));
}

export function decimalMin(a: Decimal, b: Decimal): Decimal {
  return a.lt(b) ? a : b;
}

export function decimalMax(a: Decimal, b: Decimal): Decimal {
  return a.gt(b) ? a : b;
}
