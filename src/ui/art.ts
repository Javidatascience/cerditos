// Ilustraciones sencillas: el cerdito picador en SVG plano, con complementos según las herramientas
// que tiene, y emojis para las herramientas. Es solo presentación:
// el contenido (src/content) no sabe de colores. (El arte definitivo llega al final del proyecto.)

const SVG_NS = 'http://www.w3.org/2000/svg';
const INK = '#3a2e26';

function node<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function stroke(extra: Record<string, string>): Record<string, string> {
  return { stroke: INK, 'stroke-width': '1.4', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', ...extra };
}

// ---------------------------------------------------------------------------
// Cerditos
// ---------------------------------------------------------------------------

type Accessory = 'none' | 'hat' | 'bow' | 'glasses' | 'leaf' | 'flower' | 'crown' | 'cap' | 'mushroom' | 'towel' | 'scarf' | 'star' | 'cucumbers';

/** Accesorio de cada cerdito (por id). */
function accessoryNodes(kind: Accessory): SVGElement[] {
  switch (kind) {
    case 'none':
      return [];
    case 'hat':
      return [
        node('ellipse', stroke({ cx: '24', cy: '12', rx: '16', ry: '3.4', fill: '#e2c277' })),
        node('path', stroke({ d: 'M15 12 Q15 2 24 2 Q33 2 33 12 Z', fill: '#edd08a' })),
        node('rect', { x: '15', y: '9', width: '18', height: '2.4', fill: '#b5483f' }),
      ];
    case 'bow':
      return [
        node('path', stroke({ d: 'M32 9 L40 4 L40 14 Z', fill: '#e0607e' })),
        node('path', stroke({ d: 'M32 9 L24 4 L24 14 Z', fill: '#e0607e' })),
        node('circle', stroke({ cx: '32', cy: '9', r: '2.3', fill: '#c94566' })),
      ];
    case 'glasses':
      return [
        node('circle', stroke({ cx: '17', cy: '22', r: '5.2', fill: '#ffffff', 'fill-opacity': '0.4' })),
        node('circle', stroke({ cx: '31', cy: '22', r: '5.2', fill: '#ffffff', 'fill-opacity': '0.4' })),
        node('path', stroke({ d: 'M22 22 H26', fill: 'none' })),
      ];
    case 'leaf':
      return [
        node('path', stroke({ d: 'M24 12 C22 4 30 1 37 2 C37 10 31 14 24 12 Z', fill: '#6aa84f' })),
        node('path', { d: 'M26 10 L34 4', stroke: '#3f7a30', 'stroke-width': '1.2', fill: 'none' }),
      ];
    case 'flower':
      return [
        ...[0, 72, 144, 216, 288].map((a) =>
          node('circle', { cx: String(36 + 3.4 * Math.cos((a * Math.PI) / 180)), cy: String(10 + 3.4 * Math.sin((a * Math.PI) / 180)), r: '2.6', fill: '#f6a5c0', stroke: INK, 'stroke-width': '0.8' }),
        ),
        node('circle', { cx: '36', cy: '10', r: '2', fill: '#f2c94c', stroke: INK, 'stroke-width': '0.8' }),
      ];
    case 'crown':
      return [node('path', stroke({ d: 'M13 14 L14 3 L20 9 L24 2 L28 9 L34 3 L35 14 Z', fill: '#f2c94c' })), node('circle', { cx: '24', cy: '9', r: '1.6', fill: '#d9534f' })];
    case 'cap':
      return [node('path', stroke({ d: 'M10 17 Q10 3 24 3 Q38 3 38 17 Z', fill: '#4a78a8' })), node('path', stroke({ d: 'M30 15 H44', fill: 'none', 'stroke-width': '3' }))];
    case 'mushroom':
      return [
        node('path', stroke({ d: 'M10 15 Q10 -1 24 -1 Q38 -1 38 15 Z', fill: '#d9534f' })),
        node('circle', { cx: '19', cy: '8', r: '2.2', fill: '#fff' }),
        node('circle', { cx: '28', cy: '5', r: '1.8', fill: '#fff' }),
        node('circle', { cx: '31', cy: '11', r: '1.6', fill: '#fff' }),
      ];
    case 'towel':
      return [
        node('path', stroke({ d: 'M9 17 Q24 2 39 17 L39 12 Q24 -3 9 12 Z', fill: '#ffffff' })),
        node('path', { d: 'M13 10 Q24 -1 35 10', stroke: '#6fa8dc', 'stroke-width': '1.6', fill: 'none' }),
      ];
    case 'scarf':
      return [node('path', stroke({ d: 'M9 36 Q24 47 39 36 L39 41 Q24 52 9 41 Z', fill: '#d9534f' })), node('rect', stroke({ x: '30', y: '40', width: '5', height: '8', rx: '1.5', fill: '#d9534f' }))];
    case 'star':
      return [node('path', stroke({ d: 'M37 3 L38.9 7.6 L44 8 L40.2 11.3 L41.3 16.2 L37 13.6 L32.7 16.2 L33.8 11.3 L30 8 L35.1 7.6 Z', fill: '#f2c94c' }))];
    case 'cucumbers':
      return [
        node('circle', stroke({ cx: '17', cy: '22', r: '4.8', fill: '#a7d37a' })),
        node('circle', stroke({ cx: '31', cy: '22', r: '4.8', fill: '#a7d37a' })),
        node('circle', { cx: '17', cy: '22', r: '1.6', fill: '#e7f3c9' }),
        node('circle', { cx: '31', cy: '22', r: '1.6', fill: '#e7f3c9' }),
      ];
  }
}

/** Cerdito de frente en SVG plano. `skin`: color del cuerpo; `accessory`: complemento; `locked`: lo apaga. */
export function pigIcon(skin: string, accessory: Accessory = 'none', locked = false): SVGSVGElement {
  const svg = node('svg', { viewBox: '0 0 48 48', class: locked ? 'pig-icon pig-icon-locked' : 'pig-icon', 'aria-hidden': 'true', focusable: 'false' });
  svg.append(
    node('path', stroke({ d: 'M8 15 Q8 4 17 5 L21 15 Z', fill: skin })),
    node('path', stroke({ d: 'M40 15 Q40 4 31 5 L27 15 Z', fill: skin })),
    node('path', { d: 'M11 13 Q11 8 16 8.5 L18 13 Z', fill: '#f2a6a6', opacity: '0.7' }),
    node('path', { d: 'M37 13 Q37 8 32 8.5 L30 13 Z', fill: '#f2a6a6', opacity: '0.7' }),
    node('ellipse', stroke({ cx: '24', cy: '27', rx: '18', ry: '16', fill: skin })),
    node('ellipse', { cx: '24', cy: '38', rx: '13', ry: '4.5', fill: '#000', opacity: '0.07' }),
    node('circle', { cx: '11.5', cy: '30', r: '3.6', fill: '#f2a6a6', opacity: '0.55' }),
    node('circle', { cx: '36.5', cy: '30', r: '3.6', fill: '#f2a6a6', opacity: '0.55' }),
  );
  if (accessory !== 'cucumbers') {
    svg.append(
      node('circle', { cx: '17', cy: '22', r: '2.1', fill: INK }),
      node('circle', { cx: '31', cy: '22', r: '2.1', fill: INK }),
      node('circle', { cx: '17.7', cy: '21.2', r: '0.7', fill: '#fff' }),
      node('circle', { cx: '31.7', cy: '21.2', r: '0.7', fill: '#fff' }),
    );
  }
  svg.append(
    node('ellipse', stroke({ cx: '24', cy: '31', rx: '8', ry: '6', fill: '#f2a6a6' })),
    node('ellipse', { cx: '21.4', cy: '31', rx: '1.2', ry: '1.7', fill: INK }),
    node('ellipse', { cx: '26.6', cy: '31', rx: '1.2', ry: '1.7', fill: INK }),
  );
  svg.append(...accessoryNodes(accessory));
  return svg;
}

/** Piel del cerdito picador. */
export const PIG_SKIN = '#f4c7c3';

/** El cerdito picador, con más complementos cuanto más lejos ha llegado en herramientas (índice de la mejor que tiene, o -1). */
export function minerPig(bestToolIndex: number, skin: string = PIG_SKIN): SVGSVGElement {
  const accessory: Accessory = bestToolIndex >= 8 ? 'crown' : bestToolIndex >= 5 ? 'glasses' : bestToolIndex >= 0 ? 'cap' : 'none';
  return pigIcon(skin, accessory);
}

/** Insignia con un emoji (piezas, materiales, zonas…). */
export function emojiBadge(emoji: string, locked = false): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = locked ? 'emoji-badge emoji-badge-locked' : 'emoji-badge';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = emoji;
  return el;
}
