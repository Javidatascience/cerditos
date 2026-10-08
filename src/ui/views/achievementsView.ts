// Vista "Logros": estadísticas, reliquias (bonos permanentes que dan algunos logros) y los logros, cada
// uno con su requisito y su progreso. Los de "ten N de una herramienta" se agrupan por herramienta,
// con una insignia por cantidad; las herramientas que aún no has tenido se ven borrosas y sin nombre.
// Ver docs/06-mina.md.

import type { Decimal } from '../../core/num.ts';
import { achievementViews, cosmeticViews, statsView, type AchievementView, type RequirementView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { spriteBadge } from '../art.ts';
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
  creatureAdult: 'nav-nido',
  adultCount: 'nav-nido',
};

export function mountAchievementsView(root: HTMLElement, ctx: UiContext): View {
  const summaryText = document.createTextNode('');
  const statsBox = h('dl', { className: 'stats-grid' });
  const relicList = h('ul', { className: 'cosmetic-list' });
  const list = h('div', { className: 'achievements-list' });
  const container = h('div', { className: 'album-view' }, [
    h('h3', { className: 'fly-heading' }, ['Estadísticas']),
    statsBox,
    h('h3', { className: 'fly-heading' }, ['Reliquias']),
    h('p', { className: 'settings-hint' }, ['Bonos permanentes que da un logro concreto. No se compran.']),
    relicList,
    h('h3', { className: 'fly-heading' }, ['Logros']),
    h('p', { className: 'settings-hint' }, [summaryText]),
    list,
  ]);
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
      ['Esmeraldas en total', formatNumber(stats.plumasTotal, notation)],
      ['Herramientas ahora', formatNumber(stats.toolsOwned, notation)],
      ['Mejoras compradas', String(stats.upgradesBought)],
      ['Cerditos viajeros', String(stats.visitors)],
      ['Logros', `${stats.achievements.done}/${stats.achievements.total}`],
      ['Reliquias', `${stats.relics.done}/${stats.relics.total}`],
    ];
    statsBox.replaceChildren(...rows.flatMap(([label, value]) => [h('dt', {}, [label]), h('dd', {}, [value])]));

    relicList.replaceChildren(
      ...cosmeticViews(state, ctx.content).relics.map((r) =>
        h('li', { className: r.owned ? 'cosmetic-row' : 'cosmetic-row cosmetic-row-locked' }, [
          h('div', { className: 'row-art' }, [
            spriteBadge('relics', r.id, !r.owned),
            h('div', { className: 'upgrade-info' }, [
              h('span', { className: 'upgrade-name' }, [r.owned ? r.name : '???']),
              h('span', { className: 'generator-flavor' }, [r.owned ? r.flavor : r.achievementName === '???' ? 'Se consigue criando un huevo hasta su fase final (pestaña Nido).' : `Se consigue con el logro: ${r.achievementName}`]),
              h('span', { className: 'upgrade-effect' }, [r.effectText]),
            ]),
          ]),
        ]),
      ),
    );

    const views = achievementViews(state, ctx.content);
    setText(summaryText, `${views.filter((a) => a.owned).length} de ${views.length} logros. Son un reconocimiento; algunos regalan una reliquia, una piel, una prenda o un compañero (pestaña Cerdito).`);

    const card = (a: AchievementView) =>
      h('li', { className: a.owned ? 'album-card' : 'album-card album-card-locked' }, [
        spriteBadge('ui', ACHIEVEMENT_ICONS[a.kind] ?? 'logro', !a.owned),
        h('span', { className: 'upgrade-name' }, [a.owned || a.kind !== 'creatureAdult' ? a.name : '???']),
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
