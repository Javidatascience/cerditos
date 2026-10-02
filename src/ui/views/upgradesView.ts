// Vista "Mejoras": las mejoras disponibles con la imagen del cerdito al que mejoran (o un icono
// para las globales), su efecto y su coste; y un desplegable con las ya compradas. Ver docs/01 §4.
// La lista se sincroniza por clave (dom.ts > createListSync) para que los botones no se
// recreen cada 250 ms y un clic nunca se pierda.

import { buyUpgrade } from '../../core/actions.ts';
import { purchasedUpgradeViews, upgradeViews, type UpgradeView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { generatorIcon, upgradeBadge } from '../art.ts';
import { createListSync, h, setClass, setDisabled, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

type UpgradeRow = UpgradeView & { costText: string };

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

  const syncOffers = createListSync<UpgradeRow>(
    list,
    (offer) => offer.id,
    (offer) => {
      const costText = document.createTextNode('');
      const nameText = document.createTextNode('');
      const effectText = document.createTextNode('');
      const buyButton = h('button', { className: 'buy-button' }, [costText]) as HTMLButtonElement;
      buyButton.addEventListener('click', () => ctx.dispatch((s) => void buyUpgrade(s, ctx.content, worldId, offer.id)));
      const art = offer.genIndex !== null ? generatorIcon(worldId, offer.genIndex, world.generators[offer.genIndex]?.id) : upgradeBadge(offer.id, worldId);
      const el = h('li', { className: 'upgrade-row' }, [
        h('div', { className: 'row-art' }, [art, h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [nameText]), h('span', { className: 'upgrade-effect' }, [effectText])])]),
        buyButton,
      ]);
      return {
        el,
        update: (o) => {
          setText(nameText, o.name);
          setText(effectText, o.effectText);
          setText(costText, o.costText);
          setDisabled(buyButton, !o.canAfford);
        },
      };
    },
  );

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const offers = upgradeViews(state, ctx.content, worldId);
    syncOffers(offers.map((o) => ({ ...o, costText: formatNumber(o.cost, notation) })));
    setClass(emptyText, 'hidden', offers.length > 0);

    const purchased = purchasedUpgradeViews(state, ctx.content, worldId);
    setText(purchasedToggle, `Mejoras compradas (${purchased.length})`);
    if (purchasedList.childElementCount !== purchased.length) {
      purchasedList.replaceChildren(...purchased.map((p) => h('li', { className: 'purchased-row' }, [p.name])));
    }
  }

  return {
    update,
    destroy: () => container.remove(),
  };
}
