// Vista "Cueva": el mini mundo del Dragoncito. Brasas (su propia moneda), hornos que las producen y un
// árbol de ventajas por ramas que ayuda un poco al juego principal. Las filas se crean una vez (el
// contenido es fijo) y solo se actualizan, para que ningún clic se pierda. Ver docs/06-mina.md.

import { buyCaveNode, buyFurnace, caveBlow } from '../../core/actions.ts';
import { caveView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { h, setClass, setDisabled, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

export function mountCaveView(root: HTMLElement, ctx: UiContext): View {
  const embersText = document.createTextNode('');
  const rateText = document.createTextNode('');
  const bonusText = document.createTextNode('');
  const blowText = document.createTextNode('');
  const blowButton = h('button', { className: 'tap-button' }, [blowText]) as HTMLButtonElement;
  blowButton.addEventListener('click', () => ctx.dispatch((s) => void caveBlow(s, ctx.content)));

  const furnaceRows = ctx.content.cave.furnaces.map((f) => {
    const ownedText = document.createTextNode('');
    const prodText = document.createTextNode('');
    const costText = document.createTextNode('');
    const button = h('button', { className: 'buy-button' }, [costText]) as HTMLButtonElement;
    button.addEventListener('click', () => ctx.dispatch((s) => void buyFurnace(s, ctx.content, f.id)));
    const el = h('li', { className: 'generator-row' }, [
      h('div', { className: 'perk-info' }, [
        h('div', { className: 'generator-name-row' }, [h('span', { className: 'upgrade-name' }, [`${f.emoji} ${f.name}`]), h('span', { className: 'generator-owned' }, [ownedText])]),
        h('span', { className: 'generator-flavor' }, [f.flavor]),
        h('span', { className: 'upgrade-effect' }, [prodText]),
      ]),
      button,
    ]);
    return { id: f.id, el, ownedText, prodText, costText, button };
  });

  const nodeRows = ctx.content.cave.nodes.map((n) => {
    const stateText = document.createTextNode('');
    const costText = document.createTextNode('');
    const button = h('button', { className: 'buy-button' }, [costText]) as HTMLButtonElement;
    button.addEventListener('click', () => ctx.dispatch((s) => void buyCaveNode(s, ctx.content, n.id)));
    const el = h('li', { className: 'perk-row' }, [
      h('div', { className: 'perk-info' }, [h('span', { className: 'upgrade-name' }, [n.name]), h('span', { className: 'generator-flavor' }, [n.flavor]), h('span', { className: 'perk-locked' }, [stateText])]),
      button,
    ]);
    return { id: n.id, branch: n.branch, el, stateText, costText, button };
  });

  const branchBlocks = ctx.content.cave.branches.map((b) =>
    h('section', { className: 'album-set' }, [h('h3', {}, [`${b.emoji} ${b.name}`]), h('ul', { className: 'perk-list' }, nodeRows.filter((r) => r.branch === b.id).map((r) => r.el))]),
  );

  const container = h('div', { className: 'mine-view' }, [
    h('h3', { className: 'fly-heading' }, ['Cueva del Dragón']),
    h('p', { className: 'settings-hint' }, [embersText, ' · ', rateText]),
    blowButton,
    h('p', { className: 'settings-hint' }, [bonusText]),
    h('h3', { className: 'fly-heading' }, ['Hornos']),
    h('ul', { className: 'generator-list' }, furnaceRows.map((r) => r.el)),
    h('h3', { className: 'fly-heading' }, ['Ventajas del dragón']),
    ...branchBlocks,
  ]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const view = caveView(state, ctx.content);
    setText(embersText, `🔥 ${formatNumber(view.embers, notation)} brasas`);
    setText(rateText, `+${formatNumber(view.perSecond, notation)}/s`);
    setText(blowText, view.blowReady ? `Soplar (+${formatNumber(view.blowGain, notation)})` : 'Soplar…');
    setDisabled(blowButton, !view.blowReady);
    setText(bonusText, `La cueva da ×${view.prodBonus.toFixed(2)} a la producción del juego principal. Las brasas no se pierden al ascender.`);
    for (const row of furnaceRows) {
      const f = view.furnaces.find((x) => x.id === row.id)!;
      setText(row.ownedText, `×${f.owned}`);
      setText(row.prodText, `Cada uno da ${formatNumber(f.each, notation)} brasas/s`);
      setText(row.costText, `Comprar (${formatNumber(f.cost, notation)})`);
      setDisabled(row.button, !f.canBuy);
    }
    for (const row of nodeRows) {
      const node = view.branches.flatMap((b) => b.nodes).find((x) => x.id === row.id)!;
      setText(row.stateText, node.bought ? 'Conseguida' : node.lockedBy ? `Requiere: ${node.lockedBy}` : '');
      setText(row.costText, `${formatNumber(node.cost, notation)} 🔥`);
      setDisabled(row.button, !node.canBuy);
      setClass(row.button, 'hidden', node.bought);
      setClass(row.el, 'perk-row-locked', node.lockedBy !== null);
    }
  }

  return { update, destroy: () => container.remove() };
}
