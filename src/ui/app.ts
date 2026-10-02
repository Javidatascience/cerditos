// Cascarón de la app: cabecera fija (mundo, moneda, producción/s) + contenedor de vista +
// navegación inferior. Las vistas (Granja, Mejoras…) son módulos independientes que siguen el
// patrón mount/update/destroy de docs/02-arquitectura.md §8.
//
// Pestañas de mundo (hito 7): bajo la cabecera, los mundos desbloqueados y el siguiente en gris
// con su requisito. Al cambiar de mundo se vuelve a montar la vista activa, que lee
// `ctx.activeWorld()` al montarse.

import type { Content } from '../content/types.ts';
import { claimVisitor, setActiveWorld, VISITOR_BOOST } from '../core/actions.ts';
import { headerView, visitorInjectionValue, worldTabs } from '../core/selectors.ts';
import type { GameState, WorldId } from '../core/state.ts';
import { h, setClass, setText } from './dom.ts';
import { CURRENCY_EMOJI, WORLD_EMOJI, worldBanner } from './art.ts';
import { formatDuration, formatNumber } from './format.ts';
import type { VisitorScheduler } from './visitor.ts';
import { mountAlbumView } from './views/albumView.ts';
import { mountFlyView } from './views/flyView.ts';
import { mountFarmView } from './views/farmView.ts';
import { mountJournalView } from './views/journalView.ts';
import { mountSettingsView } from './views/settingsView.ts';

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
  icon: string;
  mount: (root: HTMLElement, ctx: UiContext) => View;
}

const TABS: TabDef[] = [
  { id: 'farm', label: 'Granja', icon: '🏡', mount: mountFarmView },
  { id: 'fly', label: 'Volar', icon: '🪶', mount: mountFlyView },
  { id: 'album', label: 'Álbum', icon: '📖', mount: mountAlbumView },
  { id: 'journal', label: 'Diario', icon: '📜', mount: mountJournalView },
  { id: 'settings', label: 'Ajustes', icon: '⚙️', mount: mountSettingsView },
];

export interface App {
  update(state: GameState): void;
}

export function mountApp(root: HTMLElement, content: Content, state: GameState, requestSave: () => void = () => {}, visitor: VisitorScheduler | null = null): App {
  const worldNameText = document.createTextNode('');
  const currencyText = document.createTextNode('');
  const currencyNameText = document.createTextNode('');
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
      if (id === tabId) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    }
    activeView.update(state);
  }

  const nav = h(
    'nav',
    { className: 'bottom-nav', 'aria-label': 'Secciones del juego' },
    TABS.map((t) => {
      const btn = h('button', { className: 'nav-button', onclick: () => switchTab(t.id) }, [h('span', { className: 'nav-icon', 'aria-hidden': 'true' }, [t.icon]), h('span', { className: 'nav-label' }, [t.label])]) as HTMLButtonElement;
      navButtons.set(t.id, btn);
      return btn;
    }),
  );

  const worldTabsRow = h('div', { className: 'world-tabs', role: 'group', 'aria-label': 'Mundos' });
  const worldHint = h('p', { className: 'world-hint hidden' });
  let tabsSignature = '';
  let shownWorld = state.activeWorld;
  let bannerWorld = '';

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
        const btn = h('button', { className: `world-tab${t.active ? ' active' : ''}${t.unlocked ? '' : ' locked'}` }, [h('span', { className: 'world-emoji', 'aria-hidden': 'true' }, [WORLD_EMOJI[t.id] ?? '🐷']), t.name]) as HTMLButtonElement;
        btn.disabled = !t.unlocked;
        if (t.active) btn.setAttribute('aria-current', 'true');
        btn.addEventListener('click', () => dispatch((s) => setActiveWorld(s, t.id)));
        return btn;
      }),
    );
  }

  // Escena del mundo detrás de la cabecera (estática; cambia al cambiar de mundo).
  const bannerSlot = h('div', { className: 'banner-slot' });
  const header = h('header', { className: 'app-header' }, [
    bannerSlot,
    h('div', { className: 'header-text' }, [
      h('div', { className: 'world-name' }, [worldNameText]),
      h('div', { className: 'currency-row' }, [h('span', { className: 'currency-pill' }, [currencyText]), h('span', { className: 'currency-name' }, [currencyNameText])]),
      h('div', { className: 'per-second-row' }, [perSecondText]),
    ]),
  ]);

  // Cerdito viajero: una tarjeta fija bajo las pestañas de mundo (nada de ventanas emergentes).
  const visitorSlot = h('div', { className: 'visitor-slot' });
  let shownVisitor: string | null = null;
  let visitorLeft: Text | null = null;

  function renderVisitor(): void {
    const kind = visitor?.current() ?? null;
    const signature = kind ? `${kind}:${state.activeWorld}` : null;
    if (kind && signature !== shownVisitor) {
      const notation = state.settings.notation;
      const world = content.worlds.find((w) => w.id === state.activeWorld);
      const text =
        kind === 'injection'
          ? `Un cerdito viajero trae un saco de ${formatNumber(visitorInjectionValue(state, content, state.activeWorld), notation)} ${world?.currency.toLowerCase() ?? ''}.`
          : `Un cerdito viajero viene con ganas de ayudar: ×${VISITOR_BOOST.mult} de producción durante ${formatDuration(VISITOR_BOOST.seconds)}.`;
      const accept = h('button', { className: 'buy-button' }, ['Aceptar']) as HTMLButtonElement;
      accept.addEventListener('click', () => {
        dispatch((s) => claimVisitor(s, content, kind, s.activeWorld));
        visitor?.clear();
        renderVisitor();
      });
      visitorLeft = document.createTextNode('');
      visitorSlot.replaceChildren(
        h('div', { className: 'visitor-card' }, [
          h('span', { className: 'visitor-emoji', 'aria-hidden': 'true' }, ['🐷']),
          h('span', { className: 'visitor-text' }, [text, h('span', { className: 'visitor-left' }, [visitorLeft])]),
          accept,
        ]),
      );
      shownVisitor = signature;
    } else if (!kind && shownVisitor !== null) {
      visitorSlot.replaceChildren();
      shownVisitor = null;
    }
    if (kind && visitorLeft) setText(visitorLeft, ` Se va en ${Math.ceil(visitor?.secondsLeft() ?? 0)} s.`);
  }

  root.appendChild(
    h('div', { className: 'app' }, [
      header,
      h('div', { className: 'world-bar' }, [worldTabsRow, worldHint]),
      visitorSlot,
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
    document.documentElement.dataset.world = state.activeWorld; // el CSS pone el color del mundo
    if (bannerWorld !== state.activeWorld) {
      bannerWorld = state.activeWorld;
      bannerSlot.replaceChildren(worldBanner(state.activeWorld));
    }
    renderVisitor();
    renderWorldTabs();
    const headerData = headerView(state, content, state.activeWorld);
    const notation = state.settings.notation;
    setText(worldNameText, headerData.worldName);
    setText(currencyText, `${CURRENCY_EMOJI[state.activeWorld] ?? '🪙'} ${formatNumber(headerData.currency, notation)}`);
    setText(currencyNameText, headerData.currencyName);
    const buff = state.buff ? ` · ×${state.buff.mult} durante ${formatDuration(Math.max(0, state.buff.until - state.time))}` : '';
    setText(perSecondText, `+${formatNumber(headerData.perSecond, notation)}/s${buff}`);
    activeView?.update(state);
  }

  render();
  return { update: render };
}
