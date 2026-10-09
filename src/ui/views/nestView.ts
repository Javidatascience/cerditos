// Vista "Nido": hasta tres nidos donde se incuban huevos (se compran con bellotas), eclosionan con el
// tiempo y las crías evolucionan alimentándolas con bellotas. Una criatura adulta da logro y reliquia y se
// puede retirar para liberar el nido. Se repinta solo cuando cambia algo (los botones no se recrean cada
// 250 ms y ningún clic se pierde); las cuentas atrás se actualizan aparte. Ver docs/06-mina.md.

import { boostCreature, buyEgg, feedCreature, hatchEgg, removeCreature } from '../../core/actions.ts';
import { nestView, type NestView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { artSprite } from '../art.ts';
import { h, setClass, setText } from '../dom.ts';
import { formatDuration, formatNumber } from '../format.ts';

export function mountNestView(root: HTMLElement, ctx: UiContext): View {
  const introText = document.createTextNode('');
  const slotList = h('div', { className: 'nest-slots' });
  const eggList = h('ul', { className: 'cosmetic-list' });
  const albumRow = h('div', { className: 'nest-album' });
  const body = h('div', {}, [
    h('h3', { className: 'fly-heading' }, ['Nidos']),
    slotList,
    h('h3', { className: 'fly-heading' }, ['Huevos']),
    h('p', { className: 'settings-hint' }, ['Un huevo tarda un rato en poder eclosionar. Después, las crías crecen comiendo bellotas.']),
    eggList,
    h('h3', { className: 'fly-heading' }, ['Álbum']),
    albumRow,
  ]);
  const container = h('div', { className: 'cosmetics-view' }, [h('h3', { className: 'fly-heading' }, ['Nido']), h('p', { className: 'settings-hint' }, [introText]), body]);
  root.appendChild(container);

  let lastKey = '';
  const countdowns = new Map<number, Text>();
  const boostCounts = new Map<number, Text>();

  function acornLabel(text: string): (string | HTMLElement)[] {
    return [`${text} `, artSprite('ui', 'bellota', 'sm')];
  }

  function button(label: (string | HTMLElement)[], onClick: () => void, disabled = false, secondary = false): HTMLButtonElement {
    const btn = h('button', { className: secondary ? 'amount-button' : 'buy-button' }, label) as HTMLButtonElement;
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function build(view: NestView, notation: GameState['settings']['notation']): void {
    countdowns.clear();
    boostCounts.clear();
    slotList.replaceChildren(
      ...view.slots.map((s) => {
        if (!s.usable) {
          return h('div', { className: 'nest-slot nest-slot-locked' }, [
            artSprite('ui', 'nav-nido', 'lg'),
            h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, ['Nido bloqueado']), h('span', { className: 'generator-flavor' }, ['Se consigue con las ventajas de la zona Nido, en Ascender.'])]),
          ]);
        }
        if (s.creatureId === null) {
          return h('div', { className: 'nest-slot' }, [
            artSprite('ui', 'nav-nido', 'lg'),
            h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, ['Nido libre']), h('span', { className: 'generator-flavor' }, ['Compra un huevo y se pondrá aquí.'])]),
          ]);
        }
        const count = document.createTextNode('');
        countdowns.set(s.index, count);
        const actions: HTMLElement[] = [];
        if (s.stage === 0) {
          actions.push(s.canHatch ? button(['Eclosionar'], () => ctx.dispatch((st) => void hatchEgg(st, ctx.content, s.index, Date.now()))) : h('span', { className: 'settings-hint' }, [count]));
        } else if (s.feedCost !== null) {
          actions.push(button(['Alimentar (', ...acornLabel(String(s.feedCost)), ')'], () => ctx.dispatch((st) => void feedCreature(st, ctx.content, s.index)), !s.canFeed));
        } else {
          const left = document.createTextNode('');
          boostCounts.set(s.index, left);
          actions.push(
            h('span', { className: 'settings-hint' }, ['¡Adulta! ', s.boost?.text ? `Ofrenda: ${s.boost.text}.` : '']),
            h('span', { className: 'upgrade-effect' }, [left]),
            h('div', { className: 'amount-row' }, [
              button(['Ofrenda (', ...acornLabel(String(s.boost?.cost ?? 0)), ')'], () => ctx.dispatch((st) => void boostCreature(st, ctx.content, s.index)), !s.boost?.canGive),
              button(['Retirar'], () => ctx.dispatch((st) => void removeCreature(st, ctx.content, s.index)), false, true),
            ]),
          );
        }
        return h('div', { className: 'nest-slot' }, [
          artSprite('creatures', s.spriteId!, 'lg'),
          h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [s.stageName]), h('span', { className: 'generator-flavor' }, [s.flavor]), ...actions]),
        ]);
      }),
    );

    eggList.replaceChildren(
      ...view.eggs.map((egg) =>
        h('li', { className: 'cosmetic-row' }, [
          h('div', { className: 'row-art' }, [artSprite('creatures', `${egg.id}-0`, 'md'), h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [egg.stageName])])]),
          button(['Comprar (', ...acornLabel(String(egg.cost)), ')'], () => view.freeSlot !== null && ctx.dispatch((st) => void buyEgg(st, ctx.content, egg.id, view.freeSlot!, Date.now())), !egg.canBuy),
        ]),
      ),
    );

    albumRow.replaceChildren(
      ...ctx.content.nest.creatures.map((c) => {
        const done = view.adults.includes(c.id);
        const el = h('div', { className: done ? 'nest-album-item' : 'nest-album-item nest-album-locked' }, [done ? artSprite('creatures', `${c.id}-3`, 'md') : h('span', { className: 'nest-album-mark' }, ['?']), h('span', {}, [done ? c.stages[3]!.name : '???'])]);
        return el;
      }),
    );
    void notation;
  }

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const view = nestView(state, ctx.content, Date.now());
    setClass(body, 'hidden', !view.unlocked);
    if (!view.unlocked) {
      setText(introText, `El nido se abre al conseguir ${view.unlockPlumas} esmeraldas en total (llevas ${formatNumber(view.plumas, notation)}). Las esmeraldas se consiguen ascendiendo.`);
      return;
    }
    setText(introText, 'Cría criaturas con bellotas. Las adultas se anotan para siempre y dan un logro y una reliquia; después puedes retirarlas para criar otra.');
    const key = JSON.stringify({ ...view, plumas: undefined, slots: view.slots.map((s) => ({ ...s, hatchLeftSeconds: 0, boost: s.boost && { ...s.boost, secondsLeft: s.boost.secondsLeft > 0 ? 1 : 0 } })), acorns: state.acorns });
    if (key !== lastKey) {
      lastKey = key;
      build(view, notation);
    }
    for (const s of view.slots) {
      const text = countdowns.get(s.index);
      if (text) setText(text, `Eclosiona en ${formatDuration(s.hatchLeftSeconds)}`);
      const boostText = boostCounts.get(s.index);
      if (boostText) setText(boostText, s.boost && s.boost.secondsLeft > 0 ? `Bono activo: quedan ${formatDuration(s.boost.secondsLeft)}` : '');
    }
  }

  return { update, destroy: () => container.remove() };
}
