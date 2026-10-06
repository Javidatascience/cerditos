// Valida el contenido del juego: ids únicos, referencias existentes, números positivos y
// ventajas sin ciclos. No es lógica de juego (no vive en core/): es una comprobación de los datos.

import type { Content, PerkDef } from './types.ts';

function duplicates(ids: string[], what: string): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${what} duplicado: ${id}`);
    seen.add(id);
  }
  return errors;
}

export function validateContent(content: Content): string[] {
  const errors: string[] = [];
  const g = content.game;
  if (g.costGrowth <= 1) errors.push('game.costGrowth debe ser > 1');
  if (g.milestoneMult < 1) errors.push('game.milestoneMult debe ser ≥ 1');
  if (g.upgradeCostFactor <= 0) errors.push('game.upgradeCostFactor debe ser > 0');
  if (g.milestones.some((m, i) => m <= 0 || (i > 0 && m <= g.milestones[i - 1]!))) errors.push('game.milestones debe ser creciente y positivo');
  if (g.ascendTool < 0 || g.ascendTool >= content.tools.length) errors.push('game.ascendTool no es una herramienta válida');
  if (g.plumaE0 <= 0 || g.plumaExponent <= 0) errors.push('game: plumaE0 y plumaExponent deben ser > 0');
  if (g.momentumMax < 1 || g.momentumPerTap <= 0 || g.momentumDecay < 0) errors.push('game: momentumMax ≥ 1, momentumPerTap > 0 y momentumDecay ≥ 0');
  if (content.tools.length === 0) errors.push('Debe haber al menos una herramienta');

  errors.push(...duplicates(content.tools.map((x) => x.id), 'Herramienta'));
  errors.push(...duplicates(content.perks.map((x) => x.id), 'Ventaja'));
  errors.push(...duplicates(content.achievements.map((x) => x.id), 'Logro'));

  for (const tool of content.tools) {
    if (tool.baseCost <= 0) errors.push(`${tool.id}: baseCost debe ser > 0`);
    if (tool.baseProd <= 0) errors.push(`${tool.id}: baseProd debe ser > 0`);
  }

  const perkIds = new Set(content.perks.map((p) => p.id));
  for (const perk of content.perks) {
    if (perk.baseCost <= 0 || perk.costGrowth < 1) errors.push(`${perk.id}: baseCost > 0 y costGrowth ≥ 1`);
    for (const req of perk.requires) if (!perkIds.has(req)) errors.push(`${perk.id}: requiere una ventaja inexistente (${req})`);
  }
  errors.push(...findPerkCycles(content.perks));

  const achievementIds = new Set(content.achievements.map((a) => a.id));
  errors.push(...duplicates(content.globalUpgrades.map((x) => x.id), 'Mejora global'));
  errors.push(...duplicates(content.skins.map((x) => x.id), 'Piel'));
  errors.push(...duplicates(content.companions.map((x) => x.id), 'Compañero'));
  errors.push(...duplicates(content.relics.map((x) => x.id), 'Reliquia'));
  for (const u of content.globalUpgrades) {
    if (u.cost <= 0 || u.unlockAt <= 0 || u.mult < 1) errors.push(`${u.id}: cost y unlockAt > 0 y mult ≥ 1`);
  }
  for (const item of [...content.skins, ...content.companions]) {
    if (item.cost === null && item.achievement === null) errors.push(`${item.id}: debe poder conseguirse (cost o achievement)`);
    if (item.achievement !== null && !achievementIds.has(item.achievement)) errors.push(`${item.id}: logro desconocido (${item.achievement})`);
  }
  for (const relic of content.relics) {
    if (!achievementIds.has(relic.achievement)) errors.push(`${relic.id}: logro desconocido (${relic.achievement})`);
  }
  if (!content.skins.some((s) => s.cost === 0)) errors.push('Debe haber una piel gratis (cost 0) para empezar');

  const toolIds = new Set(content.tools.map((t) => t.id));
  for (const a of content.achievements) {
    const r = a.requires;
    if (r.kind === 'toolCount' && !toolIds.has(r.tool)) errors.push(`${a.id}: herramienta desconocida (${r.tool})`);
    const amount = r.kind === 'lifetime' ? r.amount : r.count;
    if (amount <= 0) errors.push(`${a.id}: el requisito debe ser > 0`);
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
