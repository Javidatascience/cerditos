// La carrera de la cueva (a lo Idle Slayer), dibujada en un <canvas> en pixel art. El cerdito corre solo
// hacia la izquierda; los monstruos, las brasas, el portal del bonus y el jefe vienen hacia él. Tocar =
// saltar (o, peleando, dar un golpe más). Todo lo que da brasas lo aplican las acciones de core
// (caveRun, caveDefeat, caveBossWin…) con los números de core/cave.ts; aquí solo hay movimiento, azar
// de lo que aparece y dibujo. Solo corre con la pestaña abierta y visible.

import { caveBossLeave, caveBossWin, caveDefeat, caveRun } from '../../core/actions.ts';
import type { CaveView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext } from '../app.ts';
import { formatNumber } from '../format.ts';

const W = 200;
const H = 100;
const GROUND = 86;
/** Píxeles por metro. */
const PX_PER_M = 10;
const GRAVITY = 520;
const JUMP_SPEED = 230;
const PIG_X = W - 52;
/** Pelea máxima con un monstruo normal: si no cae, se aburre y se aparta. */
const MAX_FIGHT_SECONDS = 15;
const FLUSH_SECONDS = 0.5;

type Entity =
  | { kind: 'coin'; x: number; y: number; taken: boolean }
  | { kind: 'monster'; id: string; x: number; y: number; hp: number; maxHp: number; dead: boolean }
  | { kind: 'boss'; x: number; y: number; hp: number; maxHp: number; stage: number; gone: boolean }
  | { kind: 'portal'; x: number; y: number; used: boolean };

interface Float {
  text: string;
  x: number;
  y: number;
  age: number;
}

export interface CaveRunner {
  el: HTMLElement;
  setView(view: CaveView, state: GameState): void;
  destroy(): void;
}

