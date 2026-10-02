// Vista "Mejoras": mejoras disponibles (por cerdito y globales) ordenadas por coste, y las ya
// compradas en un desplegable. Ver docs/02-arquitectura.md §8.
//
// La lista se reconstruye entera en cada `update` (en vez de actualizar nodo a nodo): el
// número de mejoras disponibles cambia con el tiempo (aparecen y desaparecen al comprarlas),
// y con como mucho una veintena de filas no compensa la complejidad de llevar un diff.

import { buyUpgrade } from '../../core/actions.ts';
import { purchasedUpgradeViews, upgradeViews } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { h, setClass, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

export function mountUpgradesView(root: HTMLElement, ctx: UiContext): View {
  const worldId = ctx.activeWorld();
  const world = ctx.content.worlds.find((w) => w.id === worldId);
  if (!world) throw new Error(`Mundo desconocido: ${worldId}`);

  const list = h('ul', { className: 'upgrade-list' });
  const emptyText = h('p', { className: 'upgrade-empty' }, ['Por ahora no hay ninguna mejora a la vista. Sigue criando cerditos.']);

  const purchasedToggle = h('button', { className: 'purchased-toggle' }, ['Mejoras compradas (0)']) as HTMLButtonElement;
  const purchasedList = h('ul', { className: 'purchased-list hidden' });
  purchasedToggle.addEventListener('click', () => purchasedList.classList.toggle('hidden'));

  const container = h('div', { className: 'upgrades-view' }, [list, emptyText, purchasedToggle, purchasedList]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const offers = upgradeViews(state, ctx.content, worldId);
    list.replaceChildren(
      ...offers.map((offer) => {
        const buyButton = h('button', { className: 'buy-button' }, [formatNumber(offer.cost, notation)]) as HTMLButtonElement;
        if (!offer.canAfford) buyButton.disabled = true;
        buyButton.addEventListener('click', () => ctx.dispatch((s) => void buyUpgrade(s, ctx.content, worldId, offer.id)));
        return h('li', { className: 'upgrade-row' }, [
          h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [offer.name]), h('span', { className: 'upgrade-effect' }, [offer.effectText])]),
          buyButton,
        ]);
      }),
    );
    setClass(emptyText, 'hidden', offers.length > 0);

    const purchased = purchasedUpgradeViews(state, ctx.content, worldId);
    setText(purchasedToggle, `Mejoras compradas (${purchased.length})`);
    purchasedList.replaceChildren(...purchased.map((p) => h('li', { className: 'purchased-row' }, [p.name])));
  }

  return {
    update,
    destroy: () => container.remove(),
  };
}
