// Granja animada: un canvas con la escena del mundo (cielo, colinas, vallas, edificios…) y tus
// cerditos paseando por ella. Cada tipo de cerdito aparece hasta 3 veces según cuántos tengas.
// También saca los "+N" que suben al rascar la barriga. Todo se apaga con el ajuste "Efectos" o
// con `prefers-reduced-motion` (entonces se dibuja una sola imagen fija). Es solo presentación:
// no cambia el estado del juego.

import type { GameState } from '../core/state.ts';
import type { UiContext } from './app.ts';
import { generatorSprite } from './art.ts';
import { h } from './dom.ts';

export interface FarmScene {
  update(state: GameState): void;
  /** Muestra un número que sube y se desvanece (si los efectos están activados). */
  floatText(text: string): void;
  destroy(): void;
}

interface Pig {
  genId: string;
  slot: number;
  index: number;
  sprite: HTMLImageElement;
  x: number;
  y: number;
  vx: number;
  timer: number;
  phase: number;
  born: number;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  speed: number;
}

const HEIGHT = 170;
const MAX_PER_TYPE = 3;

/** Cuántos cerditos se dibujan de un tipo según cuántos hay: 1 → 1, 10 → 2, 100+ → 3. */
export function visiblePigs(owned: number): number {
  if (!(owned >= 1)) return 0;
  return Math.min(MAX_PER_TYPE, 1 + Math.floor(Math.log10(owned)));
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------------------------------------------------------------------------
// Fondos (se dibujan una vez por tamaño en un canvas aparte)
// ---------------------------------------------------------------------------

function sky(ctx: CanvasRenderingContext2D, w: number, gTop: number, top: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, 0, 0, gTop);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, gTop + 2);
}

function ground(ctx: CanvasRenderingContext2D, w: number, h2: number, gTop: number, top: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, gTop, 0, h2);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, gTop, w, h2 - gTop);
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function hills(ctx: CanvasRenderingContext2D, w: number, gTop: number, color: string, amp: number, phase: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, gTop + 2);
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, gTop - amp * (0.5 + 0.5 * Math.sin(x / 55 + phase)));
  ctx.lineTo(w, gTop + 2);
  ctx.fill();
}

