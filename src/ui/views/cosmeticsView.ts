// Vista "Cerdito": pieles y compañeros (se pagan con bellotas, la moneda que da el cerdito viajero, o
// los regala un logro) y las reliquias (bonos permanentes que dan algunos logros). Todo es opcional:
// las pieles y los compañeros son de adorno. Ver docs/06-mina.md.

import { buyCompanion, buySkin, equipSkin, MAX_ACTIVE_COMPANIONS, toggleCompanion } from '../../core/actions.ts';
import { cosmeticViews, type CosmeticView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { emojiBadge, pigIcon } from '../art.ts';
import { h, setText } from '../dom.ts';

export function mountCosmeticsView(root: HTMLElement, ctx: UiContext): View {
  const acornsText = document.createTextNode('');
  const skinList = h('ul', { className: 'cosmetic-list' });
  const companionList = h('ul', { className: 'cosmetic-list' });
  const relicList = h('ul', { className: 'cosmetic-list' });
  const container = h('div', { className: 'cosmetics-view' }, [
    h('p', { className: 'acorn-line' }, [acornsText]),
    h('p', { className: 'settings-hint' }, ['Las bellotas te las da siempre el cerdito viajero cuando lo aceptas. Sirven para pieles y compañeros.']),
    h('h3', { className: 'fly-heading' }, ['Pieles']),
    skinList,
    h('h3', { className: 'fly-heading' }, ['Compañeros']),
    h('p', { className: 'settings-hint' }, [`Acompañan al cerdito en la escena (hasta ${MAX_ACTIVE_COMPANIONS} a la vez). Más adelante cada uno traerá su propio minijuego.`]),
    companionList,
    h('h3', { className: 'fly-heading' }, ['Reliquias']),
    h('p', { className: 'settings-hint' }, ['Bonos permanentes que da un logro concreto. No se compran.']),
    relicList,
  ]);
  root.appendChild(container);

  function actionButton(label: string, onClick: () => void, disabled = false, secondary = false): HTMLButtonElement {
    const btn = h('button', { className: secondary ? 'amount-button' : 'buy-button' }, [label]) as HTMLButtonElement;
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function costLine(item: CosmeticView): string {
    if (item.owned) return '';
    if (item.cost !== null) return `${item.cost} 🌰`;
    return `Logro: ${item.achievementName ?? '?'}`;
  }

  // Se repinta solo si cambia algo (si no, los botones se recrearían cada 250 ms y un clic se perdería).
  let lastKey = '';
  function update(state: GameState): void {
    const views = cosmeticViews(state, ctx.content);
    const key = JSON.stringify(views);
    if (key === lastKey) return;
    lastKey = key;
    setText(acornsText, `🌰 Bellotas: ${views.acorns}`);

    skinList.replaceChildren(
      ...views.skins.map((skin) => {
        const action = skin.equipped
          ? h('span', { className: 'settings-hint' }, ['Puesta'])
          : skin.owned
            ? actionButton('Ponérsela', () => ctx.dispatch((s) => void equipSkin(s, ctx.content, skin.id)), false, true)
            : skin.cost !== null
              ? actionButton(`Comprar (${skin.cost} 🌰)`, () => ctx.dispatch((s) => void buySkin(s, ctx.content, skin.id)), !skin.canBuy)
              : h('span', { className: 'perk-locked' }, [costLine(skin)]);
        return h('li', { className: skin.owned ? 'cosmetic-row' : 'cosmetic-row cosmetic-row-locked' }, [
          h('div', { className: 'row-art' }, [pigIcon(skin.color ?? '#f4c7c3', 'none', !skin.owned), h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [skin.name]), h('span', { className: 'generator-flavor' }, [skin.flavor])])]),
          action,
        ]);
      }),
    );

    companionList.replaceChildren(
      ...views.companions.map((c) => {
        const action = c.equipped
          ? actionButton('Quitar', () => ctx.dispatch((s) => void toggleCompanion(s, ctx.content, c.id)), false, true)
          : c.owned
            ? actionButton('Llevar', () => ctx.dispatch((s) => void toggleCompanion(s, ctx.content, c.id)))
            : c.cost !== null
              ? actionButton(`Comprar (${c.cost} 🌰)`, () => ctx.dispatch((s) => void buyCompanion(s, ctx.content, c.id)), !c.canBuy)
              : h('span', { className: 'perk-locked' }, [costLine(c)]);
        return h('li', { className: c.owned ? 'cosmetic-row' : 'cosmetic-row cosmetic-row-locked' }, [
          h('div', { className: 'row-art' }, [emojiBadge(c.emoji ?? '🐾', !c.owned), h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [c.name]), h('span', { className: 'generator-flavor' }, [c.flavor])])]),
          action,
        ]);
      }),
    );

    relicList.replaceChildren(
      ...views.relics.map((r) =>
        h('li', { className: r.owned ? 'cosmetic-row' : 'cosmetic-row cosmetic-row-locked' }, [
          h('div', { className: 'row-art' }, [
            emojiBadge(r.emoji, !r.owned),
            h('div', { className: 'upgrade-info' }, [
              h('span', { className: 'upgrade-name' }, [r.owned ? r.name : '???']),
              h('span', { className: 'generator-flavor' }, [r.owned ? r.flavor : `Se consigue con el logro: ${r.achievementName}`]),
              h('span', { className: 'upgrade-effect' }, [r.owned ? r.effectText : r.effectText]),
            ]),
          ]),
        ]),
      ),
    );
  }

  return { update, destroy: () => container.remove() };
}
