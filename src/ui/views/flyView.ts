// Vista "Volar": la ascensión arriba y, debajo, el árbol de ventajas permanentes que se
// compra con las plumas que deja cada vuelo (antes eran dos pestañas). Ver docs/01 §5-§6.

import type { UiContext, View } from '../app.ts';
import { h } from '../dom.ts';
import { mountAscendView } from './ascendView.ts';
import { mountPerksView } from './perksView.ts';

export function mountFlyView(root: HTMLElement, ctx: UiContext): View {
  const ascendSlot = h('div', { className: 'fly-ascend' });
  const perksSlot = h('div', { className: 'fly-perks' });
  const container = h('div', { className: 'fly-view' }, [ascendSlot, h('h3', { className: 'fly-heading' }, ['Ventajas permanentes']), perksSlot]);
  root.appendChild(container);

  const ascend = mountAscendView(ascendSlot, ctx);
  const perks = mountPerksView(perksSlot, ctx);

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
