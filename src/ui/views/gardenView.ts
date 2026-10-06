// Vista "Jardín": parcelas donde las flores crecen muy despacio (horas de reloj real, también con el
// juego cerrado). Cada flor distinta que recoges da un bono pasivo; si sale brillante, vale el doble.
// Los nodos se crean una vez y solo se actualizan (ningún clic se pierde). Ver docs/06-mina.md.

import { harvestFlower, plantFlower } from '../../core/actions.ts';
import { gardenView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { h, setClass, setDisabled, setStyleProp, setText } from '../dom.ts';
import { formatDuration, formatNumber } from '../format.ts';

export function mountGardenView(root: HTMLElement, ctx: UiContext): View {
  const flowers = ctx.content.garden.flowers;
  const introText = document.createTextNode('');

  const plotRows = Array.from({ length: ctx.content.garden.plots }, (_, index) => {
    const title = document.createTextNode('');
    const status = document.createTextNode('');
    const emoji = h('div', { className: 'garden-plot-emoji', 'aria-hidden': 'true' }, ['🟫']);
    const fill = h('div', { className: 'progress-bar-inner' });
    const bar = h('div', { className: 'progress-bar', role: 'presentation' }, [fill]);
    const harvest = h('button', { className: 'buy-button' }, ['Recoger']) as HTMLButtonElement;
    harvest.addEventListener('click', () => ctx.dispatch((s) => void harvestFlower(s, ctx.content, index, Date.now(), Math.random())));
    const seeds = flowers.map((f) => {
      const btn = h('button', { className: 'chip chip-button', title: `Plantar ${f.name}` }, [f.emoji]) as HTMLButtonElement;
      btn.addEventListener('click', () => ctx.dispatch((s) => void plantFlower(s, ctx.content, index, f.id, Date.now())));
      return btn;
    });
    const seedRow = h('div', { className: 'chip-row' }, seeds);
    const el = h('div', { className: 'garden-plot' }, [emoji, h('div', { className: 'upgrade-name' }, [title]), h('div', { className: 'settings-hint' }, [status]), bar, harvest, seedRow]);
    return { el, title, status, emoji, fill, bar, harvest, seeds, seedRow };
  });

  const flowerRows = flowers.map((f) => {
    const nameText = document.createTextNode('');
    const flavorText = document.createTextNode('');
    const effectText = document.createTextNode('');
    const el = h('li', { className: 'cosmetic-row' }, [
      h('div', { className: 'row-art' }, [h('span', { className: 'garden-plot-emoji', 'aria-hidden': 'true' }, [f.emoji]), h('div', { className: 'upgrade-info' }, [h('span', { className: 'upgrade-name' }, [nameText]), h('span', { className: 'generator-flavor' }, [flavorText]), h('span', { className: 'upgrade-effect' }, [effectText])])]),
    ]);
    return { id: f.id, el, nameText, flavorText, effectText };
  });

  const container = h('div', { className: 'cosmetics-view' }, [
    h('h3', { className: 'fly-heading' }, ['Jardín']),
    h('p', { className: 'settings-hint' }, [introText]),
    h('div', { className: 'garden-plots' }, plotRows.map((r) => r.el)),
    h('h3', { className: 'fly-heading' }, ['Flores']),
    h('ul', { className: 'cosmetic-list' }, flowerRows.map((r) => r.el)),
  ]);
  root.appendChild(container);

  function update(state: GameState): void {
    const notation = state.settings.notation;
    const now = Date.now();
    const view = gardenView(state, ctx.content, now);
    if (!view.unlocked) {
      setText(introText, `El jardín se abre al ganar ${formatNumber(view.unlockAt, notation)} monedas en total (llevas ${formatNumber(state.lifetime, notation)}).`);
    } else {
      setText(introText, `Una semilla cuesta ${formatNumber(view.seedCost, notation)} monedas. Las flores crecen despacio, aunque cierres el juego. Cada flor distinta que recoges da un bono para siempre, y hay un ${view.shinyPercent} % de que salga brillante (el bono vale el doble).`);
    }
    setClass(container.querySelector('.garden-plots') as HTMLElement, 'hidden', !view.unlocked);

    view.plots.forEach((plot, i) => {
      const row = plotRows[i];
      if (!row) return;
      const empty = plot.flowerId === null;
      row.emoji.textContent = empty ? '🟫' : plot.ready ? plot.emoji : '🌱';
      setText(row.title, empty ? 'Parcela vacía' : plot.flowerName);
      setText(row.status, empty ? 'Elige qué plantar:' : plot.ready ? '¡Lista!' : `Crece… ${formatDuration(plot.readyInSeconds)}`);
      setStyleProp(row.fill, 'width', `${(plot.progress * 100).toFixed(1)}%`);
      setClass(row.bar, 'hidden', empty);
      setClass(row.harvest, 'hidden', !plot.ready);
      setClass(row.seedRow, 'hidden', !empty);
      view.flowers.forEach((f, k) => {
        const btn = row.seeds[k];
        if (!btn) return;
        setClass(btn, 'hidden', !f.available);
        setDisabled(btn, !view.canAffordSeed);
      });
    });

    view.flowers.forEach((f, i) => {
      const row = flowerRows[i];
      if (!row) return;
      setText(row.nameText, f.available || f.found ? `${f.name}${f.shiny ? ' ✨' : ''}${f.count > 0 ? ` ×${f.count}` : ''}` : '???');
      setText(row.flavorText, f.available || f.found ? `${f.flavor} Tarda ${f.growHours} h.` : `Recoge antes: ${f.requires ?? ''}`);
      setText(row.effectText, f.available || f.found ? (f.found ? `Bono activo: ${f.effectText}` : `Bono al recogerla: ${f.effectText}`) : '');
      setClass(row.el, 'cosmetic-row-locked', !f.found);
    });
  }

  return { update, destroy: () => container.remove() };
}
