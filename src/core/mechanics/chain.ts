// Mecánica "cadena" (El Bosque). Ver docs/03-economia.md §3.2.
// El nivel 0 (Buscadoras) produce moneda; el nivel k produce unidades del nivel k−1.
// Con ritmos ρ₀ = p₀·2^u₀·M y ρₖ = pₖ·2^uₖ (M solo afecta al nivel 0), el sistema es lineal y
// nilpotente, así que la solución exacta para cualquier Δ es un polinomio finito:
//   aⱼ(Δ)    = Σ_{k≥j} aₖ · (ρⱼ₊₁·…·ρₖ) · Δ^(k−j) / (k−j)!
//   moneda(Δ) = ρ₀ · Σ_{k≥0} aₖ · (ρ₁·…·ρₖ) · Δ^(k+1) / (k+1)!
// Por eso `advance` con un paso grande da lo mismo que muchos pasos pequeños.
//
// Como en classic.ts, M y el multiplicador por cerdito llegan ya calculados.

import type { GeneratorDef, WorldDef } from '../../content/types.ts';
import { D, Decimal } from '../num.ts';
import type { WorldState } from '../state.ts';

function rates(world: WorldDef, globalMult: number, generatorMult: (gen: GeneratorDef) => number): number[] {
  return world.generators.map((gen, k) => gen.baseProd * generatorMult(gen) * (k === 0 ? globalMult : 1));
}

/** Moneda por segundo ahora mismo: solo las Buscadoras producen moneda directamente. */
export function chainProductionPerSecond(world: WorldDef, worldState: WorldState, globalMult: number, generatorMult: (gen: GeneratorDef) => number): Decimal {
  const first = world.generators[0];
  if (!first) return D(0);
  const owned = worldState.generators[first.id]?.owned ?? D(0);
  return owned.mul(first.baseProd).mul(generatorMult(first)).mul(globalMult);
}

/**
 * Avanza `dt` segundos la cadena: actualiza las unidades poseídas de cada nivel (muta
 * `worldState.generators[*].owned`) y devuelve la moneda ganada en ese intervalo.
 */
export function advanceChain(world: WorldDef, worldState: WorldState, globalMult: number, generatorMult: (gen: GeneratorDef) => number, dt: number): Decimal {
  const gens = world.generators;
  const n = gens.length;
  const r = rates(world, globalMult, generatorMult);
  const before = gens.map((gen) => worldState.generators[gen.id]?.owned ?? D(0));

  for (let j = 0; j < n; j++) {
    let sum = D(0);
    let coef = D(1); // (ρⱼ₊₁·…·ρₖ) · Δ^(k−j) / (k−j)!
    for (let k = j; k < n; k++) {
      if (k > j) coef = coef.mul(r[k]! * dt).div(k - j);
      sum = sum.add(before[k]!.mul(coef));
    }
    const genState = worldState.generators[gens[j]!.id];
    if (genState) genState.owned = sum;
  }

  let gained = D(0);
  let coef = D(r[0] ?? 0).mul(dt); // ρ₀ · (ρ₁…ρₖ) · Δ^(k+1) / (k+1)!
  for (let k = 0; k < n; k++) {
    if (k > 0) coef = coef.mul(r[k]! * dt).div(k + 1);
    gained = gained.add(before[k]!.mul(coef));
  }
  return gained;
}
