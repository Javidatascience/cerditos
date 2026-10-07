// Vista "Logros": los logros (con estadísticas) y, debajo, el diario. Dos vistas en una pestaña para
// no llenar la barra de navegación. Ver docs/06-mina.md.

import type { UiContext, View } from '../app.ts';
import { h } from '../dom.ts';
import { mountAchievementsView } from './achievementsView.ts';
import { mountJournalView } from './journalView.ts';

export function mountLogbookView(root: HTMLElement, ctx: UiContext): View {
  const achievementsSlot = h('div', {});
  const journalSlot = h('div', {});
  const container = h('div', {}, [achievementsSlot, h('h3', { className: 'fly-heading' }, ['Diario']), journalSlot]);
  root.appendChild(container);
  const achievements = mountAchievementsView(achievementsSlot, ctx);
  const journal = mountJournalView(journalSlot, ctx);
  return {
    update(state) {
      achievements.update(state);
      journal.update(state);
    },
    destroy() {
      achievements.destroy();
      journal.destroy();
      container.remove();
    },
  };
}
