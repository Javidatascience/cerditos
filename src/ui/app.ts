// Cascarón de la app: cabecera fija (mundo, moneda, producción/s) + contenedor de vista +
// navegación inferior. Las vistas (Granja, Mejoras…) son módulos independientes que siguen el
// patrón mount/update/destroy de docs/02-arquitectura.md §8.
//
// NOTA (hito 3): solo hay una pestaña de mundo posible (El Valle); las pestañas de mundo
// (plural) llegan en el hito 7. La cabecera ya lee `state.activeWorld`, así que no habrá que
// tocarla entonces.

import type { Content } from '../content/types.ts';
import { headerView } from '../core/selectors.ts';
import type { GameState } from '../core/state.ts';
import { h, setText } from './dom.ts';
import { formatNumber } from './format.ts';
import { mountFarmView } from './views/farmView.ts';
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
  { id: 'settings', label: 'Ajustes', mount: mountSettingsView },
];

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

  const ctx: UiContext = { content, dispatch, requestSave };

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

  root.appendChild(
    h('div', { className: 'app' }, [
      h('header', { className: 'app-header' }, [
        h('div', { className: 'world-name' }, [worldNameText]),
        h('div', { className: 'currency-row' }, [currencyText]),
        h('div', { className: 'per-second-row' }, [perSecondText]),
      ]),
      viewContainer,
      nav,
    ]),
  );

  switchTab('farm');

  function render(): void {
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
