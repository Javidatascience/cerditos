// Vista "Logros": reconocimientos sin bonos, cada uno con su requisito y su progreso. Los de "ten N de
// una herramienta" se agrupan por herramienta, con una insignia por cantidad; las herramientas que
// aún no has tenido se ven borrosas y sin nombre. Ver docs/06-mina.md.

import { D, type Decimal } from '../../core/num.ts';
import { achievementViews, incomeHistory, statsView, type AchievementView, type RequirementView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { emojiBadge, spriteBadge } from '../art.ts';
import { h, setText } from '../dom.ts';
import { formatDuration, formatNumber } from '../format.ts';

/** Icono de cada tipo de logro. */
const ACHIEVEMENT_ICONS: Record<string, string> = {
  taps: 'logro-picos',
  lifetime: 'logro-monedas',
  ascensions: 'nav-ascender',
  plumasTotal: 'nav-ascender',
  companionsOwned: 'logro-companeros',
  companionLevels: 'logro-companeros',
  flowersFound: 'logro-flor',
  harvests: 'logro-flor',
  shinyFound: 'logro-brillo',
  furnaces: 'logro-horno',
  caveNodes: 'nav-cueva',
  dragonStage: 'nav-cueva',
};

export function mountAchievementsView(root: HTMLElement, ctx: UiContext): View {
  const summaryText = document.createTextNode('');
  const statsBox = h('dl', { className: 'stats-grid' });
  const list = h('div', { className: 'achievements-list' });
  // Gráfica de ingresos: una barra por muestra, en escala logarítmica (cada rayita es ×10).
  const chart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chart.setAttribute('class', 'income-chart');
  chart.setAttribute('viewBox', '0 0 240 100');
  chart.setAttribute('preserveAspectRatio', 'none');
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', 'Gráfica de tus ingresos por segundo a lo largo de la partida');
  const chartNote = document.createTextNode('');
  let chartKey = '';

  function drawChart(state: GameState, notation: GameState['settings']['notation']): void {
    const data = incomeHistory(state);
    const last = data.points[data.points.length - 1];
    const key = `${data.points.length}:${last?.t ?? 0}:${data.maxV}`;
    if (key === chartKey) return;
    chartKey = key;
    const ns = 'http://www.w3.org/2000/svg';
    const parts: SVGElement[] = [];
    for (let v = 1; v < data.maxV; v++) {
      const line = document.createElementNS(ns, 'line');
      const y = 100 - (v / data.maxV) * 96;
      line.setAttribute('x1', '0');
      line.setAttribute('x2', '240');
      line.setAttribute('y1', y.toFixed(1));
      line.setAttribute('y2', y.toFixed(1));
      line.setAttribute('class', 'chart-grid');
      parts.push(line);
    }
    const slot = 240 / Math.max(data.points.length, 24);
    data.points.forEach((p, i) => {
      const bar = document.createElementNS(ns, 'rect');
      const height = Math.max(1, (p.v / data.maxV) * 96);
      bar.setAttribute('x', (i * slot).toFixed(1));
      bar.setAttribute('y', (100 - height).toFixed(1));
      bar.setAttribute('width', Math.max(1, slot - 0.6).toFixed(1));
      bar.setAttribute('height', height.toFixed(1));
      bar.setAttribute('class', 'chart-bar');
      parts.push(bar);
    });
    chart.replaceChildren(...parts);
    setText(
      chartNote,
      data.points.length < 2 ? 'Aún no hay datos: la gráfica se va llenando mientras juegas.' : `Escala logarítmica: cada rayita es ×10. Abarca ${formatDuration(data.spanSeconds)} de juego y llega hasta ${formatNumber(D(10).pow(data.maxV), notation)}/s.`,
    );
  }

  const container = h('div', { className: 'album-view' }, [h('h3', { className: 'fly-heading' }, ['Estadísticas']), statsBox, h('h3', { className: 'fly-heading' }, ['Ingresos']), chart as unknown as HTMLElement, h('p', { className: 'settings-hint' }, [chartNote]), h('h3', { className: 'fly-heading' }, ['Logros']), h('p', { className: 'settings-hint' }, [summaryText]), list]);
  root.appendChild(container);

  function reqLine(r: RequirementView, format: (n: Decimal) => string): HTMLElement {
    return h('span', { className: r.done ? 'album-req album-req-done' : 'album-req' }, [
      `${r.describe(format)} — ${format(r.current.lt(r.target) ? r.current : r.target)} / ${format(r.target)}`,
    ]);
  }

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const format = (n: Decimal) => formatNumber(n, notation);
    const stats = statsView(state, ctx.content);
    const rows: [string, string][] = [
      ['Monedas ganadas', formatNumber(stats.lifetime, notation)],
      ['Mejor ingreso', `${formatNumber(stats.bestIncome, notation)}/s`],
      ['Picos', formatNumber(stats.taps, notation)],
      ['Tiempo de juego', formatDuration(stats.playSeconds)],
      ['Ascensiones', String(stats.ascensions)],
      ['Esmeraldas en total',formatNumber(stats.plumasTotal, notation)],
      ['Herramientas ahora', formatNumber(stats.toolsOwned, notation)],
      ['Mejoras compradas', String(stats.upgradesBought)],
      ['Cerditos viajeros', String(stats.visitors)],
      ['Logros', `${stats.achievements.done}/${stats.achievements.total}`],
      ['Reliquias', `${stats.relics.done}/${stats.relics.total}`],
    ];
    drawChart(state, notation);
    statsBox.replaceChildren(...rows.flatMap(([label, value]) => [h('dt', {}, [label]), h('dd', {}, [value])]));

    const views = achievementViews(state, ctx.content);
    setText(summaryText, `${views.filter((a) => a.owned).length} de ${views.length} logros. Son un reconocimiento; algunos regalan una reliquia, una piel o un compañero (pestaña Cerdito).`);

    const card = (a: AchievementView) =>
      h('li', { className: a.owned ? 'album-card' : 'album-card album-card-locked' }, [
        spriteBadge('ui', ACHIEVEMENT_ICONS[a.kind] ?? 'logro', !a.owned),
        h('span', { className: 'upgrade-name' }, [a.name]),
        h('span', { className: 'generator-flavor' }, [a.owned ? a.flavor : '???']),
        reqLine(a.requirement, format),
      ]);

    const general = views.filter((a) => a.tool === null);
    const sections: HTMLElement[] = [
      h('section', { className: 'album-set' }, [h('h3', {}, [`Generales (${general.filter((a) => a.owned).length}/${general.length})`]), h('ul', { className: 'album-list' }, general.map(card))]),
    ];

    const toolCards = ctx.content.tools.map((tool) => {
      const own = views.filter((a) => a.tool?.id === tool.id).sort((a, b) => a.tool!.count - b.tool!.count);
      const done = own.filter((a) => a.owned).length;
      const next = own.find((a) => !a.owned);
      const seen = done > 0 || (state.tools[tool.id] ?? 0) > 0;
      return h('li', { className: seen ? 'album-card achievement-gen' : 'album-card achievement-gen achievement-gen-locked', 'aria-hidden': seen ? 'false' : 'true' }, [
        spriteBadge('tools', tool.id),
        h('span', { className: 'upgrade-name' }, [seen ? `${tool.name} (${done}/${own.length})` : `??? (0/${own.length})`]),
        h('span', { className: 'chip-row' }, own.map((a) => h('span', { className: a.owned ? 'chip chip-done' : 'chip' }, [String(a.tool!.count)]))),
        next ? reqLine(next.requirement, format) : h('span', { className: 'album-req album-req-done' }, ['Todos conseguidos']),
      ]);
    });
    sections.push(h('section', { className: 'album-set' }, [h('h3', {}, ['Herramientas']), h('ul', { className: 'album-list' }, toolCards)]));
    list.replaceChildren(...sections);
  }

  return { update, destroy: () => container.remove() };
}
