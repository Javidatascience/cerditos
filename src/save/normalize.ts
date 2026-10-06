// Rellena lo que falte en un GameState cargado según el contenido actual (piezas, ventajas o
// logros añadidos después de guardar la partida) y descarta ids que ya no existan. Acota valores
// fuera de rango. No cambia `state.version` ni la forma del GameState (eso es cosa de una migración).

import type { Content } from '../content/types.ts';
import { blockHpAt, MAX_DEPTH } from '../core/formulas.ts';
import type { GameState } from '../core/state.ts';

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(Number.isFinite(value) ? value : min)));
}

/** Muta y devuelve `state`. Seguro de llamar siempre, haya o no contenido nuevo. */
export function normalize(state: GameState, content: Content): GameState {
  const pieceById = new Map(content.pieces.map((p) => [p.id, p]));
  for (const id of Object.keys(state.gear)) {
    const piece = pieceById.get(id);
    if (!piece) delete state.gear[id];
    else state.gear[id] = clampInt(state.gear[id] ?? 0, 0, piece.maxLevel);
  }

  const materialIds = new Set(content.materials.map((m) => m.id));
  for (const id of Object.keys(state.materials)) if (!materialIds.has(id)) delete state.materials[id];

  const perkById = new Map(content.perks.map((p) => [p.id, p]));
  for (const id of Object.keys(state.perks)) {
    const perk = perkById.get(id);
    if (!perk) delete state.perks[id];
    else state.perks[id] = clampInt(state.perks[id] ?? 0, 0, perk.maxLevel ?? Number.MAX_SAFE_INTEGER);
  }

  const achievementIds = new Set(content.achievements.map((a) => a.id));
  for (const id of Object.keys(state.achievements)) if (!achievementIds.has(id)) delete state.achievements[id];

  state.depth = clampInt(state.depth, 1, MAX_DEPTH);
  state.runMaxDepth = clampInt(Math.max(state.runMaxDepth, state.depth), 1, MAX_DEPTH);
  state.records.maxDepth = clampInt(Math.max(state.records.maxDepth, state.runMaxDepth), 1, MAX_DEPTH);
  const maxHp = blockHpAt(content, state.depth);
  if (!Number.isFinite(state.blockHp) || state.blockHp <= 0 || state.blockHp > maxHp) state.blockHp = maxHp;

  if (state.farmZone !== null && (state.farmZone < 0 || state.farmZone >= content.zones.length)) state.farmZone = null;
  return state;
}
