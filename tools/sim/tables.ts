// Imprime en Markdown las constantes de contenido (para pegar en docs/03-economia.md).
// Uso: node tools/sim/tables.ts

import { PERKS, SETS, VARIETIES, WORLDS, type Requirement } from './content.ts';

const n = (x: number): string => {
  if (Number.isInteger(x) && Math.abs(x) < 1e6) return String(x);
  if (Math.abs(x) >= 1e4) return x.toExponential(2).replace('e+', 'e').replace('.00e', 'e');
  return String(Number(x.toPrecision(4)));
};

const out: string[] = [];

for (const w of WORLDS) {
  out.push(`\n#### ${w.name} (${w.currency}) — mecánica \`${w.mechanic}\``);
  out.push(`- Crecimiento de coste: ${w.costGrowth}${w.generators.some((g) => g.costGrowth) ? ' (por defecto; ver tabla)' : ''} · moneda inicial ${n(w.startCurrency)}`);
  out.push(`- Plumas: e0 = ${n(w.prestige.e0)}, exponente = ${n(w.prestige.exponent)}, bono por pluma = ${w.prestige.perPluma}`);
  out.push(`- Desbloqueo: ${w.unlock ? `${n(w.unlock.plumasTotal)} plumas totales en ${w.unlock.world}` : 'desde el inicio'}`);
  if (w.genUpgradeCounts.length) out.push(`- Mejoras por cerdito: ×${w.genUpgradeMult} al tener ${w.genUpgradeCounts.join(', ')} (coste = ${w.genUpgradeCostFactor} × precio de esa unidad)`);
  if (w.harmony) out.push(`- Armonía: ×(1 + ${w.harmony.perLevel}·filas) × ${w.harmony.mult}^(umbrales alcanzados: ${w.harmony.thresholds.join(', ')})`);
  if (w.calm) out.push(`- Calma: bono máximo +${w.calm.maxBonus * 100} %, sube en ${w.calm.rampSeconds / 60} min, comprar la multiplica por ${w.calm.penalty} (como mucho una vez cada ${w.calm.windowSeconds} s)`);
  out.push('');
  out.push('| # | Cerdito | Coste base | Producción base | Crec. coste | Amortización base |');
  out.push('|---|---|---|---|---|---|');
  w.generators.forEach((g, i) => {
    const payback = w.mechanic === 'chain' && i > 0 ? '—' : `${n(g.baseCost / g.baseProd)} s`;
    out.push(`| ${i} | ${g.name} | ${n(g.baseCost)} | ${n(g.baseProd)}${w.mechanic === 'chain' && i > 0 ? ' uds/s' : '/s'} | ${g.costGrowth ?? w.costGrowth} | ${payback} |`);
  });
  out.push('');
  out.push(`Mejoras globales (×${w.globalUpgrades[0].mult} a todo; aparecen al ganar en la ronda el 25 % de su coste): ` +
    w.globalUpgrades.map((u) => `${u.name} (${n(u.cost)})`).join(', '));
}

out.push('\n#### Ventajas permanentes (coste del nivel L = base × crecimiento^L, en plumas del mundo)');
out.push('| Ventaja | Mundo | Niveles | Coste base | Crecimiento | Requiere | Efecto |');
out.push('|---|---|---|---|---|---|---|');
for (const p of PERKS) {
  const eff = p.effect;
  const effText = 'perLevel' in eff ? `${eff.kind} ${eff.perLevel}` : eff.kind;
  out.push(`| ${p.name} | ${p.world} | ${p.maxLevel ?? '∞'} | ${n(p.baseCost)} | ${p.costGrowth} | ${p.requires.map((r) => r.split('.')[1]).join(', ') || '—'} | ${effText} |`);
}

const req = (r: Requirement): string => {
  switch (r.kind) {
    case 'genCount': return `${n(r.count)} × ${WORLDS.find((w) => w.id === r.world)!.generators[r.gen].name} (${r.world})`;
    case 'ascensions': return `${r.count} ascensiones en ${r.world}`;
    case 'plumasTotal': return `${n(r.count)} plumas totales en ${r.world}`;
    case 'lifetime': return `${n(r.amount)} ganado en la vida de ${r.world}`;
    case 'harmony': return `armonía ${r.count}`;
    case 'varieties': return `tener: ${r.ids.join(', ')}`;
  }
};

out.push('\n#### Colección');
out.push('| Variedad | Set | Requisito | Bono |');
out.push('|---|---|---|---|');
for (const v of VARIETIES) {
  out.push(`| ${v.name} | ${v.set} | ${v.requires.map(req).join(' y ')} | ${v.bonus.kind} ${v.bonus.world} ×${v.bonus.mult} |`);
}
out.push('\n| Set | Bono al completarlo |');
out.push('|---|---|');
for (const s of SETS) out.push(`| ${s.name} | ${s.bonus.kind} ${s.bonus.world} ×${s.bonus.mult} |`);

console.log(out.join('\n'));
