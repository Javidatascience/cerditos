// Vista principal (hito 1, mínima). Patrón de vista completo (mount/update por pestaña,
// UiContext con dispatch) llega en el hito 3; ver docs/02-arquitectura.md §8.

import { buyGenerator, tap } from '../core/actions.ts';
import { generatorCost, getWorldDef, productionPerSecond } from '../core/formulas.ts';
import type { GameState } from '../core/state.ts';
import type { Content } from '../content/types.ts';
import { h, setDisabled, setText } from './dom.ts';
import { formatNumber } from './format.ts';

export interface App {
  update(state: GameState): void;
}

interface GeneratorRow {
  genId: string;
  ownedText: Text;
  costText: Text;
  buyButton: HTMLButtonElement;
}

export function mountApp(root: HTMLElement, content: Content, state: GameState): App {
  const world = getWorldDef(content, state.activeWorld);

  const currencyText = document.createTextNode('');
  const perSecondText = document.createTextNode('');

  const tapButton = h('button', { className: 'tap-button' }, ['Rascar la barriga']);
  tapButton.addEventListener('click', () => {
    tap(state, world.id);
    render();
  });

  const rows: GeneratorRow[] = [];
  const generatorList = h(
    'ul',
    { className: 'generator-list' },
    world.generators.map((gen) => {
      const ownedText = document.createTextNode('');
      const costText = document.createTextNode('');
      const buyButton = h('button', { className: 'buy-button' }, ['Comprar (', costText, ')']) as HTMLButtonElement;
      buyButton.addEventListener('click', () => {
        buyGenerator(state, content, world.id, gen.id);
        render();
      });
      rows.push({ genId: gen.id, ownedText, costText, buyButton });
      return h('li', { className: 'generator-row' }, [
        h('div', { className: 'generator-info' }, [
          h('span', { className: 'generator-name' }, [gen.name]),
          h('span', { className: 'generator-owned' }, [ownedText]),
        ]),
        buyButton,
      ]);
    }),
  );

  root.appendChild(
    h('div', { className: 'app' }, [
      h('header', { className: 'app-header' }, [
        h('div', { className: 'currency-row' }, [h('span', { className: 'currency-name' }, [world.currency + ': ']), currencyText]),
        h('div', { className: 'per-second-row' }, [perSecondText]),
      ]),
      tapButton,
      generatorList,
    ]),
  );

  function render(): void {
    const worldState = state.worlds[world.id];
    if (!worldState) return;
    setText(currencyText, formatNumber(worldState.currency));
    setText(perSecondText, `+${formatNumber(productionPerSecond(state, content, world.id))}/s`);
    for (const row of rows) {
      const genState = worldState.generators[row.genId];
      if (!genState) continue;
      setText(row.ownedText, `× ${formatNumber(genState.owned)}`);
      const gen = world.generators.find((g) => g.id === row.genId);
      if (!gen) continue;
      const cost = generatorCost(world, gen, genState.bought);
      setText(row.costText, formatNumber(cost));
      setDisabled(row.buyButton, worldState.currency.lt(cost));
    }
  }

  render();
  return { update: render };
}
