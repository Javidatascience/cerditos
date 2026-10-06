// Logros (sin bonos): progreso y adopción automática con línea en el diario.

import type { AchievementDef, AchievementReq, Content } from '../content/types.ts';
import { addEntry } from './journal.ts';
import { D, Decimal } from './num.ts';
import type { GameState } from './state.ts';

export interface RequirementProgress {
  current: Decimal;
  target: Decimal;
  done: boolean;
}

function progress(current: Decimal | number, target: number): RequirementProgress {
  const c = D(current);
  return { current: c, target: D(target), done: c.gte(target) };
}

export function achievementProgress(state: GameState, req: AchievementReq): RequirementProgress {
  switch (req.kind) {
    case 'depth':
      return progress(state.records.maxDepth, req.count);
    case 'blocks':
      return progress(state.records.blocks, req.count);
    case 'taps':
      return progress(state.taps, req.count);
    case 'ascensions':
      return progress(state.ascensions, req.count);
    case 'plumasTotal':
      return progress(state.plumasTotal, req.count);
    case 'pieceLevel':
      return progress(state.gear[req.piece] ?? 0, req.count);
  }
}

export function isAchieved(state: GameState, def: AchievementDef): boolean {
  return state.achievements[def.id] !== undefined;
}

/** Adopta los logros cumplidos y anota en el diario los "grandes" (no los de nivel de pieza). Devuelve los ids. `now`: epoch ms. */
export function updateAchievements(state: GameState, content: Content, now: number): string[] {
  const achieved: string[] = [];
  for (const def of content.achievements) {
    if (isAchieved(state, def) || !achievementProgress(state, def.requires).done) continue;
    state.achievements[def.id] = { at: now };
    if (def.requires.kind !== 'pieceLevel') addEntry(state, `Logro: ${def.name}. ${def.flavor}`, now);
    achieved.push(def.id);
  }
  return achieved;
}
