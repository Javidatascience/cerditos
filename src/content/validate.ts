// Valida el contenido del juego: ids únicos, referencias existentes, sin ciclos en las
// ventajas, costes positivos, al menos un mundo sin `unlock` (y el primero lo es). Ver docs/02-arquitectura.md §7.
// No es lógica de juego (no vive en core/): es una comprobación de los propios datos.

import type { Content, PerkDef, Requirement } from './types.ts';

export function validateContent(content: Content): string[] {
  const errors: string[] = [];

  const worldIds = new Set<string>();
  for (const world of content.worlds) {
    if (worldIds.has(world.id)) errors.push(`Mundo duplicado: ${world.id}`);
    worldIds.add(world.id);
  }

  for (const world of content.worlds) {
    const genIds = new Set<string>();
    for (const gen of world.generators) {
      if (genIds.has(gen.id)) errors.push(`${world.id}: cerdito duplicado (${gen.id})`);
      genIds.add(gen.id);
      if (gen.baseCost <= 0) errors.push(`${world.id}.${gen.id}: baseCost debe ser > 0`);
      if (gen.baseProd <= 0) errors.push(`${world.id}.${gen.id}: baseProd debe ser > 0`);
    }
    const upgradeIds = new Set<string>();
    for (const upgrade of world.globalUpgrades) {
      if (upgradeIds.has(upgrade.id)) errors.push(`${world.id}: mejora global duplicada (${upgrade.id})`);
      upgradeIds.add(upgrade.id);
      if (upgrade.cost <= 0) errors.push(`${world.id}.${upgrade.id}: cost debe ser > 0`);
    }
  }

  if (content.worlds[0] && content.worlds[0].unlock !== null) {
    errors.push('El primer mundo debe estar abierto desde el inicio (unlock: null)');
  }
  for (const world of content.worlds) {
    if (world.unlock === null) continue;
    if (world.unlock.world === world.id) {
      errors.push(`${world.id}: unlock.world no puede ser el propio mundo`);
    } else if (!worldIds.has(world.unlock.world)) {
      errors.push(`${world.id}: unlock.world desconocido (${world.unlock.world})`);
    } else {
      const from = content.worlds.find((w) => w.id === world.unlock!.world);
      if (!from?.generators.some((g) => g.id === world.unlock!.gen)) errors.push(`${world.id}: unlock.gen desconocido (${world.unlock.gen})`);
    }
    if (world.unlock.count <= 0) errors.push(`${world.id}: unlock.count debe ser > 0`);
  }

  const perkIds = new Set(content.perks.map((p) => p.id));
  const seenPerkIds = new Set<string>();
  for (const perk of content.perks) {
    if (seenPerkIds.has(perk.id)) errors.push(`Ventaja duplicada: ${perk.id}`);
    seenPerkIds.add(perk.id);
    if (!worldIds.has(perk.world)) errors.push(`${perk.id}: mundo desconocido (${perk.world})`);
    if (perk.baseCost <= 0) errors.push(`${perk.id}: baseCost debe ser > 0`);
    for (const req of perk.requires) {
      if (!perkIds.has(req)) errors.push(`${perk.id}: requiere una ventaja inexistente (${req})`);
    }
  }
  errors.push(...findPerkCycles(content.perks));

  const setIds = new Set(content.sets.map((s) => s.id));
  const seenSetIds = new Set<string>();
  for (const set of content.sets) {
    if (seenSetIds.has(set.id)) errors.push(`Set duplicado: ${set.id}`);
    seenSetIds.add(set.id);
  }

  const varietyIds = new Set(content.varieties.map((v) => v.id));
  const seenVarietyIds = new Set<string>();
  for (const variety of content.varieties) {
    if (seenVarietyIds.has(variety.id)) errors.push(`Variedad duplicada: ${variety.id}`);
    seenVarietyIds.add(variety.id);
    if (!setIds.has(variety.set)) errors.push(`${variety.id}: set desconocido (${variety.set})`);
    for (const req of variety.requires) {
      errors.push(...validateRequirement(variety.id, req, worldIds, content, varietyIds));
    }
  }

  const achievementIds = new Set<string>();
  for (const a of content.achievements) {
    if (achievementIds.has(a.id)) errors.push(`Logro duplicado: ${a.id}`);
    achievementIds.add(a.id);
    const req = a.requires;
    if (req.kind === 'worldUnlocked') {
      if (!worldIds.has(req.world)) errors.push(`${a.id}: mundo desconocido en requisito (${req.world})`);
    } else if (req.kind === 'varietyCount') {
      if (req.count <= 0 || req.count > content.varieties.length) errors.push(`${a.id}: varietyCount fuera de rango`);
    } else if (req.kind === 'taps') {
      if (req.count <= 0) errors.push(`${a.id}: count debe ser > 0`);
    } else {
      errors.push(...validateRequirement(a.id, req, worldIds, content, varietyIds));
    }
  }

  return errors;
}

