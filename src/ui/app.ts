// Cascarón de la app: cabecera fija (mundo, moneda, producción/s) + contenedor de vista +
// navegación inferior. Las vistas (Granja, Mejoras…) son módulos independientes que siguen el
// patrón mount/update/destroy de docs/02-arquitectura.md §8.
//
// Pestañas de mundo (hito 7): bajo la cabecera, los mundos desbloqueados y el siguiente en gris
// con su requisito. Al cambiar de mundo se vuelve a montar la vista activa, que lee
// `ctx.activeWorld()` al montarse.

import type { Content } from '../content/types.ts';
import { setActiveWorld } from '../core/actions.ts';
import { headerView, worldTabs } from '../core/selectors.ts';
import type { GameState, WorldId } from '../core/state.ts';
import { h, setClass, setText } from './dom.ts';
import { formatNumber } from './format.ts';
import { mountAlbumView } from './views/albumView.ts';
import { mountAscendView } from './views/ascendView.ts';
import { mountFarmView } from './views/farmView.ts';
import { mountJournalView } from './views/journalView.ts';
import { mountPerksView } from './views/perksView.ts';
import { mountSettingsView } from './views/settingsView.ts';
import { mountUpgradesView } from './views/upgradesView.ts';

/** Una vista montada: `update` repinta a partir del estado, `destroy` limpia sus nodos. */
export interface View {
  update(state: GameState): void;
  destroy(): void;
}

/** Lo que cada vista necesita para leer contenido, pedir cambios de estado y guardar. */
export interface UiContext {
  content: Content;
  /** Mundo que se está viendo ahora (las vistas por mundo lo leen al montarse). */
  activeWorld(): WorldId;
  /** Aplica una mutación del estado (vía core/actions.ts o save/) y repinta. */
  dispatch(action: (state: GameState) => void): void;
  /** Fuerza un guardado inmediato (02 §6: "tras ascender, tras importar"), fuera del guardado
   * automático cada 10 s que lleva main.ts. */
  requestSave(): void;
}

interface TabDef {
  id: string;
  label: string;
  mount: (root: HTMLElement, ctx: UiContext) => View;
}

const TABS: TabDef[] = [
  { id: 'farm', label: 'Granja', mount: mountFarmView },
  { id: 'upgrades', label: 'Mejoras', mount: mountUpgradesView },
  { id: 'ascend', label: 'Volar', mount: mountAscendView },
  { id: 'perks', label: 'Ventajas', mount: mountPerksView },
  { id: 'album', label: 'Álbum', mount: mountAlbumView },
  { id: 'journal', label: 'Diario', mount: mountJournalView },
  { id: 'settings', label: 'Ajustes', mount: mountSettingsView },
];

/** Color de acento de cada mundo (solo presentación; el contenido no sabe de colores). */
const WORLD_ACCENTS: Record<string, string> = { valle: '#a86c50', bosque: '#5f7f55', huerta: '#8a8a2e', balneario: '#5a8a99' };

export interface App {
  update(state: GameState): void;
}

export function mountApp(root: HTMLElement, content: Content, state: GameState, requestSave: () => void = () => {}): App {
  const worldNameText = document.createTextNode('');
  const currencyText = document.createTextNode('');
  const perSecondText = document.createTextNode('');

  const viewContainer = h('div', { className: 'view-container' });
  const navButtons = new Map<string, HTMLButtonElement>();

  function dispatch(action: (s: GameState) => void): void {
    action(state);
    render();
  }

  const ctx: UiContext = { content, dispatch, requestSave, activeWorld: () => state.activeWorld };

  let activeTab = TABS[0]!.id;
  let activeView: View | null = null;

  function switchTab(tabId: string): void {
    if (tabId === activeTab && activeView) return;
    const def = TABS.find((t) => t.id === tabId);
    if (!def) return;
    activeTab = tabId;
    activeView?.destroy();
    activeView = def.mount(viewContainer, ctx);
    for (const [id, btn] of navButtons) {
      btn.classList.toggle('active', id === tabId);
    }
    activeView.update(state);
  }

  const nav = h(
    'nav',
    { className: 'bottom-nav' },
    TABS.map((t) => {
      const btn = h('button', { className: 'nav-button', onclick: () => switchTab(t.id) }, [t.label]) as HTMLButtonElement;
      navButtons.set(t.id, btn);
      return btn;
    }),
  );

  const worldTabsRow = h('div', { className: 'world-tabs' });
  const worldHint = h('p', { className: 'world-hint hidden' });
  let tabsSignature = '';
  let shownWorld = state.activeWorld;

  function renderWorldTabs(): void {
    const tabs = worldTabs(state, content);
    const notation = state.settings.notation;
    const next = tabs.find((t) => !t.unlocked);
    setClass(worldHint, 'hidden', !next?.requirement);
    if (next?.requirement) {
      const r = next.requirement;
      setText(worldHint, `${next.name} abrirá con ${formatNumber(r.target, notation)} plumas de ${r.fromWorldName}: llevas ${formatNumber(r.current, notation)}.`);
    }
    const signature = tabs.map((t) => `${t.id}:${t.unlocked}:${t.active}`).join('|');
    if (signature === tabsSignature) return;
    tabsSignature = signature;
    worldTabsRow.replaceChildren(
      ...tabs.map((t) => {
        const btn = h('button', { className: `world-tab${t.active ? ' active' : ''}${t.unlocked ? '' : ' locked'}` }, [t.name]) as HTMLButtonElement;
        btn.disabled = !t.unlocked;
        btn.addEventListener('click', () => dispatch((s) => setActiveWorld(s, t.id)));
        return btn;
      }),
    );
  }

  root.appendChild(
    h('div', { className: 'app' }, [
      h('header', { className: 'app-header' }, [
        h('div', { className: 'world-name' }, [worldNameText]),
        h('div', { className: 'currency-row' }, [currencyText]),
        h('div', { className: 'per-second-row' }, [perSecondText]),
      ]),
      h('div', { className: 'world-bar' }, [worldTabsRow, worldHint]),
      viewContainer,
      nav,
    ]),
  );

  switchTab('farm');

  function render(): void {
    if (state.activeWorld !== shownWorld) {
      shownWorld = state.activeWorld;
      const def = TABS.find((t) => t.id === activeTab);
      if (def) {
        activeView?.destroy();
        activeView = def.mount(viewContainer, ctx);
      }
    }
    root.style.setProperty('--world-accent', WORLD_ACCENTS[state.activeWorld] ?? '#a86c50');
    renderWorldTabs();
    const header = headerView(state, content, state.activeWorld);
    const notation = state.settings.notation;
    setText(worldNameText, header.worldName);
    setText(currencyText, `${header.currencyName}: ${formatNumber(header.currency, notation)}`);
    setText(perSecondText, `+${formatNumber(header.perSecond, notation)}/s`);
    activeView?.update(state);
  }

  render();
  return { update: render };
}
