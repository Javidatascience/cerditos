// Vista "Ascender": la ascensión arriba y, debajo, el árbol de ventajas permanentes que se
// compra con las esmeraldas que deja cada subida. Ver docs/06-mina.md.

import type { UiContext, View } from '../app.ts';
import { h } from '../dom.ts';
import { mountAscendView } from './ascendView.ts';
import { mountPerkTreeView } from './perkTreeView.ts';

export function mountFlyView(root: HTMLElement, ctx: UiContext): View {
  const ascendSlot = h('div', { className: 'fly-ascend' });
  const perksSlot = h('div', { className: 'fly-perks' });
  const container = h('div', { className: 'fly-view' }, [ascendSlot, h('h3', { className: 'fly-heading' }, ['Ventajas permanentes']), perksSlot]);
  root.appendChild(container);

  const ascend = mountAscendView(ascendSlot, ctx);
  const perks = mountPerkTreeView(perksSlot, ctx);

  return {
    update(state) {
      ascend.update(state);
      perks.update(state);
    },
    destroy() {
      ascend.destroy();
      perks.destroy();
      container.remove();
    },
  };
}
