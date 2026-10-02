// Rellena lo que falte en un GameState cargado según el contenido actual (mundos, cerditos,
// mejoras o ventajas añadidos después de guardar la partida) y descarta ids que ya no existan.
// Ver docs/02-arquitectura.md §6: "contenido nuevo no necesita migración".
//
// A diferencia de migrations.ts, SÍ accede al contenido, y no cambia `state.version` ni la
// forma del GameState (eso es cosa de una migración).

import { generatorUpgradeId } from '../core/formulas.ts';
import { createGeneratorState, createWorldState } from '../core/state.ts';
import type { Content, WorldDef } from '../content/types.ts';
import type { GameState, WorldState } from '../core/state.ts';

/** Ventajas que ya no existen y lo que costaron (nivel único, sin escalado). */
const REMOVED_PERK_REFUNDS: Record<string, number> = { capataz: 5, encargada: 20 };

function validUpgradeIdsFor(world: WorldDef): Set<string> {
  const ids = new Set<string>();
  for (const upgrade of world.globalUpgrades) ids.add(upgrade.id);
  if (world.genUpgrades) {
    for (const gen of world.generators) {
      for (let level = 0; level < world.genUpgrades.counts.length; level++) ids.add(generatorUpgradeId(gen.id, level));
    }
  }
  return ids;
}

function normalizeWorldState(w: WorldState, world: WorldDef, content: Content): void {
  const validGenIds = new Set(world.generators.map((g) => g.id));
  for (const gen of world.generators) {
    if (!w.generators[gen.id]) {
      w.generators[gen.id] = createGeneratorState();
      w.records.maxBought[gen.id] = 0;
    }
  }
  for (const id of Object.keys(w.generators)) if (!validGenIds.has(id)) delete w.generators[id];
  for (const id of Object.keys(w.records.maxBought)) if (!validGenIds.has(id)) delete w.records.maxBought[id];

  w.revealed = Math.min(world.generators.length, Math.max(1, Math.floor(w.revealed)));

  const validUpgradeIds = validUpgradeIdsFor(world);
  for (const id of Object.keys(w.upgrades)) if (!validUpgradeIds.has(id)) delete w.upgrades[id];

  const validPerkIds = new Set(content.perks.filter((p) => p.world === world.id).map((p) => p.id));
  for (const id of Object.keys(w.perks)) {
    if (validPerkIds.has(id)) continue;
    // Capataz y Encargada se eliminaron (autocompra): se devuelven las plumas que costaron.
    const refund = REMOVED_PERK_REFUNDS[id.split('.')[1] ?? ''];
    if (refund !== undefined && (w.perks[id] ?? 0) > 0) w.plumas = w.plumas.add(refund);
    delete w.perks[id];
  }
}

/** Muta y devuelve `state`. Seguro de llamar siempre, haya o no contenido nuevo. */
export function normalize(state: GameState, content: Content): GameState {
  const validWorldIds = new Set(content.worlds.map((w) => w.id));

  for (const world of content.worlds) {
    const existing = state.worlds[world.id];
    if (!existing) state.worlds[world.id] = createWorldState(world);
    else normalizeWorldState(existing, world, content);
  }
  for (const id of Object.keys(state.worlds)) if (!validWorldIds.has(id)) delete state.worlds[id];

  if (!validWorldIds.has(state.activeWorld)) {
    const first = content.worlds[0];
    if (first) state.activeWorld = first.id;
  }

  const validVarietyIds = new Set(content.varieties.map((v) => v.id));
  for (const id of Object.keys(state.collection)) if (!validVarietyIds.has(id)) delete state.collection[id];

  const validAchievementIds = new Set(content.achievements.map((a) => a.id));
  for (const id of Object.keys(state.achievements)) if (!validAchievementIds.has(id)) delete state.achievements[id];

  return state;
}
