// Vista "Cerdito": compañeros y pieles (se pagan con bellotas, la moneda que da el cerdito viajero, o
// los regala un logro) y las reliquias (bonos permanentes que dan algunos logros). Los compañeros
// hacen algo útil en el fondo; las pieles son de adorno. Ver docs/06-mina.md.

import { buyCompanion, buySkin, equipSkin, MAX_ACTIVE_COMPANIONS, toggleCompanion, upgradeCompanion } from '../../core/actions.ts';
import { cosmeticViews, type CosmeticView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { artSprite, pigSprite, spriteBadge } from '../art.ts';
import { h, setText } from '../dom.ts';

export function mountCosmeticsView(root: HTMLElement, ctx: UiContext): View {
  const acornsText = document.createTextNode('');
  const skinList = h('ul', { className: 'cosmetic-list' });
  const companionList = h('ul', { className: 'cosmetic-list' });
  const relicList = h('ul', { className: 'cosmetic-list' });
  const container = h('div', { className: 'cosmetics-view' }, [
    h('p', { className: 'acorn-line' }, [artSprite('ui', 'bellota', 'sm'), acornsText]),
    h('p', { className: 'settings-hint' }, ['Las bellotas te las da siempre el cerdito viajero cuando lo aceptas (y el topo, si lo llevas). Sirven para compañeros, sus mejoras y pieles.']),
    h('h3', { className: 'fly-heading' }, ['Compañeros']),
    h('p', { className: 'settings-hint' }, [`Acompañan al cerdito en la escena (hasta ${MAX_ACTIVE_COMPANIONS} a la vez). Cada uno hace algo en el fondo mientras lo llevas.`]),
    companionList,
    h('h3', { className: 'fly-heading' }, ['Pieles']),
    skinList,
    h('h3', { className: 'fly-heading' }, ['Reliquias']),
    h('p', { className: 'settings-hint' }, ['Bonos permanentes que da un logro concreto. No se compran.']),
    relicList,
  ]);
  root.appendChild(container);

  /** Texto con una bellota (sprite) al final, para precios. */
  function withAcorn(text: string): (string | HTMLElement)[] {
    return [`${text} `, artSprite('ui', 'bellota', 'sm')];
  }

  function actionButton(label: (string | HTMLElement)[] | string, onClick: () => void, disabled = false, secondary = false): HTMLButtonElement {
    const btn = h('button', { className: secondary ? 'amount-button' : 'buy-button' }, Array.isArray(label) ? label : [label]) as HTMLButtonElement;
    btn.disabled = disabled;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function costLine(item: CosmeticView): HTMLElement {
    if (item.cost !== null) return h('span', { className: 'perk-locked' }, withAcorn(String(item.cost)));
    return h('span', { className: 'perk-locked' }, [`Logro: ${item.achievementName ?? '?'}`]);
  }

  // Se repinta solo si cambia algo (si no, los botones se recrearían cada 250 ms y un clic se perdería).
  let lastKey = '';
  function update(state: GameState): void {
    const views = cosmeticViews(state, ctx.content);
    const key = JSON.stringify(views);
    if (key === lastKey) return;
    lastKey = key;
    setText(acornsText, ` Bellotas: ${views.acorns}`);

    skinList.replaceChildren(
      ...views.skins.map((skin) => {
        const action = skin.equipped
          ? h('span', { className: 'settings-hint' }, ['Puesta'])
          : skin.owned
            ? actionButton('Ponérsela', () => ctx.dispatch((s) => void equipSkin(s, ctx.content, skin.id)), false, true)
            : skin.cost !== null
              ? actionButton(['Comprar (', ...withAcorn(String(skin.cost)), ')'], () => ctx.dispatch((s) => void buySkin(s, ctx.content, skin.id)), !skin.canBuy)
              : costLine(skin);
        return h('li', { className: skin.owned ? 'cosmetic-row' : 'cosmetic-row cosmetic-row-locked' }, [
          h('div', { className: 'row-art' }, [pigSprite(skin.id, !skin.owned), h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [skin.name]), h('span', { className: 'generator-flavor' }, [skin.flavor])])]),
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
              ? actionButton(['Comprar (', ...withAcorn(String(c.cost)), ')'], () => ctx.dispatch((s) => void buyCompanion(s, ctx.content, c.id)), !c.canBuy)
              : costLine(c);
        return h('li', { className: c.owned ? 'cosmetic-row' : 'cosmetic-row cosmetic-row-locked' }, [
          h('div', { className: 'row-art' }, [
            spriteBadge('companions', c.id, !c.owned),
            h('div', { className: 'upgrade-info' }, [
              h('span', { className: 'upgrade-name' }, [c.maxLevel > 0 && c.owned ? `${c.name} (nivel ${c.level}/${c.maxLevel})` : c.name]),
              h('span', { className: 'generator-flavor' }, [c.flavor]),
              h('span', { className: 'upgrade-effect' }, [c.abilityText]),
            ]),
          ]),
          h('div', { className: 'cosmetic-actions' }, [
            action,
            ...(c.owned && c.upgradeCost !== null
              ? [actionButton(['Mejorar (', ...withAcorn(String(c.upgradeCost)), ')'], () => ctx.dispatch((s) => void upgradeCompanion(s, ctx.content, c.id)), !c.canUpgrade, true)]
              : []),
          ]),
        ]);
      }),
    );

    relicList.replaceChildren(
      ...views.relics.map((r) =>
        h('li', { className: r.owned ? 'cosmetic-row' : 'cosmetic-row cosmetic-row-locked' }, [
          h('div', { className: 'row-art' }, [
            spriteBadge('relics', r.id, !r.owned),
            h('div', { className: 'upgrade-info' }, [
              h('span', { className: 'upgrade-name' }, [r.owned ? r.name : '???']),
              h('span', { className: 'generator-flavor' }, [r.owned ? r.flavor : `Se consigue con el logro: ${r.achievementName}`]),
              h('span', { className: 'upgrade-effect' }, [r.effectText]),
            ]),
          ]),
        ]),
      ),
    );
  }

  return { update, destroy: () => container.remove() };
}
