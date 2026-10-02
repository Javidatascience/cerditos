// Cesta de la granja: cada mundo va llenando una cesta con una fracción de su producción;
// "Recoger" la vacía y la añade a la moneda. Determinista, no caduca y no hay prisa: tiene tope.
// Es un empujoncito para quien visita a menudo, no una obligación (el offline sigue al 100 %).

import type { Content } from '../content/types.ts';
import { displayProductionPerSecond } from './formulas.ts';
import type { Decimal } from './num.ts';
import type { GameState, WorldId } from './state.ts';

/** Fracción de la producción que se acumula en la cesta. */
export const BASKET_RATE = 0.25;
/** Tope de tiempo acumulable: 30 min de producción (×BASKET_RATE). */
export const BASKET_CAP_SECONDS = 1800;

/** Segundos acumulados en la cesta (0..tope). */
export function basketSeconds(state: GameState, worldId: WorldId): number {
  const since = state.worlds[worldId]?.basketSince ?? state.time;
  return Math.min(BASKET_CAP_SECONDS, Math.max(0, state.time - since));
}

/** Lo que daría recoger la cesta ahora mismo. */
export function basketValue(state: GameState, content: Content, worldId: WorldId): Decimal {
  return displayProductionPerSecond(state, content, worldId).mul(basketSeconds(state, worldId) * BASKET_RATE);
}
