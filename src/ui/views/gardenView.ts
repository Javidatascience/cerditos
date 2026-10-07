// Vista "Jardín": una cuadrícula donde eliges una semilla y tocas casillas vacías para plantarla; las
// flores maduras se recogen tocándolas. Dos flores vecinas maduras pueden cruzarse y dar una nueva.
// Los nodos se crean una vez y solo se actualizan (ningún clic se pierde). Ver docs/06-mina.md.

import { harvestFlower, plantFlower } from '../../core/actions.ts';
import { gardenView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { artSprite } from '../art.ts';
import { h, setClass, setDisabled, setText } from '../dom.ts';
import { formatDuration, formatNumber } from '../format.ts';

export function mountGardenView(root: HTMLElement, ctx: UiContext): View {
  const garden = ctx.content.garden;
  const flowers = garden.flowers;
  let selected = flowers[0]!.id;
  let lastState: GameState | null = null;

  const introText = document.createTextNode('');
  const harvestText = document.createTextNode('');

  const seedButtons = flowers.map((f) => {
    const btn = h('button', { className: 'chip chip-button', title: f.name }, [artSprite('flowers', f.id, 'sm')]) as HTMLButtonElement;
    btn.addEventListener('click', () => {
      selected = f.id;
      if (lastState) update(lastState);
    });
    return btn;
  });
  const seedRow = h('div', { className: 'chip-row' }, seedButtons);

  const harvestAll = h('button', { className: 'buy-button' }, [harvestText]) as HTMLButtonElement;
  harvestAll.addEventListener('click', () =>
    ctx.dispatch((s) => {
      const now = Date.now();
      s.garden.cells.forEach((_, i) => void harvestFlower(s, ctx.content, i, now, Math.random()));
    }),
  );

  const cellButtons = Array.from({ length: garden.cols * garden.rows }, (_, index) => {
    const btn = h('button', { className: 'garden-cell' }, ['']) as HTMLButtonElement;
    btn.addEventListener('click', () =>
      ctx.dispatch((s) => {
        const now = Date.now();
        if (harvestFlower(s, ctx.content, index, now, Math.random()) === null) void plantFlower(s, ctx.content, index, selected, now);
      }),
    );
    return btn;
  });
  const grid = h('div', { className: 'garden-grid' }, cellButtons);
  grid.style.gridTemplateColumns = `repeat(${garden.cols}, 1fr)`;

  const flowerRows = flowers.map((f) => {
    const nameText = document.createTextNode('');
    const flavorText = document.createTextNode('');
    const effectText = document.createTextNode('');
    const recipeText = document.createTextNode('');
    const el = h('li', { className: 'cosmetic-row' }, [
      h('div', { className: 'row-art' }, [
        artSprite('flowers', f.id, 'md'),
        h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [nameText]), h('span', { className: 'generator-flavor' }, [flavorText]), h('span', { className: 'upgrade-effect' }, [effectText]), h('span', { className: 'perk-locked' }, [recipeText])]),
      ]),
    ]);
    return { el, nameText, flavorText, effectText, recipeText };
  });

  const playArea = h('div', {}, [seedRow, grid, harvestAll]);
  const container = h('div', { className: 'cosmetics-view' }, [
    h('h3', { className: 'fly-heading' }, ['Jardín']),
    h('p', { className: 'settings-hint' }, [introText]),
    playArea,
    h('h3', { className: 'fly-heading' }, ['Flores']),
    h('ul', { className: 'cosmetic-list' }, flowerRows.map((r) => r.el)),
  ]);
  root.appendChild(container);

  function update(state: GameState): void {
    lastState = state;
    const notation = state.settings.notation;
    const view = gardenView(state, ctx.content, Date.now());
    setClass(playArea, 'hidden', !view.unlocked);
    if (!view.unlocked) {
      setText(introText, `El jardín se abre al conseguir ${view.unlockPlumas} plumas en total (llevas ${formatNumber(view.plumas, notation)}). Las plumas se consiguen ascendiendo.`);
    } else {
      const activeNow = view.active.length > 0 ? ` Activo ahora: ${view.active.map((a) => `${a.name} ${formatDuration(a.secondsLeft)}`).join(' · ')}.` : '';
      setText(
        introText,
        `Elige una semilla y toca las casillas vacías; toca una flor madura para recogerla. Plantar es gratis. Dos flores vecinas maduras pueden cruzarse en una casilla vacía y dar una flor nueva. Al recogerlas dan un bono temporal; hay un ${view.shinyPercent} % de que salgan brillantes (el bono dura el doble).${activeNow}`,
      );
    }

    view.flowers.forEach((f, i) => {
      const btn = seedButtons[i];
      if (!btn) return;
      setClass(btn, 'hidden', !f.available);
      setClass(btn, 'chip-done', f.id === selected);
    });
    setText(harvestText, view.readyCount > 0 ? `Recoger todo lo listo (${view.readyCount})` : 'Nada listo todavía');
    setDisabled(harvestAll, view.readyCount === 0);

    view.cells.forEach((cell, i) => {
      const btn = cellButtons[i];
      if (!btn) return;
      const empty = cell.flowerId === null;
      const glyph = empty ? '' : cell.ready ? (cell.flowerId ?? '') : 'brote';
      if (btn.dataset['glyph'] !== glyph) {
        btn.dataset['glyph'] = glyph;
        btn.replaceChildren(...(glyph ? [artSprite('flowers', glyph, 'md')] : []));
      }
      btn.title = empty ? 'Casilla vacía' : cell.ready ? `${cell.flowerName}: toca para recoger` : `${cell.flowerName}: ${formatDuration(cell.readyInSeconds)}`;
      setClass(btn, 'garden-cell-ready', cell.ready);
      setClass(btn, 'garden-cell-growing', !empty && !cell.ready);
    });

    view.flowers.forEach((f, i) => {
      const row = flowerRows[i];
      if (!row) return;
      const known = f.available || f.found;
      setText(row.nameText, known ? `${f.name}${f.shiny ? ' ✨' : ''}${f.count > 0 ? ` ×${f.count}` : ''}` : '???');
      setText(row.flavorText, known ? `${f.flavor} Tarda ${formatDuration(f.growSeconds)}.` : '');
      setText(row.effectText, known ? `Al recogerla: ${f.effectText}` : '');
      setText(row.recipeText, f.recipeText ?? '');
      setClass(row.el, 'cosmetic-row-locked', !f.found);
    });
  }

  return { update, destroy: () => container.remove() };
}
