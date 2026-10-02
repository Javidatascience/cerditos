// Desbloqueo de mundos (01 §7): un mundo se abre al tener cierto total de plumas del mundo
// anterior. El umbral es visible siempre (progreso en `unlockProgress`). Ver docs/02 §4 paso 3.

import type { Content, WorldDef } from '../content/types.ts';
import { startCurrency } from './formulas.ts';
import { addEntry } from './journal.ts';
import type { GameState, WorldId } from './state.ts';

export interface UnlockProgress {
  /** Mundo del que hay que acumular plumas. */
  fromWorld: WorldId;
  current: number;
  target: number;
  done: boolean;
}

/** Progreso hacia el desbloqueo de `world`; `null` si es el mundo inicial (sin requisito). */
export function unlockProgress(state: GameState, world: WorldDef): UnlockProgress | null {
  if (!world.unlock) return null;
  const current = state.worlds[world.unlock.world]?.plumasTotal.toNumber() ?? 0;
  return { fromWorld: world.unlock.world, current, target: world.unlock.plumasTotal, done: current >= world.unlock.plumasTotal };
}

/**
 * Abre los mundos cuyo requisito se cumple (una sola vez: los ya abiertos no se tocan).
 * Al abrirse recibe su moneda inicial y deja una entrada en el diario. Devuelve los ids abiertos.
 * `now`: epoch ms (core no lee el reloj del sistema).
 */
export function updateUnlocks(state: GameState, content: Content, now: number): WorldId[] {
  const opened: WorldId[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const world of content.worlds) {
      const worldState = state.worlds[world.id];
      if (!worldState || worldState.unlocked) continue;
      if (!unlockProgress(state, world)?.done) continue;
      worldState.unlocked = true;
      worldState.currency = startCurrency(state, content, world.id);
      addEntry(state, `Se ha abierto ${world.name}. ${world.flavor}`, now);
      opened.push(world.id);
      changed = true;
    }
  }
  return opened;
}
