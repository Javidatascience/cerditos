// Efectos de las ventajas del árbol que usan el jardín, la cueva y los compañeros. Vive aparte de
// formulas.ts (que importa a cave.ts y garden.ts) para no crear un ciclo de importaciones.

import type { Content, PerkEffect } from '../content/types.ts';
import type { GameState } from './state.ts';

/** Suma de `perLevel · nivel` de las ventajas de ese tipo. */
export function perkSumOf(state: GameState, content: Content, kind: PerkEffect['kind']): number {
  let total = 0;
  for (const perk of content.perks) if (perk.effect.kind === kind) total += perk.effect.perLevel * (state.perks[perk.id] ?? 0);
  return total;
}

/** Producto de `perLevel ^ nivel` de las ventajas de ese tipo. */
export function perkProductOf(state: GameState, content: Content, kind: PerkEffect['kind']): number {
  let total = 1;
  for (const perk of content.perks) if (perk.effect.kind === kind) total *= perk.effect.perLevel ** (state.perks[perk.id] ?? 0);
  return total;
}

/** Máximo que se podría llegar a sumar de un tipo (todos los niveles comprados), para dimensionar datos guardados. */
export function perkSumMax(content: Content, kind: PerkEffect['kind']): number {
  let total = 0;
  for (const perk of content.perks) if (perk.effect.kind === kind) total += perk.effect.perLevel * (perk.maxLevel ?? 0);
  return total;
}
