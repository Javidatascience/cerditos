// Vista "Picar": el cerdito con su pico, el botón de picar, la cesta y la lista de herramientas.
// Solo se ven las herramientas descubiertas; la siguiente aparece difuminada y se avisa de que hay
// más. Las listas se sincronizan por clave (dom.ts > createListSync) para que los botones no se
// recreen cada 250 ms y un clic nunca se pierda. Ver docs/06-mina.md.

import { buyTool, buyUpgrade, collectBasket, setBuyAmount, tap, type BuyAmount } from '../../core/actions.ts';
import { basketView, headerView, toolViews, type ToolView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { emojiBadge, minerPig } from '../art.ts';
import { createListSync, h, setClass, setDisabled, setStyleProp, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

const AMOUNTS: BuyAmount[] = [1, 10, 'max'];

type ToolRow = ToolView & { costText: string; prodText: string; milestoneText: string; upgradeText: string };

export function mountPickView(root: HTMLElement, ctx: UiContext): View {
  // --- Escena: cerdito + pico ---
  const pigSlot = h('div', { className: 'mine-pig' });
  let pigSignature: number | null = null;
  let ownedToolsSignature = '';
  const floats = h('div', { className: 'float-layer' });
  const incomeText = document.createTextNode('');
  const handTool = h('div', { className: 'mine-block', 'aria-hidden': 'true' }, ['⛏️']);
  const ownedTools = h('div', { className: 'mine-tools', 'aria-label': 'Herramientas del cerdito' });
  const scene = h('div', { className: 'mine-scene' }, [
    h('div', { className: 'mine-stage' }, [pigSlot, handTool]),
    ownedTools,
    h('p', { className: 'mine-stats' }, [incomeText]),
    floats,
  ]);

  function floatText(text: string): void {
    if (!ctx.effectsOn()) return;
    while (floats.childElementCount >= 6) floats.firstElementChild?.remove();
    const el = h('span', { className: 'float-text' }, [text]);
    el.style.left = `${30 + Math.random() * 40}%`;
    el.addEventListener('animationend', () => el.remove());
    floats.appendChild(el);
  }

  // --- Picar ---
  const tapText = document.createTextNode('');
  const tapButton = h('button', { className: 'tap-button' }, [tapText]) as HTMLButtonElement;
  tapButton.addEventListener('click', () =>
    ctx.dispatch((state) => {
      const gained = tap(state, ctx.content);
      floatText(`+${formatNumber(gained, state.settings.notation)}`);
    }),
  );

  // --- Cesta ---
  const basketText = document.createTextNode('');
  const basketFill = h('div', { className: 'progress-bar-inner' });
  const basketButton = h('button', { className: 'buy-button' }, ['Recoger']) as HTMLButtonElement;
  basketButton.addEventListener('click', () => ctx.dispatch((state) => void collectBasket(state, ctx.content)));
  const basketBlock = h('div', { className: 'basket-block' }, [
    h('div', { className: 'basket-info' }, [h('span', { className: 'basket-text' }, [basketText]), h('div', { className: 'progress-bar', role: 'presentation' }, [basketFill])]),
    basketButton,
  ]);

  // --- Herramientas ---
  const amountButtons = new Map<BuyAmount, HTMLButtonElement>();
  const amountRow = h(
    'div',
    { className: 'amount-row' },
    AMOUNTS.map((a) => {
      const btn = h('button', { className: 'amount-button', onclick: () => ctx.dispatch((state) => setBuyAmount(state, a)) }, [a === 'max' ? 'Máx' : `×${a}`]) as HTMLButtonElement;
      amountButtons.set(a, btn);
      return btn;
    }),
  );
  const toolList = h('ul', { className: 'generator-list' });
  const moreHint = h('p', { className: 'more-hint hidden' }, ['Hay más herramientas por descubrir.']);

  const syncTools = createListSync<ToolRow>(
    toolList,
    (t) => t.id,
    (tool) => {
      const nameText = document.createTextNode(tool.name);
      const ownedText = document.createTextNode('');
      const prodText = document.createTextNode('');
      const milestoneText = document.createTextNode('');
      const costText = document.createTextNode('');
      const buyButton = h('button', { className: 'buy-button' }, [costText]) as HTMLButtonElement;
      buyButton.addEventListener('click', () => ctx.dispatch((state) => void buyTool(state, ctx.content, tool.id, state.settings.buyAmount)));
      const upgradeText = document.createTextNode('');
      const upgradeButton = h('button', { className: 'buy-button upgrade-button hidden' }, [upgradeText]) as HTMLButtonElement;
      upgradeButton.addEventListener('click', () => ctx.dispatch((state) => void buyUpgrade(state, ctx.content, tool.id)));
      const el = h('li', { className: 'generator-row' }, [
        h('div', { className: 'row-art' }, [
          emojiBadge(tool.emoji),
          h('div', { className: 'generator-info' }, [
            h('div', { className: 'generator-name-row' }, [h('span', { className: 'generator-name' }, [nameText]), h('span', { className: 'generator-owned' }, [ownedText])]),
            h('span', { className: 'generator-flavor' }, [tool.flavor]),
            h('span', { className: 'generator-prod' }, [prodText]),
            h('span', { className: 'generator-flavor' }, [milestoneText]),
          ]),
        ]),
        buyButton,
        upgradeButton,
      ]);
      return {
        el,
        update: (t) => {
          const teaser = t.reveal === 'teaser';
          setClass(el, 'generator-row-teaser', teaser);
          el.style.setProperty('--blur', `${(6 - 4 * t.closeness).toFixed(1)}px`);
          el.setAttribute('aria-hidden', teaser ? 'true' : 'false');
          setText(ownedText, `× ${t.owned}`);
          setText(prodText, t.prodText);
          setText(milestoneText, t.milestoneText);
          setText(costText, t.costText);
          setDisabled(buyButton, teaser || !t.canAfford);
          buyButton.tabIndex = teaser ? -1 : 0;
          const ready = t.nextUpgrade !== null && t.nextUpgrade.unlocked;
          setClass(upgradeButton, 'hidden', !ready || teaser);
          setText(upgradeText, t.upgradeText);
          setDisabled(upgradeButton, !(t.nextUpgrade?.canAfford ?? false));
        },
      };
    },
  );

  const container = h('div', { className: 'mine-view' }, [scene, tapButton, basketBlock, amountRow, toolList, moreHint]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const head = headerView(state, ctx.content);

    const best = Math.max(-1, ...ctx.content.tools.map((t, i) => ((state.tools[t.id] ?? 0) > 0 ? i : -1)));
    if (best !== pigSignature) {
      pigSignature = best;
      pigSlot.replaceChildren(minerPig(best));
    }
    handTool.textContent = best >= 0 ? ctx.content.tools[best]!.emoji : '⛏️';
    const ownedList = ctx.content.tools.filter((t) => (state.tools[t.id] ?? 0) > 0);
    const ownedSignature = ownedList.map((t) => `${t.id}:${state.tools[t.id]}`).join('|');
    if (ownedSignature !== ownedToolsSignature) {
      ownedToolsSignature = ownedSignature;
      ownedTools.replaceChildren(...ownedList.map((t) => h('span', { className: 'tool-chip', title: t.name }, [`${t.emoji} ${state.tools[t.id]}`])));
    }
    setText(incomeText, head.income.gt(0) ? `El cerdito gana ${formatNumber(head.income, notation)} monedas por segundo` : 'Pica para ganar tus primeras monedas y compra un pico.');
    setText(tapText, `Picar (+${formatNumber(head.tapGain, notation)})`);

    const basket = basketView(state, ctx.content);
    setText(basketText, `Cesta: ${formatNumber(basket.value, notation)}${basket.fill >= 1 ? ' (llena)' : ''}`);
    setStyleProp(basketFill, 'width', `${(basket.fill * 100).toFixed(1)}%`);
    setDisabled(basketButton, basket.value.lte(0));
    setClass(basketBlock, 'hidden', head.income.lte(0));

    for (const [id, btn] of amountButtons) setClass(btn, 'active', id === state.settings.buyAmount);
    const views = toolViews(state, ctx.content);
    syncTools(
      views
        .filter((t) => t.reveal !== 'hidden')
        .map((t) => {
          const amount = t.amountToBuy > 1 ? ` ×${t.amountToBuy}` : '';
          return {
            ...t,
            costText: `Comprar${amount} (${formatNumber(t.nextCost, notation)})`,
            prodText: t.owned > 0 ? `Cada una da ${formatNumber(t.unitProd, notation)}/s · en total ${formatNumber(t.totalProd, notation)}/s` : `Cada una daría ${formatNumber(t.unitProd, notation)}/s`,
            milestoneText: !t.nextUpgrade
              ? `Todas las mejoras compradas (×${t.upgradeMult})`
              : t.nextUpgrade.unlocked
                ? `¡Mejora desbloqueada! ×${ctx.content.game.milestoneMult} de producción${t.upgradeMult > 1 ? ` (ahora ×${t.upgradeMult})` : ''}`
                : `Mejora ×${ctx.content.game.milestoneMult} al tener ${t.nextUpgrade.threshold}${t.upgradeMult > 1 ? ` (ahora ×${t.upgradeMult})` : ''}`,
            upgradeText: t.nextUpgrade ? `Mejora ×${ctx.content.game.milestoneMult} (${formatNumber(t.nextUpgrade.cost, notation)})` : '',
          };
        }),
    );
    setClass(moreHint, 'hidden', !views.some((t) => t.reveal === 'hidden'));
  }

  return { update, destroy: () => container.remove() };
}