function drawBackground(worldId: string, w: number, h2: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h2));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const gTop = h2 * 0.5;

  if (worldId === 'bosque') {
    sky(ctx, w, gTop, '#c4dcc9', '#e7f0e1');
    disc(ctx, w * 0.8, 30, 14, '#f4efc8');
    hills(ctx, w, gTop, '#8fb08a', 26, 1);
    for (let i = 0; i < Math.ceil(w / 34); i++) {
      const x = 8 + i * 34;
      const tall = 46 + ((i * 11) % 22);
      ctx.fillStyle = i % 2 ? '#4f7a4c' : '#3f6a3f';
      ctx.beginPath();
      ctx.moveTo(x, gTop + 8);
      ctx.lineTo(x + 15, gTop + 8 - tall);
      ctx.lineTo(x + 30, gTop + 8);
      ctx.fill();
      ctx.fillStyle = '#6b4f3a';
      ctx.fillRect(x + 13, gTop + 8, 4, 8);
    }
    ground(ctx, w, h2, gTop + 8, '#6f9a5a', '#4f7a40');
    for (let i = 0; i < 7; i++) {
      const x = ((i * 53 + 20) % Math.max(60, w - 20)) + 10;
      const y = gTop + 30 + ((i * 29) % (h2 - gTop - 44));
      ctx.fillStyle = '#f2ecd9';
      ctx.fillRect(x - 1.5, y, 3, 7);
      disc(ctx, x, y, 5, i % 2 ? '#d9534f' : '#b5651d');
    }
  } else if (worldId === 'huerta') {
    sky(ctx, w, gTop, '#f6dfb4', '#fbf1d9');
    disc(ctx, w * 0.15, 32, 16, '#f6c667');
    hills(ctx, w, gTop, '#c9d49b', 14, 2);
    ground(ctx, w, h2, gTop, '#a97c50', '#8a6140');
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < Math.ceil(w / 22); i++) {
        const x = 8 + i * 22 + (row % 2) * 9;
        const y = gTop + 12 + row * 13;
        ctx.fillStyle = '#5f9a45';
        ctx.fillRect(x - 5, y - 2, 10, 4);
        disc(ctx, x, y - 3, 4.5, row === 1 ? '#e7893f' : '#7fb85a');
      }
    }
  } else if (worldId === 'balneario') {
    sky(ctx, w, gTop, '#d6e8f1', '#f1f7fa');
    hills(ctx, w, gTop, '#bcd3c9', 18, 0.5);
    ground(ctx, w, h2, gTop, '#dccfba', '#c9b99f');
    ctx.fillStyle = '#7fc1d3';
    ctx.beginPath();
    ctx.roundRect(w * 0.25, gTop + 8, w * 0.5, 36, 14);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.roundRect(w * 0.28, gTop + 12, w * 0.44, 7, 4);
    ctx.fill();
    for (let i = 0; i < 6; i++) disc(ctx, w * 0.3 + i * (w * 0.08), gTop + 30 + (i % 2) * 5, 3 + (i % 3), 'rgba(255,255,255,0.7)');
  } else {
    sky(ctx, w, gTop, '#bfe0f3', '#f4eed3');
    disc(ctx, w * 0.82, 32, 16, '#f7d65e');
    hills(ctx, w, gTop, '#a8cc84', 20, 0);
    hills(ctx, w, gTop + 6, '#92bd70', 12, 2.2);
    ground(ctx, w, h2, gTop + 6, '#8fc468', '#6fae52');
    // establo
    const bx = w * 0.08;
    ctx.fillStyle = '#b8473d';
    ctx.fillRect(bx, gTop - 30, 62, 40);
    ctx.fillStyle = '#7a2f29';
    ctx.beginPath();
    ctx.moveTo(bx - 6, gTop - 30);
    ctx.lineTo(bx + 31, gTop - 52);
    ctx.lineTo(bx + 68, gTop - 30);
    ctx.fill();
    ctx.fillStyle = '#f4ead7';
    ctx.fillRect(bx + 20, gTop - 12, 22, 22);
    ctx.strokeStyle = '#b8473d';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 20, gTop - 12, 22, 22);
    ctx.beginPath();
    ctx.moveTo(bx + 20, gTop - 12);
    ctx.lineTo(bx + 42, gTop + 10);
    ctx.moveTo(bx + 42, gTop - 12);
    ctx.lineTo(bx + 20, gTop + 10);
    ctx.stroke();
    // valla
    ctx.fillStyle = '#8b6b4a';
    for (let x = 6; x < w; x += 22) ctx.fillRect(x, gTop + 6, 4, 16);
    ctx.fillRect(0, gTop + 10, w, 3);
    ctx.fillRect(0, gTop + 17, w, 3);
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Escena
// ---------------------------------------------------------------------------

