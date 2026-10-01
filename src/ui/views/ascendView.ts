// Vista "Volar": plumas actuales, ganancia si asciendes ahora, el multiplicador resultante y
// a qué ritmo crecen las plumas pendientes. Botón "Echar a volar" con confirmación simple.
// Nada parpadea, nada presiona: ver docs/01-diseno-juego.md §5.
//
// NOTA (hito 5): solo hay un mundo jugable (El Valle), igual que farmView/upgradesView.

import { ascend } from '../../core/actions.ts';
import { ascendView as getAscendView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { h, setClass, setDisabled, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

/** Historial reciente de "plumas pendientes" (en segundos de juego, no reloj real) para
 * mostrar un ritmo de crecimiento aproximado. Vive en el cierre de la vista: al cambiar de
 * pestaña y volver se reinicia, lo cual es correcto (es solo una pista, no un dato guardado). */
const HISTORY_WINDOW_SECONDS = 3600;

export function mountAscendView(root: HTMLElement, ctx: UiContext): View {
  const world = ctx.content.worlds[0];
  if (!world) throw new Error('No hay ningún mundo en el contenido');
  const worldId = world.id;
  const worldName = world.name;
  const prestigeCurrency = world.prestigeCurrency;

  const history: { t: number; gain: number }[] = [];

  const plumasText = document.createTextNode('');
  const pendingText = document.createTextNode('');
  const multiplierText = document.createTextNode('');
  const growthText = document.createTextNode('');

  const ascendButton = h('button', { className: 'tap-button' }, ['Echar a volar']) as HTMLButtonElement;
  const confirmText = document.createTextNode('');
  const confirmYes = h('button', { className: 'buy-button' }, ['Sí, echar a volar']) as HTMLButtonElement;
  const confirmNo = h('button', { className: 'amount-button' }, ['Seguir un poco más']) as HTMLButtonElement;
  const confirmBlock = h('div', { className: 'settings-confirm hidden' }, [h('p', {}, [confirmText]), h('div', { className: 'amount-row' }, [confirmYes, confirmNo])]);

  ascendButton.addEventListener('click', () => setClass(confirmBlock, 'hidden', false));
  confirmNo.addEventListener('click', () => setClass(confirmBlock, 'hidden', true));
  confirmYes.addEventListener('click', () => {
    setClass(confirmBlock, 'hidden', true);
    ctx.dispatch((state) => ascend(state, ctx.content, worldId, Date.now()));
    ctx.requestSave();
  });

  const container = h('div', { className: 'ascend-view' }, [
    h('p', { className: 'ascend-plumas' }, [plumasText]),
    h('p', { className: 'settings-hint' }, [pendingText]),
    h('p', { className: 'settings-hint' }, [multiplierText]),
    h('p', { className: 'settings-hint' }, [growthText]),
    ascendButton,
    confirmBlock,
  ]);
  root.appendChild(container);

  function update(state: GameState): void {
    const view = getAscendView(state, ctx.content, worldId);

    setText(plumasText, `${prestigeCurrency}: ${formatNumber(view.plumas, state.settings.notation)} (${formatNumber(view.plumasTotal, state.settings.notation)} en total)`);
    setText(pendingText, view.pendingGain > 0 ? `Si echas a volar ahora, ganarás ${view.pendingGain} pluma${view.pendingGain === 1 ? '' : 's'}.` : 'Todavía no hay ninguna pluma pendiente.');
    setText(
      multiplierText,
      view.pendingGain > 0
        ? `Tu producción pasaría de ×${view.currentBonusMultiplier.toFixed(2)} a ×${view.nextBonusMultiplier.toFixed(2)} (solo por el bono de plumas).`
        : '',
    );

    history.push({ t: state.time, gain: view.pendingGain });
    while (history.length > 1 && state.time - history[0]!.t > HISTORY_WINDOW_SECONDS) history.shift();
    const oldest = history[0];
    if (oldest && state.time - oldest.t >= 300 && oldest.gain > 0) {
      const percent = ((view.pendingGain - oldest.gain) / oldest.gain) * 100;
      const minutes = Math.round((state.time - oldest.t) / 60);
      setText(growthText, `${percent >= 0 ? '+' : ''}${percent.toFixed(1)} % en los últimos ${minutes} min.`);
    } else {
      setText(growthText, '');
    }

    setDisabled(ascendButton, !view.canAscend);
    setText(confirmText, `Vas a reiniciar ${worldName.toLowerCase()}: la moneda, los cerditos y las mejoras de esta ronda. Conservas las plumas y las ventajas.`);
  }

  return {
    update,
    destroy: () => container.remove(),
  };
}
