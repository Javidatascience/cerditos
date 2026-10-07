// Arranque del juego: cargar partida (o crear una nueva) → calcular lo ocurrido mientras no
// se estaba → montar la UI → avanzar el tiempo cada 250 ms y guardar. Ver docs/06-mina.md.
// Si algo falla al arrancar (un guardado raro, una versión vieja en caché…), en vez de dejar la
// página en blanco se enseña el motivo y un botón para borrar los datos guardados.

import { CONTENT } from './content/index.ts';
import { companionTick, gardenTick } from './core/actions.ts';
import { visitorModifiers } from './core/formulas.ts';
import { simulateOffline } from './core/offline.ts';
import { advance } from './core/tick.ts';
import { registerPwa } from './pwa/register.ts';
import { mountApp } from './ui/app.ts';
import { disableZoom } from './ui/noZoom.ts';
import { createVisitorScheduler } from './ui/visitor.ts';
import { showOfflineSummary } from './ui/views/offlineSummary.ts';
import { createLocalStorageStorage, loadGame, saveGame } from './save/storage.ts';

const TICK_MS = 250;
const SAVE_INTERVAL_MS = 10_000;
// Si el tick detecta más de esto entre dos marcas (pestaña dormida, móvil bloqueado…), se
// calcula como ausencia offline en vez de como un simple avance.
const OFFLINE_TICK_THRESHOLD_SECONDS = 10;
// Por debajo de esto no merece la pena interrumpir con un resumen.
const OFFLINE_SUMMARY_THRESHOLD_SECONDS = 60;

/** Pantalla de error de arranque: muestra el motivo y permite borrar los datos guardados. */
function showFatal(err: unknown): void {
  const root = document.getElementById('app') ?? document.body;
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  root.replaceChildren();
  const box = document.createElement('div');
  box.style.cssText = 'max-width:420px;margin:40px auto;padding:20px;font-family:system-ui,sans-serif;line-height:1.4';
  const title = document.createElement('h2');
  title.textContent = 'El juego no ha podido arrancar';
  const text = document.createElement('p');
  text.textContent = 'Suele pasar con una partida guardada de una versión vieja. Puedes borrar los datos guardados y empezar de nuevo (se perderá la partida; si quieres conservarla, copia el código en Ajustes de otro navegador antes).';
  const detail = document.createElement('pre');
  detail.style.cssText = 'white-space:pre-wrap;font-size:0.8rem;opacity:0.7';
  detail.textContent = message;
  const button = document.createElement('button');
  button.textContent = 'Borrar datos guardados y recargar';
  button.style.cssText = 'padding:12px 16px;font-size:1rem';
  button.addEventListener('click', () => {
    try {
      window.localStorage.removeItem('cerditos:save');
      window.localStorage.removeItem('cerditos:save:backup');
    } catch {
      // sin almacenamiento disponible: nada que borrar
    }
    window.location.reload();
  });
  box.append(title, text, detail, button);
  root.append(box);
  console.error(err);
}

function start(): void {
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
  gardenTick(state, CONTENT, now);

  function persist(): void {
    saveGame(storage, state, Date.now());
  }

  const visitor = createVisitorScheduler(Math.random, () => visitorModifiers(state, CONTENT));
  const app = mountApp(root, CONTENT, state, persist, visitor);

  if (pendingOfflineSummary && pendingOfflineSummary.awaySeconds > OFFLINE_SUMMARY_THRESHOLD_SECONDS) {
    showOfflineSummary(document.body, pendingOfflineSummary, state.settings.notation, () => app.update(state));
  }

  let lastTickAt = now;
  let failed = false;
  setInterval(() => {
    if (failed) return;
    try {
      const tickNow = Date.now();
      const dt = (tickNow - lastTickAt) / 1000;
      lastTickAt = tickNow;
      state.lastTickAt = tickNow;
      if (dt > OFFLINE_TICK_THRESHOLD_SECONDS) {
        simulateOffline(state, CONTENT, dt);
      } else {
        advance(state, CONTENT, dt);
        companionTick(state, CONTENT, dt); // solo con el juego abierto
        visitor.tick(dt); // solo cuenta el tiempo con el juego abierto, nunca el offline
      }
      gardenTick(state, CONTENT, tickNow); // el jardín va en tiempo real, también tras una ausencia
      app.update(state);
    } catch (err) {
      failed = true; // se para el bucle para no repetir el error cada 250 ms
      showFatal(err);
    }
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
}

try {
  start();
  disableZoom();
} catch (err) {
  showFatal(err);
}
registerPwa();
