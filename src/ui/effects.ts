// Efectos visuales sueltos (solo UI). Se apagan con el interruptor de efectos y con `prefers-reduced-motion`.

import { artSprite } from './art.ts';
import { h } from './dom.ts';

/** Lluvia de esmeraldas pixeladas con un rótulo (al ascender). Se borra sola a los pocos segundos. */
export function emeraldRain(count: number, text: string): void {
  const drops = Math.min(28, 10 + count * 2);
  const layer = h('div', { className: 'emerald-rain', 'aria-hidden': 'true' });
  for (let i = 0; i < drops; i++) {
    const drop = artSprite('ui', 'esmeralda', i % 3 === 0 ? 'lg' : 'md');
    drop.classList.add('emerald-drop');
    drop.style.left = `${Math.random() * 94}%`;
    drop.style.animationDelay = `${(Math.random() * 0.9).toFixed(2)}s`;
    layer.appendChild(drop);
  }
  layer.appendChild(h('div', { className: 'emerald-rain-text' }, [text]));
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 3400);
}
