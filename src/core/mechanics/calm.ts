// Mecánica "calma" (El Balneario). Ver docs/03-economia.md §3.4.
//   calma ∈ [0,1] sube linealmente (1/rampSeconds por segundo) hasta 1.
//   producción(t) = base · (1 + maxBonus · calma(t))
//   Al comprar: calma ← calma · penalty, como mucho una vez por ventana (windowSeconds, medida
//   en segundos de `state.time`). Cada ronda empieza con la calma llena.

import type { CalmDef, WorldDef } from '../../content/types.ts';
import type { WorldState } from '../state.ts';

function calmDef(world: WorldDef): CalmDef | null {
  return world.mechanic === 'calm' && world.calm ? world.calm : null;
}

/** Factor de producción actual por calma: 1 + maxBonus·calma (1 si el mundo no usa calma). */
export function calmMultiplier(world: WorldDef, worldState: WorldState): number {
  const cfg = calmDef(world);
  return cfg ? 1 + cfg.maxBonus * worldState.calm : 1;
}

/**
 * Avanza la calma `dt` segundos (rampa lineal, tope en 1) y devuelve el factor MEDIO de
 * producción en ese intervalo: 1 + maxBonus · (calma media). La integral es exacta: rampa
 * parcial, completa o mixta (rampa y luego tramo plano). Muta `worldState.calm`.
 */
export function advanceCalm(world: WorldDef, worldState: WorldState, dt: number): number {
  const cfg = calmDef(world);
  if (!cfg || dt <= 0) return 1;
  const c0 = worldState.calm;
  const tFull = Math.max(0, (1 - c0) * cfg.rampSeconds);
  const t1 = Math.min(dt, tFull);
  const c1 = c0 + t1 / cfg.rampSeconds;
  const avgCalm = (t1 * ((c0 + c1) / 2) + (dt - t1) * 1) / dt;
  worldState.calm = Math.min(1, c1);
  return 1 + cfg.maxBonus * avgCalm;
}

/** ¿Una compra ahora molestaría a los cerditos? (fuera de la ventana de 60 s ya penalizada). */
export function purchaseWouldDisturb(world: WorldDef, worldState: WorldState, time: number): boolean {
  return calmDef(world) !== null && time >= worldState.calmPenaltyUntil;
}

/** Aplica la penalización de una compra (una vez por ventana). Muta `worldState`. */
export function touchCalm(world: WorldDef, worldState: WorldState, time: number): void {
  const cfg = calmDef(world);
  if (!cfg || time < worldState.calmPenaltyUntil) return;
  worldState.calm *= cfg.penalty;
  worldState.calmPenaltyUntil = time + cfg.windowSeconds;
}
