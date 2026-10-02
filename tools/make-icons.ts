// Genera los iconos de la PWA (PNG) y el favicon (SVG) con un cerdito sencillo, sin dependencias:
// rasteriza unas pocas formas con suavizado y escribe el PNG con zlib. Uso: node tools/make-icons.ts
// Salida: public/icons/*.png y public/favicon.svg. Ver docs/04 hito 10.

import { crc32, deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

type RGB = [number, number, number];
interface Shape {
  fill: RGB;
  contains(x: number, y: number): boolean;
}

const INK: RGB = [0x3a, 0x2e, 0x26];
const SKIN: RGB = [0xf4, 0xc7, 0xc3];
const PINK: RGB = [0xf2, 0xa6, 0xa6];
const CREAM: RGB = [0xfa, 0xf6, 0xef];
const WHITE: RGB = [255, 255, 255];

function ellipse(cx: number, cy: number, rx: number, ry: number, fill: RGB): Shape {
  return { fill, contains: (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 };
}

function triangle(p: [number, number][], fill: RGB): Shape {
  const [a, b, c] = p as [[number, number], [number, number], [number, number]];
  const sign = (p1: [number, number], p2: [number, number], p3: [number, number]) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  return {
    fill,
    contains: (x, y) => {
      const d1 = sign([x, y], a, b);
      const d2 = sign([x, y], b, c);
      const d3 = sign([x, y], c, a);
      return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
    },
  };
}

/** Triángulo agrandado `k` veces desde su centro (para el contorno). */
function grown(p: [number, number][], k: number): [number, number][] {
  const cx = p.reduce((s, q) => s + q[0], 0) / p.length;
  const cy = p.reduce((s, q) => s + q[1], 0) / p.length;
  return p.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}

const LEFT_EAR: [number, number][] = [[9, 14], [16, 5], [21, 15]];
const RIGHT_EAR: [number, number][] = [[39, 14], [32, 5], [27, 15]];

/** Cerdito de frente en un lienzo de 48×48 (las mismas formas que ui/art.ts > pigIcon). */
const PIG: Shape[] = [
  triangle(grown(LEFT_EAR, 1.14), INK),
  triangle(grown(RIGHT_EAR, 1.14), INK),
  triangle(LEFT_EAR, SKIN),
  triangle(RIGHT_EAR, SKIN),
  ellipse(24, 27, 18.8, 16.8, INK),
  ellipse(24, 27, 18, 16, SKIN),
  ellipse(11.5, 30, 3.6, 3.6, [0xf3, 0xb4, 0xb2]),
  ellipse(36.5, 30, 3.6, 3.6, [0xf3, 0xb4, 0xb2]),
  ellipse(17, 22, 2.3, 2.3, INK),
  ellipse(31, 22, 2.3, 2.3, INK),
  ellipse(17.7, 21.2, 0.7, 0.7, WHITE),
  ellipse(31.7, 21.2, 0.7, 0.7, WHITE),
  ellipse(24, 31, 8.7, 6.7, INK),
  ellipse(24, 31, 8, 6, PINK),
  ellipse(21.4, 31, 1.2, 1.7, INK),
  ellipse(26.6, 31, 1.2, 1.7, INK),
];

function render(size: number, contentFraction: number, background: RGB): Buffer {
  const scale = (size * contentFraction) / 48;
  const offset = (size - 48 * scale) / 2;
  const SS = 3; // suavizado: 3×3 muestras por píxel
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let py = 0; py < size; py++) {
    raw[py * (size * 3 + 1)] = 0; // filtro 0
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS - offset) / scale;
          const y = (py + (sy + 0.5) / SS - offset) / scale;
          let color = background;
          for (const shape of PIG) if (shape.contains(x, y)) color = shape.fill;
          r += color[0];
          g += color[1];
          b += color[2];
        }
      }
      const n = SS * SS;
      const o = py * (size * 3 + 1) + 1 + px * 3;
      raw[o] = Math.round(r / n);
      raw[o + 1] = Math.round(g / n);
      raw[o + 2] = Math.round(b / n);
    }
  }
  return raw;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

function png(size: number, contentFraction: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(render(size, contentFraction, CREAM), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, 0.82));
writeFileSync('public/icons/icon-512.png', png(512, 0.82));
// Maskable: el contenido debe caber en el círculo seguro (80 % centrado), así que algo más pequeño.
writeFileSync('public/icons/icon-maskable-512.png', png(512, 0.62));
writeFileSync('public/icons/apple-touch-icon-180.png', png(180, 0.82));

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="10" fill="#faf6ef"/>
  <g stroke="#3a2e26" stroke-width="1.4" stroke-linejoin="round">
    <path d="M9 14 L16 5 L21 15 Z" fill="#f4c7c3"/>
    <path d="M39 14 L32 5 L27 15 Z" fill="#f4c7c3"/>
    <ellipse cx="24" cy="27" rx="18" ry="16" fill="#f4c7c3"/>
    <ellipse cx="24" cy="31" rx="8" ry="6" fill="#f2a6a6"/>
  </g>
  <circle cx="17" cy="22" r="2.2" fill="#3a2e26"/><circle cx="31" cy="22" r="2.2" fill="#3a2e26"/>
  <ellipse cx="21.4" cy="31" rx="1.2" ry="1.7" fill="#3a2e26"/><ellipse cx="26.6" cy="31" rx="1.2" ry="1.7" fill="#3a2e26"/>
</svg>
`;
writeFileSync('public/favicon.svg', favicon);
console.log('Iconos generados en public/');
