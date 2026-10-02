// Bucle de avance del tiempo. Ver docs/02-arquitectura.md §4.
// `advance` es la única función que hace pasar el tiempo. Es exacta para cualquier `dt`
// mientras no haya compras de por medio: advance(dt=10) == 10× advance(dt=1) acumulado.
//
// Mecánicas: classic y chain (hito 7); harmony y calm llegan en los hitos 8-9. La adopción de
// variedades y los desbloqueos de mundo ocurren al final y no cambian lo producido en este
// avance, solo los siguientes.

import type { Content } from '../content/types.ts';
import { updateCollection } from './collection.ts';
import { generatorMultiplierFn, globalMultiplier, productionPerSecond } from './formulas.ts';
import { gameClockMs } from './journal.ts';
import { advanceChain } from './mechanics/chain.ts';
import type { GameState } from './state.ts';
import { updateUnlocks } from './unlocks.ts';

/** Avanza `dt` segundos la producción de todos los mundos desbloqueados. Muta `state`. */
export function advance(state: GameState, content: Content, dt: number): void {
  if (dt <= 0) return;
  state.time += dt;
  for (const world of content.worlds) {
    const worldState = state.worlds[world.id];
    if (!worldState || !worldState.unlocked) continue;
    const gained =
      world.mechanic === 'chain'
        ? advanceChain(world, worldState, globalMultiplier(state, content, world.id), generatorMultiplierFn(world, worldState), dt)
        : productionPerSecond(state, content, world.id).mul(dt);
    worldState.currency = worldState.currency.add(gained);
    worldState.runEarned = worldState.runEarned.add(gained);
    worldState.lifetimeEarned = worldState.lifetimeEarned.add(gained);
    worldState.runSeconds += dt;
  }
  // Adopción de variedades (01 §8): automática y sin ventanas; el diario la anota con la hora
  // de juego derivada del estado (core no lee el reloj del sistema).
  const now = gameClockMs(state);
  updateCollection(state, content, now);
  updateUnlocks(state, content, now);
}
