// Vista "Ventajas": las ventajas permanentes en lista, con su coste, nivel, efecto actual → siguiente
// y el requisito si está bloqueada. Se sincroniza por clave (dom.ts > createListSync) para que los
// botones no se recreen y un clic nunca se pierda. Ver docs/06-mina.md.

import { buyPerk } from '../../core/actions.ts';
import { perkViews, type PerkView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { createListSync, h, setClass, setDisabled, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

type PerkRow = PerkView & { costText: string };

export function mountPerksView(root: HTMLElement, ctx: UiContext): View {
  const list = h('ul', { className: 'perk-list' });
  const container = h('div', { className: 'perks-view' }, [list]);
  root.appendChild(container);

  const sync = createListSync<PerkRow>(
    list,
    (perk) => perk.id,
    (perk) => {
      const nameText = document.createTextNode(perk.name);
      const levelText = document.createTextNode('');
      const effectText = document.createTextNode('');
      const lockedText = document.createTextNode('');
      const costText = document.createTextNode('');
      const buyButton = h('button', { className: 'buy-button' }, [costText]) as HTMLButtonElement;
      buyButton.addEventListener('click', () => ctx.dispatch((s) => void buyPerk(s, ctx.content, perk.id)));
      const maxedText = h('span', { className: 'settings-hint hidden' }, ['Al máximo']);
      const lockedLine = h('span', { className: 'perk-locked' }, [lockedText]);
      const el = h('li', { className: 'perk-row' }, [
        h('div', { className: 'perk-info' }, [
          h('div', { className: 'generator-name-row' }, [h('span', { className: 'upgrade-name' }, [nameText]), h('span', { className: 'generator-owned' }, [levelText])]),
          h('span', { className: 'generator-flavor' }, [perk.flavor]),
          h('span', { className: 'upgrade-effect' }, [effectText]),
          lockedLine,
        ]),
        buyButton,
        maxedText,
      ]);
      return {
        el,
        update: (p) => {
          setText(levelText, p.maxLevel === null ? `nivel ${p.level}` : `nivel ${p.level}/${p.maxLevel}`);
          setText(effectText, p.nextEffectText ? `${p.currentEffectText} → ${p.nextEffectText}` : `${p.currentEffectText} (máximo)`);
          const locked = p.missingRequirements.length > 0;
          setText(lockedText, locked ? `Requiere: ${p.missingRequirements.join(', ')}` : '');
          setClass(lockedLine, 'hidden', !locked);
          setClass(el, 'perk-row-locked', locked);
          setText(costText, p.costText);
          setDisabled(buyButton, !p.purchasable);
          setClass(buyButton, 'hidden', p.maxed);
          setClass(maxedText, 'hidden', !p.maxed);
        },
      };
    },
  );

  function update(state: GameState): void {
    const notation = state.settings.notation;
    sync(perkViews(state, ctx.content).map((p) => ({ ...p, costText: `${formatNumber(p.cost, notation)} plumas` })));
  }

  return { update, destroy: () => container.remove() };
}
