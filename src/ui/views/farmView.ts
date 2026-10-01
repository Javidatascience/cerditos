// Vista "Granja": tocar, lista de cerditos con compra ×1/×10/máx y una barra fina de
// progreso hacia la próxima compra pendiente. Ver docs/01-diseno-juego.md §4 y
// docs/02-arquitectura.md §8.
//
// NOTA (hito 3): solo hay un mundo jugable (El Valle), así que esta vista usa directamente
// `content.worlds[0]` en vez de `state.activeWorld`. El hito 7 (pestañas de mundo) la hará
// reactiva a `state.activeWorld`, reconstruyendo las filas si cambia de mundo.

import { buyGenerator, setBuyAmount, tap, type BuyAmount } from '../../core/actions.ts';
import { cheapestPendingPurchase, generatorViews } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { h, setClass, setDisabled, setStyleProp, setText } from '../dom.ts';
import { formatDuration, formatNumber } from '../format.ts';

interface Row {
  genId: string;
  ownedText: Text;
  prodText: Text;
  costText: Text;
  buyButton: HTMLButtonElement;
}

const AMOUNTS: BuyAmount[] = [1, 10, 'max'];

export function mountFarmView(root: HTMLElement, ctx: UiContext): View {
  const world = ctx.content.worlds[0];
  if (!world) throw new Error('No hay ningún mundo en el contenido');
  const worldId = world.id;

  const tapButton = h('button', { className: 'tap-button' }, ['Rascar la barriga']) as HTMLButtonElement;
  tapButton.addEventListener('click', () => ctx.dispatch((state) => tap(state, worldId)));

  // El conmutador de cantidad vive en `state.settings.buyAmount` (única fuente de verdad: así
  // generatorViews, que lee ese campo, y el botón de compra, que lee el mismo estado en el
  // momento de comprar, están siempre de acuerdo).
  const amountButtons = new Map<BuyAmount, HTMLButtonElement>();
  const amountRow = h(
    'div',
    { className: 'amount-row' },
    AMOUNTS.map((a) => {
      const btn = h('button', { className: 'amount-button', onclick: () => ctx.dispatch((state) => setBuyAmount(state, a)) }, [
        a === 'max' ? 'Máx' : `×${a}`,
      ]) as HTMLButtonElement;
      amountButtons.set(a, btn);
      return btn;
    }),
  );

  const rows: Row[] = [];
  const list = h(
    'ul',
    { className: 'generator-list' },
    world.generators.map((gen) => {
      const ownedText = document.createTextNode('');
      const prodText = document.createTextNode('');
      const costText = document.createTextNode('');
      const buyButton = h('button', { className: 'buy-button' }, [costText]) as HTMLButtonElement;
      buyButton.addEventListener('click', () => ctx.dispatch((state) => void buyGenerator(state, ctx.content, worldId, gen.id, state.settings.buyAmount)));
      rows.push({ genId: gen.id, ownedText, prodText, costText, buyButton });
      return h('li', { className: 'generator-row' }, [
        h('div', { className: 'generator-info' }, [
          h('div', { className: 'generator-name-row' }, [h('span', { className: 'generator-name' }, [gen.name]), ownedText]),
          h('span', { className: 'generator-flavor' }, [gen.flavor]),
          h('span', { className: 'generator-prod' }, [prodText]),
        ]),
        buyButton,
      ]);
    }),
  );

  const pendingText = document.createTextNode('');
  const progressInner = h('div', { className: 'progress-bar-inner' });
  const pendingBlock = h('div', { className: 'pending-purchase hidden' }, [h('div', { className: 'progress-bar' }, [progressInner]), h('p', {}, [pendingText])]);

  const container = h('div', { className: 'farm-view' }, [tapButton, amountRow, list, pendingBlock]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    for (const [id, btn] of amountButtons) setClass(btn, 'active', id === state.settings.buyAmount);

    const views = generatorViews(state, ctx.content, worldId);
    for (const row of rows) {
      const view = views.find((v) => v.id === row.genId);
      if (!view) continue;
      setText(row.ownedText, `× ${formatNumber(view.owned, notation)}`);
      setText(row.prodText, `+${formatNumber(view.prodPerSec, notation)}/s`);
      const label = view.amountToBuy > 1 ? `Comprar ×${view.amountToBuy} (${formatNumber(view.nextCost, notation)})` : `Comprar (${formatNumber(view.nextCost, notation)})`;
      setText(row.costText, label);
      setDisabled(row.buyButton, !view.canAfford);
    }

    const pending = cheapestPendingPurchase(state, ctx.content, worldId);
    setClass(pendingBlock, 'hidden', pending === null || pending.etaSeconds === null);
    if (pending && pending.etaSeconds !== null) {
      setText(pendingText, `${pending.name}: te faltan ${formatDuration(pending.etaSeconds)}`);
      setStyleProp(progressInner, 'width', `${(pending.progress * 100).toFixed(1)}%`);
    }
  }

  return {
    update,
    destroy: () => container.remove(),
  };
}
