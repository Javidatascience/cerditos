// Tablero de fusión de La Pocilga: una cuadrícula con los huecos del mundo. Cada cerdo es una
// casilla; para fusionar dos del mismo nivel se toca uno y luego el otro, o se arrastra uno
// encima del otro. Las casillas se sincronizan por clave (dom.ts > createListSync), así que
// los botones no se recrean cada 250 ms y ni un clic ni un arrastre se pierden.

import { buyGenerator, mergePigs } from '../../core/actions.ts';
import { mergeView, type MergeLevelView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { generatorIcon } from '../art.ts';
import { createListSync, h, setClass, setDisabled, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

interface Cell {
  key: string;
  /** Nivel del cerdo (0-based) o -1 si el hueco está vacío. */
  level: number;
  genId: string;
  prodText: string;
  canMerge: boolean;
}

const DRAG_THRESHOLD_PX = 8;

export function mountMergeBoard(root: HTMLElement, ctx: UiContext): View {
  const worldId = ctx.activeWorld();
  const world = ctx.content.worlds.find((w) => w.id === worldId);
  if (!world) throw new Error(`Mundo desconocido: ${worldId}`);

  let selected: { level: number; key: string } | null = null;
  let lastState: GameState | null = null;
  let suppressClick = false;

  const usedText = document.createTextNode('');
  const buyText = document.createTextNode('');
  const buyButton = h('button', { className: 'buy-button merge-buy' }, [buyText]) as HTMLButtonElement;
  buyButton.addEventListener('click', () => ctx.dispatch((state) => void buyGenerator(state, ctx.content, worldId, world.generators[0]!.id, state.settings.buyAmount)));
  const grid = h('div', { className: 'merge-grid' });
  const container = h('div', { className: 'merge-board' }, [
    h('div', { className: 'merge-head' }, [h('span', { className: 'merge-used' }, [usedText]), buyButton]),
    grid,
    h('p', { className: 'settings-hint' }, ['Toca un cerdo y luego otro igual, o arrastra uno encima de otro, para fusionarlos en uno mejor.']),
  ]);
  root.appendChild(container);

  function doMerge(level: number): void {
    selected = null;
    ctx.dispatch((state) => void mergePigs(state, ctx.content, worldId, level));
  }

  function onCellClick(level: number, key: string): void {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (selected && selected.level === level && selected.key !== key) doMerge(level);
    else if (selected && selected.key === key) selected = null;
    else selected = { level, key };
    if (lastState) update(lastState);
  }

  // Arrastrar: se sigue el puntero en la ventana; al soltar sobre otro cerdo del mismo nivel, se fusionan.
  grid.addEventListener('pointerdown', (down) => {
    const source = (down.target as HTMLElement).closest<HTMLElement>('[data-level]');
    if (!source || down.button > 0) return;
    const level = Number(source.dataset['level']);
    const key = source.dataset['key'] ?? '';
    let ghost: HTMLElement | null = null;

    const move = (e: PointerEvent): void => {
      if (!ghost && Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) > DRAG_THRESHOLD_PX) {
        ghost = source.cloneNode(true) as HTMLElement;
        ghost.classList.add('merge-ghost');
        document.body.appendChild(ghost);
        source.classList.add('merge-dragging');
      }
      if (ghost) {
        ghost.style.left = `${e.clientX}px`;
        ghost.style.top = `${e.clientY}px`;
      }
    };
    const up = (e: PointerEvent): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!ghost) return;
      ghost.remove();
      source.classList.remove('merge-dragging');
      suppressClick = true; // el clic que sigue al arrastre no cuenta
      setTimeout(() => (suppressClick = false), 0);
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-level]');
      if (target && target.dataset['key'] !== key && Number(target.dataset['level']) === level) doMerge(level);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });

  const syncCells = createListSync<Cell>(
    grid,
    (cell) => cell.key,
    (cell) => {
      if (cell.level < 0) return { el: h('div', { className: 'merge-cell merge-cell-empty', 'aria-hidden': 'true' }), update: () => {} };
      const levelText = document.createTextNode('');
      const prodText = document.createTextNode('');
      const el = h(
        'button',
        { className: 'merge-cell', 'data-level': String(cell.level), 'data-key': cell.key, 'aria-label': `Cerdo de nivel ${cell.level + 1}` },
        [
          generatorIcon(worldId, cell.level, cell.genId),
          h('span', { className: 'merge-level' }, [levelText]),
          h('span', { className: 'merge-prod' }, [prodText]),
        ],
      ) as HTMLButtonElement;
      el.addEventListener('click', () => onCellClick(cell.level, cell.key));
      return {
        el,
        update: (c) => {
          setText(levelText, `Nv ${c.level + 1}`);
          setText(prodText, c.prodText);
          setClass(el, 'merge-selected', selected?.key === c.key);
          setClass(el, 'merge-ready', c.canMerge);
        },
      };
    },
  );

  function update(state: GameState): void {
    lastState = state;
    const view = mergeView(state, ctx.content, worldId);
    if (!view) return;
    const notation = state.settings.notation;
    const levelByIndex = new Map<number, MergeLevelView>(view.levels.map((l) => [l.index, l]));

    // Si lo seleccionado ya no existe (se fusionó, se ascendió…), se deselecciona.
    if (selected) {
      const lv = levelByIndex.get(selected.level);
      const slot = Number(selected.key.split(':')[1]);
      if (!lv || slot >= lv.count) selected = null;
    }

    const cells: Cell[] = [];
    for (const lv of view.levels) {
      for (let i = 0; i < lv.count; i++) {
        cells.push({ key: `${lv.index}:${i}`, level: lv.index, genId: lv.genId, prodText: `+${formatNumber(lv.unitProd, notation)}/s`, canMerge: lv.canMerge });
      }
    }
    for (let i = 0; i < view.slots - view.used; i++) cells.push({ key: `e:${i}`, level: -1, genId: '', prodText: '', canMerge: false });
    syncCells(cells);

    setText(usedText, `Cerdos: ${view.used}/${view.slots}`);
    const count = Math.max(1, view.buyCount);
    setText(buyText, `${view.buyName}${count > 1 ? ` ×${count}` : ''} (${formatNumber(view.buyCost, notation)})`);
    setDisabled(buyButton, !view.canBuy);
  }

  return { update, destroy: () => container.remove() };
}
