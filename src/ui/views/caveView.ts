// Vista "Cueva": la carrera del cerdito (caveRunner.ts) arriba, y debajo el dragón, el próximo jefe, la
// armería (se compra con brasas) y el renacer por almas. Las filas de la armería se crean una vez y solo
// se actualizan, para que ningún clic se pierda. Ver docs/06-mina.md.

import { buyArmory, caveRebirth } from '../../core/actions.ts';
import { caveView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { artSprite } from '../art.ts';
import { h, setClass, setDisabled, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';
import { mountCaveRunner } from './caveRunner.ts';

export function mountCaveView(root: HTMLElement, ctx: UiContext): View {
  const embersText = document.createTextNode('');
  const metersText = document.createTextNode('');
  const runner = mountCaveRunner(ctx);
  const infoText = document.createTextNode('');
  const bossText = document.createTextNode('');

  // El dragón: crece al vencerlo como jefe en la carrera.
  const dragonSlot = h('div', { className: 'dragon-slot' });
  let shownDragon = -1;
  const dragonName = document.createTextNode('');
  const dragonFlavor = document.createTextNode('');
  const dragonBonus = document.createTextNode('');
  const dragonCard = h('div', { className: 'dragon-card' }, [
    dragonSlot,
    h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [dragonName]), h('span', { className: 'generator-flavor' }, [dragonFlavor]), h('span', { className: 'upgrade-effect' }, [dragonBonus])]),
  ]);

  const armoryRows = ctx.content.cave.armory.map((item) => {
    const levelText = document.createTextNode('');
    const effectText = document.createTextNode('');
    const costText = document.createTextNode('');
    const button = h('button', { className: 'buy-button' }, [costText, artSprite('ui', 'brasa', 'sm')]) as HTMLButtonElement;
    button.addEventListener('click', () => ctx.dispatch((s) => void buyArmory(s, ctx.content, item.id)));
    const el = h('li', { className: 'perk-row' }, [
      h('div', { className: 'perk-info' }, [
        h('div', { className: 'generator-name-row' }, [h('span', { className: 'upgrade-name' }, [item.name]), h('span', { className: 'generator-owned' }, [levelText])]),
        h('span', { className: 'generator-flavor' }, [item.flavor]),
        h('span', { className: 'upgrade-effect' }, [effectText]),
      ]),
      button,
    ]);
    return { id: item.id, el, levelText, effectText, costText, button };
  });

  // Renacer: la carrera vuelve a empezar a cambio de almas permanentes.
  const soulsText = document.createTextNode('');
  const rebirthButton = h('button', { className: 'buy-button' }, ['Renacer']) as HTMLButtonElement;
  const confirmYes = h('button', { className: 'buy-button' }, ['Sí, renacer']) as HTMLButtonElement;
  const confirmNo = h('button', { className: 'amount-button' }, ['Todavía no']) as HTMLButtonElement;
  const confirmBlock = h('div', { className: 'settings-confirm hidden' }, [
    h('p', {}, ['Pierdes las brasas, la armería y los metros de esta carrera. Conservas las almas, el dragón y el récord.']),
    h('div', { className: 'amount-row' }, [confirmYes, confirmNo]),
  ]);
  rebirthButton.addEventListener('click', () => setClass(confirmBlock, 'hidden', false));
  confirmNo.addEventListener('click', () => setClass(confirmBlock, 'hidden', true));
  confirmYes.addEventListener('click', () => {
    setClass(confirmBlock, 'hidden', true);
    ctx.dispatch((s) => void caveRebirth(s, ctx.content));
    ctx.requestSave();
  });

  const lockText = document.createTextNode('');
  const body = h('div', {}, [
    h('p', { className: 'ascend-plumas sticky-currency' }, [artSprite('ui', 'brasa', 'md'), embersText, h('span', { className: 'currency-rate' }, [metersText])]),
    runner.el,
    h('p', { className: 'settings-hint' }, ['Toca la carrera para saltar; peleando, cada toque es un golpe más. El cerdito corre solo y pelea con lo que se encuentra.']),
    h('p', { className: 'settings-hint' }, [bossText]),
    dragonCard,
    h('p', { className: 'settings-hint' }, [infoText]),
    h('h3', { className: 'fly-heading' }, ['Armería']),
    h('ul', { className: 'perk-list' }, armoryRows.map((r) => r.el)),
    h('h3', { className: 'fly-heading' }, ['Renacer']),
    h('p', { className: 'settings-hint' }, [soulsText]),
    rebirthButton,
    confirmBlock,
  ]);
  const container = h('div', { className: 'mine-view' }, [h('div', { className: 'cave-title' }, [h('h3', { className: 'fly-heading' }, ['Cueva del Dragón'])]), h('p', { className: 'settings-hint' }, [lockText]), body]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const view = caveView(state, ctx.content);
    setClass(body, 'hidden', !view.unlocked);
    setText(lockText, view.unlocked ? '' : `La cueva se abre al conseguir ${view.unlockPlumas} esmeraldas en total (llevas ${formatNumber(view.plumas, notation)}). Las esmeraldas se consiguen ascendiendo.`);
    if (!view.unlocked) return;
    runner.setView(view, state);
    setText(embersText, ` Brasas: ${formatNumber(view.embers, notation)}`);
    setText(metersText, `${formatNumber(Math.floor(view.meters), notation)} m (récord ${formatNumber(Math.floor(view.bestMeters), notation)} m)`);
    setText(bossText, `Próximo jefe a los ${formatNumber(Math.floor(view.boss.atMeters), notation)} m: ${view.boss.name} (vida ${formatNumber(view.boss.hp, notation)}, ${view.boss.seconds} s para vencerlo, da ${formatNumber(view.boss.embers, notation)} brasas). Tu golpe: ${formatNumber(view.runner.damage, notation)} × ${view.runner.hitsPerSecond} por segundo.`);
    if (view.dragon.stage !== shownDragon) {
      shownDragon = view.dragon.stage;
      dragonSlot.replaceChildren(artSprite('cave', `dragon-${view.dragon.stage}`, 'lg'));
    }
    setText(dragonName, view.dragon.name);
    setText(dragonFlavor, view.dragon.flavor);
    setText(dragonBonus, view.dragon.bonusText);
    setText(infoText, `La cueva da ×${view.prodBonus.toFixed(2)} a la producción de la mina (dragón y almas). Brasas ×${view.embersMult.toFixed(2)}. Las brasas no se pierden al ascender; la carrera solo avanza con esta pestaña abierta.`);
    for (const row of armoryRows) {
      const item = view.armory.find((x) => x.id === row.id)!;
      setText(row.levelText, item.maxLevel === null ? `nivel ${item.level}` : `${item.level}/${item.maxLevel}`);
      setText(row.effectText, item.effectText);
      setText(row.costText, item.maxed ? 'Al máximo ' : `${formatNumber(item.cost, notation)} `);
      setDisabled(row.button, !item.canBuy);
    }
    setText(
      soulsText,
      `Almas: ${view.souls} (cada una da +${Math.round(ctx.content.cave.soulEmbers * 100)} % de brasas y +${Math.round(ctx.content.cave.soulProd * 100)} % de producción en la mina). Si renaces ahora: +${view.soulsPending}.`,
    );
    setDisabled(rebirthButton, view.soulsPending <= 0);
  }

  return {
    update,
    destroy: () => {
      runner.destroy();
      container.remove();
    },
  };
}
