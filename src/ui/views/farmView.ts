// Vista "Granja": tocar, lista de cerditos con compra ×1/×10/máx y una barra fina de
// progreso hacia la próxima compra pendiente. Ver docs/01-diseno-juego.md §4 y
// docs/02-arquitectura.md §8.
//
// Muestra el mundo activo al montarse (`ctx.activeWorld()`); app.ts la vuelve a montar al
// cambiar de mundo.

import { buyGenerator, buyRow, setBuyAmount, tap, type BuyAmount } from '../../core/actions.ts';
import { cheapestPendingPurchase, calmView, generatorViews, harmonyView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { generatorIcon } from '../art.ts';
import { h, setClass, setDisabled, setStyleProp, setText } from '../dom.ts';
import { formatDuration, formatNumber } from '../format.ts';

interface Row {
  genId: string;
  item: HTMLElement;
  ownedText: Text;
  prodText: Text;
  costText: Text;
  buyButton: HTMLButtonElement;
}

const AMOUNTS: BuyAmount[] = [1, 10, 'max'];

export function mountFarmView(root: HTMLElement, ctx: UiContext): View {
  const worldId = ctx.activeWorld();
  const world = ctx.content.worlds.find((w) => w.id === worldId);
  if (!world) throw new Error(`Mundo desconocido: ${worldId}`);

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
      const item = h('li', { className: 'generator-row' }, [
        h('div', { className: 'row-art' }, [
          generatorIcon(worldId, world.generators.indexOf(gen)),
          h('div', { className: 'generator-info' }, [
            h('div', { className: 'generator-name-row' }, [h('span', { className: 'generator-name' }, [gen.name]), ownedText]),
            h('span', { className: 'generator-flavor' }, [gen.flavor]),
            h('span', { className: 'generator-prod' }, [prodText]),
          ]),
        ]),
        buyButton,
      ]);
      rows.push({ genId: gen.id, item, ownedText, prodText, costText, buyButton });
      return item;
    }),
  );

  const pendingText = document.createTextNode('');
  const progressInner = h('div', { className: 'progress-bar-inner' });
  const pendingBlock = h('div', { className: 'pending-purchase hidden' }, [h('div', { className: 'progress-bar' }, [progressInner]), h('p', {}, [pendingText])]);

  // Armonía (Huerta): indicador de filas y botón "Completar fila" (solo en ese mundo).
  const harmonyText = document.createTextNode('');
  const rowCostText = document.createTextNode('');
  const rowButton = h('button', { className: 'buy-button' }, [rowCostText]) as HTMLButtonElement;
  rowButton.addEventListener('click', () => ctx.dispatch((state) => void buyRow(state, ctx.content, worldId)));
  const harmonyBlock = h('div', { className: 'harmony-block hidden' }, [h('span', { className: 'harmony-text' }, [harmonyText]), rowButton]);

  // Calma (Balneario): barra estática y un aviso suave sobre el efecto de comprar.
  const calmText = document.createTextNode('');
  const calmInner = h('div', { className: 'progress-bar-inner' });
  const calmNote = document.createTextNode('');
  const calmBlock = h('div', { className: 'calm-block hidden' }, [
    h('div', { className: 'progress-bar' }, [calmInner]),
    h('p', { className: 'harmony-text' }, [calmText]),
    h('p', { className: 'settings-hint' }, [calmNote]),
  ]);

  const container = h('div', { className: 'farm-view' }, [tapButton, harmonyBlock, calmBlock, amountRow, list, pendingBlock]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    for (const [id, btn] of amountButtons) setClass(btn, 'active', id === state.settings.buyAmount);

    const views = generatorViews(state, ctx.content, worldId);
    for (const row of rows) {
      const view = views.find((v) => v.id === row.genId);
      if (!view) continue;
      setClass(row.item, 'generator-row-lowest', view.atMinimum);
      setText(row.ownedText, `× ${formatNumber(view.owned, notation)}`);
      setText(row.prodText, view.prodUnit ? `produce ${formatNumber(view.prodPerSec, notation)} ${view.prodUnit}/s` : `+${formatNumber(view.prodPerSec, notation)}/s`);
      const label = view.amountToBuy > 1 ? `Comprar ×${view.amountToBuy} (${formatNumber(view.nextCost, notation)})` : `Comprar (${formatNumber(view.nextCost, notation)})`;
      setText(row.costText, label);
      setDisabled(row.buyButton, !view.canAfford);
    }

    const harmony = harmonyView(state, ctx.content, worldId);
    setClass(harmonyBlock, 'hidden', harmony === null);
    if (harmony) {
      const next = harmony.nextThreshold === null ? '' : ` — siguiente ×${harmony.thresholdMult} a las ${harmony.nextThreshold}`;
      setText(harmonyText, `Filas completas: ${harmony.rows} (×${formatNumber(harmony.multiplier, notation)})${next}`);
      setText(rowCostText, `Completar fila (${formatNumber(harmony.rowCost, notation)})`);
      setDisabled(rowButton, !harmony.canBuyRow);
    }

    const calm = calmView(state, ctx.content, worldId);
    setClass(calmBlock, 'hidden', calm === null);
    if (calm) {
      setText(calmText, `Calma ${Math.round(calm.calm * 100)} % · ×${formatNumber(calm.multiplier, notation)}`);
      setStyleProp(calmInner, 'width', `${(calm.calm * 100).toFixed(1)}%`);
      setText(
        calmNote,
        calm.buyWillDisturb
          ? `Comprar molestará a los cerditos (la calma bajará ${calm.penalty === 0.5 ? "a la mitad" : `a ${Math.round(calm.penalty * 100)} %`}). Varias compras seguidas molestan una sola vez.`
          : `Los cerditos ya están algo revueltos: durante ${formatDuration(calm.windowSecondsLeft)} puedes comprar sin molestarlos más.`,
      );
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