function validateRequirement(
  varietyId: string,
  req: Requirement,
  worldIds: Set<string>,
  content: Content,
  varietyIds: Set<string>,
): string[] {
  const errors: string[] = [];
  switch (req.kind) {
    case 'genCount': {
      if (!worldIds.has(req.world)) {
        errors.push(`${varietyId}: mundo desconocido en requisito (${req.world})`);
        break;
      }
      const world = content.worlds.find((w) => w.id === req.world);
      if (world && !world.generators.some((g) => g.id === req.gen)) {
        errors.push(`${varietyId}: cerdito desconocido en requisito (${req.world}.${req.gen})`);
      }
      if (req.count <= 0) errors.push(`${varietyId}: count debe ser > 0`);
      break;
    }
    case 'ascensions':
    case 'plumasTotal':
      if (!worldIds.has(req.world)) errors.push(`${varietyId}: mundo desconocido en requisito (${req.world})`);
      if (req.count <= 0) errors.push(`${varietyId}: count debe ser > 0`);
      break;
    case 'lifetime':
      if (!worldIds.has(req.world)) errors.push(`${varietyId}: mundo desconocido en requisito (${req.world})`);
      if (req.amount <= 0) errors.push(`${varietyId}: amount debe ser > 0`);
      break;
    case 'harmony': {
      if (!worldIds.has(req.world)) {
        errors.push(`${varietyId}: mundo desconocido en requisito (${req.world})`);
        break;
      }
      const world = content.worlds.find((w) => w.id === req.world);
      if (world && world.mechanic !== 'harmony') {
        errors.push(`${varietyId}: requisito de armonía en un mundo sin esa mecánica (${req.world})`);
      }
      if (req.count <= 0) errors.push(`${varietyId}: count debe ser > 0`);
      break;
    }
    case 'varieties':
      for (const id of req.ids) {
        if (id === varietyId) errors.push(`${varietyId}: no puede requerirse a sí misma`);
        else if (!varietyIds.has(id)) errors.push(`${varietyId}: requiere una variedad inexistente (${id})`);
      }
      break;
  }
  return errors;
}

/** Detección de ciclos por DFS sobre el grafo de `requires` de las ventajas. */
function findPerkCycles(perks: PerkDef[]): string[] {
  const byId = new Map(perks.map((p) => [p.id, p]));
  const state = new Map<string, 'visiting' | 'done'>();
  const errors: string[] = [];

  function visit(id: string, path: string[]): void {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      errors.push(`Ciclo de ventajas: ${[...path, id].join(' → ')}`);
      return;
    }
    state.set(id, 'visiting');
    const perk = byId.get(id);
    if (perk) for (const req of perk.requires) visit(req, [...path, id]);
    state.set(id, 'done');
  }

  for (const perk of perks) visit(perk.id, []);
  return errors;
}
