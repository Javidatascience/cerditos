// Cerditos descubiertos (docs/01 §4): al empezar solo se ven los que ya puedes comprar; el
// siguiente aparece difuminado y los demás quedan ocultos ("hay más por descubrir"). Un cerdito
// se descubre cuando se ha podido pagar su primera unidad, o ya se compró alguna vez. Solo
// avanza (ascender no vuelve a ocultar nada). En armonía y fusión se ven todos desde el inicio.

import type { Content } from '../content/types.ts';
import { generatorCost, perkCostGrowthDelta, totalCostMultiplier } from './formulas.ts';
import type { GameState } from './state.ts';

/** Descubre los cerditos que ya se pueden pagar. Muta `state`. */
export function updateReveals(state: GameState, content: Content): void {
  for (const world of content.worlds) {
    const ws = state.worlds[world.id];
    if (!ws || !ws.unlocked) continue;
    if (world.mechanic === 'harmony' || world.mechanic === 'merge') {
      ws.revealed = world.generators.length;
      continue;
    }
    const delta = perkCostGrowthDelta(state, content, world.id);
    const mult = totalCostMultiplier(state, content, world.id);
    while (ws.revealed < world.generators.length) {
      const gen = world.generators[ws.revealed]!;
      const seenBefore = (ws.records.maxBought[gen.id] ?? 0) > 0;
      const bought = ws.generators[gen.id]?.bought ?? 0;
      if (!seenBefore && ws.currency.lt(generatorCost(world, gen, bought, delta, mult))) break;
      ws.revealed += 1;
    }
  }
}
