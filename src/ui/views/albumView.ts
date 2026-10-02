// Vista "Álbum": las 28 variedades por sets, cada una con su requisito exacto y su progreso
// desde el principio (determinista, nada oculto). Las no conseguidas se ven en silueta.
// Ver docs/01-diseno-juego.md §8.

import type { Decimal } from '../../core/num.ts';
import { albumSummary, albumViews } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { varietyIcon } from '../art.ts';
import { h, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

export function mountAlbumView(root: HTMLElement, ctx: UiContext): View {
  const summaryText = document.createTextNode('');
  const sections = h('div', { className: 'album-sets' });
  const container = h('div', { className: 'album-view' }, [h('p', { className: 'settings-hint' }, [summaryText]), sections]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const format = (n: Decimal) => formatNumber(n, notation);
    const summary = albumSummary(state, ctx.content);
    setText(summaryText, `${summary.owned} de ${summary.total} variedades.`);

    sections.replaceChildren(
      ...albumViews(state, ctx.content).map((set) =>
        h('section', { className: 'album-set' }, [
          h('h3', {}, [`${set.name} (${set.ownedCount}/${set.total})`]),
          h('p', { className: 'settings-hint' }, [`Set completo: ${set.bonusText}${set.complete ? ' ✓' : ''}`]),
          h(
            'ul',
            { className: 'album-list' },
            set.varieties.map((v) =>
              h('li', { className: v.owned ? 'album-card' : 'album-card album-card-locked' }, [
                varietyIcon(v.id, v.owned),
                h('span', { className: 'upgrade-name' }, [v.name]),
                h('span', { className: 'generator-flavor' }, [v.owned ? v.flavor : '???']),
                h('span', { className: 'upgrade-effect' }, [v.bonusText]),
                h('span', { className: 'album-how' }, [v.owned ? 'Conseguida:' : 'Cómo conseguirla:']),
                ...v.requirements.map((r) =>
                  h('span', { className: r.done ? 'album-req album-req-done' : 'album-req' }, [
                    `${r.describe(format)} — ${format(r.current.lt(r.target) ? r.current : r.target)} / ${format(r.target)}`,
                  ]),
                ),
              ]),
            ),
          ),
        ]),
      ),
    );
  }

  return { update, destroy: () => container.remove() };
}
