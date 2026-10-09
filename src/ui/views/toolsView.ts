// Menú de herramientas y mejoras: se abre al tocar "Picar" estando en la pantalla del cerdito. Solo se ven
// las herramientas descubiertas; la siguiente aparece difuminada y se avisa de que hay más. Las listas se
// sincronizan por clave (dom.ts > createListSync) para que los botones no se recreen cada 250 ms y un
// clic nunca se pierda. Ver docs/06-mina.md.

import { buyGlobalUpgrade, buyTool, buyUpgrade, setBuyAmount, type BuyAmount } from '../../core/actions.ts';
import { globalUpgradeViews, toolViews, type GlobalUpgradeView, type ToolView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { spriteBadge } from '../art.ts';
import { createListSync, h, onHold, setClass, setDisabled, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

const AMOUNTS: BuyAmount[] = [1, 10, 'max'];

type ToolRow = ToolView & { costText: string; prodText: string; milestoneText: string; upgradeText: string; needText: string };

export function mountToolsView(root: HTMLElement, ctx: UiContext): View {
  // --- Mejoras globales (×1,5 a todo) y de inercia ---
  const globalNote = h('p', { className: 'settings-hint hidden' });
  const globalList = h('ul', { className: 'upgrade-list' });
  const globalBlock = h('div', { className: 'global-block' }, [globalList, globalNote]);
  const syncGlobals = createListSync<GlobalUpgradeView & { costText: string }>(
    globalList,
    (u) => u.id,
    (def) => {
      const costText = document.createTextNode('');
      const buy = h('button', { className: 'buy-button upgrade-button' }, [costText]) as HTMLButtonElement;
      buy.addEventListener('click', () => ctx.dispatch((state) => void buyGlobalUpgrade(state, ctx.content, def.id)));
      const el = h('li', { className: 'upgrade-row' }, [
        h('div', { className: 'row-art' }, [
          spriteBadge('ui', def.momentumAdd > 0 ? 'mejora-inercia' : 'mejora-global'),
          h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [def.name]), h('span', { className: 'upgrade-effect' }, [def.momentumAdd > 0 ? `+${def.momentumAdd} al tope de la inercia · ${def.flavor}` : `×${def.mult} a toda la producción · ${def.flavor}`])]),
        ]),
        buy,
      ]);
      return { el, update: (u) => { setText(costText, u.costText); setDisabled(buy, !u.canAfford); } };
    },
  );

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
      onHold(buyButton, () => ctx.dispatch((state) => void buyTool(state, ctx.content, tool.id, state.settings.buyAmount)));
      const needText = document.createTextNode('');
      const upgradeText = document.createTextNode('');
      const upgradeButton = h('button', { className: 'buy-button upgrade-button hidden' }, [upgradeText]) as HTMLButtonElement;
      upgradeButton.addEventListener('click', () => ctx.dispatch((state) => void buyUpgrade(state, ctx.content, tool.id)));
      const el = h('li', { className: 'generator-row' }, [
        h('div', { className: 'row-art' }, [
          spriteBadge('tools', tool.id),
          h('div', { className: 'generator-info' }, [
            h('div', { className: 'generator-name-row' }, [h('span', { className: 'generator-name' }, [nameText]), h('span', { className: 'generator-owned' }, [ownedText])]),
            h('span', { className: 'generator-prod' }, [prodText]),
            h('span', { className: 'generator-flavor' }, [milestoneText]),
            h('span', { className: 'need-line' }, [needText]),
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
          setText(needText, t.needText);
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

  // Dos secciones para no alargar la pantalla: herramientas y mejoras (globales y de inercia).
  const toolsPane = h('div', {}, [amountRow, toolList, moreHint]);
  const upgradesPane = h('div', { className: 'hidden' }, [globalBlock]);
  const modeLabels = new Map<'tools' | 'upgrades', Text>([
    ['tools', document.createTextNode('Herramientas')],
    ['upgrades', document.createTextNode('Mejoras')],
  ]);
  let mode: 'tools' | 'upgrades' = 'tools';
  const modeButtons = (['tools', 'upgrades'] as const).map((m) => {
    const btn = h('button', { className: 'amount-button', onclick: () => { mode = m; applyMode(); } }, [modeLabels.get(m)!]) as HTMLButtonElement;
    return [m, btn] as const;
  });
  function applyMode(): void {
    setClass(toolsPane, 'hidden', mode !== 'tools');
    setClass(upgradesPane, 'hidden', mode !== 'upgrades');
    for (const [m, btn] of modeButtons) setClass(btn, 'active', m === mode);
  }
  const modeRow = h('div', { className: 'amount-row' }, modeButtons.map(([, b]) => b));
  applyMode();
  const container = h('div', { className: 'mine-view' }, [modeRow, toolsPane, upgradesPane]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    setClass(container, 'no-effects', !ctx.effectsOn());

    const globals = globalUpgradeViews(state, ctx.content);
    syncGlobals(globals.available.map((u) => ({ ...u, costText: `Comprar (${formatNumber(u.cost, notation)})` })));
    setText(modeLabels.get('upgrades')!, globals.available.length > 0 ? `Mejoras (${globals.available.length})` : 'Mejoras');
    setClass(globalNote, 'hidden', globals.nextUnlockAt === null && globals.available.length > 0);
    setText(globalNote, globals.nextUnlockAt !== null ? `Siguiente mejora al ganar ${formatNumber(globals.nextUnlockAt, notation)} monedas en total.` : 'No quedan más mejoras por ahora.');

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
            needText: '',
            upgradeText: t.nextUpgrade ? `Mejora ×${ctx.content.game.milestoneMult} (${formatNumber(t.nextUpgrade.cost, notation)})` : '',
          };
        }),
    );
    setClass(moreHint, 'hidden', !views.some((t) => t.reveal === 'hidden'));
  }

  return { update, destroy: () => container.remove() };
}
