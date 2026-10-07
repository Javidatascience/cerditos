// Árbol de ventajas permanentes (estilo Cookie Clicker): cada nivel de cada ventaja es un círculo con el
// dibujo de la ventaja, unidos por líneas. Al conseguir un círculo se abren los siguientes (el nivel
// siguiente de la misma ventaja y las ramas que lo piden). Tocar un círculo abre un cuadro con el
// nombre, el nivel, el efecto, el coste y el botón de comprar. Los nodos se crean una vez y solo se
// actualizan, para que ningún clic se pierda. Ver docs/06-mina.md.

import { buyPerk } from '../../core/actions.ts';
import { perkViews, type PerkView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext, View } from '../app.ts';
import { artSprite } from '../art.ts';
import { h, setClass, setDisabled, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

const CELL_X = 48;
const CELL_Y = 58;
const PAD_X = 24;
const PAD_Y = 30;
const NODE = 42;
const SVG_NS = 'http://www.w3.org/2000/svg';
const BUBBLE_W = 230;

interface Node {
  perkId: string;
  level: number; // 1..max
  x: number;
  y: number;
  el: HTMLButtonElement;
  badge: Text;
}

export function mountPerkTreeView(root: HTMLElement, ctx: UiContext): View {
  const perks = ctx.content.perks.filter((p) => p.layout);
  const position = (perkId: string, level: number): { x: number; y: number } => {
    const perk = perks.find((p) => p.id === perkId)!;
    const l = perk.layout!;
    const col = l.dir === 'right' ? l.col + level - 1 : l.col;
    const row = l.dir === 'down' ? l.row + level - 1 : l.row;
    return { x: PAD_X + col * CELL_X, y: PAD_Y + row * CELL_Y };
  };

  const nodes: Node[] = [];
  for (const perk of perks) {
    for (let level = 1; level <= (perk.maxLevel ?? 1); level++) {
      const { x, y } = position(perk.id, level);
      const badge = document.createTextNode(String(level));
      const el = h('button', { className: 'perk-node', style: `left:${x - NODE / 2}px;top:${y - NODE / 2}px`, 'aria-label': `${perk.name}, nivel ${level}` }, [
        artSprite('ui', perk.icon ?? 'esmeralda', 'md'),
        h('span', { className: 'perk-node-level' }, [badge]),
      ]) as HTMLButtonElement;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        select(perk.id, level);
      });
      nodes.push({ perkId: perk.id, level, x, y, el, badge });
    }
  }

  const width = Math.max(...nodes.map((n) => n.x)) + PAD_X;
  const height = Math.max(...nodes.map((n) => n.y)) + PAD_Y + 6;

  // Líneas: entre niveles consecutivos de una ventaja y desde el nivel que abre una rama hasta su primer nivel.
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'perk-lines');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('aria-hidden', 'true');
  interface Link {
    line: SVGLineElement;
    from: Node;
    to: Node;
    gate: boolean;
  }
  const links: Link[] = [];
  const nodeAt = (perkId: string, level: number) => nodes.find((n) => n.perkId === perkId && n.level === level);
  function addLink(from: Node | undefined, to: Node | undefined, gate: boolean): void {
    if (!from || !to) return;
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(from.x));
    line.setAttribute('y1', String(from.y));
    line.setAttribute('x2', String(to.x));
    line.setAttribute('y2', String(to.y));
    svg.appendChild(line);
    links.push({ line, from, to, gate });
  }
  for (const perk of perks) {
    for (let level = 2; level <= (perk.maxLevel ?? 1); level++) addLink(nodeAt(perk.id, level - 1), nodeAt(perk.id, level), false);
    for (const req of perk.requires) addLink(nodeAt(req, perk.requiresLevel ?? 1), nodeAt(perk.id, 1), true);
  }

  // Cuadro de detalle (burbuja) del nodo elegido.
  let selected: { perkId: string; level: number } | null = null;
  const bubbleName = document.createTextNode('');
  const bubbleLevel = document.createTextNode('');
  const bubbleEffect = document.createTextNode('');
  const bubbleFlavor = document.createTextNode('');
  const bubbleNote = document.createTextNode('');
  const costText = document.createTextNode('');
  const buyButton = h('button', { className: 'buy-button' }, ['Comprar ', costText, artSprite('ui', 'esmeralda', 'sm')]) as HTMLButtonElement;
  buyButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (selected) {
      const id = selected.perkId;
      ctx.dispatch((s) => void buyPerk(s, ctx.content, id));
    }
  });
  const bubble = h('div', { className: 'perk-bubble hidden' }, [
    h('div', { className: 'upgrade-name' }, [bubbleName]),
    h('div', { className: 'generator-owned' }, [bubbleLevel]),
    h('div', { className: 'upgrade-effect' }, [bubbleEffect]),
    h('div', { className: 'generator-flavor' }, [bubbleFlavor]),
    h('div', { className: 'perk-locked' }, [bubbleNote]),
    buyButton,
  ]);
  bubble.addEventListener('click', (e) => e.stopPropagation());

  const tree = h('div', { className: 'perk-tree', style: `width:${width}px;height:${height}px` }, [svg as unknown as HTMLElement, ...nodes.map((n) => n.el), bubble]);
  tree.addEventListener('click', () => {
    selected = null;
    setClass(bubble, 'hidden', true);
    if (lastState) update(lastState);
  });
  const container = h('div', { className: 'perk-tree-wrap' }, [
    h('p', { className: 'settings-hint' }, ['Toca un círculo para ver la ventaja. Al conseguirla se abren las de al lado; algunas ramas piden un nivel concreto de la anterior.']),
    tree,
  ]);
  root.appendChild(container);

  let lastState: GameState | null = null;
  function select(perkId: string, level: number): void {
    selected = selected && selected.perkId === perkId && selected.level === level ? null : { perkId, level };
    if (lastState) update(lastState);
  }

  function update(state: GameState): void {
    lastState = state;
    const notation = state.settings.notation;
    const views = new Map<string, PerkView>(perkViews(state, ctx.content).map((v) => [v.id, v]));
    for (const n of nodes) {
      const v = views.get(n.perkId)!;
      const bought = v.level >= n.level;
      const next = !bought && v.level === n.level - 1 && v.requirementsMet;
      const affordable = next && v.cost.lte(state.plumas);
      setClass(n.el, 'perk-node-bought', bought);
      setClass(n.el, 'perk-node-next', next && !affordable);
      setClass(n.el, 'perk-node-affordable', affordable);
      setClass(n.el, 'perk-node-locked', !bought && !next);
      setClass(n.el, 'perk-node-selected', selected !== null && selected.perkId === n.perkId && selected.level === n.level);
    }
    for (const link of links) {
      const fromV = views.get(link.from.perkId)!;
      const toV = views.get(link.to.perkId)!;
      const fromDone = fromV.level >= link.from.level;
      const toDone = toV.level >= link.to.level;
      link.line.setAttribute('class', toDone ? 'perk-line perk-line-done' : fromDone ? 'perk-line perk-line-open' : 'perk-line');
    }

    if (!selected) {
      setClass(bubble, 'hidden', true);
      return;
    }
    const v = views.get(selected.perkId)!;
    const node = nodeAt(selected.perkId, selected.level)!;
    const bought = v.level >= selected.level;
    const next = !bought && v.level === selected.level - 1;
    setClass(bubble, 'hidden', false);
    setText(bubbleName, v.name);
    setText(bubbleLevel, `Nivel ${selected.level}${v.maxLevel !== null ? ` de ${v.maxLevel}` : ''}`);
    setText(bubbleEffect, v.effectTexts[selected.level - 1] ?? '');
    setText(bubbleFlavor, v.flavor);
    const cost = v.costs[selected.level - 1] ?? v.cost;
    setText(costText, `${formatNumber(cost, notation)} `);
    const blockedBy = !v.requirementsMet ? `Requiere: ${v.missingRequirements.join(', ')}` : '';
    setText(bubbleNote, bought ? 'Conseguido' : next ? blockedBy : `Primero consigue el nivel ${selected.level - 1}.`);
    const canBuy = next && v.requirementsMet;
    setClass(buyButton, 'hidden', !canBuy);
    setDisabled(buyButton, !v.purchasable);
    // Posición: debajo del nodo (o encima si no cabe), sin salirse del árbol por los lados.
    const left = Math.min(Math.max(node.x - BUBBLE_W / 2, 0), Math.max(0, width - BUBBLE_W));
    const top = node.y > height - 170 ? node.y - NODE / 2 - 8 - 160 : node.y + NODE / 2 + 8;
    bubble.style.left = `${left}px`;
    bubble.style.top = `${Math.max(0, top)}px`;
  }

  return { update, destroy: () => container.remove() };
}
