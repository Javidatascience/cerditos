// Mecánica "fusión" (La Pocilga). Hay un número limitado de huecos; solo se compra el nivel 0
// (cochinillo) y dos cerdos del mismo nivel se fusionan en uno del nivel siguiente. Cada nivel
// produce ×3 que el anterior (dato `baseProd` de cada cerdito), así que fusionar compensa:
// dos del nivel k valen 2·3^k, uno del k+1 vale 3^(k+1) (un 50 % más) y ocupa la mitad.
// La producción usa la misma suma que "classic" (owned · baseProd · mejoras · M).

import type { WorldDef } from '../../content/types.ts';
import type { WorldState } from '../state.ts';

/** Huecos totales del mundo (0 si no es de fusión). */
export function slotsOf(world: WorldDef): number {
  return world.mechanic === 'merge' ? (world.merge?.slots ?? 0) : 0;
}

/** Cerdos que hay ahora mismo, de todos los niveles. */
export function totalPigs(world: WorldDef, worldState: WorldState): number {
  let total = 0;
  for (const gen of world.generators) total += worldState.generators[gen.id]?.owned.toNumber() ?? 0;
  return total;
}

export function freeSlots(world: WorldDef, worldState: WorldState): number {
  return Math.max(0, slotsOf(world) - Math.round(totalPigs(world, worldState)));
}

/** Se puede fusionar el nivel `level` (0-based): hay dos y existe un nivel siguiente. */
export function canMerge(world: WorldDef, worldState: WorldState, level: number): boolean {
  if (world.mechanic !== 'merge') return false;
  const gen = world.generators[level];
  const next = world.generators[level + 1];
  if (!gen || !next) return false;
  return (worldState.generators[gen.id]?.owned.toNumber() ?? 0) >= 2;
}
