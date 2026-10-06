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
  const m = content.mine;
  if (m.zoneLength < 1) errors.push('mine.zoneLength debe ser ≥ 1');
  if (m.hpBase <= 0 || m.hpGrowth < 1) errors.push('mine: hpBase > 0 y hpGrowth ≥ 1');
  if (m.coinBase <= 0 || m.coinGrowth < 1) errors.push('mine: coinBase > 0 y coinGrowth ≥ 1');
  if (m.baseDps <= 0) errors.push('mine.baseDps debe ser > 0');
  if (m.hazardFloor < 0 || m.hazardFloor > 1) errors.push('mine.hazardFloor debe estar entre 0 y 1');

  errors.push(...duplicates(content.materials.map((x) => x.id), 'Material'));
  errors.push(...duplicates(content.hazards.map((x) => x.id), 'Peligro'));
  errors.push(...duplicates(content.zones.map((x) => x.id), 'Zona'));
  errors.push(...duplicates(content.pieces.map((x) => x.id), 'Pieza'));
  errors.push(...duplicates(content.perks.map((x) => x.id), 'Ventaja'));
  errors.push(...duplicates(content.achievements.map((x) => x.id), 'Logro'));
  if (content.zones.length === 0) errors.push('Debe haber al menos una zona');

  const materialIds = new Set(content.materials.map((x) => x.id));
  const hazardIds = new Set(content.hazards.map((x) => x.id));
  const pieceIds = new Set(content.pieces.map((x) => x.id));

  for (const zone of content.zones) {
    if (!materialIds.has(zone.material)) errors.push(`${zone.id}: material desconocido (${zone.material})`);
    if (zone.hazard !== null && !hazardIds.has(zone.hazard)) errors.push(`${zone.id}: peligro desconocido (${zone.hazard})`);
  }

  for (const piece of content.pieces) {
    if (piece.baseCost <= 0 || piece.costGrowth < 1) errors.push(`${piece.id}: baseCost > 0 y costGrowth ≥ 1`);
    if (piece.maxLevel < 1) errors.push(`${piece.id}: maxLevel debe ser ≥ 1`);
    if (piece.material !== null && !materialIds.has(piece.material)) errors.push(`${piece.id}: material desconocido (${piece.material})`);
    if (piece.material !== null && piece.materialBase <= 0) errors.push(`${piece.id}: materialBase debe ser > 0`);
    if (piece.effect.kind === 'resist') {
      const hazard = piece.effect.hazard;
      if (!hazardIds.has(hazard)) errors.push(`${piece.id}: peligro desconocido (${hazard})`);
      else if (!content.zones.some((z) => z.hazard === hazard)) errors.push(`${piece.id}: ninguna zona tiene el peligro ${hazard}`);
    }
  }
  // Cada peligro de una zona debe poder resistirse con alguna pieza.
  for (const zone of content.zones) {
    if (zone.hazard === null) continue;
    if (!content.pieces.some((p) => p.effect.kind === 'resist' && p.effect.hazard === zone.hazard)) errors.push(`${zone.id}: ninguna pieza resiste ${zone.hazard}`);
  }

  const perkIds = new Set(content.perks.map((p) => p.id));
  for (const perk of content.perks) {
    if (perk.baseCost <= 0 || perk.costGrowth < 1) errors.push(`${perk.id}: baseCost > 0 y costGrowth ≥ 1`);
    for (const req of perk.requires) if (!perkIds.has(req)) errors.push(`${perk.id}: requiere una ventaja inexistente (${req})`);
  }
  errors.push(...findPerkCycles(content.perks));

  for (const a of content.achievements) {
    if (a.requires.kind === 'pieceLevel' && !pieceIds.has(a.requires.piece)) errors.push(`${a.id}: pieza desconocida (${a.requires.piece})`);
    if (a.requires.count <= 0) errors.push(`${a.id}: count debe ser > 0`);
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
