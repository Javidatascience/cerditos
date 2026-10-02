// Logros (sin bonos): progreso, adopción automática con línea en el diario.
// Reutiliza requirementProgress de collection.ts para los requisitos comunes.

import type { AchievementDef, AchievementReq, Content } from '../content/types.ts';
import { requirementProgress, type RequirementProgress } from './collection.ts';
import { addEntry } from './journal.ts';
import { D } from './num.ts';
import type { GameState } from './state.ts';

export function achievementProgress(state: GameState, req: AchievementReq): RequirementProgress {
  switch (req.kind) {
    case 'varietyCount': {
      const current = D(Object.keys(state.collection).length);
      return { current, target: D(req.count), done: current.gte(req.count) };
    }
    case 'worldUnlocked': {
      const unlocked = state.worlds[req.world]?.unlocked ?? false;
      return { current: D(unlocked ? 1 : 0), target: D(1), done: unlocked };
    }
    case 'taps': {
      const current = D(state.taps);
      return { current, target: D(req.count), done: current.gte(req.count) };
    }
    default:
      return requirementProgress(state, req);
  }
}

export function isAchieved(state: GameState, def: AchievementDef): boolean {
  return state.achievements[def.id] !== undefined;
}

/** Adopta los logros cumplidos y anota cada uno en el diario. Devuelve los ids. `now`: epoch ms. */
export function updateAchievements(state: GameState, content: Content, now: number): string[] {
  const achieved: string[] = [];
  for (const def of content.achievements) {
    if (isAchieved(state, def) || !achievementProgress(state, def.requires).done) continue;
    state.achievements[def.id] = { at: now };
    addEntry(state, `Logro: ${def.name}. ${def.flavor}`, now);
    achieved.push(def.id);
  }
  return achieved;
}