export function mountFarmScene(root: HTMLElement, ctx: UiContext): FarmScene {
  const worldId = ctx.activeWorld();
  const world = ctx.content.worlds.find((w) => w.id === worldId);
  if (!world) throw new Error(`Mundo desconocido: ${worldId}`);

  const canvas = h('canvas', { className: 'farm-canvas', 'aria-hidden': 'true' }) as HTMLCanvasElement;
  const floats = h('div', { className: 'float-layer' });
  const container = h('div', { className: 'farm-scene' }, [canvas, floats]);
  root.appendChild(container);

  const g = canvas.getContext('2d');
  let width = 0;
  let dpr = 1;
  let background: HTMLCanvasElement | null = null;
  let pigs: Pig[] = [];
  let clouds: Cloud[] = [];
  let effectsOn = true;
  let raf = 0;
  let lastTime = 0;
  let destroyed = false;

  const groundTop = () => HEIGHT * 0.5;
  const animating = () => effectsOn && !prefersReducedMotion() && !document.hidden && !destroyed;

  function layout(): void {
    const rect = container.getBoundingClientRect();
    if (rect.width < 10) return;
    const firstLayout = width === 0;
    width = rect.width;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    background = drawBackground(worldId, width, HEIGHT);
    clouds = [0, 1, 2].map((i) => ({ x: (width / 3) * i + 20, y: 16 + i * 14, w: 46 + i * 12, speed: 4 + i * 2 }));
    // Los cerditos creados antes de conocer el ancho se reparten ahora por la granja.
    for (const pig of pigs) pig.x = firstLayout ? 20 + Math.random() * Math.max(10, width - 40) : Math.min(Math.max(pig.x, 20), width - 20);
    draw(performance.now());
  }

  function spawn(genId: string, index: number, slot: number): Pig {
    const gTop = groundTop();
    return {
      genId,
      slot,
      index,
      sprite: generatorSprite(worldId, index, genId),
      x: 20 + Math.random() * Math.max(10, width - 40),
      y: gTop + 22 + Math.random() * (HEIGHT - gTop - 44),
      vx: 0,
      timer: Math.random() * 2,
      phase: Math.random() * 6,
      born: performance.now(),
    };
  }

  function syncPigs(state: GameState): void {
    const worldState = state.worlds[worldId];
    if (!worldState) return;
    const wanted: { genId: string; index: number; slot: number }[] = [];
    world!.generators.forEach((gen, index) => {
      const owned = worldState.generators[gen.id]?.owned.toNumber() ?? 0;
      for (let slot = 0; slot < visiblePigs(owned); slot++) wanted.push({ genId: gen.id, index, slot });
    });
    const keep = new Map(pigs.map((p) => [`${p.genId}:${p.slot}`, p]));
    pigs = wanted.map((w) => keep.get(`${w.genId}:${w.slot}`) ?? spawn(w.genId, w.index, w.slot));
  }

  function step(dt: number): void {
    for (const pig of pigs) {
      pig.timer -= dt;
      if (pig.timer <= 0) {
        if (pig.vx === 0) {
          pig.vx = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 14);
          pig.timer = 1.5 + Math.random() * 3;
        } else {
          pig.vx = 0;
          pig.timer = 1 + Math.random() * 3;
        }
      }
      pig.x += pig.vx * dt;
      if (pig.x < 20) {
        pig.x = 20;
        pig.vx = Math.abs(pig.vx);
      } else if (pig.x > width - 20) {
        pig.x = width - 20;
        pig.vx = -Math.abs(pig.vx);
      }
      pig.phase += dt * (pig.vx !== 0 ? 9 : 2);
    }
    for (const cloud of clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x - cloud.w > width) cloud.x = -cloud.w;
    }
  }

  function draw(now: number): void {
    if (!g || width === 0) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, HEIGHT);
    if (background) g.drawImage(background, 0, 0, width, HEIGHT);

    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (const cloud of clouds) {
      g.beginPath();
      g.ellipse(cloud.x, cloud.y, cloud.w / 2, 8, 0, 0, Math.PI * 2);
      g.ellipse(cloud.x - cloud.w / 4, cloud.y - 5, cloud.w / 4, 7, 0, 0, Math.PI * 2);
      g.ellipse(cloud.x + cloud.w / 5, cloud.y - 6, cloud.w / 5, 7, 0, 0, Math.PI * 2);
      g.fill();
    }

    const gTop = groundTop();
    const ordered = [...pigs].sort((a, b) => a.y - b.y);
    for (const pig of ordered) {
      const depth = (pig.y - gTop) / (HEIGHT - gTop);
      const size = 40 * (0.8 + 0.3 * Math.min(1, Math.max(0, depth)));
      const age = Math.min(1, (now - pig.born) / 300);
      const pop = effectsOn ? age : 1;
      const bob = pig.vx !== 0 && effectsOn ? -Math.abs(Math.sin(pig.phase)) * 3 : 0;
      g.fillStyle = 'rgba(0,0,0,0.16)';
      g.beginPath();
      g.ellipse(pig.x, pig.y + size * 0.42, size * 0.38 * pop, size * 0.1 * pop, 0, 0, Math.PI * 2);
      g.fill();
      if (!pig.sprite.complete || pig.sprite.naturalWidth === 0) continue;
      g.save();
      g.translate(pig.x, pig.y + bob);
      g.scale(pig.vx < 0 ? -pop : pop, pop);
      g.drawImage(pig.sprite, -size / 2, -size / 2, size, size);
      g.restore();
    }
  }

  function tick(now: number): void {
    raf = 0;
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    step(dt);
    draw(now);
    ensureLoop();
  }

  function ensureLoop(): void {
    if (raf !== 0 || !animating()) return;
    raf = requestAnimationFrame((t) => {
      if (lastTime === 0) lastTime = t;
      tick(t);
    });
  }

  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => layout()) : null;
  resizeObserver?.observe(container);
  const onVisibility = () => {
    lastTime = 0;
    ensureLoop();
  };
  document.addEventListener('visibilitychange', onVisibility);
  layout();

  return {
    update(state) {
      effectsOn = state.settings.effects;
      syncPigs(state);
      if (animating()) ensureLoop();
      else draw(performance.now());
    },
    floatText(text) {
      if (!effectsOn || prefersReducedMotion()) return;
      while (floats.childElementCount >= 6) floats.firstElementChild?.remove();
      const el = h('span', { className: 'float-text' }, [text]);
      el.style.left = `${30 + Math.random() * 40}%`;
      el.addEventListener('animationend', () => el.remove());
      floats.appendChild(el);
    },
    destroy() {
      destroyed = true;
      if (raf !== 0) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      container.remove();
    },
  };
}
