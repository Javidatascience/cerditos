// Mecánica "classic" (El Valle; también la base de "calm" en El Balneario antes de aplicar
// el bono de calma, hito 9). Ver docs/03-economia.md §3.1:
//   producción/s = M · Σᵢ aᵢ · pᵢ · 2^(mejoras compradas del cerdito i)
//
// M (multiplicador global) y el multiplicador por generador los calcula formulas.ts; aquí solo
// se reciben ya calculados (como parámetros) para no crear un import circular formulas↔classic.

import type { GeneratorDef, WorldDef } from '../../content/types.ts';
import { D, Decimal } from '../num.ts';
import type { WorldState } from '../state.ts';

export function classicProductionPerSecond(
  world: WorldDef,
  worldState: WorldState,
  globalMult: number,
  generatorMult: (gen: GeneratorDef) => number,
): Decimal {
  let total = D(0);
  for (const gen of world.generators) {
    const genState = worldState.generators[gen.id];
    if (!genState) continue;
    total = total.add(genState.owned.mul(gen.baseProd).mul(generatorMult(gen)));
  }
  return total.mul(globalMult);
}
