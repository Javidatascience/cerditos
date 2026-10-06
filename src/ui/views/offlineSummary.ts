// Resumen offline: lo que ha pasado mientras no estabas, sobrio y con un botón "Vale". No es una
// vista con pestaña: es un aviso de una sola vez al abrir el juego.

import type { OfflineSummary } from '../../core/offline.ts';
import { h } from '../dom.ts';
import { formatDuration, formatNumber, type Notation } from '../format.ts';

export function showOfflineSummary(root: HTMLElement, summary: OfflineSummary, notation: Notation, onDismiss: () => void): void {
  const lines: HTMLElement[] = [];
  if (summary.coinsEarned.gt(0)) lines.push(h('li', {}, [`+${formatNumber(summary.coinsEarned, notation)} monedas`]));
  if (summary.levelsGained > 0) lines.push(h('li', {}, [`${summary.levelsGained} nivel${summary.levelsGained === 1 ? '' : 'es'} más hondo`]));
  if (summary.blocks > 0) lines.push(h('li', {}, [`${formatNumber(summary.blocks, notation)} bloques rotos`]));

  const away =
    summary.totalAwaySeconds > summary.awaySeconds
      ? `Has estado fuera ${formatDuration(summary.totalAwaySeconds)}. La mina trabajó durante las primeras ${formatDuration(summary.awaySeconds)}.`
      : `Has estado fuera ${formatDuration(summary.awaySeconds)}.`;

  const dismissButton = h('button', { className: 'tap-button' }, ['Vale']) as HTMLButtonElement;
  const overlay = h('div', { className: 'offline-summary-overlay' }, [
    h('div', { className: 'offline-summary-card' }, [
      h('h2', {}, ['Mientras no estabas']),
      h('p', {}, [away]),
      lines.length > 0 ? h('ul', { className: 'offline-summary-list' }, lines) : h('p', {}, ['El cerdito ha seguido a lo suyo, tranquilo.']),
      dismissButton,
    ]),
  ]);

  dismissButton.addEventListener('click', () => {
    overlay.remove();
    onDismiss();
  });
  root.appendChild(overlay);
}
