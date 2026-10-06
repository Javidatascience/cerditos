// Vista "Logros": reconocimientos sin bonos, cada uno con su requisito y su progreso. Los de "sube
// una pieza al nivel N" se agrupan por pieza, con una insignia por nivel. Ver docs/06-mina.md.

import type { Decimal } from '../../core/num.ts';
import { achievementViews, type AchievementView, type RequirementView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { emojiBadge } from '../art.ts';
import { h, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

export function mountAchievementsView(root: HTMLElement, ctx: UiContext): View {
  const summaryText = document.createTextNode('');
  const list = h('div', { className: 'achievements-list' });
  const container = h('div', { className: 'album-view' }, [h('p', { className: 'settings-hint' }, [summaryText]), list]);
  root.appendChild(container);

  function reqLine(r: RequirementView, format: (n: Decimal) => string): HTMLElement {
    return h('span', { className: r.done ? 'album-req album-req-done' : 'album-req' }, [
      `${r.describe(format)} — ${format(r.current.lt(r.target) ? r.current : r.target)} / ${format(r.target)}`,
    ]);
  }

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const format = (n: Decimal) => formatNumber(n, notation);
    const views = achievementViews(state, ctx.content);
    setText(summaryText, `${views.filter((a) => a.owned).length} de ${views.length} logros. Son solo un reconocimiento: no dan bonos.`);

    const card = (a: AchievementView) =>
      h('li', { className: a.owned ? 'album-card' : 'album-card album-card-locked' }, [
        emojiBadge('🏅', !a.owned),
        h('span', { className: 'upgrade-name' }, [a.name]),
        h('span', { className: 'generator-flavor' }, [a.owned ? a.flavor : '???']),
        reqLine(a.requirement, format),
      ]);

    const general = views.filter((a) => a.piece === null);
    const sections: HTMLElement[] = [
      h('section', { className: 'album-set' }, [h('h3', {}, [`Generales (${general.filter((a) => a.owned).length}/${general.length})`]), h('ul', { className: 'album-list' }, general.map(card))]),
    ];

    const pieceCards = ctx.content.pieces.map((piece) => {
      const own = views.filter((a) => a.piece?.id === piece.id).sort((a, b) => a.piece!.count - b.piece!.count);
      const done = own.filter((a) => a.owned).length;
      const next = own.find((a) => !a.owned);
      // Piezas que aún no has tocado: la ficha se ve borrosa y sin nombre.
      const seen = (state.gear[piece.id] ?? 0) > 0 || done > 0;
      return h('li', { className: seen ? 'album-card achievement-gen' : 'album-card achievement-gen achievement-gen-locked', 'aria-hidden': seen ? 'false' : 'true' }, [
        emojiBadge(piece.emoji),
        h('span', { className: 'upgrade-name' }, [seen ? `${piece.name} (${done}/${own.length})` : `??? (0/${own.length})`]),
        h('span', { className: 'chip-row' }, own.map((a) => h('span', { className: a.owned ? 'chip chip-done' : 'chip' }, [String(a.piece!.count)]))),
        next ? reqLine(next.requirement, format) : h('span', { className: 'album-req album-req-done' }, ['Todos conseguidos']),
      ]);
    });
    sections.push(h('section', { className: 'album-set' }, [h('h3', {}, ['Piezas']), h('ul', { className: 'album-list' }, pieceCards)]));
    list.replaceChildren(...sections);
  }

  return { update, destroy: () => container.remove() };
}
