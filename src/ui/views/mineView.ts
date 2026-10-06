// Vista "Mina": el cerdito minero cavando (nivel, zona, bloque con su barra de vida), el botón de
// picar, la dinamita, los materiales, la cesta y la lista de piezas. Todo el cálculo viene de
// core/selectors.ts. Las listas se sincronizan por clave (dom.ts > createListSync) para que los
// botones no se recreen cada 250 ms y un clic nunca se pierda. Ver docs/06-mina.md.

import { buyPiece, collectBasket, setBuyAmount, setFarmZone, tap, useBurst, type BuyAmount } from '../../core/actions.ts';
import { basketView, burstStatus, mineView, pieceViews, type PieceView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { emojiBadge, minerPig } from '../art.ts';
import { createListSync, h, setClass, setDisabled, setStyleProp, setText } from '../dom.ts';
import { formatDuration, formatNumber, type Notation } from '../format.ts';

const AMOUNTS: BuyAmount[] = [1, 10, 'max'];

type PieceRow = PieceView & { costText: string; effectText: string; nextText: string };

function effectTexts(view: PieceView, notation: Notation): { now: string; next: string } {
  const e = view.effect;
  const n = (x: number) => formatNumber(x, notation);
  const pct = (x: number) => `${Math.round(x * 100)} %`;
  switch (e.kind) {
    case 'dig':
      return { now: `+${n(e.value)} de cavado`, next: `+${n(e.nextValue)}` };
    case 'helper':
      return { now: `+${n(e.value)} de cavado (ayuda)`, next: `+${n(e.nextValue)}` };
    case 'digMult':
      return { now: `cavado ×${(1 + e.value).toFixed(2)}`, next: `×${(1 + e.nextValue).toFixed(2)}` };
    case 'tap':
      return { now: `cada pico ×${(1 + e.value).toFixed(2)}`, next: `×${(1 + e.nextValue).toFixed(2)}` };
    case 'coinMult':
      return { now: `monedas +${pct(e.value)}`, next: `+${pct(e.nextValue)}` };
    case 'materialMult':
      return { now: `materiales +${pct(e.value)}`, next: `+${pct(e.nextValue)}` };
    case 'burst':
      return { now: e.value > 0 ? `${n(e.value)} s de cavado de golpe (cada ${formatDuration(e.cooldown ?? 0)})` : `cavado de golpe (cada ${formatDuration(e.cooldown ?? 0)})`, next: `${n(e.nextValue)} s` };
    case 'resist':
      return {
        now: `${e.hazardName}: ${Math.round((e.factor ?? 1) * 100)} % del cavado (nivel ${e.needLevel} lo anula)`,
        next: `nivel ${e.nextValue}`,
      };
  }
}

export function mountMineView(root: HTMLElement, ctx: UiContext): View {
  // --- Escena: cerdito + bloque ---
  const pigSlot = h('div', { className: 'mine-pig' });
  let pigSignature: string | null = null;
  let tapDamage = 0;
  const depthText = document.createTextNode('');
  const zoneText = document.createTextNode('');
  const flavorText = document.createTextNode('');
  const hpInner = h('div', { className: 'hp-bar-inner' });
  const hpText = document.createTextNode('');
  const dpsText = document.createTextNode('');
  const hazardText = document.createTextNode('');
  const hazardLine = h('p', { className: 'hazard-line hidden' }, [hazardText]);
  const floats = h('div', { className: 'float-layer' });
  const scene = h('div', { className: 'mine-scene' }, [
    h('div', { className: 'mine-head' }, [h('span', { className: 'mine-depth' }, [depthText]), h('span', { className: 'mine-zone' }, [zoneText])]),
    h('div', { className: 'mine-stage' }, [pigSlot, h('div', { className: 'mine-block', 'aria-hidden': 'true' }, ['🟫'])]),
    h('div', { className: 'hp-bar' }, [hpInner]),
    h('p', { className: 'mine-stats' }, [hpText, dpsText]),
    h('p', { className: 'generator-flavor' }, [flavorText]),
    hazardLine,
    floats,
  ]);
  const blockEmoji = scene.querySelector('.mine-block') as HTMLElement;

  function floatText(text: string): void {
    if (!ctx.effectsOn()) return;
    while (floats.childElementCount >= 6) floats.firstElementChild?.remove();
    const el = h('span', { className: 'float-text' }, [text]);
    el.style.left = `${30 + Math.random() * 40}%`;
    el.addEventListener('animationend', () => el.remove());
    floats.appendChild(el);
  }

  // --- Acciones ---
  const tapText = document.createTextNode('');
  const tapButton = h('button', { className: 'tap-button' }, [tapText]) as HTMLButtonElement;
  tapButton.addEventListener('click', () =>
    ctx.dispatch((state) => {
      const gained = tap(state, ctx.content);
      floatText(gained.gt(0) ? `+${formatNumber(gained, state.settings.notation)}` : `−${formatNumber(tapDamage, state.settings.notation)}`);
    }),
  );
  const burstText = document.createTextNode('');
  const burstButton = h('button', { className: 'buy-button burst-button hidden' }, [burstText]) as HTMLButtonElement;
  burstButton.addEventListener('click', () =>
    ctx.dispatch((state) => {
      const gained = useBurst(state, ctx.content);
      if (gained.gt(0)) floatText(`+${formatNumber(gained, state.settings.notation)}`);
    }),
  );

  // --- Zona en la que cavar ---
  const zoneButtons: HTMLButtonElement[] = ctx.content.zones.map((z, index) => {
    const btn = h('button', { className: 'zone-button', 'aria-label': z.name, title: z.name }, [z.emoji]) as HTMLButtonElement;
    btn.addEventListener('click', () => ctx.dispatch((state) => setFarmZone(state, ctx.content, state.farmZone === index ? null : index)));
    return btn;
  });
  const farmText = document.createTextNode('');
  const zoneBlock = h('div', { className: 'zone-block' }, [h('div', { className: 'zone-row' }, zoneButtons), h('p', { className: 'settings-hint' }, [farmText])]);

  // --- Materiales y cesta ---
  const materialsRow = h('div', { className: 'materials-row' });
  const basketText = document.createTextNode('');
  const basketFill = h('div', { className: 'progress-bar-inner' });
  const basketButton = h('button', { className: 'buy-button' }, ['Recoger']) as HTMLButtonElement;
  basketButton.addEventListener('click', () => ctx.dispatch((state) => void collectBasket(state, ctx.content)));
  const basketBlock = h('div', { className: 'basket-block' }, [
    h('div', { className: 'basket-info' }, [h('span', { className: 'basket-text' }, [basketText]), h('div', { className: 'progress-bar', role: 'presentation' }, [basketFill])]),
    basketButton,
  ]);

  // --- Piezas ---
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
  const pieceList = h('ul', { className: 'piece-list' });
  const syncPieces = createListSync<PieceRow>(
    pieceList,
    (p) => p.id,
    (piece) => {
      const nameText = document.createTextNode(piece.name);
      const levelText = document.createTextNode('');
      const effectText = document.createTextNode('');
      const costText = document.createTextNode('');
      const lockedText = document.createTextNode('');
      const buyButton = h('button', { className: 'buy-button' }, [costText]) as HTMLButtonElement;
      buyButton.addEventListener('click', () => ctx.dispatch((state) => void buyPiece(state, ctx.content, piece.id, state.settings.buyAmount)));
      const lockedLine = h('span', { className: 'perk-locked' }, [lockedText]);
      const el = h('li', { className: 'generator-row piece-row' }, [
        h('div', { className: 'row-art' }, [
          emojiBadge(piece.emoji),
          h('div', { className: 'generator-info' }, [
            h('div', { className: 'generator-name-row' }, [h('span', { className: 'generator-name' }, [nameText]), h('span', { className: 'generator-owned' }, [levelText])]),
            h('span', { className: 'generator-flavor' }, [piece.flavor]),
            h('span', { className: 'generator-prod' }, [effectText]),
            lockedLine,
          ]),
        ]),
        buyButton,
      ]);
      return {
        el,
        update: (p) => {
          setText(levelText, `nivel ${p.level}/${p.maxLevel}`);
          setText(effectText, `${p.effectText}${p.maxed ? '' : ` → ${p.nextText}`}${p.nextMilestone ? ` · ×${ctx.content.mine.milestoneMult} al nivel ${p.nextMilestone}` : ''}`);
          setText(lockedText, p.lockedReason ?? '');
          setClass(lockedLine, 'hidden', p.lockedReason === null);
          setClass(el, 'perk-row-locked', !p.unlocked);
          setText(costText, p.maxed ? 'Al máximo' : p.costText);
          setDisabled(buyButton, !p.canAfford);
          setClass(buyButton, 'hidden', !p.unlocked);
        },
      };
    },
  );

  const container = h('div', { className: 'mine-view' }, [scene, tapButton, burstButton, zoneBlock, materialsRow, basketBlock, h('h3', { className: 'fly-heading' }, ['Piezas del cerdito']), amountRow, pieceList]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const view = mineView(state, ctx.content);

    // Cerdito con los complementos de sus piezas (se repinta solo si cambian).
    const owned = ctx.content.pieces.filter((p) => (state.gear[p.id] ?? 0) > 0).map((p) => p.id);
    const signature = owned.join(',');
    if (signature !== pigSignature) {
      pigSignature = signature;
      pigSlot.replaceChildren(minerPig(owned));
    }

    setText(depthText, `Nivel ${formatNumber(view.depth, notation)}`);
    setText(zoneText, `${view.zoneEmoji} ${view.zoneName}`);
    setText(flavorText, view.zoneFlavor);
    blockEmoji.textContent = view.zoneEmoji;
    setStyleProp(hpInner, 'width', `${(view.blockFraction * 100).toFixed(1)}%`);
    setText(hpText, `Bloque: +${formatNumber(view.blockCoinsValue, notation)} ${view.materialEmoji}  `);
    setText(dpsText, `· cavas ${formatNumber(view.dps, notation)}/s${view.boostMult > 1 ? ` (×${view.boostMult})` : ''}`);
    setClass(hazardLine, 'hidden', view.hazard === null);
    if (view.hazard) {
      const hz = view.hazard;
      setText(
        hazardText,
        hz.factor >= 1
          ? `${hz.emoji} ${hz.name}: ya no te frena (${hz.pieceName}).`
          : `${hz.emoji} ${hz.name}: cavas al ${Math.round(hz.factor * 100)} %. ${hz.pieceName} nivel ${hz.pieceLevel}/${hz.needLevel} lo anula.`,
      );
    }

    tapDamage = view.tapDamage;
    setText(tapText, `Picar (${formatNumber(view.tapDamage, notation)} de cavado)`);

    const burst = burstStatus(state, ctx.content);
    setClass(burstButton, 'hidden', !burst.owned);
    setText(burstText, burst.ready ? '🧨 ¡Dinamita!' : `🧨 Dinamita en ${formatDuration(burst.secondsLeft)}`);
    setDisabled(burstButton, !burst.ready);

    view.zones.forEach((z, index) => {
      const btn = zoneButtons[index]!;
      btn.disabled = !z.reachable;
      setClass(btn, 'active', view.farmZone === z.index);
      setClass(btn, 'current', z.current);
    });
    setText(farmText, view.farmZone === null ? 'Avanzando por la mina. Toca una zona para quedarte cavando en ella y juntar sus materiales.' : `Cavando en ${ctx.content.zones[view.farmZone]!.name}. Vuelve a tocarla para seguir bajando.`);

    materialsRow.replaceChildren(
      ...view.materials.map((m) => h('span', { className: 'material-chip', title: m.name }, [`${m.emoji} ${formatNumber(m.amount, notation)}`])),
    );

    const basket = basketView(state, ctx.content);
    setText(basketText, `Cesta de la mina: ${formatNumber(basket.value, notation)}${basket.fill >= 1 ? ' (llena)' : ''}`);
    setStyleProp(basketFill, 'width', `${(basket.fill * 100).toFixed(1)}%`);
    setDisabled(basketButton, basket.value.lte(0));

    for (const [id, btn] of amountButtons) setClass(btn, 'active', id === state.settings.buyAmount);
    syncPieces(
      pieceViews(state, ctx.content).map((p) => {
        const texts = effectTexts(p, notation);
        const material = p.material ? ` + ${p.material.emoji} ${formatNumber(p.material.cost, notation)}` : '';
        const amount = p.amountToBuy > 1 ? ` ×${p.amountToBuy}` : '';
        return { ...p, effectText: texts.now, nextText: texts.next, costText: `Subir${amount} (${formatNumber(p.costCoins, notation)}${material})` };
      }),
    );
  }

  return { update, destroy: () => container.remove() };
}
