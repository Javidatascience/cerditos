// Cascarón de la app: cabecera fija (monedas e ingresos/s) + tarjeta del cerdito viajero +
// contenedor de vista + navegación inferior. Las vistas son módulos independientes con el patrón
// mount/update/destroy. Ver docs/06-mina.md.

import { claimVisitor, VISITOR_BOOST } from '../core/actions.ts';
import { headerView, visitorInjectionValue } from '../core/selectors.ts';
import type { GameState } from '../core/state.ts';
import type { Content } from '../content/types.ts';
import { h, setClass, setText } from './dom.ts';
import { formatDuration, formatNumber } from './format.ts';
import type { VisitorScheduler } from './visitor.ts';
import { mountAchievementsView } from './views/achievementsView.ts';
import { mountFlyView } from './views/flyView.ts';
import { mountJournalView } from './views/journalView.ts';
import { mountPickView } from './views/pickView.ts';
import { mountSettingsView } from './views/settingsView.ts';

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
  /** Fuerza un guardado inmediato (tras ascender, tras importar). */
  requestSave(): void;
  /** ¿Están activados los efectos? (ajuste, y no `prefers-reduced-motion`). */
  effectsOn(): boolean;
}

interface TabDef {
  id: string;
  label: string;
  icon: string;
  mount: (root: HTMLElement, ctx: UiContext) => View;
}

const TABS: TabDef[] = [
  { id: 'pick', label: 'Picar', icon: '⛏️', mount: mountPickView },
  { id: 'fly', label: 'Ascender', icon: '🪶', mount: mountFlyView },
  { id: 'achievements', label: 'Logros', icon: '🏅', mount: mountAchievementsView },
  { id: 'journal', label: 'Diario', icon: '📜', mount: mountJournalView },
  { id: 'settings', label: 'Ajustes', icon: '⚙️', mount: mountSettingsView },
];

export interface App {
  update(state: GameState): void;
}

export function mountApp(root: HTMLElement, content: Content, state: GameState, requestSave: () => void = () => {}, visitor: VisitorScheduler | null = null): App {
  const coinsText = document.createTextNode('');
  const incomeText = document.createTextNode('');

  const viewContainer = h('div', { className: 'view-container' });
  const navButtons = new Map<string, HTMLButtonElement>();

  function dispatch(action: (s: GameState) => void): void {
    action(state);
    render();
  }

  const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx: UiContext = { content, dispatch, requestSave, effectsOn: () => state.settings.effects && !reducedMotion() };

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
      const btn = h('button', { className: 'nav-button', onclick: () => switchTab(t.id) }, [
        h('span', { className: 'nav-icon', 'aria-hidden': 'true' }, [t.icon]),
        h('span', { className: 'nav-label' }, [t.label]),
      ]) as HTMLButtonElement;
      navButtons.set(t.id, btn);
      return btn;
    }),
  );

  const header = h('header', { className: 'app-header' }, [
    h('div', { className: 'header-text' }, [
      h('div', { className: 'currency-row' }, [h('span', { className: 'currency-pill' }, [coinsText]), h('span', { className: 'currency-name' }, ['Monedas'])]),
      h('div', { className: 'per-second-row' }, [incomeText]),
    ]),
  ]);

  // Cerdito viajero: una tarjeta fija bajo la cabecera (nada de ventanas emergentes).
  const visitorSlot = h('div', { className: 'visitor-slot' });
  let shownVisitor: string | null = null;
  let visitorLeft: Text | null = null;

  function renderVisitor(): void {
    const kind = visitor?.current() ?? null;
    if (kind && kind !== shownVisitor) {
      const notation = state.settings.notation;
      const text =
        kind === 'injection'
          ? `Un cerdito viajero trae un saco de ${formatNumber(visitorInjectionValue(state, content), notation)} monedas.`
          : `Un cerdito viajero viene con ganas de ayudar: ×${VISITOR_BOOST.mult} de producción y de picos durante ${formatDuration(VISITOR_BOOST.seconds)}.`;
      const accept = h('button', { className: 'buy-button' }, ['Aceptar']) as HTMLButtonElement;
      accept.addEventListener('click', () => {
        dispatch((s) => claimVisitor(s, content, kind));
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
      shownVisitor = kind;
    } else if (!kind && shownVisitor !== null) {
      visitorSlot.replaceChildren();
      shownVisitor = null;
    }
    if (kind && visitorLeft) setText(visitorLeft, ` Se va en ${Math.ceil(visitor?.secondsLeft() ?? 0)} s.`);
  }

  root.appendChild(h('div', { className: 'app' }, [header, visitorSlot, viewContainer, nav]));
  switchTab('pick');

  function render(): void {
    renderVisitor();
    const head = headerView(state, content);
    const notation = state.settings.notation;
    setText(coinsText, `🪙 ${formatNumber(head.coins, notation)}`);
    const buff = state.buff ? ` · ×${state.buff.mult} durante ${formatDuration(Math.max(0, state.buff.until - state.time))}` : '';
    setText(incomeText, `+${formatNumber(head.income, notation)}/s${buff}`);
    setClass(header, 'boosted', state.buff !== null);
    activeView?.update(state);
  }

  render();
  return { update: render };
}
