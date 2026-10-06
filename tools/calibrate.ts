// Calibración rápida de la economía: simula a un jugador que visita cada `STEP` segundos, pica un
// puñado de veces, compra la herramienta con mejor amortización que pueda pagar, gasta las plumas en
// ventajas y asciende cuando duplica sus plumas. Uso: node tools/calibrate.ts [segundosPorVisita] [horas] [picosPorVisita]
// Solo imprime una tabla; no forma parte de los tests.

import { CONTENT } from '../src/content/index.ts';
import { ascend, buyPerk, buyTool, tap } from '../src/core/actions.ts';
import { ascendUnlocked, incomePerSecond, plumasPending, toolBulkCost, toolOwned, unitProduction } from '../src/core/formulas.ts';
import { createInitialState } from '../src/core/state.ts';
import { advance } from '../src/core/tick.ts';
import { formatNumber } from '../src/ui/format.ts';

const step = Number(process.argv[2] ?? 60);
const hours = Number(process.argv[3] ?? 48);
const tapsPerVisit = Number(process.argv[4] ?? 20);
const state = createInitialState(CONTENT, 0);
const reportEvery = Math.max(3600, Math.floor((hours * 3600) / 24));
let nextReport = 0;

function shop(): void {
  for (let guard = 0; guard < 500; guard++) {
    let best: { id: string; score: number } | null = null;
    for (const tool of CONTENT.tools) {
      const owned = toolOwned(state, tool.id);
      const cost = toolBulkCost(state, CONTENT, tool, owned, 1);
      if (state.coins.lt(cost)) continue;
      const prod = unitProduction(state, CONTENT, tool);
      const score = cost.div(prod.gt(0) ? prod : 1e-9).toNumber(); // segundos de amortización
      if (!best || score < best.score) best = { id: tool.id, score };
    }
    if (!best) return;
    buyTool(state, CONTENT, best.id, 1);
  }
}

function spendPlumas(): void {
  for (let i = 0; i < 50; i++) {
    const options = CONTENT.perks.filter((p) => (p.maxLevel === null || (state.perks[p.id] ?? 0) < p.maxLevel) && p.requires.every((r) => (state.perks[r] ?? 0) > 0));
    options.sort((a, b) => a.baseCost * a.costGrowth ** (state.perks[a.id] ?? 0) - b.baseCost * b.costGrowth ** (state.perks[b.id] ?? 0));
    const perk = options[0];
    if (!perk || !buyPerk(state, CONTENT, perk.id)) return;
  }
}

let t = 0;
while (t < hours * 3600) {
  advance(state, CONTENT, step);
  t += step;
  for (let i = 0; i < tapsPerVisit; i++) tap(state, CONTENT);
  shop();
  const gain = plumasPending(state, CONTENT);
  if (ascendUnlocked(state, CONTENT) && gain >= Math.max(5, state.plumasTotal.toNumber() * 0.8)) {
    ascend(state, CONTENT, 0);
    console.log(`   ↑ asciende a las ${(t / 3600).toFixed(2)} h: +${gain} plumas (total ${state.plumasTotal.toString()})`);
    spendPlumas();
    shop();
  }
  if (t >= nextReport) {
    nextReport += reportEvery;
    const tools = CONTENT.tools.map((tool) => toolOwned(state, tool.id)).join(',');
    console.log(`t=${(t / 3600).toFixed(1)}h monedas=${formatNumber(state.coins)} ingresos=${formatNumber(incomePerSecond(state, CONTENT))}/s plumas=${state.plumasTotal.toString()} asc=${state.ascensions} herramientas=[${tools}]`);
  }
}
