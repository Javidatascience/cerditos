// Vista "Cueva": la carrera del cerdito (caveRunner.ts) arriba, y debajo el dragón, el próximo jefe, la
// armería (brasas), las mejoras de almas (permanentes, incluidas las evoluciones de monstruos) y el renacer. Las filas de la armería se crean una vez y solo
// se actualizan, para que ningún clic se pierda. Ver docs/06-mina.md.

import { buyArmory, buySoulUpgrade, caveRebirth } from '../../core/actions.ts';
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
  const soulsTopText = document.createTextNode('');
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

  // Mejoras de almas: permanentes (no se pierden al renacer).
  const soulRows = ctx.content.cave.soulUpgrades.map((up) => {
    const levelText = document.createTextNode('');
    const costText = document.createTextNode('');
    const button = h('button', { className: 'buy-button' }, [costText]) as HTMLButtonElement;
    button.addEventListener('click', () => ctx.dispatch((s) => void buySoulUpgrade(s, ctx.content, up.id)));
    const art = up.effect.kind === 'evolve' ? [artSprite('monsters', up.effect.monster, 'md')] : [];
    const el = h('li', { className: 'perk-row' }, [
      ...art,
      h('div', { className: 'perk-info' }, [
        h('div', { className: 'generator-name-row' }, [h('span', { className: 'upgrade-name' }, [up.name]), h('span', { className: 'generator-owned' }, [levelText])]),
        h('span', { className: 'generator-flavor' }, [up.flavor]),
      ]),
      button,
    ]);
    return { id: up.id, el, levelText, costText, button };
  });
  const soulsHeadText = document.createTextNode('');

  // Renacer: la carrera vuelve a empezar a cambio de almas.
  const soulsText = document.createTextNode('');
  const rebirthButton = h('button', { className: 'buy-button' }, ['Renacer']) as HTMLButtonElement;
  const confirmYes = h('button', { className: 'buy-button' }, ['Sí, renacer']) as HTMLButtonElement;
  const confirmNo = h('button', { className: 'amount-button' }, ['Todavía no']) as HTMLButtonElement;
  const confirmBlock = h('div', { className: 'settings-confirm hidden' }, [
    h('p', {}, ['Pierdes las brasas, la armería y los metros de esta carrera. Conservas las almas, sus mejoras, el dragón y el récord.']),
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
    h('p', { className: 'ascend-plumas sticky-currency' }, [artSprite('ui', 'brasa', 'md'), embersText, h('span', { className: 'currency-rate' }, [soulsTopText])]),
    runner.el,
    h('p', { className: 'settings-hint' }, ['El cerdito corre solo: los monstruos caen al chocar con ellos y dan brasas y almas (a veces, la semilla de su flor). A los que vuelan hay que alcanzarlos saltando: toca la carrera para saltar. Contra el dragón, cada toque es un golpe más. Derrota monstruos para llenar la furia.']),
    h('p', { className: 'settings-hint' }, [metersText, bossText]),
    dragonCard,
    h('p', { className: 'settings-hint' }, [infoText]),
    h('h3', { className: 'fly-heading' }, ['Armería']),
    h('ul', { className: 'perk-list' }, armoryRows.map((r) => r.el)),
    h('h3', { className: 'fly-heading' }, ['Almas']),
    h('p', { className: 'settings-hint' }, [soulsHeadText]),
    h('ul', { className: 'perk-list' }, soulRows.map((r) => r.el)),
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
    setText(soulsTopText, `${formatNumber(view.souls, notation)} almas`);
    setText(metersText, `Llevas ${formatNumber(Math.floor(view.meters), notation)} m en esta carrera (récord: ${formatNumber(Math.floor(view.bestMeters), notation)} m). `);
    setText(bossText, `Próximo jefe a los ${formatNumber(Math.floor(view.boss.atMeters), notation)} m: ${view.boss.name} (vida ${formatNumber(view.boss.hp, notation)}, ${view.boss.seconds} s para vencerlo, da ${formatNumber(view.boss.embers, notation)} brasas y ${view.boss.souls} almas). Tu golpe: ${formatNumber(view.runner.damage, notation)} × ${view.runner.hitsPerSecond} por segundo (sube con la espada).`);
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
      soulsHeadText,
      `Tienes ${formatNumber(view.souls, notation)} almas para gastar. Las ${formatNumber(view.soulsTotal, notation)} conseguidas en total dan +${Math.round(ctx.content.cave.soulEmbers * 100)} % de brasas y +${Math.round(ctx.content.cave.soulProd * 100)} % de producción en la mina cada una. Gastarlas no quita el bono.`,
    );
    for (const row of soulRows) {
      const up = view.soulUpgrades.find((x) => x.id === row.id)!;
      setText(row.levelText, up.maxLevel === null ? `nivel ${up.level}` : `${up.level}/${up.maxLevel}`);
      setText(row.costText, up.maxed ? 'Hecho' : `${formatNumber(up.cost, notation)} almas`);
      setDisabled(row.button, !up.canBuy);
    }
    setText(soulsText, `Al renacer conviertes las brasas de esta carrera en almas: ahora darías ${view.soulsPending}.`);
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
