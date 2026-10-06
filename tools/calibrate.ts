// Calibración rápida de la economía de la mina: simula a un jugador que visita cada `STEP`
// segundos, compra piezas (la más barata que pueda pagar), farmea el material que le falta y
// sube a la superficie cuando duplica sus plumas. Uso: node tools/calibrate.ts [segundosPorVisita] [horas]
// Solo imprime una tabla; no forma parte de los tests.

import { CONTENT } from '../src/content/index.ts';
import { ascend, buyPiece, setFarmZone, useBurst } from '../src/core/actions.ts';
import { incomePerSecond, pieceCost, pieceLevel, pieceUnlocked, plumasPending, zoneIndexOf } from '../src/core/formulas.ts';
import { createInitialState } from '../src/core/state.ts';
import { advance } from '../src/core/tick.ts';
import { D } from '../src/core/num.ts';
import { formatNumber } from '../src/ui/format.ts';

const step = Number(process.argv[2] ?? 30);
const hours = Number(process.argv[3] ?? 24);
const state = createInitialState(CONTENT, 0);
let nextReport = 0;
const reportEvery = Math.max(3600, Math.floor((hours * 3600) / 24));

function shop(): void {
  for (let guard = 0; guard < 500; guard++) {
    let best: { id: string; coins: ReturnType<typeof D> } | null = null;
    let missingMaterialZone: number | null = null;
    for (const piece of CONTENT.pieces) {
      if (!pieceUnlocked(state, piece)) continue;
      const level = pieceLevel(state, piece.id);
      if (level >= piece.maxLevel) continue;
      const cost = pieceCost(state, CONTENT, piece, level);
      const stock = piece.material === null ? D(0) : (state.materials[piece.material] ?? D(0));
      const hasMaterial = cost.material === null || stock.gte(cost.material);
      if (state.coins.gte(cost.coins) && !hasMaterial && piece.material !== null) {
        missingMaterialZone = CONTENT.zones.findIndex((z) => z.material === piece.material);
      }
      if (state.coins.gte(cost.coins) && hasMaterial && (!best || cost.coins.lt(best.coins))) best = { id: piece.id, coins: cost.coins };
    }
    if (!best) {
      if (missingMaterialZone !== null && missingMaterialZone <= zoneIndexOf(CONTENT, state.runMaxDepth)) setFarmZone(state, CONTENT, missingMaterialZone);
      return;
    }
    buyPiece(state, CONTENT, best.id, 1);
    setFarmZone(state, CONTENT, null);
  }
}

let t = 0;
while (t < hours * 3600) {
  advance(state, CONTENT, step);
  t += step;
  shop();
  useBurst(state, CONTENT);
  const gain = plumasPending(state, CONTENT);
  if (gain >= Math.max(15, state.plumasTotal.toNumber() * 0.8) && state.runSeconds > 600) {
    const depth = state.runMaxDepth;
    ascend(state, CONTENT, 0);
    console.log(`   ↑ sube a las ${(t / 3600).toFixed(2)} h desde el nivel ${depth}: +${gain} plumas (total ${state.plumasTotal.toString()})`);
    // gasta plumas en lo más barato disponible (Abono primero)
    for (let i = 0; i < 50; i++) {
      const perk = CONTENT.perks.filter((p) => (p.maxLevel === null || (state.perks[p.id] ?? 0) < p.maxLevel) && p.requires.every((r) => (state.perks[r] ?? 0) > 0)).sort((a, b) => a.baseCost * a.costGrowth ** (state.perks[a.id] ?? 0) - b.baseCost * b.costGrowth ** (state.perks[b.id] ?? 0))[0];
      if (!perk) break;
      const cost = Math.ceil(perk.baseCost * perk.costGrowth ** (state.perks[perk.id] ?? 0));
      if (state.plumas.lt(cost)) break;
      state.plumas = state.plumas.sub(cost);
      state.perks[perk.id] = (state.perks[perk.id] ?? 0) + 1;
    }
  }
  if (t >= nextReport) {
    nextReport += reportEvery;
    const gear = CONTENT.pieces.map((p) => pieceLevel(state, p.id)).join(',');
    console.log(`t=${(t / 3600).toFixed(1)}h nivel=${state.depth} (rec ${state.records.maxDepth}) monedas=${formatNumber(state.coins)} ingresos=${formatNumber(incomePerSecond(state, CONTENT))}/s plumas=${state.plumasTotal.toString()} subidas=${state.ascensions} piezas=[${gear}]`);
  }
}