function loadImage(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

export function mountCaveRunner(ctx: UiContext): CaveRunner {
  const base = import.meta.env.BASE_URL;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.className = 'cave-runner';
  canvas.setAttribute('role', 'button');
  canvas.setAttribute('aria-label', 'Carrera de la cueva: toca para saltar');
  canvas.tabIndex = 0;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;

  const images = new Map<string, HTMLImageElement>();
  const img = (path: string) => {
    let i = images.get(path);
    if (!i) {
      i = loadImage(`${base}${path}`);
      images.set(path, i);
    }
    return i;
  };

  let view: CaveView | null = null;
  let pigLayers: string[] = ['pig/rosa.png'];

  // Estado de la carrera (solo de esta pantalla)
  let entities: Entity[] = [];
  let floats: Float[] = [];
  let pigY = 0; // altura sobre el suelo (0 = en el suelo; negativo = arriba)
  let vy = 0;
  let jumpsLeft = 0;
  let fighting: Entity | null = null;
  let fightTime = 0;
  let hitTimer = 0;
  let bossTimer = 0;
  let bonusLeft = 0;
  let nextSpawnIn = 4;
  let pendingMeters = 0;
  let pendingCoins = 0;
  let flushTimer = 0;
  let scroll = 0;
  let runTime = 0;
  let lastBonusIndex = -1;
  let bossSpawned = false;
  let raf = 0;
  let last = 0;

  const grounded = () => pigY >= 0;
  const metersNow = () => (view?.meters ?? 0) + pendingMeters;

  function addFloat(text: string, x: number, y: number): void {
    if (!ctx.effectsOn()) return;
    floats.push({ text, x, y, age: 0 });
    if (floats.length > 8) floats.shift();
  }

  function flush(): void {
    if (pendingMeters <= 0 && pendingCoins <= 0) return;
    const meters = pendingMeters;
    const coins = pendingCoins;
    pendingMeters = 0;
    pendingCoins = 0;
    ctx.dispatch((s) => void caveRun(s, ctx.content, meters, coins));
  }

  function hit(target: Entity & { hp: number }, damage: number): void {
    target.hp -= damage;
    addFloat(formatNumber(damage, 'es'), target.x + 4 + Math.random() * 20, GROUND - 36 - Math.random() * 10);
  }

  function action(): void {
    if (!view) return;
    if (fighting && (fighting.kind === 'monster' || fighting.kind === 'boss')) {
      hit(fighting, view.runner.damage); // pelando: cada toque es un golpe más
      return;
    }
    if (grounded()) {
      vy = -JUMP_SPEED;
      pigY = -0.01;
      jumpsLeft = view.runner.extraJumps;
    } else if (jumpsLeft > 0) {
      vy = -JUMP_SPEED;
      jumpsLeft -= 1;
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    action();
  });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') {
      e.preventDefault();
      action();
    }
  });

  function spawn(): void {
    if (!view) return;
    const x = -24;
    if (bonusLeft > 0) {
      // fase de bonus: arcos de brasas, sin monstruos
      for (let i = 0; i < 6; i++) entities.push({ kind: 'coin', x: x - i * 12, y: GROUND - 14 - Math.round(Math.sin((i / 5) * Math.PI) * 34), taken: false });
      nextSpawnIn = 3;
      return;
    }
    const roll = Math.random();
    if (roll < 0.45 && view.monsters.length > 0) {
      const options = view.monsters;
      // los monstruos más nuevos salen menos que los de siempre
      const pick = options[Math.min(options.length - 1, Math.floor(Math.random() ** 1.6 * options.length))]!;
      entities.push({ kind: 'monster', id: pick.id, x, y: GROUND - 30, hp: pick.hp, maxHp: pick.hp, dead: false });
    } else if (roll < 0.8) {
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) entities.push({ kind: 'coin', x: x - i * 12, y: GROUND - 14, taken: false });
    } else {
      for (let i = 0; i < 5; i++) entities.push({ kind: 'coin', x: x - i * 12, y: GROUND - 14 - Math.round(Math.sin((i / 4) * Math.PI) * 40), taken: false });
    }
    nextSpawnIn = 5 + Math.random() * 9;
  }

  function step(dt: number): void {
    if (!view) return;
    runTime += dt;
    const r = view.runner;
    const pigLeft = PIG_X + 6;
    const pigRight = PIG_X + 30;
    const pigTop = GROUND - 26 + pigY;

    // ¿Pelea en curso?
    if (fighting) {
      hitTimer += dt;
      fightTime += dt;
      const target = fighting as Entity & { hp: number };
      while (hitTimer >= 1 / r.hitsPerSecond) {
        hitTimer -= 1 / r.hitsPerSecond;
        hit(target, r.damage);
      }
      if (fighting.kind === 'monster') {
        if (fighting.hp <= 0) {
          fighting.dead = true;
          const id = fighting.id;
          let gained = '';
          ctx.dispatch((s) => {
            gained = formatNumber(caveDefeat(s, ctx.content, id), s.settings.notation);
          });
          addFloat(`+${gained}`, fighting.x + 10, GROUND - 50);
          fighting = null;
        } else if (fightTime > MAX_FIGHT_SECONDS) {
          fighting.dead = true; // se aburre y se aparta
          addFloat('¡se va!', fighting.x + 8, GROUND - 50);
          fighting = null;
        }
      } else if (fighting.kind === 'boss') {
        bossTimer -= dt;
        if (fighting.hp <= 0) {
          fighting.gone = true;
          let gained = '';
          ctx.dispatch((s) => {
            gained = formatNumber(caveBossWin(s, ctx.content), s.settings.notation);
          });
          addFloat(`¡Jefe vencido! +${gained}`, 40, 24);
          fighting = null;
          bossSpawned = false;
        } else if (bossTimer <= 0) {
          fighting.gone = true;
          ctx.dispatch((s) => caveBossLeave(s, ctx.content));
          addFloat('El dragón se escapa…', 50, 24);
          fighting = null;
          bossSpawned = false;
        }
      }
    }

    // Movimiento del mundo (parado mientras pelea)
    const speedPx = fighting ? 0 : r.speed * PX_PER_M * (bonusLeft > 0 ? 1.4 : 1);
    const dx = speedPx * dt;
    scroll += dx;
    if (!fighting) {
      pendingMeters += dx / PX_PER_M;
      nextSpawnIn -= dx / PX_PER_M;
      if (nextSpawnIn <= 0) spawn();
    }
    if (bonusLeft > 0) bonusLeft -= dt;

    // Jefe y portal según los metros
    const meters = metersNow();
    if (!bossSpawned && bonusLeft <= 0 && meters >= view.boss.atMeters) {
      bossSpawned = true;
      entities.push({ kind: 'boss', x: -60, y: GROUND - 48, hp: view.boss.hp, maxHp: view.boss.hp, stage: view.boss.stage, gone: false });
    }
    const bonusIndex = Math.floor(meters / r.bonusEvery);
    if (lastBonusIndex < 0) lastBonusIndex = bonusIndex;
    if (bonusIndex > lastBonusIndex) {
      lastBonusIndex = bonusIndex;
      entities.push({ kind: 'portal', x: -30, y: GROUND - 34, used: false });
    }

    // Salto
    if (!grounded() || vy < 0) {
      vy += GRAVITY * dt;
      pigY += vy * dt;
      if (pigY >= 0) {
        pigY = 0;
        vy = 0;
      }
    }

    // Entidades
    for (const e of entities) {
      e.x += dx;
      if (e.kind === 'coin' && !e.taken) {
        const cx = e.x + 6;
        const cy = e.y + 6;
        const near = Math.hypot(cx - (pigLeft + pigRight) / 2, cy - (pigTop + 12)) < 16 + r.magnet;
        if (r.magnet > 0 && near) {
          e.x += ((pigLeft + pigRight) / 2 - cx) * Math.min(1, dt * 10);
          e.y += (pigTop + 12 - cy) * Math.min(1, dt * 10);
        }
        if (cx > pigLeft && cx < pigRight && cy > pigTop && cy < GROUND) {
          e.taken = true;
          pendingCoins += 1;
          addFloat(`+${formatNumber(view.coinEmbers, 'es')}`, e.x, e.y - 4);
        }
      } else if (e.kind === 'monster' && !e.dead && !fighting) {
        const mLeft = e.x + 6;
        const mRight = e.x + 26;
        // Salto automático (Ojo de lagarto): por encima de lo que tardaría en caer
        if (r.auto && grounded() && mRight > pigLeft - 26 && mRight < pigLeft && e.hp > r.damage * r.hitsPerSecond * 1.5) action();
        if (mRight > pigLeft && mLeft < pigRight && grounded()) {
          fighting = e;
          fightTime = 0;
          hitTimer = 0;
        }
      } else if (e.kind === 'boss' && !e.gone && !fighting) {
        if (e.x + 40 > pigLeft) {
          e.x = pigLeft - 40;
          fighting = e;
          fightTime = 0;
          hitTimer = 0;
          bossTimer = view.boss.seconds;
          flush();
        }
      } else if (e.kind === 'portal' && !e.used) {
        if (e.x + 20 > pigLeft && e.x < pigRight) {
          e.used = true;
          bonusLeft = r.bonusSeconds;
          nextSpawnIn = 1;
          addFloat('¡Fase de bonus!', 60, 30);
        }
      }
      // salto automático para las brasas altas
      if (r.auto && e.kind === 'coin' && !e.taken && grounded() && e.y < GROUND - 30 && e.x + 12 > pigLeft - 30 && e.x < pigLeft) action();
    }
    entities = entities.filter((e) => e.x < W + 20 && !(e.kind === 'coin' && e.taken) && !(e.kind === 'monster' && e.dead) && !(e.kind === 'boss' && e.gone) && !(e.kind === 'portal' && e.used));

    for (const f of floats) {
      f.age += dt;
      f.y -= dt * 18;
    }
    floats = floats.filter((f) => f.age < 1.2);

    flushTimer += dt;
    if (flushTimer >= FLUSH_SECONDS) {
      flushTimer = 0;
      flush();
    }
  }

  function draw(): void {
    const bonus = bonusLeft > 0;
    // fondo: cueva oscura con dos capas de rocas que se mueven a distinta velocidad
    g.fillStyle = bonus ? '#3b2252' : '#2a2030';
    g.fillRect(0, 0, W, H);
    for (const [speed, color, size] of [[0.25, bonus ? '#4b2d66' : '#3a2c40', 22], [0.55, bonus ? '#5a3779' : '#4a3850', 14]] as const) {
      g.fillStyle = color;
      const off = (scroll * speed) % 40;
      for (let x = -40; x < W + 40; x += 40) {
        const px = Math.floor(x + off);
        g.fillRect(px, 0, size, 6 + (size >> 2));
        g.fillRect(px + 4, 6 + (size >> 2), size - 8, 4);
        g.fillRect(px + 14, GROUND - size, size, size);
      }
    }
    // suelo
    g.fillStyle = '#6b4a3a';
    g.fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle = '#8a6450';
    g.fillRect(0, GROUND, W, 2);
    g.fillStyle = '#54392d';
    const tile = Math.floor(scroll % 16);
    for (let x = -16; x < W + 16; x += 16) g.fillRect(x + tile, GROUND + 6, 6, 2);

    // entidades
    for (const e of entities) {
      if (e.kind === 'coin') g.drawImage(img('art/ui/brasa.png'), Math.round(e.x), Math.round(e.y), 12, 12);
      else if (e.kind === 'portal') g.drawImage(img('art/monsters/portal.png'), Math.round(e.x), Math.round(e.y), 32, 32);
      else if (e.kind === 'monster') {
        g.drawImage(img(`art/monsters/${e.id}.png`), Math.round(e.x), Math.round(e.y), 32, 32);
        if (e.hp < e.maxHp) bar(e.x + 4, e.y - 4, 24, e.hp / e.maxHp, '#e04848');
      } else if (e.kind === 'boss') {
        g.drawImage(img(`art/cave/dragon-${e.stage}.png`), Math.round(e.x), Math.round(e.y), 48, 48);
        bar(e.x, e.y - 6, 48, e.hp / e.maxHp, '#f2a52b');
      }
    }

    // cerdito (con su piel y prendas), con un saltito al correr
    const bob = fighting || !grounded() ? 0 : Math.round(Math.abs(Math.sin(runTime * 14)) * 1.5);
    const y = Math.round(GROUND - 30 + pigY - bob);
    for (const layer of pigLayers) g.drawImage(img(layer), PIG_X, y, 36, 30);
    if (fighting && Math.floor(runTime * 8) % 2 === 0) {
      g.fillStyle = '#fff1b8';
      g.fillRect(PIG_X - 3, y + 14, 4, 2); // chispa del golpe
    }

    // jefe: tiempo que queda
    if (fighting?.kind === 'boss') {
      g.fillStyle = '#fff1b8';
      g.font = '8px "Jersey 10", monospace';
      g.fillText(`${Math.ceil(bossTimer)} s`, 4, 10);
    }
    if (bonus) {
      g.fillStyle = '#fff1b8';
      g.font = '8px "Jersey 10", monospace';
      g.fillText(`Bonus ${Math.ceil(bonusLeft)} s`, 4, 10);
    }

    // números que suben
    g.font = '8px "Jersey 10", monospace';
    for (const f of floats) {
      g.globalAlpha = Math.max(0, 1 - f.age / 1.2);
      g.fillStyle = '#3a2e26';
      g.fillText(f.text, Math.round(f.x) + 1, Math.round(f.y) + 1);
      g.fillStyle = '#ffd56b';
      g.fillText(f.text, Math.round(f.x), Math.round(f.y));
    }
    g.globalAlpha = 1;
  }

  function bar(x: number, y: number, w: number, fraction: number, color: string): void {
    g.fillStyle = '#1b1420';
    g.fillRect(Math.round(x), Math.round(y), w, 3);
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.max(0, Math.round(w * Math.max(0, fraction))), 3);
  }

  function frame(t: number): void {
    raf = requestAnimationFrame(frame);
    if (document.visibilityState !== 'visible') {
      last = t;
      return;
    }
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 0);
    last = t;
    step(dt);
    draw();
  }
  raf = requestAnimationFrame(frame);

  return {
    el: canvas,
    setView(next, state) {
      // si se ha renacido (los metros han bajado), se limpia la pantalla
      if (view && next.meters + 1 < view.meters) {
        entities = [];
        fighting = null;
        bossSpawned = false;
        lastBonusIndex = -1;
      }
      view = next;
      const worn = state.wardrobe.worn;
      pigLayers = [`pig/${state.activeSkin}.png`, ...[worn.tail, worn.body, worn.head].filter((x): x is string => x !== null).map((id) => `pig/acc/${id}.png`)];
    },
    destroy() {
      cancelAnimationFrame(raf);
      flush();
      canvas.remove();
    },
  };
}
