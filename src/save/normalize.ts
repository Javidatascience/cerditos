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

  for (const id of Object.keys(state.upgrades)) {
    if (!toolIds.has(id)) delete state.upgrades[id];
    else state.upgrades[id] = clampInt(state.upgrades[id] ?? 0, 0, content.game.milestones.length);
  }

  const globalIds = new Set(content.globalUpgrades.map((u) => u.id));
  for (const id of Object.keys(state.globalUpgrades)) if (!globalIds.has(id)) delete state.globalUpgrades[id];
  state.momentum = Math.min(1, Math.max(0, Number.isFinite(state.momentum) ? state.momentum : 0));
  state.acorns = clampInt(state.acorns, 0, Number.MAX_SAFE_INTEGER);

  const skinIds = new Set(content.skins.map((s) => s.id));
  for (const id of Object.keys(state.skins)) if (!skinIds.has(id)) delete state.skins[id];
  if (!skinIds.has(state.activeSkin)) state.activeSkin = content.skins[0]?.id ?? '';
  const companionIds = new Set(content.companions.map((c) => c.id));
  for (const id of Object.keys(state.companions)) if (!companionIds.has(id)) delete state.companions[id];
  state.activeCompanions = state.activeCompanions.filter((id, i, all) => companionIds.has(id) && all.indexOf(id) === i).slice(-2);
  for (const id of Object.keys(state.companionProgress)) {
    const v = state.companionProgress[id];
    if (!companionIds.has(id) || typeof v !== 'number' || !Number.isFinite(v) || v < 0) delete state.companionProgress[id];
  }
  for (const id of Object.keys(state.companionLevels)) {
    const def = content.companions.find((c) => c.id === id);
    if (!def) delete state.companionLevels[id];
    else state.companionLevels[id] = clampInt(state.companionLevels[id] ?? 0, 0, def.upgrades.length);
  }
  const flowerIds = new Set(content.garden.flowers.map((f) => f.id));
  state.garden.plots = Array.from({ length: content.garden.plots }, (_, i) => {
    const p = state.garden.plots[i];
    return p && flowerIds.has(p.flower) && Number.isFinite(p.plantedAt) ? { flower: p.flower, plantedAt: p.plantedAt } : null;
  });
  for (const id of Object.keys(state.garden.found)) {
    const f = state.garden.found[id];
    if (!flowerIds.has(id) || !f) delete state.garden.found[id];
    else state.garden.found[id] = { count: clampInt(f.count, 1, Number.MAX_SAFE_INTEGER), shiny: f.shiny === true };
  }
  for (const id of Object.keys(state.garden.buffs)) {
    const until = state.garden.buffs[id];
    if (!flowerIds.has(id) || typeof until !== 'number' || !Number.isFinite(until)) delete state.garden.buffs[id];
  }
  const furnaceIds = new Set(content.cave.furnaces.map((f) => f.id));
  for (const id of Object.keys(state.cave.furnaces)) {
    if (!furnaceIds.has(id)) delete state.cave.furnaces[id];
    else state.cave.furnaces[id] = clampInt(state.cave.furnaces[id] ?? 0, 0, Number.MAX_SAFE_INTEGER);
  }
  const nodeIds = new Set(content.cave.nodes.map((x) => x.id));
  for (const id of Object.keys(state.cave.nodes)) if (!nodeIds.has(id)) delete state.cave.nodes[id];
  if (!Number.isFinite(state.cave.blowAt)) state.cave.blowAt = -1000;
  if (!state.cave.embers.gte(0)) state.cave.embers = state.cave.embers.sub(state.cave.embers);
  state.stats.visitors = clampInt(state.stats.visitors, 0, Number.MAX_SAFE_INTEGER);

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
