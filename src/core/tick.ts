// Bucle de avance del tiempo. Ver docs/02-arquitectura.md §4.
// `advance` es la única función que hace pasar el tiempo. Es exacta para cualquier `dt`
// mientras no haya compras de por medio: advance(dt=10) == 10× advance(dt=1) acumulado.
//
// Hito 1: solo mecánica "classic". Las demás mecánicas (chain, harmony, calm), la colección
// y los desbloqueos se añaden en hitos posteriores (7-9, 6).

import type { Content } from '../content/types.ts';
import { productionPerSecond } from './formulas.ts';
import type { GameState } from './state.ts';

/** Avanza `dt` segundos la producción de todos los mundos desbloqueados. Muta `state`. */
export function advance(state: GameState, content: Content, dt: number): void {
  if (dt <= 0) return;
  state.time += dt;
  for (const world of content.worlds) {
    const worldState = state.worlds[world.id];
    if (!worldState || !worldState.unlocked) continue;
    const gained = productionPerSecond(state, content, world.id).mul(dt);
    worldState.currency = worldState.currency.add(gained);
    worldState.runEarned = worldState.runEarned.add(gained);
    worldState.lifetimeEarned = worldState.lifetimeEarned.add(gained);
    worldState.runSeconds += dt;
  }
}
