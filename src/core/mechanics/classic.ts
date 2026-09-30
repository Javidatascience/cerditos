// Mecánica "classic" (El Valle) y "calm" (El Balneario, antes de aplicar el bono de calma).
// Ver docs/03-economia.md §3.1: producción/s = M · Σᵢ aᵢ · pᵢ · 2^(mejoras del cerdito i).
//
// Hito 1: sin mejoras por cerdito ni multiplicador global (M = 1 fijo); se completa en el
// hito 3 (mejoras) y en los hitos 5-9 (ventajas, colección, armonía/calma).

import type { WorldDef } from '../../content/types.ts';
import { D, Decimal } from '../num.ts';
import type { WorldState } from '../state.ts';

/** Producción por segundo sin aplicar el multiplicador global del mundo. */
export function classicProductionPerSecond(world: WorldDef, worldState: WorldState): Decimal {
  let total = D(0);
  for (const gen of world.generators) {
    const genState = worldState.generators[gen.id];
    if (!genState) continue;
    total = total.add(genState.owned.mul(gen.baseProd));
  }
  return total;
}
