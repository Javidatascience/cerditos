// Vista "Álbum": dos secciones, "Variedades" (28 por sets, cada una con su requisito exacto y su
// progreso desde el principio; las no conseguidas se ven apagadas) y "Logros" (reconocimientos
// sin bonos, también con su requisito visible). Ver docs/01-diseno-juego.md §8.

import type { Decimal } from '../../core/num.ts';
import { achievementViews, albumSummary, albumViews, type RequirementView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { achievementBadge, varietyIcon } from '../art.ts';
import { h, setClass, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

type Section = 'varieties' | 'achievements';

export function mountAlbumView(root: HTMLElement, ctx: UiContext): View {
  let section: Section = 'varieties';

  const summaryText = document.createTextNode('');
  const sets = h('div', { className: 'album-sets' });
  const achievements = h('ul', { className: 'album-list achievements-list hidden' });

  const tabButtons = new Map<Section, HTMLButtonElement>();
  const tabs = h(
    'div',
    { className: 'amount-row', role: 'group', 'aria-label': 'Sección' },
    (['varieties', 'achievements'] as Section[]).map((id) => {
      const btn = h('button', { className: 'amount-button', onclick: () => { section = id; refresh(); } }, [id === 'varieties' ? 'Variedades' : 'Logros']) as HTMLButtonElement;
      tabButtons.set(id, btn);
      return btn;
    }),
  );

  const container = h('div', { className: 'album-view' }, [tabs, h('p', { className: 'settings-hint' }, [summaryText]), sets, achievements]);
  root.appendChild(container);

  let lastState: GameState | null = null;
  function refresh(): void {
    if (lastState) update(lastState);
  }

  function reqLine(r: RequirementView, format: (n: Decimal) => string): HTMLElement {
    return h('span', { className: r.done ? 'album-req album-req-done' : 'album-req' }, [`${r.describe(format)} — ${format(r.current.lt(r.target) ? r.current : r.target)} / ${format(r.target)}`]);
  }

  function update(state: GameState): void {
    lastState = state;
    const notation = state.settings.notation;
    const format = (n: Decimal) => formatNumber(n, notation);
    for (const [id, btn] of tabButtons) setClass(btn, 'active', id === section);
    setClass(sets, 'hidden', section !== 'varieties');
    setClass(achievements, 'hidden', section !== 'achievements');

    if (section === 'varieties') {
      const summary = albumSummary(state, ctx.content);
      setText(summaryText, `${summary.owned} de ${summary.total} variedades.`);
      sets.replaceChildren(
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
                  ...v.requirements.map((r) => reqLine(r, format)),
                ]),
              ),
            ),
          ]),
        ),
      );
    } else {
      const views = achievementViews(state, ctx.content);
      setText(summaryText, `${views.filter((a) => a.owned).length} de ${views.length} logros. Son solo un reconocimiento: no dan bonos.`);
      achievements.replaceChildren(
        ...views.map((a) =>
          h('li', { className: a.owned ? 'album-card' : 'album-card album-card-locked' }, [
            achievementBadge(a.owned),
            h('span', { className: 'upgrade-name' }, [a.name]),
            h('span', { className: 'generator-flavor' }, [a.owned ? a.flavor : '???']),
            reqLine(a.requirement, format),
          ]),
        ),
      );
    }
  }

  return { update, destroy: () => container.remove() };
}
