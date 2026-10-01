// Resumen offline: lo que ha pasado mientras no estabas, sobrio y con un botón "Vale"
// (01 §10). No es una vista con pestaña: es un aviso de una sola vez al abrir el juego.

import type { Content } from '../../content/types.ts';
import type { OfflineSummary } from '../../core/offline.ts';
import { h } from '../dom.ts';
import { formatDuration, formatNumber, type Notation } from '../format.ts';

export function showOfflineSummary(root: HTMLElement, summary: OfflineSummary, content: Content, notation: Notation, onDismiss: () => void): void {
  const lines = content.worlds
    .filter((world) => (summary.earnedByWorld[world.id]?.gt(0) ?? false))
    .map((world) => h('li', {}, [`${world.name}: +${formatNumber(summary.earnedByWorld[world.id]!, notation)} ${world.currency}`]));

  const dismissButton = h('button', { className: 'tap-button' }, ['Vale']) as HTMLButtonElement;

  const overlay = h('div', { className: 'offline-summary-overlay' }, [
    h('div', { className: 'offline-summary-card' }, [
      h('h2', {}, ['Mientras no estabas']),
      h('p', {}, [`Has estado fuera ${formatDuration(summary.awaySeconds)}.`]),
      lines.length > 0 ? h('ul', { className: 'offline-summary-list' }, lines) : h('p', {}, ['La granja ha seguido a lo suyo, tranquila.']),
      dismissButton,
    ]),
  ]);

  dismissButton.addEventListener('click', () => {
    overlay.remove();
    onDismiss();
  });

  root.appendChild(overlay);
}
