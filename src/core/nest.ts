// Fórmulas del Nido y de las bellotas de la cesta (solo lectura; las compras y los cambios de etapa
// mutan en actions.ts). Los tiempos son de reloj real (`now` en epoch ms), también con el juego cerrado.

import type { Content, CreatureDef } from '../content/types.ts';
import { perkSumOf } from './perkEffects.ts';
import type { GameState } from './state.ts';

/** El Nido se abre al conseguir cierto número de esmeraldas en total (cuenta el histórico). */
export function nestUnlocked(state: GameState, content: Content): boolean {
  return state.plumasTotal.gte(content.nest.unlockPlumas);
}

/** Nidos disponibles: 1 de base más los que den las ventajas (como máximo los de `maxSlots`). */
export function nestSlotCount(state: GameState, content: Content): number {
  return Math.min(content.nest.maxSlots, 1 + Math.round(perkSumOf(state, content, 'nestSlots')));
}

export function creatureOf(content: Content, id: string): CreatureDef | undefined {
  return content.nest.creatures.find((c) => c.id === id);
}

/** Milisegundos que le quedan al huevo de una casilla para poder eclosionar (0 si ya puede). */
export function hatchLeftMs(content: Content, slot: { creature: string; stage: number; since: number }, now: number): number {
  const creature = creatureOf(content, slot.creature);
  if (!creature || slot.stage !== 0) return 0;
  return Math.max(0, slot.since + creature.hatchSeconds * 1000 - now);
}

/** Horas que tarda el Topo excavador en dejar una bellota en la cesta (null si no se tiene la ventaja). */
export function basketAcornHours(state: GameState, content: Content): number | null {
  return (state.companionLevels['topo'] ?? 0) >= content.nest.topoLevel ? content.nest.topoHours : null;
}

/** Bono temporal de las ofrendas a criaturas adultas: producto (prodMult) o suma (tapMult, momentumMax) de las activas. */
export function nestBoost(state: GameState, content: Content, kind: 'prodMult' | 'tapMult' | 'momentumMax'): number {
  let product = 1;
  let sum = 0;
  for (const c of content.nest.creatures) {
    if (c.boost.kind !== kind || (state.nest.boosts[c.id] ?? 0) <= state.time) continue;
    product *= c.boost.value;
    sum += c.boost.value;
  }
  return kind === 'prodMult' ? product : sum;
}

/** Bellotas que hay ahora en la cesta, dejadas por el topo (con tope; no cuentan mientras no se tenga la ventaja). */
export function basketAcornsReady(state: GameState, content: Content, now: number): number {
  const hours = basketAcornHours(state, content);
  if (hours === null || state.basketAcornsAt <= 0) return 0;
  return Math.min(content.nest.basketAcornCap, Math.max(0, Math.floor((now - state.basketAcornsAt) / (hours * 3600_000))));
}
