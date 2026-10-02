// Vista "Ventajas": árbol de ventajas permanentes en lista, con coste, nivel, efecto actual
// → siguiente, y el requisito si está bloqueada. Ver docs/01-diseno-juego.md §6.

import { buyPerk } from '../../core/actions.ts';
import { perkViews } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { h, setClass, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

export function mountPerksView(root: HTMLElement, ctx: UiContext): View {
  const worldId = ctx.activeWorld();
  const world = ctx.content.worlds.find((w) => w.id === worldId);
  if (!world) throw new Error(`Mundo desconocido: ${worldId}`);

  const list = h('ul', { className: 'perk-list' });
  const container = h('div', { className: 'perks-view' }, [list]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const views = perkViews(state, ctx.content, worldId);

    list.replaceChildren(
      ...views.map((perk) => {
        const buyButton = h('button', { className: 'buy-button' }, [formatNumber(perk.cost, notation)]) as HTMLButtonElement;
        buyButton.disabled = !perk.purchasable;
        buyButton.addEventListener('click', () => ctx.dispatch((s) => void buyPerk(s, ctx.content, perk.id)));

        const levelText = perk.maxLevel === null ? `nivel ${perk.level}` : `nivel ${perk.level}/${perk.maxLevel}`;
        const effectText = perk.nextEffectText ? `${perk.currentEffectText} → ${perk.nextEffectText}` : `${perk.currentEffectText} (máximo)`;

        const row = h('li', { className: 'perk-row' }, [
          h('div', { className: 'perk-info' }, [
            h('div', { className: 'generator-name-row' }, [h('span', { className: 'upgrade-name' }, [perk.name]), h('span', { className: 'generator-owned' }, [levelText])]),
            h('span', { className: 'generator-flavor' }, [perk.flavor]),
            h('span', { className: 'upgrade-effect' }, [effectText]),
            perk.missingRequirements.length > 0 ? h('span', { className: 'perk-locked' }, [`Requiere: ${perk.missingRequirements.join(', ')}`]) : null,
          ].filter((n): n is HTMLElement => n !== null)),
          perk.maxed ? h('span', { className: 'settings-hint' }, ['Al máximo']) : buyButton,
        ]);
        setClass(row, 'perk-row-locked', perk.missingRequirements.length > 0);
        return row;
      }),
    );
  }

  return {
    update,
    destroy: () => container.remove(),
  };
}
