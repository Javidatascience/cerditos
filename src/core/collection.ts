// Colección de variedades de cerdito (determinista, 01 §8): progreso de cada requisito,
// adopción automática (con cruces en cadena), bonos de variedades y sets completos.
// Ver docs/03-economia.md §7 y tools/sim/engine.ts > collectionMult/updateCollectionAndUnlocks.

import type { Bonus, Content, Requirement, VarietyDef } from '../content/types.ts';
import { addEntry } from './journal.ts';
import { D, Decimal } from './num.ts';
import type { GameState, WorldId } from './state.ts';

export interface RequirementProgress {
  current: Decimal;
  target: Decimal;
  done: boolean;
}

function progress(current: Decimal, target: Decimal): RequirementProgress {
  return { current, target, done: current.gte(target) };
}

/** Cuánto lleva el jugador de un requisito y cuánto hace falta. Nunca lanza por mundos o
 * cerditos que falten en el estado (cuenta como 0). */
export function requirementProgress(state: GameState, req: Requirement): RequirementProgress {
  switch (req.kind) {
    case 'genCount':
      return progress(D(state.worlds[req.world]?.records.maxBought[req.gen] ?? 0), D(req.count));
    case 'ascensions':
      return progress(D(state.worlds[req.world]?.ascensions ?? 0), D(req.count));
    case 'plumasTotal':
      return progress(state.worlds[req.world]?.plumasTotal ?? D(0), D(req.count));
    case 'lifetime':
      return progress(state.worlds[req.world]?.lifetimeEarned ?? D(0), D(req.amount));
    case 'harmony':
      return progress(D(state.worlds[req.world]?.records.maxHarmony ?? 0), D(req.count));
    case 'varieties': {
      const owned = req.ids.filter((id) => state.collection[id] !== undefined).length;
      return progress(D(owned), D(req.ids.length));
    }
  }
}

export function varietyRequirementsMet(state: GameState, variety: VarietyDef): boolean {
  return variety.requires.every((req) => requirementProgress(state, req).done);
}

/**
 * Adopta las variedades cuyos requisitos están cumplidos, repitiendo hasta que no haya
 * cambios (un cruce puede depender de una variedad adoptada en esta misma pasada) y anota
 * cada una en el diario. Devuelve los ids adoptados. `now`: epoch ms.
 */
export function updateCollection(state: GameState, content: Content, now: number): string[] {
  const adopted: string[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const variety of content.varieties) {
      if (state.collection[variety.id] !== undefined || !varietyRequirementsMet(state, variety)) continue;
      state.collection[variety.id] = { adoptedAt: now };
      addEntry(state, `Ha llegado ${variety.name}. ${variety.flavor}`, now);
      adopted.push(variety.id);
      changed = true;
    }
  }
  return adopted;
}

function bonusApplies(bonus: Bonus, worldId: WorldId, kind: Bonus['kind']): boolean {
  return bonus.kind === kind && (bonus.world === 'all' || bonus.world === worldId);
}

/** Producto de los bonos de `kind` ('prod' o 'cost') que aplican a `worldId`: variedades
 * adoptadas más sets completos (03 §7). */
export function collectionMultiplier(state: GameState, content: Content, worldId: WorldId, kind: Bonus['kind']): number {
  let mult = 1;
  const setTotal: Record<string, number> = {};
  const setOwned: Record<string, number> = {};
  for (const variety of content.varieties) {
    setTotal[variety.set] = (setTotal[variety.set] ?? 0) + 1;
    if (state.collection[variety.id] === undefined) continue;
    setOwned[variety.set] = (setOwned[variety.set] ?? 0) + 1;
    if (bonusApplies(variety.bonus, worldId, kind)) mult *= variety.bonus.mult;
  }
  for (const set of content.sets) {
    if (!bonusApplies(set.bonus, worldId, kind)) continue;
    const total = setTotal[set.id] ?? 0;
    if (total > 0 && (setOwned[set.id] ?? 0) === total) mult *= set.bonus.mult;
  }
  return mult;
}
