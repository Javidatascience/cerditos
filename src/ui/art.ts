// Ilustraciones estáticas (docs/01 §3: nada que rebote, gire o brille). Un cerdito de SVG plano
// con accesorio propio por cerdito/variedad, una escena de cabecera por mundo y emojis para
// mejoras y ventajas. Es solo presentación: el contenido (src/content) no sabe de colores.

const SVG_NS = 'http://www.w3.org/2000/svg';
const INK = '#3a2e26';

export const WORLD_EMOJI: Record<string, string> = { valle: '🌾', pocilga: '🐽', bosque: '🌲', huerta: '🥕', balneario: '♨️' };

/** Icono de la moneda de cada mundo (para la cabecera). */
export const CURRENCY_EMOJI: Record<string, string> = { valle: '🌰', pocilga: '🪙', bosque: '🍄', huerta: '🎃', balneario: '🫧' };

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
const GENERATOR_ACCESSORY: Record<string, Accessory> = {
  lechon: 'none', 'cerdita-rosa': 'flower', duroc: 'cap', pietrain: 'scarf', berkshire: 'glasses', mangalica: 'leaf', iberico: 'hat', 'gran-blanco': 'crown',
  buscadora: 'leaf', 'madre-trufera': 'hat', 'abuela-sabia': 'glasses', 'clan-del-roble': 'mushroom', 'espiritu-del-bosque': 'star',
  hortelana: 'hat', regador: 'cap', escardadora: 'scarf', 'cuidador-de-tomates': 'bow', 'pastora-de-gallinas': 'flower', apicultor: 'glasses', 'jardinera-jefa': 'crown', 'abuelo-del-huerto': 'mushroom',
  cochinillo: 'none', cerdito: 'bow', 'cerdo-joven': 'cap', 'cerdo-robusto': 'scarf', verraco: 'glasses', 'cerdo-de-feria': 'flower', 'cerdo-campeon': 'crown', 'cerdo-alado': 'star', 'cerdo-estelar': 'star', 'cerdo-cosmico': 'crown',
  banista: 'towel', 'cerdita-del-barro': 'none', masajista: 'scarf', socorrista: 'cap', termalista: 'cucumbers', 'maestra-de-sales': 'flower', 'director-del-spa': 'glasses', 'cerdo-zen': 'star',
};

const ACCESSORIES: Accessory[] = ['none', 'hat', 'bow', 'glasses', 'leaf', 'flower', 'crown', 'cap', 'mushroom', 'towel', 'scarf', 'star', 'cucumbers'];

/** Tonos de piel por mundo (uno por cerdito, por orden). */
const WORLD_PIGS: Record<string, string[]> = {
  valle: ['#f4c7c3', '#efb0b0', '#d98a63', '#8a8484', '#5d5656', '#b98c78', '#7a4f3f', '#f6e8df'],
  bosque: ['#d9b99b', '#c49a74', '#a67c52', '#8b6b4a', '#6f5a45'],
  huerta: ['#f4c7c3', '#f0d29a', '#e7a779', '#d9c27c', '#c9d49b', '#e8b86d', '#bfa05a', '#a68c4f'],
  pocilga: ['#f6d4d0', '#f4c7c3', '#efb0b0', '#e89a9a', '#d98a63', '#c9a24a', '#d8b84a', '#9fc3e6', '#b79de6', '#f2c94c'],
  balneario: ['#f4d3d3', '#c9a28a', '#b7c9d6', '#9fc3c9', '#e6c8e0', '#d6c2a2', '#a9bfd0', '#c5d8c2'],
};
const FALLBACK_PIGS = ['#f4c7c3', '#d98a63', '#9fc3c9', '#c9d49b', '#b98c78', '#e6c8e0'];

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

const spriteCache = new Map<string, HTMLImageElement>();

