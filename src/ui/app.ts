// Cascarón de la app: cabecera fija (monedas e ingresos/s) + tarjeta del cerdito viajero +
// contenedor de vista + navegación inferior. Las vistas son módulos independientes con el patrón
// mount/update/destroy. Ver docs/06-mina.md.

import { VISITOR_INJECTION_SECONDS } from '../core/actions.ts';
import { claimVisitor, VISITOR_ACORNS, VISITOR_BOOST, VISITOR_GOLDEN } from '../core/actions.ts';
import { ascendView, gardenView, headerView, visitorInjectionValue } from '../core/selectors.ts';
import type { GameState } from '../core/state.ts';
import type { Content } from '../content/types.ts';
import { artSprite, pigSprite } from './art.ts';
import { h, setClass, setText } from './dom.ts';
import { formatDuration, formatNumber } from './format.ts';
import type { VisitorScheduler } from './visitor.ts';
import { mountCaveView } from './views/caveView.ts';
import { mountGardenView } from './views/gardenView.ts';
import { mountCosmeticsView } from './views/cosmeticsView.ts';
import { mountFlyView } from './views/flyView.ts';
import { mountLogbookView } from './views/logbookView.ts';
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
  /** false = no sale en la barra de abajo (se abre desde otro sitio, como la gema de ascender). */
  inNav?: boolean;
}

const TABS: TabDef[] = [
  { id: 'pick', label: 'Picar', icon: 'nav-picar', mount: mountPickView },
  { id: 'fly', label: 'Ascender', icon: 'nav-ascender', mount: mountFlyView, inNav: false },
  { id: 'cosmetics', label: 'Cerdito', icon: 'nav-cerdito', mount: mountCosmeticsView },
  { id: 'garden', label: 'Jardín', icon: 'nav-jardin', mount: mountGardenView },
  { id: 'cave', label: 'Cueva', icon: 'nav-cueva', mount: mountCaveView },
  { id: 'achievements', label: 'Logros', icon: 'nav-logros', mount: mountLogbookView },
  { id: 'settings', label: 'Ajustes', icon: 'nav-ajustes', mount: mountSettingsView },
];

export interface App {
  update(state: GameState): void;
}

