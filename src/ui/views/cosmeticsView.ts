// Vista "Cerdito": los compañeros (hacen algo útil en el fondo) y el aspecto del cerdito en cuatro
// secciones: color (pieles), gorro, ropa y cola. Todo se paga con bellotas (la moneda que da el cerdito
// viajero) o lo regala un logro. Las reliquias están en la pestaña Logros. Ver docs/06-mina.md.

import { buyAccessory, buyCompanion, buySkin, equipSkin, toggleCompanion, upgradeCompanion, wearAccessory } from '../../core/actions.ts';
import { cosmeticViews, type AccessoryView, type CosmeticView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { artSprite, pigSprite, pigStack, spriteBadge, type PigLook } from '../art.ts';
import { h, setText } from '../dom.ts';

type Section = 'color' | 'head' | 'body' | 'tail';
const SECTIONS: { id: Section; label: string; none: string }[] = [
  { id: 'color', label: 'Color', none: '' },
  { id: 'head', label: 'Gorro', none: 'Sin gorro' },
  { id: 'body', label: 'Ropa', none: 'Sin ropa' },
  { id: 'tail', label: 'Cola', none: 'Cola normal' },
];

export function mountCosmeticsView(root: HTMLElement, ctx: UiContext): View {
  const acornsText = document.createTextNode('');
  const companionHint = document.createTextNode('');
  const companionList = h('ul', { className: 'cosmetic-list' });
  const lookPreview = h('div', { className: 'look-preview' });
  const lookList = h('ul', { className: 'cosmetic-list' });
  let section: Section = 'color';
  let lastState: GameState | null = null;
  let lastKey = '';

  // Pista de bienvenida: la primera vez, invita a comprar al topo y llevarlo. Se recuerda en localStorage
  // (es una preferencia de la interfaz, no del guardado) y se quita sola cuando ya lo llevas.
  const HINT_KEY = 'cerditos:hint-topo';
  const hintSeen = (): boolean => {
    try {
      return window.localStorage.getItem(HINT_KEY) === '1';
    } catch {
      return false;
    }
  };
  const markHintSeen = (): void => {
    try {
      window.localStorage.setItem(HINT_KEY, '1');
    } catch {
      // sin almacenamiento: la pista volverá a salir, no pasa nada
    }
  };
  const hintBox = h('div', { className: 'hint-box hidden' }, [
    h('span', {}, ['Empieza por aquí: compra al topo y equípalo. Desentierra bellotas mientras picas.']),
    h('button', { className: 'amount-button', onclick: () => { markHintSeen(); hintBox.classList.add('hidden'); } }, ['Entendido']),
  ]);

  // Secciones del aspecto (color, gorro, ropa, cola)
  const sectionButtons = SECTIONS.map((s) => {
    const btn = h('button', { className: 'amount-button' }, [s.label]) as HTMLButtonElement;
    btn.addEventListener('click', () => {
      section = s.id;
      lastKey = '';
      if (lastState) update(lastState);
    });
    return [s.id, btn] as const;
  });

  const container = h('div', { className: 'cosmetics-view' }, [
    hintBox,
    h('p', { className: 'acorn-line' }, [artSprite('ui', 'bellota', 'sm'), acornsText]),
    h('p', { className: 'settings-hint' }, ['Las bellotas te las da siempre el cerdito viajero cuando lo aceptas (y el topo, si lo llevas). Sirven para compañeros, sus mejoras y el aspecto del cerdito.']),
    h('h3', { className: 'fly-heading' }, ['Compañeros']),
    h('p', { className: 'settings-hint' }, [companionHint]),
    companionList,
    h('h3', { className: 'fly-heading' }, ['Aspecto']),
    lookPreview,
    h('div', { className: 'amount-row look-tabs' }, sectionButtons.map(([, b]) => b)),
    lookList,
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

  function costLine(item: { cost: number | null; achievementName: string | null }): HTMLElement {
    if (item.cost !== null) return h('span', { className: 'perk-locked' }, withAcorn(String(item.cost)));
    return h('span', { className: 'perk-locked' }, [`Logro: ${item.achievementName ?? '?'}`]);
  }

  function skinRow(skin: CosmeticView): HTMLElement {
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
  }

  function accessoryRow(a: AccessoryView, skin: string): HTMLElement {
    const slot = a.slot;
    const action = a.worn
      ? actionButton('Quitar', () => ctx.dispatch((s) => void wearAccessory(s, ctx.content, slot, null)), false, true)
      : a.owned
        ? actionButton('Ponérselo', () => ctx.dispatch((s) => void wearAccessory(s, ctx.content, slot, a.id)))
        : a.cost !== null
          ? actionButton(['Comprar (', ...withAcorn(String(a.cost)), ')'], () => ctx.dispatch((s) => void buyAccessory(s, ctx.content, a.id)), !a.canBuy)
          : costLine(a);
    const look: PigLook = { skin, head: null, body: null, tail: null };
    look[slot] = a.id;
    return h('li', { className: a.owned ? 'cosmetic-row' : 'cosmetic-row cosmetic-row-locked' }, [
      h('div', { className: 'row-art' }, [pigStack(look, 'sm'), h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [a.name]), h('span', { className: 'generator-flavor' }, [a.flavor])])]),
      action,
    ]);
  }

  // Se repinta solo si cambia algo (si no, los botones se recrearían cada 250 ms y un clic se perdería).
  function update(state: GameState): void {
    lastState = state;
    const views = cosmeticViews(state, ctx.content);
    const key = JSON.stringify([views, section]);
    if (key === lastKey) return;
    lastKey = key;
    setText(acornsText, ` Bellotas: ${views.acorns}`);
    setText(companionHint, `Acompañan al cerdito en la escena (hasta ${views.maxActive} a la vez). Cada uno hace algo en el fondo mientras lo llevas.`);
    const topoEquipped = views.companions.some((c) => c.id === 'topo' && c.equipped);
    if (topoEquipped) markHintSeen();
    hintBox.classList.toggle('hidden', hintSeen() || topoEquipped);

    for (const [id, btn] of sectionButtons) btn.classList.toggle('active', id === section);
    lookPreview.replaceChildren(pigStack(views.look, 'lg'));

    if (section === 'color') {
      lookList.replaceChildren(...views.skins.map(skinRow));
    } else {
      const slot = section;
      const info = SECTIONS.find((s) => s.id === slot)!;
      const none = h('li', { className: 'cosmetic-row' }, [
        h('div', { className: 'row-art' }, [pigStack({ skin: views.look.skin, head: null, body: null, tail: null }, 'sm'), h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [info.none])])]),
        views.look[slot] === null ? h('span', { className: 'settings-hint' }, ['Puesto']) : actionButton('Ponerlo', () => ctx.dispatch((s) => void wearAccessory(s, ctx.content, slot, null)), false, true),
      ]);
      lookList.replaceChildren(none, ...views.accessories.filter((a) => a.slot === slot).map((a) => accessoryRow(a, views.look.skin)));
    }

    companionList.replaceChildren(
      ...views.companions.map((c) => {
        const action = c.equipped
          ? actionButton('Quitar', () => ctx.dispatch((s) => void toggleCompanion(s, ctx.content, c.id, Date.now())), false, true)
          : c.owned
            ? actionButton('Llevar', () => ctx.dispatch((s) => void toggleCompanion(s, ctx.content, c.id, Date.now())))
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
              ? [actionButton(['Mejorar (', ...withAcorn(String(c.upgradeCost)), ')'], () => ctx.dispatch((s) => void upgradeCompanion(s, ctx.content, c.id, Date.now())), !c.canUpgrade, true)]
              : []),
          ]),
        ]);
      }),
    );
  }

  return { update, destroy: () => container.remove() };
}