/** Imagen (para el canvas de la granja animada) del cerdito `genId` del mundo, en caché. */
export function generatorSprite(worldId: string, index: number, genId: string): HTMLImageElement {
  const key = `${worldId}:${genId}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;
  const svg = generatorIcon(worldId, index, genId);
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('width', '96');
  svg.setAttribute('height', '96');
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  spriteCache.set(key, image);
  return image;
}

function pigColor(worldId: string, index: number): string {
  const palette = WORLD_PIGS[worldId] ?? FALLBACK_PIGS;
  return palette[index % palette.length] ?? '#f4c7c3';
}

/** Icono del cerdito `genId`, número `index` (0-based) del mundo. */
export function generatorIcon(worldId: string, index: number, genId?: string): SVGSVGElement {
  return pigIcon(pigColor(worldId, index), (genId && GENERATOR_ACCESSORY[genId]) || 'none');
}

/** Icono de una variedad del álbum: color y accesorio salen de un hash estable del id. */
export function varietyIcon(id: string, owned: boolean): SVGSVGElement {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const accessory = ACCESSORIES[(hash >>> 3) % ACCESSORIES.length] ?? 'none';
  return pigIcon(pigColor('', hash), accessory, !owned);
}

// ---------------------------------------------------------------------------
// Emojis de mejoras, ventajas y logros
// ---------------------------------------------------------------------------

const UPGRADE_EMOJI: Record<string, string> = {
  'paja-fresca': '🌾', 'charca-de-barro': '💧', 'rascador-de-roble': '🪵', 'acordeon-del-abuelo': '🪗', 'huerto-de-manzanos': '🍎', 'siesta-a-la-sombra': '😴', 'fiesta-de-san-anton': '🎉', 'pocilga-con-vistas': '🏡',
  'hocico-entrenado': '👃', 'mapa-de-robles': '🗺️', 'cesta-de-mimbre': '🧺', 'linterna-de-luciernagas': '🏮', 'cancion-del-bosque': '🎶', 'musgo-mullido': '🌿',
  'semillas-antiguas': '🌱', 'compost-casero': '🪱', 'espantapajaros-amable': '🧑‍🌾', 'riego-por-goteo': '🚿', invernadero: '🏕️', 'calendario-lunar': '🌙', 'abejas-amigas': '🐝', 'fiesta-de-la-cosecha': '🎃',
  'toallas-calentitas': '🧖', 'barro-volcanico': '🌋', 'pepinos-en-los-ojos': '🥒', 'hilo-musical': '🎵', 'albornoces-bordados': '👘', 'aromas-de-lavanda': '💜',
};

const PERK_EMOJI: Record<string, string> = {
  abono: '🌱', comienzo: '🎒', ahorro: '🏷️', mejoras: '🔧', vuelo: '🪶', puente: '🤝', establo: '🏠', raices: '🌳',
};

const ACHIEVEMENT_EMOJI = '🏅';

function badge(emoji: string, locked = false): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = locked ? 'emoji-badge emoji-badge-locked' : 'emoji-badge';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = emoji;
  return el;
}

/** Imagen de una mejora global (por id). */
export function upgradeBadge(upgradeId: string, worldId: string): HTMLSpanElement {
  return badge(UPGRADE_EMOJI[upgradeId] ?? WORLD_EMOJI[worldId] ?? '⭐');
}

/** Imagen de una ventaja permanente (id con forma `mundo.local`). */
export function perkBadge(perkId: string): HTMLSpanElement {
  return badge(PERK_EMOJI[perkId.split('.')[1] ?? ''] ?? '⭐');
}

export function achievementBadge(owned: boolean): HTMLSpanElement {
  return badge(ACHIEVEMENT_EMOJI, !owned);
}

// ---------------------------------------------------------------------------
// Escena de cabecera por mundo
// ---------------------------------------------------------------------------

function gradient(id: string, top: string, bottom: string): SVGLinearGradientElement {
  const g = node('linearGradient', { id, x1: '0', y1: '0', x2: '0', y2: '1' });
  g.append(node('stop', { offset: '0', 'stop-color': top }), node('stop', { offset: '1', 'stop-color': bottom }));
  return g;
}

/** Escena estática y apagada que va detrás de la cabecera. */
export function worldBanner(worldId: string): SVGSVGElement {
  const svg = node('svg', { viewBox: '0 0 400 100', preserveAspectRatio: 'xMidYMid slice', class: 'world-banner', 'aria-hidden': 'true', focusable: 'false' });
  const defs = node('defs', {});
  svg.append(defs);
  const sky = `sky-${worldId}`;

  if (worldId === 'bosque') {
    defs.append(gradient(sky, '#cfe3d4', '#eaf2e6'));
    svg.append(node('rect', { width: '400', height: '100', fill: `url(#${sky})` }), node('circle', { cx: '330', cy: '26', r: '12', fill: '#f6f1d0' }));
    for (let i = 0; i < 12; i++) {
      const x = 15 + i * 34;
      const h = 38 + ((i * 7) % 18);
      svg.append(node('path', { d: `M${x} 100 L${x + 16} ${100 - h} L${x + 32} 100 Z`, fill: i % 2 ? '#5f8a5a' : '#4f7a4c' }), node('rect', { x: String(x + 14), y: '96', width: '4', height: '4', fill: '#6b4f3a' }));
    }
  } else if (worldId === 'huerta') {
    defs.append(gradient(sky, '#f9e7c6', '#fbf3df'));
    svg.append(node('rect', { width: '400', height: '100', fill: `url(#${sky})` }), node('circle', { cx: '60', cy: '26', r: '13', fill: '#f6c667' }), node('rect', { y: '58', width: '400', height: '42', fill: '#a97c50' }));
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 20; i++) {
        svg.append(node('circle', { cx: String(10 + i * 20 + (row % 2) * 8), cy: String(66 + row * 11), r: '4.5', fill: row === 1 ? '#e7893f' : '#6aa84f' }));
      }
    }
  } else if (worldId === 'balneario') {
    defs.append(gradient(sky, '#dcecf3', '#f3f8fa'));
    svg.append(
      node('rect', { width: '400', height: '100', fill: `url(#${sky})` }),
      node('rect', { x: '0', y: '62', width: '400', height: '38', fill: '#8fc1d1' }),
      node('rect', { x: '0', y: '62', width: '400', height: '5', fill: '#a9d3df' }),
    );
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 62;
      svg.append(node('path', { d: `M${x} 58 q8 -12 0 -22 q-8 -10 0 -22`, stroke: '#ffffff', 'stroke-width': '4', 'stroke-linecap': 'round', fill: 'none', opacity: '0.8' }));
    }
  } else {
    defs.append(gradient(sky, '#cfe8f5', '#f8f1dc'));
    svg.append(
      node('rect', { width: '400', height: '100', fill: `url(#${sky})` }),
      node('circle', { cx: '340', cy: '26', r: '14', fill: '#f6d56a' }),
      node('path', { d: 'M0 100 V70 Q60 44 130 66 T270 62 T400 70 V100 Z', fill: '#a8cc84' }),
      node('path', { d: 'M0 100 V82 Q80 62 160 80 T320 78 T400 84 V100 Z', fill: '#86b866' }),
    );
    for (let i = 0; i < 9; i++) svg.append(node('rect', { x: String(20 + i * 44), y: '76', width: '4', height: '14', fill: '#8b6b4a' }));
    svg.append(node('rect', { x: '16', y: '80', width: '372', height: '3', fill: '#8b6b4a' }));
  }
  return svg;
}
