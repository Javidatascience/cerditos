// Vista "Granja": rascar, cesta de la granja, lista de cerditos con compra ×1/×10/máx y una barra
// fina de progreso hacia la próxima compra pendiente. Solo se ven los cerditos descubiertos; el
// siguiente aparece difuminado y se avisa de que hay más por descubrir. Ver docs/01 §4 y 02 §8.
//
// Muestra el mundo activo al montarse (`ctx.activeWorld()`); app.ts la vuelve a montar al
// cambiar de mundo.

import { buyGenerator, buyRow, collectBasket, setBuyAmount, tap, tapValue, type BuyAmount } from '../../core/actions.ts';
import { basketView, calmView, generatorViews, harmonyView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { generatorIcon } from '../art.ts';
import { mountFarmScene } from '../farmScene.ts';
import { mountUpgradesList } from './upgradesList.ts';
import { h, setClass, setDisabled, setStyleProp, setText } from '../dom.ts';
import { formatDuration, formatNumber } from '../format.ts';

interface Row {
  genId: string;
  item: HTMLElement;
  nameText: Text;
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

  const sceneSlot = h('div', { className: 'scene-slot' });
  const tapText = document.createTextNode('');
  const tapButton = h('button', { className: 'tap-button' }, [tapText]) as HTMLButtonElement;
  const scene = mountFarmScene(sceneSlot, ctx);
  tapButton.addEventListener('click', () =>
    ctx.dispatch((state) => {
      const gained = tap(state, ctx.content, worldId);
      scene.floatText(`+${formatNumber(gained, state.settings.notation)}`);
    }),
  );

  // Cesta de la granja: se llena sola (con tope) y "Recoger" la vacía.
  const basketText = document.createTextNode('');
  const basketFill = h('div', { className: 'progress-bar-inner' });
  const basketButton = h('button', { className: 'buy-button' }, ['Recoger']) as HTMLButtonElement;
  basketButton.addEventListener('click', () => ctx.dispatch((state) => void collectBasket(state, ctx.content, worldId)));
  const basketBlock = h('div', { className: 'basket-block' }, [
    h('div', { className: 'basket-info' }, [h('span', { className: 'basket-text' }, [basketText]), h('div', { className: 'progress-bar', role: 'presentation' }, [basketFill])]),
    basketButton,
  ]);

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
    world.generators.map((gen, index) => {
      const nameText = document.createTextNode(gen.name);
      const ownedText = document.createTextNode('');
      const prodText = document.createTextNode('');
      const costText = document.createTextNode('');
      const buyButton = h('button', { className: 'buy-button' }, [costText]) as HTMLButtonElement;
      buyButton.addEventListener('click', () => ctx.dispatch((state) => void buyGenerator(state, ctx.content, worldId, gen.id, state.settings.buyAmount)));
      const item = h('li', { className: 'generator-row hidden' }, [
        h('div', { className: 'row-art' }, [
          generatorIcon(worldId, index, gen.id),
          h('div', { className: 'generator-info' }, [
            h('div', { className: 'generator-name-row' }, [h('span', { className: 'generator-name' }, [nameText]), h('span', { className: 'generator-owned' }, [ownedText])]),
            h('span', { className: 'generator-flavor' }, [gen.flavor]),
            h('span', { className: 'generator-prod' }, [prodText]),
          ]),
        ]),
        buyButton,
      ]);
      rows.push({ genId: gen.id, item, nameText, ownedText, prodText, costText, buyButton });
      return item;
    }),
  );

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

  const moreHint = h('p', { className: 'more-hint hidden' }, ['Hay más cerditos por descubrir.']);

  const upgradesSlot = h('div', { className: 'upgrades-slot' });
  const upgrades = mountUpgradesList(upgradesSlot, ctx);

  const container = h('div', { className: 'farm-view' }, [sceneSlot, tapButton, upgradesSlot, basketBlock, harmonyBlock, calmBlock, amountRow, list, moreHint]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    for (const [id, btn] of amountButtons) setClass(btn, 'active', id === state.settings.buyAmount);

    upgrades.update(state);
    setText(tapText, `Rascar la barriga (+${formatNumber(tapValue(state, ctx.content, worldId), notation)})`);

    const basket = basketView(state, ctx.content, worldId);
    const full = basket.fill >= 1;
    setText(basketText, `Cesta de la granja: ${formatNumber(basket.value, notation)}${full ? ' (llena)' : ''}`);
    setStyleProp(basketFill, 'width', `${(basket.fill * 100).toFixed(1)}%`);
    setDisabled(basketButton, basket.value.lte(0));

    const views = generatorViews(state, ctx.content, worldId);
    const perUnit = (v: (typeof views)[number]) => formatNumber(v.unitProd, notation);
    for (const row of rows) {
      const view = views.find((v) => v.id === row.genId);
      if (!view) continue;
      const teaser = view.reveal === 'teaser';
      setClass(row.item, 'hidden', view.reveal === 'hidden');
      setClass(row.item, 'generator-row-teaser', teaser);
      row.item.style.setProperty('--blur', `${(6 - 4 * view.closeness).toFixed(1)}px`);
      row.item.setAttribute('aria-hidden', teaser ? 'true' : 'false');
      setClass(row.item, 'generator-row-lowest', view.atMinimum && !teaser);
      setText(row.ownedText, `× ${formatNumber(view.owned, notation)}`);
      const unit = view.prodUnit
        ? `Cada uno produce ${perUnit(view)} ${view.prodUnit}/s · en total ${formatNumber(view.prodPerSec, notation)}/s`
        : `Cada uno da +${perUnit(view)}/s · en total +${formatNumber(view.prodPerSec, notation)}/s`;
      setText(row.prodText, unit);
      const label = view.amountToBuy > 1 ? `Comprar ×${view.amountToBuy} (${formatNumber(view.nextCost, notation)})` : `Comprar (${formatNumber(view.nextCost, notation)})`;
      setText(row.costText, label);
      setDisabled(row.buyButton, teaser || !view.canAfford);
      row.buyButton.tabIndex = teaser ? -1 : 0;
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
          ? `Comprar molestará a los cerditos (la calma bajará ${calm.penalty === 0.5 ? 'a la mitad' : `a ${Math.round(calm.penalty * 100)} %`}). Varias compras seguidas molestan una sola vez.`
          : `Los cerditos ya están algo revueltos: durante ${formatDuration(calm.windowSecondsLeft)} puedes comprar sin molestarlos más.`,
      );
    }

    setClass(moreHint, 'hidden', !views.some((v) => v.reveal !== 'visible'));
    scene.update(state);
  }

  return {
    update,
    destroy: () => {
      scene.destroy();
      upgrades.destroy();
      container.remove();
    },
  };
}
