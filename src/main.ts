// Arranque del juego: cargar partida (o crear una nueva) → calcular lo ocurrido mientras no
// se estaba → montar la UI → avanzar el tiempo cada 250 ms y guardar. Ver docs/02-arquitectura.md
// §4-§6 y docs/01-diseno-juego.md §10.

import { CONTENT } from './content/index.ts';
import { simulateOffline } from './core/offline.ts';
import { advance } from './core/tick.ts';
import { mountApp } from './ui/app.ts';
import { showOfflineSummary } from './ui/views/offlineSummary.ts';
import { createLocalStorageStorage, loadGame, saveGame } from './save/storage.ts';

const TICK_MS = 250;
const SAVE_INTERVAL_MS = 10_000;
// Si el tick detecta más de esto entre dos marcas (pestaña dormida, móvil bloqueado…), se
// calcula como ausencia offline en vez de como un simple avance (02 §4).
const OFFLINE_TICK_THRESHOLD_SECONDS = 10;
// Por debajo de esto no merece la pena interrumpir con un resumen (02 §5).
const OFFLINE_SUMMARY_THRESHOLD_SECONDS = 60;

const storage = createLocalStorageStorage();
const now = Date.now();
const { state, source } = loadGame(storage, CONTENT, now);

const root = document.getElementById('app');
if (!root) throw new Error('Falta el nodo #app en index.html');

// Ausencia desde el último tick guardado (no aplica a una partida nueva: no hay "antes").
let pendingOfflineSummary = null as ReturnType<typeof simulateOffline> | null;
if (source !== 'new') {
  const awaySeconds = (now - state.lastTickAt) / 1000;
  if (awaySeconds > 1) pendingOfflineSummary = simulateOffline(state, CONTENT, awaySeconds);
}
state.lastTickAt = now;

function persist(): void {
  saveGame(storage, state, Date.now());
}

const app = mountApp(root, CONTENT, state, persist);

if (pendingOfflineSummary && pendingOfflineSummary.awaySeconds > OFFLINE_SUMMARY_THRESHOLD_SECONDS) {
  showOfflineSummary(document.body, pendingOfflineSummary, CONTENT, state.settings.notation, () => app.update(state));
}

let lastTickAt = now;
setInterval(() => {
  const tickNow = Date.now();
  const dt = (tickNow - lastTickAt) / 1000;
  lastTickAt = tickNow;
  state.lastTickAt = tickNow;
  if (dt > OFFLINE_TICK_THRESHOLD_SECONDS) {
    simulateOffline(state, CONTENT, dt);
  } else {
    advance(state, CONTENT, dt);
  }
  app.update(state);
}, TICK_MS);

setInterval(persist, SAVE_INTERVAL_MS);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persist();
});
window.addEventListener('pagehide', persist);

// La primera ausencia ya se simuló al cargar; si no hubo resumen que mostrar, se guarda ya
// para fijar el nuevo lastTickAt (y, si era una partida nueva, para no perderla si se cierra
// la pestaña antes de los primeros 10 s).
if (!pendingOfflineSummary || pendingOfflineSummary.awaySeconds <= OFFLINE_SUMMARY_THRESHOLD_SECONDS) persist();
