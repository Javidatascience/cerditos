// Arranque del juego. Hito 1: crea una partida nueva en memoria (sin guardado todavía, eso
// llega en el hito 4) y avanza el tiempo cada 250 ms. Ver docs/02-arquitectura.md §4.

import { CONTENT } from './content/index.ts';
import { advance } from './core/tick.ts';
import { createInitialState } from './core/state.ts';
import { mountApp } from './ui/app.ts';

const TICK_MS = 250;

const state = createInitialState(CONTENT, Date.now());

const root = document.getElementById('app');
if (!root) throw new Error('Falta el nodo #app en index.html');

const app = mountApp(root, CONTENT, state);

let lastTickAt = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTickAt) / 1000;
  lastTickAt = now;
  advance(state, CONTENT, dt);
  app.update(state);
}, TICK_MS);
