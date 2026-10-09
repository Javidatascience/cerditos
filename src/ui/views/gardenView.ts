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

  const messageText = document.createTextNode('');
  const message = h('p', { className: 'garden-message hidden' }, [messageText]);
  let messageTimer = 0;
  function showMessage(text: string): void {
    setText(messageText, text);
    setClass(message, 'hidden', false);
    window.clearTimeout(messageTimer);
    messageTimer = window.setTimeout(() => setClass(message, 'hidden', true), 3000);
  }

  const harvestAll = h('button', { className: 'buy-button' }, [harvestText]) as HTMLButtonElement;
  harvestAll.addEventListener('click', () =>
    ctx.dispatch((s) => {
      const now = Date.now();
      s.garden.cells.forEach((_, i) => void harvestFlower(s, ctx.content, i, now));
    }),
  );

  // Se crean las casillas que puede llegar a haber (con las filas de Más tierra) y se ocultan las que aún no existen.
  const extraRows = ctx.content.perks.reduce((sum, p) => sum + (p.effect.kind === 'gardenRows' ? p.effect.perLevel * (p.maxLevel ?? 0) : 0), 0);
  const cellButtons = Array.from({ length: garden.cols * (garden.rows + Math.round(extraRows)) }, (_, index) => {
    const btn = h('button', { className: 'garden-cell' }, ['']) as HTMLButtonElement;
    btn.addEventListener('click', () => {
      const cell = lastState ? gardenView(lastState, ctx.content, Date.now()).cells[index] : undefined;
      if (cell?.flowerId && !cell.ready) {
        showMessage(`${cell.flowerName}: le quedan ${formatDuration(cell.readyInSeconds)} para crecer.`);
        return;
      }
      ctx.dispatch((s) => {
        const now = Date.now();
        if (harvestFlower(s, ctx.content, index, now) === null) void plantFlower(s, ctx.content, index, selected, now);
      });
    });
    return btn;
  });
  const grid = h('div', { className: 'garden-grid' }, cellButtons);
  grid.style.gridTemplateColumns = `repeat(${garden.cols}, 1fr)`;

  const flowerRows = flowers.map((f) => {
    const nameText = document.createTextNode('');
    const flavorText = document.createTextNode('');
    const effectText = document.createTextNode('');
    const recipeText = document.createTextNode('');
    const shinyText = document.createTextNode('');
    const shinyBox = h('span', { className: 'garden-shiny-count' }, [artSprite('ui', 'brillo', 'sm'), shinyText]);
    const el = h('li', { className: 'cosmetic-row' }, [
      h('div', { className: 'row-art' }, [
        artSprite('flowers', f.id, 'md'),
        h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [nameText]), shinyBox, h('span', { className: 'generator-flavor' }, [flavorText]), h('span', { className: 'upgrade-effect' }, [effectText]), h('span', { className: 'perk-locked' }, [recipeText])]),
      ]),
    ]);
    return { el, nameText, flavorText, effectText, recipeText, shinyText, shinyBox };
  });

  const playArea = h('div', {}, [seedRow, message, grid, harvestAll]);
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
      setText(introText, `El jardín se abre al conseguir ${view.unlockPlumas} esmeraldas en total (llevas ${formatNumber(view.plumas, notation)}). Las esmeraldas se consiguen ascendiendo.`);
    } else {
      const activeNow = view.active.length > 0 ? ` Activo ahora: ${view.active.map((a) => `${a.name} ${formatDuration(a.secondsLeft)}`).join(' · ')}.` : '';
      setText(
        introText,
        `Elige una semilla y toca las casillas vacías; toca una flor madura para recogerla. Plantar es gratis. Dos flores vecinas maduras pueden cruzarse en una casilla vacía y dar una flor nueva. Al recogerlas dan un bono temporal (si recoges varias iguales, sus efectos van uno detrás de otro); hay un ${view.shinyPercent} % de que salgan brillantes (se ven con una estrellita cuando están maduras; el bono dura el doble).${activeNow}`,
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

    cellButtons.forEach((btn, i) => setClass(btn, 'hidden', i >= view.cells.length));
    view.cells.forEach((cell, i) => {
      const btn = cellButtons[i];
      if (!btn) return;
      const empty = cell.flowerId === null;
      const glyph = empty ? '' : cell.ready ? (cell.flowerId ?? '') : 'brote';
      const key = `${glyph}${cell.ready && cell.shiny ? '*' : ''}`;
      if (btn.dataset['glyph'] !== key) {
        btn.dataset['glyph'] = key;
        const star = cell.ready && cell.shiny ? [Object.assign(artSprite('ui', 'brillo', 'sm'), { className: 'art-sprite garden-star' })] : [];
        btn.replaceChildren(...(glyph ? [artSprite('flowers', glyph, 'md'), ...star] : []));
      }
      btn.title = empty ? 'Casilla vacía' : cell.ready ? `${cell.flowerName}: toca para recoger` : `${cell.flowerName}: ${formatDuration(cell.readyInSeconds)}`;
      setClass(btn, 'garden-cell-ready', cell.ready);
      setClass(btn, 'garden-cell-growing', !empty && !cell.ready);
    });

    view.flowers.forEach((f, i) => {
      const row = flowerRows[i];
      if (!row) return;
      const known = f.available || f.found;
      setText(row.nameText, known ? `${f.name}${f.count > 0 ? ` ×${f.count}` : ''}` : '???');
      setText(row.shinyText, known && f.count > 0 ? ` ×${f.shinyCount} brillantes` : '');
      setClass(row.shinyBox, 'hidden', !(known && f.count > 0));
      setText(row.flavorText, known ? `${f.flavor} Tarda ${formatDuration(f.growSeconds)}.` : '');
      setText(row.effectText, known ? `Al recogerla: ${f.effectText}` : '');
      setText(row.recipeText, f.recipeText ?? '');
      setClass(row.el, 'cosmetic-row-locked', !f.found);
    });
  }

  return { update, destroy: () => container.remove() };
}
