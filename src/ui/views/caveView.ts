// Vista "Cueva": el mini mundo del Dragoncito. Brasas (su propia moneda), hornos que las producen y un
// árbol de ventajas por ramas que ayuda un poco al juego principal. Las filas se crean una vez (el
// contenido es fijo) y solo se actualizan, para que ningún clic se pierda. Ver docs/06-mina.md.

import { buyCaveNode, buyFurnace, caveBlow, feedDragon } from '../../core/actions.ts';
import { caveEffectText, caveView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { artSprite, spriteBadge } from '../art.ts';
import { h, setClass, setDisabled, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

export function mountCaveView(root: HTMLElement, ctx: UiContext): View {
  const embersText = document.createTextNode('');
  const rateText = document.createTextNode('');
  const bonusText = document.createTextNode('');
  const blowText = document.createTextNode('');
  const blowButton = h('button', { className: 'tap-button' }, [blowText]) as HTMLButtonElement;
  blowButton.addEventListener('click', () => ctx.dispatch((s) => void caveBlow(s, ctx.content)));

  // El dragón: crece al alimentarlo con brasas y cada etapa da bonos.
  const dragonSlot = h('div', { className: 'dragon-slot' });
  let shownDragon = '';
  const dragonName = document.createTextNode('');
  const dragonFlavor = document.createTextNode('');
  const dragonBonus = document.createTextNode('');
  const feedCost = document.createTextNode('');
  const feedNext = document.createTextNode('');
  const feedButton = h('button', { className: 'buy-button' }, [feedNext, feedCost, artSprite('ui', 'brasa', 'sm'), ')']) as HTMLButtonElement;
  feedButton.addEventListener('click', () => ctx.dispatch((s) => void feedDragon(s, ctx.content)));
  const dragonCard = h('div', { className: 'dragon-card' }, [
    dragonSlot,
    h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [dragonName]), h('span', { className: 'generator-flavor' }, [dragonFlavor]), h('span', { className: 'upgrade-effect' }, [dragonBonus])]),
    feedButton,
  ]);

  const furnaceRows = ctx.content.cave.furnaces.map((f) => {
    const ownedText = document.createTextNode('');
    const prodText = document.createTextNode('');
    const costText = document.createTextNode('');
    const button = h('button', { className: 'buy-button' }, [costText]) as HTMLButtonElement;
    button.addEventListener('click', () => ctx.dispatch((s) => void buyFurnace(s, ctx.content, f.id)));
    const el = h('li', { className: 'generator-row' }, [
      spriteBadge('furnaces', f.id),
      h('div', { className: 'perk-info' }, [
        h('div', { className: 'generator-name-row' }, [h('span', { className: 'upgrade-name' }, [f.name]), h('span', { className: 'generator-owned' }, [ownedText])]),
        h('span', { className: 'generator-flavor' }, [f.flavor]),
        h('span', { className: 'upgrade-effect' }, [prodText]),
      ]),
      button,
    ]);
    return { id: f.id, el, ownedText, prodText, costText, button };
  });

  const nodeRows = ctx.content.cave.nodes.map((n) => {
    const stateText = document.createTextNode('');
    const effectText = caveEffectText(n.effect);
    const costText = document.createTextNode('');
    const button = h('button', { className: 'buy-button' }, [costText, artSprite('ui', 'brasa', 'sm')]) as HTMLButtonElement;
    button.addEventListener('click', () => ctx.dispatch((s) => void buyCaveNode(s, ctx.content, n.id)));
    const el = h('li', { className: 'perk-row' }, [
      h('div', { className: 'perk-info' }, [h('span', { className: 'upgrade-name' }, [n.name]), h('span', { className: 'generator-flavor' }, [n.flavor]), h('span', { className: 'upgrade-effect' }, [effectText]), h('span', { className: 'perk-locked' }, [stateText])]),
      button,
    ]);
    return { id: n.id, branch: n.branch, el, stateText, costText, button };
  });

  const branchBlocks = ctx.content.cave.branches.map((b) =>
    h('section', { className: 'album-set' }, [h('h3', { className: 'branch-heading' }, [artSprite('furnaces', `rama-${b.id}`, 'sm'), ` ${b.name}`]), h('ul', { className: 'perk-list' }, nodeRows.filter((r) => r.branch === b.id).map((r) => r.el))]),
  );

  const lockText = document.createTextNode('');
  const body = h('div', {}, [
    h('p', { className: 'ascend-plumas sticky-currency' }, [artSprite('ui', 'brasa', 'md'), embersText, h('span', { className: 'currency-rate' }, [rateText])]),
    dragonCard,
    blowButton,
    h('p', { className: 'settings-hint' }, [bonusText]),
    h('h3', { className: 'fly-heading' }, ['Hornos']),
    h('ul', { className: 'generator-list' }, furnaceRows.map((r) => r.el)),
    h('h3', { className: 'fly-heading' }, ['Ventajas del dragón']),
    ...branchBlocks,
  ]);
  const container = h('div', { className: 'mine-view' }, [h('div', { className: 'cave-title' }, [h('h3', { className: 'fly-heading' }, ['Cueva del Dragón'])]), h('p', { className: 'settings-hint' }, [lockText]), body]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const view = caveView(state, ctx.content);
    setClass(body, 'hidden', !view.unlocked);
    setText(lockText, view.unlocked ? '' : `La cueva se abre al conseguir ${view.unlockPlumas} esmeraldas en total (llevas ${formatNumber(view.plumas, notation)}). Las esmeraldas se consiguen ascendiendo.`);
    if (view.dragon.spriteId !== shownDragon) {
      shownDragon = view.dragon.spriteId;
      dragonSlot.replaceChildren(artSprite('cave', shownDragon, 'lg'));
    }
    setText(dragonName, view.dragon.name);
    setText(dragonFlavor, view.dragon.flavor);
    setText(dragonBonus, view.dragon.next ? `${view.dragon.bonusText} Al crecer (${view.dragon.next.name.toLowerCase()}): ${view.dragon.next.bonusText}.` : view.dragon.bonusText);
    setClass(feedButton, 'hidden', view.dragon.next === null);
    if (view.dragon.next) {
      setText(feedNext, 'Alimentar (');
      setText(feedCost, `${formatNumber(view.dragon.next.cost, notation)} `);
    }
    setDisabled(feedButton, !view.dragon.canFeed);
    setText(embersText, ` Brasas: ${formatNumber(view.embers, notation)}`);
    setText(rateText, `+${formatNumber(view.perSecond, notation)}/s`);
    setText(blowText, view.blowReady ? `Soplar (+${formatNumber(view.blowGain, notation)})` : 'Soplar…');
    setDisabled(blowButton, !view.blowReady);
    setText(bonusText, `La cueva da ×${view.prodBonus.toFixed(2)} a la producción del juego principal. Las brasas no se pierden al ascender.`);
    for (const row of furnaceRows) {
      const f = view.furnaces.find((x) => x.id === row.id)!;
      setText(row.ownedText, `×${f.owned}`);
      setText(row.prodText, `Cada uno da ${formatNumber(f.each, notation)} brasas/s${f.nextMilestone ? ` · al tener ${f.nextMilestone}, el doble` : ''}`);
      setText(row.costText, `Comprar (${formatNumber(f.cost, notation)})`);
      setDisabled(row.button, !f.canBuy);
    }
    for (const row of nodeRows) {
      const node = view.branches.flatMap((b) => b.nodes).find((x) => x.id === row.id)!;
      setText(row.stateText, node.bought ? 'Conseguida' : node.lockedBy ? `Requiere: ${node.lockedBy}` : '');
      setText(row.costText, `${formatNumber(node.cost, notation)} `);
      setDisabled(row.button, !node.canBuy);
      setClass(row.button, 'hidden', node.bought);
      setClass(row.el, 'perk-row-locked', node.lockedBy !== null);
    }
  }

  return { update, destroy: () => container.remove() };
}