export function mountApp(root: HTMLElement, content: Content, state: GameState, requestSave: () => void = () => {}, visitor: VisitorScheduler | null = null): App {
  const coinsText = document.createTextNode('');
  const incomeText = document.createTextNode('');
  const acornsText = document.createTextNode('');

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
    gemButton.classList.toggle('gem-open', tabId === 'fly');
    for (const [id, btn] of navButtons) {
      btn.classList.toggle('active', id === tabId);
      if (id === tabId) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    }
    activeView.update(state);
  }

  // La gema abre el menú de ascender y, si se vuelve a tocar, regresa a la pestaña en la que se estaba.
  let tabBeforeAscend = TABS[0]!.id;
  function toggleAscend(): void {
    if (activeTab === 'fly') {
      switchTab(tabBeforeAscend);
    } else {
      tabBeforeAscend = activeTab;
      switchTab('fly');
    }
  }

  const nav = h(
    'nav',
    { className: 'bottom-nav', 'aria-label': 'Secciones del juego' },
    TABS.filter((t) => t.inNav !== false).map((t) => {
      const btn = h('button', { className: 'nav-button', onclick: () => switchTab(t.id) }, [
        h('span', { className: 'nav-icon', 'aria-hidden': 'true' }, [artSprite('ui', t.icon)]),
        h('span', { className: 'nav-label' }, [t.label]),
      ]) as HTMLButtonElement;
      navButtons.set(t.id, btn);
      return btn;
    }),
  );

  // Bonos temporales de las flores: un icono y los segundos que le quedan, junto a los ingresos.
  const flowerBuffs = h('span', { className: 'flower-buffs' });
  const flowerBuffNodes = new Map<string, { el: HTMLElement; text: Text }>();
  function renderFlowerBuffs(active: { id: string; secondsLeft: number }[]): void {
    for (const [id, node] of flowerBuffNodes) {
      if (!active.some((a) => a.id === id)) {
        node.el.remove();
        flowerBuffNodes.delete(id);
      }
    }
    for (const a of active) {
      let node = flowerBuffNodes.get(a.id);
      if (!node) {
        const text = document.createTextNode('');
        const el = h('span', { className: 'flower-buff' }, [artSprite('flowers', a.id, 'sm'), text]);
        flowerBuffs.appendChild(el);
        node = { el, text };
        flowerBuffNodes.set(a.id, node);
      }
      setText(node.text, ` ${formatDuration(a.secondsLeft)}`);
    }
  }

  // La gema de ascender, flotando arriba a la derecha: abre el menú de ascender (que ya no está en la barra de abajo).
  const gemButton = h('button', { className: 'gem-button', 'aria-label': 'Ascender: esmeraldas y ventajas', title: 'Ascender', onclick: toggleAscend }, [artSprite('ui', 'esmeralda', 'md')]) as HTMLButtonElement;
  const boostText = document.createTextNode('');

  const header = h('header', { className: 'app-header' }, [
    h('div', { className: 'header-text' }, [
      h('div', { className: 'currency-row' }, [
        h('span', { className: 'currency-pill' }, [artSprite('ui', 'moneda', 'md'), coinsText]),
        h('span', { className: 'currency-name' }, [artSprite('ui', 'bellota', 'sm'), acornsText]),
        h('span', { className: 'income-text' }, [incomeText]),
      ]),
      h('div', { className: 'per-second-row' }, [boostText, flowerBuffs]),
    ]),
    gemButton,
  ]);

  // Cerdito viajero: una tarjeta fija bajo la cabecera (nada de ventanas emergentes).
  const visitorSlot = h('div', { className: 'visitor-slot' });
  let shownVisitor: string | null = null;
  let visitorLeft: Text | null = null;
  let visitorBar: HTMLElement | null = null;
  let visitorTotal = 1;

  function renderVisitor(): void {
    const kind = visitor?.current() ?? null;
    if (kind && kind !== shownVisitor) {
      const notation = state.settings.notation;
      // Mensaje corto: la recompensa y, al final, las bellotas con su símbolo.
      const coins = (seconds: number) => `+${formatNumber(visitorInjectionValue(state, content).mul(seconds / VISITOR_INJECTION_SECONDS), notation)} monedas`;
      const text =
        kind === 'golden'
          ? `¡Dorado! ${coins(VISITOR_GOLDEN.injectionSeconds)} y ×${VISITOR_GOLDEN.mult} durante ${formatDuration(VISITOR_GOLDEN.seconds)}`
          : kind === 'injection'
            ? coins(VISITOR_INJECTION_SECONDS)
            : `×${VISITOR_BOOST.mult} durante ${formatDuration(VISITOR_BOOST.seconds)}`;
      const acorns = kind === 'golden' ? VISITOR_GOLDEN.acorns : VISITOR_ACORNS;
      const accept = h('button', { className: 'buy-button' }, ['Aceptar']) as HTMLButtonElement;
      accept.addEventListener('click', () => {
        dispatch((s) => claimVisitor(s, content, kind));
        visitor?.clear();
        renderVisitor();
      });
      visitorLeft = document.createTextNode('');
      visitorTotal = Math.max(1, visitor?.secondsLeft() ?? 1);
      visitorBar = h('div', {});
      visitorSlot.replaceChildren(
        h('div', { className: kind === 'golden' ? 'visitor-card visitor-card-golden' : 'visitor-card', role: 'alert' }, [
          h('span', { className: 'visitor-emoji', 'aria-hidden': 'true' }, [pigSprite('dorado')]),
          h('span', { className: 'visitor-text' }, [h('b', {}, [text]), ` · +${acorns} `, artSprite('ui', 'bellota', 'sm'), h('span', { className: 'visitor-left' }, [visitorLeft])]),
          accept,
          h('div', { className: 'visitor-timer', 'aria-hidden': 'true' }, [visitorBar]),
        ]),
      );
      if (ctx.effectsOn()) navigator.vibrate?.(150);
      shownVisitor = kind;
    } else if (!kind && shownVisitor !== null) {
      visitorSlot.replaceChildren();
      shownVisitor = null;
    }
    if (kind && visitorLeft) setText(visitorLeft, `  (${Math.ceil(visitor?.secondsLeft() ?? 0)} s)`);
    if (kind && visitorBar) visitorBar.style.width = `${Math.min(100, ((visitor?.secondsLeft() ?? 0) / visitorTotal) * 100).toFixed(1)}%`;
  }

  root.appendChild(h('div', { className: 'app' }, [header, visitorSlot, viewContainer, nav]));
  switchTab('pick');

  function render(): void {
    renderVisitor();
    const head = headerView(state, content);
    const notation = state.settings.notation;
    setText(coinsText, ` ${formatNumber(head.coins, notation)}`);
    setText(acornsText, ` ${head.bellotas}`);
    setText(boostText, state.buff ? `×${state.buff.mult} durante ${formatDuration(Math.max(0, state.buff.until - state.time))}` : '');
    setText(incomeText, `+${formatNumber(head.income, notation)}/s`);
    setClass(gemButton, 'gem-ready', ascendView(state, content).canAscend);
    setClass(gemButton, 'gem-open', activeTab === 'fly');
    root.style.setProperty('--header-h', `${Math.ceil(header.getBoundingClientRect().height)}px`);
    renderFlowerBuffs(gardenView(state, content, 0).active);
    setClass(header, 'boosted', state.buff !== null);
    activeView?.update(state);
  }

  render();
  return { update: render };
}
