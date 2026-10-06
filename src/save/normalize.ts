// Rellena lo que falte en un GameState cargado según el contenido actual (herramientas, ventajas o
// logros añadidos después de guardar la partida) y descarta ids que ya no existan. Acota valores
// fuera de rango. No cambia `state.version` ni la forma del GameState (eso es cosa de una migración).

import type { Content } from '../content/types.ts';
import type { GameState } from '../core/state.ts';

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(Number.isFinite(value) ? value : min)));
}

/** Muta y devuelve `state`. Seguro de llamar siempre, haya o no contenido nuevo. */
export function normalize(state: GameState, content: Content): GameState {
  const toolIds = new Set(content.tools.map((t) => t.id));
  for (const id of Object.keys(state.tools)) {
    if (!toolIds.has(id)) delete state.tools[id];
    else state.tools[id] = clampInt(state.tools[id] ?? 0, 0, Number.MAX_SAFE_INTEGER);
  }
  for (const id of Object.keys(state.maxOwned)) if (!toolIds.has(id)) delete state.maxOwned[id];
  for (const id of toolIds) state.maxOwned[id] = Math.max(state.maxOwned[id] ?? 0, state.tools[id] ?? 0);

  const perkById = new Map(content.perks.map((p) => [p.id, p]));
  for (const id of Object.keys(state.perks)) {
    const perk = perkById.get(id);
    if (!perk) delete state.perks[id];
    else state.perks[id] = clampInt(state.perks[id] ?? 0, 0, perk.maxLevel ?? Number.MAX_SAFE_INTEGER);
  }

  const achievementIds = new Set(content.achievements.map((a) => a.id));
  for (const id of Object.keys(state.achievements)) if (!achievementIds.has(id)) delete state.achievements[id];

  state.revealed = clampInt(state.revealed, 1, content.tools.length);
  // Si se tiene alguna unidad de una herramienta, esa y todas las anteriores están descubiertas.
  content.tools.forEach((tool, index) => {
    if ((state.maxOwned[tool.id] ?? 0) > 0) state.revealed = Math.max(state.revealed, Math.min(content.tools.length, index + 1));
  });
  return state;
}
