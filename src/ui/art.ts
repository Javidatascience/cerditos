// Ilustraciones estáticas sencillas (docs/01 §3: "iconos simples, nada que rebote, gire o
// brille"). Un cerdito de SVG plano cuyo color sale del cerdito/variedad; y un emoji por mundo.
// Es solo presentación: el contenido (src/content) no sabe de colores.

const SVG_NS = 'http://www.w3.org/2000/svg';

export const WORLD_EMOJI: Record<string, string> = { valle: '🌾', bosque: '🌲', huerta: '🥕', balneario: '♨️' };

/** Tonos de piel por mundo (uno por cerdito, por orden). */
const WORLD_PIGS: Record<string, string[]> = {
  valle: ['#f4c7c3', '#efb0b0', '#d98a63', '#6f6a6a', '#4a4545', '#b98c78', '#7a4f3f', '#f2e3da'],
  bosque: ['#d9b99b', '#c49a74', '#a67c52', '#8b6b4a', '#6f5a45'],
  huerta: ['#f4c7c3', '#f0d29a', '#e7a779', '#d9c27c', '#c9d49b', '#e8b86d', '#bfa05a', '#a68c4f'],
  balneario: ['#f4d3d3', '#c9a28a', '#b7c9d6', '#9fc3c9', '#e6c8e0', '#d6c2a2', '#a9bfd0', '#c5d8c2'],
};
const FALLBACK_PIGS = ['#f4c7c3', '#d98a63', '#9fc3c9', '#c9d49b', '#b98c78'];

function colorFor(worldId: string, index: number): string {
  const palette = WORLD_PIGS[worldId] ?? FALLBACK_PIGS;
  return palette[index % palette.length] ?? '#f4c7c3';
}

function node<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/** Cerdito de frente en SVG plano. `skin` es el color del cuerpo; `locked` lo apaga (álbum). */
export function pigIcon(skin: string, locked = false): SVGSVGElement {
  const svg = node('svg', { viewBox: '0 0 48 48', class: locked ? 'pig-icon pig-icon-locked' : 'pig-icon', 'aria-hidden': 'true', focusable: 'false' });
  const ink = '#3a2e26';
  svg.append(
    node('path', { d: 'M9 14 L16 5 L21 15 Z', fill: skin, stroke: ink, 'stroke-width': '1.5', 'stroke-linejoin': 'round' }),
    node('path', { d: 'M39 14 L32 5 L27 15 Z', fill: skin, stroke: ink, 'stroke-width': '1.5', 'stroke-linejoin': 'round' }),
    node('ellipse', { cx: '24', cy: '27', rx: '18', ry: '16', fill: skin, stroke: ink, 'stroke-width': '1.5' }),
    node('ellipse', { cx: '24', cy: '31', rx: '8', ry: '6', fill: '#f2a6a6', stroke: ink, 'stroke-width': '1.5' }),
    node('circle', { cx: '21', cy: '31', r: '1.3', fill: ink }),
    node('circle', { cx: '27', cy: '31', r: '1.3', fill: ink }),
    node('circle', { cx: '17', cy: '22', r: '2', fill: ink }),
    node('circle', { cx: '31', cy: '22', r: '2', fill: ink }),
  );
  return svg;
}

/** Icono del cerdito número `index` (0-based) del mundo. */
export function generatorIcon(worldId: string, index: number): SVGSVGElement {
  return pigIcon(colorFor(worldId, index));
}

/** Icono de una variedad del álbum: el color sale de un hash estable del id. */
export function varietyIcon(id: string, owned: boolean): SVGSVGElement {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return pigIcon(colorFor('', hash), !owned);
}
