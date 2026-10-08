// Vista "Picar": el cerdito con su pico, el botón de picar, la cesta y la lista de herramientas.
// Solo se ven las herramientas descubiertas; la siguiente aparece difuminada y se avisa de que hay
// más. Las listas se sincronizan por clave (dom.ts > createListSync) para que los botones no se
// recreen cada 250 ms y un clic nunca se pierda. Ver docs/06-mina.md.

import { buyGlobalUpgrade, buyTool, useRabbit, buyUpgrade, collectBasket, setBuyAmount, tap, type BuyAmount } from '../../core/actions.ts';
import { basketView, companionStatusViews, globalUpgradeViews, headerView, toolViews, type GlobalUpgradeView, type ToolView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { artSprite, pigStack, spriteBadge } from '../art.ts';
import { createListSync, h, onHold, setClass, setDisabled, setStyleProp, setText } from '../dom.ts';
import { formatDuration, formatNumber } from '../format.ts';

const AMOUNTS: BuyAmount[] = [1, 10, 'max'];

type ToolRow = ToolView & { costText: string; prodText: string; milestoneText: string; upgradeText: string; needText: string };

export function mountPickView(root: HTMLElement, ctx: UiContext): View {
  // --- Escena: cerdito + pico ---
  const pigSlot = h('div', { className: 'mine-pig' });
  let pigSignature: string | null = null;
  let companionsSignature = '';
  let ownedToolsSignature = '';
  const floats = h('div', { className: 'float-layer' });
  const incomeText = document.createTextNode('');
  const statsLine = h('p', { className: 'mine-stats' }, [incomeText]);
  const handTool = h('div', { className: 'mine-block', 'aria-hidden': 'true' }, ['⛏️']);
  const companionsRow = h('div', { className: 'mine-companions', 'aria-hidden': 'true' });
  const ownedTools = h('div', { className: 'mine-tools', 'aria-label': 'Herramientas del cerdito' });
  // El escenario entero es el botón de picar: se toca al cerdito (también con teclado: Intro o espacio).
  const stage = h('div', { className: 'mine-stage', role: 'button', tabindex: 0, 'aria-label': 'Picar: toca al cerdito' }, [pigSlot, companionsRow]);
  const scene = h('div', { className: 'mine-scene' }, [
    stage,
    ownedTools,
    statsLine,
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
  const tapHint = h('p', { className: 'tap-hint' }, [tapText]);
  function doTap(): void {
    ctx.dispatch((state) => {
      const gained = tap(state, ctx.content);
      floatText(`+${formatNumber(gained, state.settings.notation)}`);
      dipPig();
    });
  }
  // pointerdown (y no click) para que cada toque cuente al instante, también picando rápido con varios dedos.
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    doTap();
  });
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      doTap();
    }
  });

  /** El cerdito se agacha un instante al picar (se reinicia la animación aunque piques muy seguido). */
  function dipPig(): void {
    if (!ctx.effectsOn()) return;
    pigSlot.classList.remove('pig-dip');
    void pigSlot.offsetWidth; // fuerza a reiniciar la animación
    pigSlot.classList.add('pig-dip');
  }
  pigSlot.addEventListener('animationend', (e) => {
    if ((e as AnimationEvent).animationName === 'pig-dip') pigSlot.classList.remove('pig-dip');
  });

  // --- Inercia: cuanto más picas, más sube la producción ---
  const momentumText = document.createTextNode('');
  const momentumFill = h('div', { className: 'progress-bar-inner' });
  const momentumBlock = h('div', { className: 'momentum-block' }, [h('span', { className: 'basket-text' }, [momentumText]), h('div', { className: 'progress-bar', role: 'presentation' }, [momentumFill])]);

  // --- Compañeros: lo que está haciendo cada uno ---
  const companionBlock = h('div', { className: 'companion-status' });
  let companionStatusKey = '';
  let companionLines: { text: Text; fill: HTMLElement; chips: HTMLElement | null }[] = [];

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

  // --- Cesta ---
  const basketText = document.createTextNode('');
  const basketFill = h('div', { className: 'progress-bar-inner' });
  const basketButton = h('button', { className: 'buy-button' }, ['Recoger']) as HTMLButtonElement;
  basketButton.addEventListener('click', () => ctx.dispatch((state) => void collectBasket(state, ctx.content, Date.now())));
  // Bellotas que el topo deja en la cesta (solo con la ventaja Topo excavador)
  const basketAcornText = document.createTextNode('');
  const basketAcorns = h('span', { className: 'basket-text hidden' }, [' · ', artSprite('ui', 'bellota', 'sm'), basketAcornText]);
  const basketBlock = h('div', { className: 'basket-block' }, [
    h('div', { className: 'basket-info' }, [h('span', { className: 'basket-text' }, [basketText]), basketAcorns, h('div', { className: 'progress-bar', role: 'presentation' }, [basketFill])]),
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
  const container = h('div', { className: 'mine-view' }, [momentumBlock, companionBlock, basketBlock, scene, tapHint, modeRow, toolsPane, upgradesPane]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const head = headerView(state, ctx.content);
    setClass(container, 'no-effects', !ctx.effectsOn());

    const best = Math.max(-1, ...ctx.content.tools.map((t, i) => ((state.tools[t.id] ?? 0) > 0 ? i : -1)));
    const worn = state.wardrobe.worn;
    const signature = `${state.activeSkin}|${worn.head}|${worn.body}|${worn.tail}`;
    if (signature !== pigSignature) {
      pigSignature = signature;
      pigSlot.replaceChildren(pigStack({ skin: state.activeSkin, head: worn.head, body: worn.body, tail: worn.tail }, 'lg'));
    }
    const statuses = companionStatusViews(state, ctx.content, Date.now());
    const statusKey = `${statuses.map((c) => c.id).join(',')}:${state.revealed}`;
    if (statusKey !== companionStatusKey) {
      companionStatusKey = statusKey;
      companionLines = statuses.map((c) => {
        const chips =
          c.kind === 'freeTool'
            ? h(
                'div',
                { className: 'chip-row hidden' },
                ctx.content.tools.slice(0, state.revealed).map((tool) =>
                  h('button', { className: 'chip chip-button', title: `Gratis: ${tool.name}`, onclick: () => ctx.dispatch((s) => void useRabbit(s, ctx.content, tool.id, Date.now())) }, [artSprite('tools', tool.id)]),
                ),
              )
            : null;
        return { text: document.createTextNode(''), fill: h('div', { className: 'progress-bar-inner' }), chips };
      });
      companionBlock.replaceChildren(
        ...companionLines.map((line) =>
          h('div', { className: 'companion-line' }, [h('span', { className: 'basket-text' }, [line.text]), h('div', { className: 'progress-bar', role: 'presentation' }, [line.fill]), ...(line.chips ? [line.chips] : [])]),
        ),
      );
    }
    statuses.forEach((c, i) => {
      const line = companionLines[i];
      if (!line) return;
      const what =
        c.kind === 'tapAcorn'
          ? `desentierra una bellota en ${Math.ceil(c.target - c.progress)} picos`
          : c.kind === 'coinGift'
            ? `te trae monedas en ${formatDuration(c.secondsLeft ?? 0)}`
            : c.kind === 'bestToolMult' || c.kind === 'visitorSpeed' || c.kind === 'gardenSpeed' || c.kind === 'gardenLuck' || c.kind === 'embersMult'
              ? c.describe
              : (c.secondsLeft ?? 0) > 0
                ? `te dejará una herramienta gratis en ${formatDuration(c.secondsLeft ?? 0)}`
                : 'te deja elegir una herramienta gratis:';
      setText(line.text, `${c.name} ${what}`);
      setStyleProp(line.fill, 'width', `${((c.progress / c.target) * 100).toFixed(1)}%`);
      if (line.chips) setClass(line.chips, 'hidden', (c.secondsLeft ?? 0) > 0);
    });
    const companionIds = state.activeCompanions.join(',');
    if (companionIds !== companionsSignature) {
      companionsSignature = companionIds;
      companionsRow.replaceChildren(
        ...state.activeCompanions.map((id, i) => h('span', { className: `companion companion-${i}` }, [artSprite('companions', id, 'lg')])),
      );
    }
    const handId = ctx.content.tools[Math.max(best, 0)]!.id;
    if (handTool.dataset['tool'] !== handId) {
      handTool.dataset['tool'] = handId;
      handTool.replaceChildren(artSprite('tools', handId, 'lg'));
    }
    const ownedList = ctx.content.tools.filter((t) => (state.tools[t.id] ?? 0) > 0);
    const ownedSignature = ownedList.map((t) => `${t.id}:${state.tools[t.id]}`).join('|');
    if (ownedSignature !== ownedToolsSignature) {
      ownedToolsSignature = ownedSignature;
      ownedTools.replaceChildren(...ownedList.map((t) => h('span', { className: 'tool-chip', title: t.name }, [artSprite('tools', t.id, 'sm'), ` ${state.tools[t.id]}`])));
    }
    setText(incomeText, 'Pica para ganar tus primeras monedas y compra un pico.');
    setClass(statsLine, 'hidden', head.income.gt(0) || state.taps > 0);
    setText(tapText, `Toca al cerdito para picar (+${formatNumber(head.tapGain, notation)})`);
    setText(momentumText, `Inercia ×${head.momentum.mult.toFixed(2)} (máx. ×${head.momentum.max.toFixed(2)})`);
    setStyleProp(momentumFill, 'width', `${(head.momentum.fraction * 100).toFixed(1)}%`);

    const globals = globalUpgradeViews(state, ctx.content);
    syncGlobals(globals.available.map((u) => ({ ...u, costText: `Comprar (${formatNumber(u.cost, notation)})` })));
    setText(modeLabels.get('upgrades')!, globals.available.length > 0 ? `Mejoras (${globals.available.length})` : 'Mejoras');
    setClass(globalNote, 'hidden', globals.nextUnlockAt === null && globals.available.length > 0);
    setText(globalNote, globals.nextUnlockAt !== null ? `Siguiente mejora al ganar ${formatNumber(globals.nextUnlockAt, notation)} monedas en total.` : 'No quedan más mejoras por ahora.');

    const basket = basketView(state, ctx.content, Date.now());
    setText(basketText, `Cesta: ${formatNumber(basket.value, notation)}${basket.fill >= 1 ? ' (llena)' : ''}`);
    setText(basketAcornText, ` +${basket.acorns}`);
    setClass(basketAcorns, 'hidden', basket.acorns <= 0);
    setStyleProp(basketFill, 'width', `${(basket.fill * 100).toFixed(1)}%`);
    setDisabled(basketButton, basket.value.lte(0) && basket.acorns <= 0);
    setClass(basketBlock, 'hidden', head.income.lte(0) && basket.acorns <= 0);

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
