// Vista "Subir": subir a la superficie a cambio de plumas. Dice cuántas ganarías ahora, por qué
// nivel, y cuánto multiplicaría tu cavado el bono de plumas. Botón con confirmación simple; nada
// parpadea ni presiona. Ver docs/06-mina.md.

import { ascend } from '../../core/actions.ts';
import { ascendView as getAscendView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { h, setClass, setDisabled, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

export function mountAscendView(root: HTMLElement, ctx: UiContext): View {
  const plumasText = document.createTextNode('');
  const pendingText = document.createTextNode('');
  const multiplierText = document.createTextNode('');

  const ascendButton = h('button', { className: 'tap-button' }, ['Subir a la superficie']) as HTMLButtonElement;
  const confirmText = document.createTextNode('');
  const confirmYes = h('button', { className: 'buy-button' }, ['Sí, subir']) as HTMLButtonElement;
  const confirmNo = h('button', { className: 'amount-button' }, ['Seguir un poco más']) as HTMLButtonElement;
  const confirmBlock = h('div', { className: 'settings-confirm hidden' }, [h('p', {}, [confirmText]), h('div', { className: 'amount-row' }, [confirmYes, confirmNo])]);

  ascendButton.addEventListener('click', () => setClass(confirmBlock, 'hidden', false));
  confirmNo.addEventListener('click', () => setClass(confirmBlock, 'hidden', true));
  confirmYes.addEventListener('click', () => {
    setClass(confirmBlock, 'hidden', true);
    ctx.dispatch((state) => ascend(state, ctx.content, Date.now()));
    ctx.requestSave();
  });

  const container = h('div', { className: 'ascend-view' }, [
    h('p', { className: 'ascend-plumas' }, [plumasText]),
    h('p', { className: 'settings-hint' }, [pendingText]),
    h('p', { className: 'settings-hint' }, [multiplierText]),
    ascendButton,
    confirmBlock,
  ]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const view = getAscendView(state, ctx.content);
    setText(plumasText, `Plumas: ${formatNumber(view.plumas, notation)} (${formatNumber(view.plumasTotal, notation)} en total)`);
    setText(
      pendingText,
      view.pendingGain > 0
        ? `Si subes ahora, ganarás ${view.pendingGain} pluma${view.pendingGain === 1 ? '' : 's'} por haber llegado al nivel ${view.runMaxDepth}. Cuanto más hondo llegues en la ronda, más plumas.`
        : 'Todavía no hay ninguna pluma pendiente: baja un poco más.',
    );
    setText(
      multiplierText,
      view.pendingGain > 0 ? `Tu cavado pasaría de ×${view.currentBonusMultiplier.toFixed(2)} a ×${view.nextBonusMultiplier.toFixed(2)} solo por el bono de plumas.` : '',
    );
    setDisabled(ascendButton, !view.canAscend);
    setText(confirmText, 'Vas a volver a la superficie: pierdes las monedas, los materiales y las piezas de esta ronda. Conservas las plumas, las ventajas y los logros.');
  }

  return { update, destroy: () => container.remove() };
}
