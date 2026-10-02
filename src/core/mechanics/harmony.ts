// Mecánica "armonía" (La Huerta). Ver docs/03-economia.md §3.3.
//   filas = mínimo de unidades poseídas entre todos los cerditos
//   M_armonía = (1 + perLevel·filas) · mult^(umbrales alcanzados)
// Umbrales (10, 25, 50, 75…) y no exponencial continua: ver 03 §3.3 (estabilidad).

import type { WorldDef } from '../../content/types.ts';
import { D, Decimal } from '../num.ts';
import type { WorldState } from '../state.ts';

/** Filas completas: el mínimo de unidades poseídas entre los cerditos del mundo. */
export function harmonyLevel(world: WorldDef, worldState: WorldState): number {
  let min: Decimal | null = null;
  for (const gen of world.generators) {
    const owned = worldState.generators[gen.id]?.owned ?? D(0);
    if (min === null || owned.lt(min)) min = owned;
  }
  return min ? Math.floor(min.toNumber()) : 0;
}

/** Multiplicador de producción por armonía para `level` filas (1 si el mundo no la usa). */
export function harmonyMultiplier(world: WorldDef, level: number): number {
  const cfg = world.harmony;
  if (!cfg) return 1;
  const steps = cfg.thresholds.filter((t) => level >= t).length;
  return (1 + cfg.perLevel * level) * cfg.mult ** steps;
}

/** Siguiente umbral de ×mult todavía no alcanzado; `null` si ya se alcanzaron todos. */
export function nextHarmonyThreshold(world: WorldDef, level: number): number | null {
  return world.harmony?.thresholds.find((t) => t > level) ?? null;
}

/** Ids de los cerditos que están en el mínimo (los que "completarían la fila"). */
export function lowestGenerators(world: WorldDef, worldState: WorldState): string[] {
  const level = harmonyLevel(world, worldState);
  return world.generators.filter((gen) => (worldState.generators[gen.id]?.owned ?? D(0)).lte(level)).map((gen) => gen.id);
}
