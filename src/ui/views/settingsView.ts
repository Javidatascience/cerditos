// Vista "Ajustes": notación de números, exportar/importar la partida como texto y borrarla.
// Ver docs/01-diseno-juego.md §10, docs/02-arquitectura.md §6 y §9 (aviso de iOS).

import { setNotation } from '../../core/actions.ts';
import { createInitialState, replaceState } from '../../core/state.ts';
import type { GameState } from '../../core/state.ts';
import { normalize } from '../../save/normalize.ts';
import { deserialize } from '../../save/serialize.ts';
import { exportSave, parseImport } from '../../save/transfer.ts';
import type { UiContext, View } from '../app.ts';
import { h, setClass, setDisabled, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

const DELETE_CONFIRM_WORD = 'borrar';

export function mountSettingsView(root: HTMLElement, ctx: UiContext): View {
  let latestState: GameState | null = null;
  let pendingImport: GameState | null = null;

  // --- Notación ---
  const notationButtons = new Map<'es' | 'cientifica', HTMLButtonElement>();
  const notationRow = h(
    'div',
    { className: 'amount-row' },
    (['es', 'cientifica'] as const).map((n) => {
      const btn = h('button', { className: 'amount-button', onclick: () => ctx.dispatch((state) => setNotation(state, n)) }, [
        n === 'es' ? 'Normal' : 'Científica',
      ]) as HTMLButtonElement;
      notationButtons.set(n, btn);
      return btn;
    }),
  );

  // --- Exportar ---
  const exportArea = h('textarea', { className: 'settings-textarea', readonly: true, rows: '4' }) as HTMLTextAreaElement;
  const exportStatus = h('p', { className: 'settings-status' }, ['']);
  const exportButton = h('button', { className: 'buy-button' }, ['Generar código']) as HTMLButtonElement;
  const copyButton = h('button', { className: 'amount-button' }, ['Copiar']) as HTMLButtonElement;
  exportButton.addEventListener('click', () => {
    if (!latestState) return;
    exportArea.value = exportSave(latestState, Date.now());
    setText(exportStatus, '');
  });
  copyButton.addEventListener('click', () => {
    if (!exportArea.value) return;
    void copyText(exportArea.value).then((ok) => setText(exportStatus, ok ? 'Copiado.' : 'No se pudo copiar: selecciona el texto a mano.'));
  });

  // --- Importar ---
  const importArea = h('textarea', { className: 'settings-textarea', rows: '4', placeholder: 'Pega aquí el código de la partida' }) as HTMLTextAreaElement;
  const importButton = h('button', { className: 'buy-button' }, ['Leer código']) as HTMLButtonElement;
  const importStatus = h('p', { className: 'settings-status' }, ['']);
  const importConfirmText = document.createTextNode('');
  const importConfirmYes = h('button', { className: 'buy-button' }, ['Reemplazar partida']) as HTMLButtonElement;
  const importConfirmNo = h('button', { className: 'amount-button' }, ['Cancelar']) as HTMLButtonElement;
  const importConfirm = h('div', { className: 'settings-confirm hidden' }, [
    h('p', {}, [importConfirmText]),
    h('div', { className: 'amount-row' }, [importConfirmYes, importConfirmNo]),
  ]);

  importButton.addEventListener('click', () => {
    pendingImport = null;
    setClass(importConfirm, 'hidden', true);
    const result = parseImport(importArea.value);
    if (!result.ok) {
      setText(importStatus, result.error);
      return;
    }
    const imported = normalize(deserialize(result.data), ctx.content);
    pendingImport = imported;
    setText(importStatus, '');
    setText(importConfirmText, summarize(imported));
    setClass(importConfirm, 'hidden', false);
  });
  importConfirmYes.addEventListener('click', () => {
    if (!pendingImport) return;
    const toApply = pendingImport;
    ctx.dispatch((state) => replaceState(state, toApply));
    ctx.requestSave();
    pendingImport = null;
    setClass(importConfirm, 'hidden', true);
    setText(importStatus, 'Partida reemplazada.');
  });
  importConfirmNo.addEventListener('click', () => {
    pendingImport = null;
    setClass(importConfirm, 'hidden', true);
  });

  // --- Borrar partida ---
  const deleteInput = h('input', { type: 'text', className: 'settings-textarea', placeholder: `Escribe "${DELETE_CONFIRM_WORD}"` }) as HTMLInputElement;
  const deleteButton = h('button', { className: 'buy-button' }, ['Borrar partida']) as HTMLButtonElement;
  deleteButton.disabled = true;
  deleteInput.addEventListener('input', () => {
    setDisabled(deleteButton, deleteInput.value.trim().toLowerCase() !== DELETE_CONFIRM_WORD);
  });
  deleteButton.addEventListener('click', () => {
    ctx.dispatch((state) => replaceState(state, createInitialState(ctx.content, Date.now())));
    ctx.requestSave();
    deleteInput.value = '';
    setDisabled(deleteButton, true);
  });

  const container = h('div', { className: 'settings-view' }, [
    h('h3', {}, ['Números']),
    notationRow,

    h('h3', {}, ['Guardar partida en texto']),
    h('p', { className: 'settings-hint' }, [
      'Genera un código y guárdalo donde quieras (una nota, un mensaje a ti mismo) para recuperar la partida en otro dispositivo.',
    ]),
    exportArea,
    h('div', { className: 'amount-row' }, [exportButton, copyButton]),
    exportStatus,

    h('h3', {}, ['Cargar partida desde texto']),
    importArea,
    importButton,
    importStatus,
    importConfirm,

    h('h3', {}, ['Este dispositivo']),
    h('p', { className: 'settings-hint' }, [
      'Si añades Cerditos a la pantalla de inicio en el iPhone, esa app guarda su partida aparte de la de Safari: usa el código de arriba para pasarla de una a otra.',
    ]),

    h('h3', {}, ['Borrar partida']),
    h('p', { className: 'settings-hint' }, ['Esto reinicia el Valle por completo. No se puede deshacer.']),
    deleteInput,
    deleteButton,
  ]);
  root.appendChild(container);

  function summarize(state: GameState): string {
    const parts = ctx.content.worlds
      .filter((w) => state.worlds[w.id]?.unlocked)
      .map((w) => `${w.name}: ${formatNumber(state.worlds[w.id]!.currency, state.settings.notation)} ${w.currency}`);
    return `${parts.join(' · ')}. ¿Reemplazar la partida actual?`;
  }

  function update(state: GameState): void {
    latestState = state;
    for (const [n, btn] of notationButtons) setClass(btn, 'active', n === state.settings.notation);
  }

  return { update, destroy: () => container.remove() };
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
