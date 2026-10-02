// Vista "Diario": lo que ha ido pasando en la granja, de lo más reciente a lo más antiguo,
// con la hora relativa ("hace 2 h"). Sin avisos ni contadores. Ver docs/01-diseno-juego.md §8.

import { journalEntries } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { h } from '../dom.ts';
import { formatDuration } from '../format.ts';

export function relativeTime(at: number, now: number): string {
  const seconds = Math.max(0, (now - at) / 1000);
  return seconds < 10 ? 'ahora mismo' : `hace ${formatDuration(seconds)}`;
}

export function mountJournalView(root: HTMLElement, _ctx: UiContext): View {
  const list = h('ul', { className: 'journal-list' });
  const empty = h('p', { className: 'settings-hint' }, ['Todavía no ha pasado nada que contar.']);
  const container = h('div', { className: 'journal-view' }, [empty, list]);
  root.appendChild(container);

  function update(state: GameState): void {
    const entries = journalEntries(state);
    empty.classList.toggle('hidden', entries.length > 0);
    const now = Date.now();
    list.replaceChildren(
      ...entries.map((e) =>
        h('li', { className: 'journal-row' }, [h('span', { className: 'generator-owned' }, [relativeTime(e.at, now)]), h('span', {}, [e.text])]),
      ),
    );
  }

  return { update, destroy: () => container.remove() };
}
