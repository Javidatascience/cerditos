// Cesta: se va llenando con una fracción de lo que ganas por segundo (sin la inercia); "Recoger" la vacía y la
// suma a las monedas. Determinista, no caduca y tiene tope. Es un empujoncito para quien visita a
// menudo, no una obligación.

import type { Content } from '../content/types.ts';
import { caveSum } from './cave.ts';
import { baseIncomePerSecond } from './formulas.ts';
import type { Decimal } from './num.ts';
import type { GameState } from './state.ts';

/** Fracción de las monedas por segundo que se acumula en la cesta. */
export const BASKET_RATE = 0.25;
/** Tope de tiempo acumulable: 30 min. */
export const BASKET_CAP_SECONDS = 1800;

/** Tope de tiempo de la cesta (más con las ventajas de la cueva). */
export function basketCap(state: GameState, content: Content): number {
  return BASKET_CAP_SECONDS + caveSum(state, content, 'basketSeconds');
}

export function basketSeconds(state: GameState, capSeconds: number = BASKET_CAP_SECONDS): number {
  return Math.min(capSeconds, Math.max(0, state.time - state.basketSince));
}

/** Lo que daría recoger la cesta ahora mismo. */
export function basketValue(state: GameState, content: Content): Decimal {
  return baseIncomePerSecond(state, content).mul(basketSeconds(state, basketCap(state, content)) * BASKET_RATE);
}
