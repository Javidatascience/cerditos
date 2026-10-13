// Cesta: lo que el cerdito gana mientras no estás. La producción offline (hasta el tope de horas) no va a
// las monedas sino a la cesta, y "Recoger" la suma (y cuenta para las esmeraldas). Mientras juegas no se
// llena. También guarda las bellotas que deja el topo al nivel 3. Ver docs/06-mina.md.

import type { Decimal } from './num.ts';
import type { GameState } from './state.ts';

/** Lo que daría recoger la cesta ahora mismo. */
export function basketValue(state: GameState): Decimal {
  return state.basket;
}
