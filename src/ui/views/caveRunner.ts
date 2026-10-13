// La carrera de la cueva (a lo Idle Slayer), dibujada en un <canvas> en pixel art. El cerdito corre solo de
// izquierda a derecha; los monstruos, las brasas, los cofres, el portal del bonus y el jefe vienen hacia él.
// Los monstruos caen al chocar con ellos (a los que vuelan hay que alcanzarlos saltando). Tocar = saltar
// (contra el jefe, un golpe más). Derrotar monstruos llena la barra de furia. Todo lo que da brasas, almas
// o semillas lo aplican las acciones de core (caveRun, caveDefeat, caveChest, caveBossWin…) con los números
// de core/cave.ts; aquí solo hay movimiento, el azar de lo que aparece y el dibujo. Solo corre con la
// pestaña abierta y visible.

import { caveBossLeave, caveBossWin, caveChest, caveDefeat, caveRun } from '../../core/actions.ts';
import type { CaveView } from '../../core/selectors.ts';
import type { GameState } from '../../core/state.ts';
import type { UiContext } from '../app.ts';
import { h, setClass, setDisabled, setStyleProp, setText } from '../dom.ts';
import { formatNumber } from '../format.ts';

const W = 240;
const H = 180;
const GROUND = 150;
/** Píxeles por metro. */
const PX_PER_M = 10;
const GRAVITY = 560;
const JUMP_SPEED = 250;
const PIG_X = 28;
const FLUSH_SECONDS = 0.5;
/** Altura (sobre el suelo, en px) de los monstruos que vuelan: bajos y altos. */
const FLY_HEIGHTS = [34, 58];

type Entity =
  | { kind: 'coin'; x: number; y: number; taken: boolean }
  | { kind: 'monster'; id: string; x: number; y: number; flies: boolean; evolved: boolean; dead: boolean; phase: number }
  | { kind: 'boss'; x: number; y: number; hp: number; maxHp: number; stage: number; gone: boolean }
  | { kind: 'chest'; x: number; y: number; opened: boolean }
  | { kind: 'portal'; x: number; y: number; used: boolean };

interface Float {
  text: string;
  x: number;
  y: number;
  age: number;
  color: string;
}

export interface CaveRunner {
  el: HTMLElement;
  setView(view: CaveView, state: GameState): void;
  destroy(): void;
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

  // Furia: se llena derrotando monstruos y se activa con su botón.
  const rageFill = h('div', { className: 'progress-bar-inner' });
  const rageText = document.createTextNode('');
  const rageButton = h('button', { className: 'buy-button rage-button' }, [rageText]) as HTMLButtonElement;
  rageButton.addEventListener('click', () => {
    if (!view || rageCharge < view.runner.rageKills) return;
    rageCharge = 0;
    rageLeft = view.runner.rageSeconds;
    addFloat('¡FURIA!', W / 2 - 16, 40, '#ff6b4a');
  });
  const rageRow = h('div', { className: 'rage-row' }, [h('div', { className: 'progress-bar rage-bar', role: 'presentation' }, [rageFill]), rageButton]);
  const el = h('div', { className: 'cave-runner-wrap' }, [canvas, rageRow]);

  const images = new Map<string, HTMLImageElement>();
  const img = (path: string) => {
    let i = images.get(path);
    if (!i) {
      i = new Image();
      i.src = `${base}${path}`;
      images.set(path, i);
    }
    return i;
  };

  let view: CaveView | null = null;
  let pigLayers: string[] = ['pig/rosa.png'];

  let entities: Entity[] = [];
  let floats: Float[] = [];
  let pigY = 0; // altura sobre el suelo (0 = en el suelo; negativo = arriba)
  let vy = 0;
  let jumpsLeft = 0;
  let boss: (Entity & { kind: 'boss' }) | null = null;
  let hitTimer = 0;
  let bossTimer = 0;
  let bonusLeft = 0;
  let rageLeft = 0;
  let rageCharge = 0;
  let nextSpawnIn = 3;
  let nextChestIn = 200;
  let pendingMeters = 0;
  let pendingCoins = 0;
  let pendingRageCoins = 0;
  let flushTimer = 0;
  let scroll = 0;
  let runTime = 0;
  let lastBonusIndex = -1;
  let bossSpawned = false;
  let raf = 0;
  let last = 0;

  const grounded = () => pigY >= 0;
  const metersNow = () => (view?.meters ?? 0) + pendingMeters;
  const notation = () => 'es' as const;

  function addFloat(text: string, x: number, y: number, color = '#ffd56b'): void {
    if (!ctx.effectsOn()) return;
    floats.push({ text, x, y, age: 0, color });
    if (floats.length > 10) floats.shift();
  }

  function flush(): void {
    if (pendingMeters <= 0 && pendingCoins <= 0 && pendingRageCoins <= 0) return;
    const meters = pendingMeters;
    const coins = pendingCoins;
    const rageCoins = pendingRageCoins;
    pendingMeters = 0;
    pendingCoins = 0;
    pendingRageCoins = 0;
    ctx.dispatch((s) => {
      caveRun(s, ctx.content, meters, coins);
      if (rageCoins > 0) caveRun(s, ctx.content, 0, rageCoins, true);
    });
  }

  function action(): void {
    if (!view) return;
    if (boss && bossTimer > 0) {
      boss.hp -= view.runner.damage; // contra el jefe, cada toque es un golpe más
      addFloat(formatNumber(view.runner.damage, notation()), boss.x + 8 + Math.random() * 30, boss.y - 4 - Math.random() * 10);
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
    const x = W + 8;
    if (bonusLeft > 0) {
      // fase de bonus: arcos de brasas, sin monstruos
      for (let i = 0; i < 7; i++) entities.push({ kind: 'coin', x: x + i * 12, y: GROUND - 14 - Math.round(Math.sin((i / 6) * Math.PI) * 50), taken: false });
      nextSpawnIn = 3;
      return;
    }
    const roll = Math.random();
    if (roll < 0.5 && view.monsters.length > 0) {
      // los monstruos más nuevos salen menos que los de siempre; a veces en grupo
      const group = Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 2) : 1;
      for (let k = 0; k < group; k++) {
        const options = view.monsters;
        const pick = options[Math.min(options.length - 1, Math.floor(Math.random() ** 1.6 * options.length))]!;
        const height = pick.flies ? FLY_HEIGHTS[Math.floor(Math.random() * FLY_HEIGHTS.length)]! : 0;
        entities.push({ kind: 'monster', id: pick.id, x: x + k * 40, y: GROUND - 30 - height, flies: pick.flies, evolved: pick.evolved, dead: false, phase: Math.random() * 6 });
      }
    } else if (roll < 0.82) {
      const n = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) entities.push({ kind: 'coin', x: x + i * 12, y: GROUND - 14, taken: false });
    } else {
      for (let i = 0; i < 6; i++) entities.push({ kind: 'coin', x: x + i * 12, y: GROUND - 14 - Math.round(Math.sin((i / 5) * Math.PI) * 56), taken: false });
    }
    nextSpawnIn = 4 + Math.random() * 8;
  }

  function step(dt: number): void {
    if (!view) return;
    runTime += dt;
    const r = view.runner;
    const pigLeft = PIG_X + 6;
    const pigRight = PIG_X + 32;
    const pigTop = GROUND - 26 + pigY;
    const pigBottom = GROUND + pigY;
    const raging = rageLeft > 0;

    // Jefe: se para y le pega
    if (boss && bossTimer > 0) {
      hitTimer += dt;
      bossTimer -= dt;
      while (hitTimer >= 1 / r.hitsPerSecond) {
        hitTimer -= 1 / r.hitsPerSecond;
        boss.hp -= r.damage;
        addFloat(formatNumber(r.damage, notation()), boss.x + 8 + Math.random() * 30, boss.y - 4 - Math.random() * 10);
      }
      if (boss.hp <= 0) {
        boss.gone = true;
        let gained = '';
        ctx.dispatch((s) => {
          gained = formatNumber(caveBossWin(s, ctx.content), s.settings.notation);
        });
        addFloat(`¡Jefe vencido! +${gained}`, 50, 40, '#fff1b8');
        boss = null;
        bossSpawned = false;
      } else if (bossTimer <= 0) {
        boss.gone = true;
        ctx.dispatch((s) => caveBossLeave(s, ctx.content));
        addFloat('El dragón se escapa…', 60, 40, '#fff1b8');
        boss = null;
        bossSpawned = false;
      }
    }
    const fighting = boss !== null && bossTimer > 0;

    // Movimiento del mundo (parado contra el jefe)
    const speedPx = fighting ? 0 : r.speed * PX_PER_M * (bonusLeft > 0 ? 1.4 : 1) * (raging ? 1.3 : 1);
    const dx = speedPx * dt;
    scroll += dx;
    if (!fighting) {
      pendingMeters += dx / PX_PER_M;
      nextSpawnIn -= dx / PX_PER_M;
      nextChestIn -= dx / PX_PER_M;
      if (nextSpawnIn <= 0) spawn();
      if (nextChestIn <= 0 && bonusLeft <= 0) {
        entities.push({ kind: 'chest', x: W + 8, y: GROUND - 20, opened: false });
        nextChestIn = r.chestEvery * (0.6 + Math.random() * 0.8);
      }
    }
    if (bonusLeft > 0) bonusLeft -= dt;
    if (rageLeft > 0) rageLeft -= dt;

    // Jefe y portal según los metros
    const meters = metersNow();
    if (!bossSpawned && bonusLeft <= 0 && meters >= view.boss.atMeters) {
      bossSpawned = true;
      entities.push({ kind: 'boss', x: W + 10, y: GROUND - 48, hp: view.boss.hp, maxHp: view.boss.hp, stage: view.boss.stage, gone: false });
    }
    const bonusIndex = Math.floor(meters / r.bonusEvery);
    if (lastBonusIndex < 0) lastBonusIndex = bonusIndex;
    if (bonusIndex > lastBonusIndex) {
      lastBonusIndex = bonusIndex;
      entities.push({ kind: 'portal', x: W + 8, y: GROUND - 34, used: false });
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

    // Entidades (vienen de la derecha)
    for (const e of entities) {
      e.x -= dx;
      if (e.kind === 'coin' && !e.taken) {
        const cx = e.x + 6;
        const cy = e.y + 6;
        if (r.magnet > 0 && Math.hypot(cx - (pigLeft + pigRight) / 2, cy - (pigTop + 12)) < 18 + r.magnet) {
          e.x += ((pigLeft + pigRight) / 2 - cx) * Math.min(1, dt * 10);
          e.y += (pigTop + 12 - cy) * Math.min(1, dt * 10);
        }
        if (cx > pigLeft && cx < pigRight && cy > pigTop && cy < pigBottom) {
          e.taken = true;
          if (raging) pendingRageCoins += 1;
          else pendingCoins += 1;
          addFloat(`+${formatNumber(raging ? view.coinEmbers.mul(r.rageMult) : view.coinEmbers, notation())}`, e.x, e.y - 4);
        }
      } else if (e.kind === 'monster' && !e.dead) {
        if (e.flies) e.y += Math.sin(runTime * 4 + e.phase) * 0.4; // aleteo
        const mLeft = e.x + 6;
        const mRight = e.x + 26;
        const mTop = e.y + 6;
        const mBottom = e.y + 28;
        if (mRight > pigLeft && mLeft < pigRight && mBottom > pigTop && mTop < pigBottom) {
          e.dead = true;
          rageCharge = raging ? rageCharge : Math.min(r.rageKills, rageCharge + 1);
          const id = e.id;
          let text = '';
          let seed = '';
          ctx.dispatch((s) => {
            const res = caveDefeat(s, ctx.content, id, Math.random(), raging);
            text = `+${formatNumber(res.embers, s.settings.notation)} · ${res.souls} alma${res.souls === 1 ? '' : 's'}`;
            seed = res.seed ? (ctx.content.garden.flowers.find((f) => f.id === res.seed)?.name ?? '') : '';
          });
          addFloat(text, e.x - 10, e.y - 6);
          if (seed) addFloat(`¡Semilla de ${seed.toLowerCase()}!`, 30, 50, '#9be36b');
        }
      } else if (e.kind === 'chest' && !e.opened) {
        if (e.x + 6 < pigRight && e.x + 22 > pigLeft && pigBottom > e.y) {
          e.opened = true;
          let text = '';
          ctx.dispatch((s) => {
            const res = caveChest(s, ctx.content, Math.random());
            text =
              res.kind === 'seed'
                ? `¡Semilla de ${ctx.content.garden.flowers.find((f) => f.id === res.seed)?.name.toLowerCase() ?? ''}!`
                : res.kind === 'souls'
                  ? `Cofre: +${res.souls} almas`
                  : `Cofre: +${formatNumber(res.embers, s.settings.notation)} brasas`;
          });
          addFloat(text, 40, 56, '#fff1b8');
        }
      } else if (e.kind === 'boss' && !e.gone && !boss) {
        if (e.x < pigRight + 2) {
          e.x = pigRight + 2;
          boss = e;
          hitTimer = 0;
          bossTimer = view.boss.seconds;
          flush();
        }
      } else if (e.kind === 'portal' && !e.used) {
        if (e.x < pigRight && e.x + 24 > pigLeft) {
          e.used = true;
          bonusLeft = r.bonusSeconds;
          nextSpawnIn = 1;
          addFloat('¡Fase de bonus!', 70, 50, '#d6a8ff');
        }
      }
    }
    entities = entities.filter((e) => e.x > -60 && !(e.kind === 'coin' && e.taken) && !(e.kind === 'monster' && e.dead) && !(e.kind === 'boss' && e.gone) && !(e.kind === 'portal' && e.used) && !(e.kind === 'chest' && e.opened));

    for (const f of floats) {
      f.age += dt;
      f.y -= dt * 20;
    }
    floats = floats.filter((f) => f.age < 1.3);

    flushTimer += dt;
    if (flushTimer >= FLUSH_SECONDS) {
      flushTimer = 0;
      flush();
    }
  }

  function bar(x: number, y: number, w: number, fraction: number, color: string): void {
    g.fillStyle = '#1b1420';
    g.fillRect(Math.round(x), Math.round(y), w, 4);
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.max(0, Math.round(w * Math.max(0, fraction))), 4);
  }

  function draw(): void {
    const bonus = bonusLeft > 0;
    const raging = rageLeft > 0;
    // fondo: cueva oscura con capas de rocas que se mueven a distinta velocidad
    g.fillStyle = bonus ? '#3b2252' : raging ? '#3a1a1e' : '#2a2030';
    g.fillRect(0, 0, W, H);
    const layers = [
      [0.2, bonus ? '#4b2d66' : raging ? '#4f2226' : '#3a2c40', 30],
      [0.5, bonus ? '#5a3779' : raging ? '#62292c' : '#4a3850', 18],
    ] as const;
    for (const [speed, color, size] of layers) {
      g.fillStyle = color;
      const off = (scroll * speed) % 48;
      for (let x = -48; x < W + 48; x += 48) {
        const px = Math.floor(x - off);
        g.fillRect(px, 0, size, 8 + (size >> 2)); // estalactitas
        g.fillRect(px + 5, 8 + (size >> 2), size - 10, 6);
        g.fillRect(px + 18, GROUND - size, size, size); // rocas del fondo
      }
    }
    // suelo
    g.fillStyle = '#6b4a3a';
    g.fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle = '#8a6450';
    g.fillRect(0, GROUND, W, 2);
    g.fillStyle = '#54392d';
    const tile = Math.floor(scroll % 16);
    for (let x = -16; x < W + 16; x += 16) {
      g.fillRect(x - tile, GROUND + 8, 6, 2);
      g.fillRect(x - tile + 8, GROUND + 18, 4, 2);
    }

    // entidades (los monstruos se dibujan mirando hacia el cerdito)
    for (const e of entities) {
      if (e.kind === 'coin') g.drawImage(img('art/ui/brasa.png'), Math.round(e.x), Math.round(e.y), 12, 12);
      else if (e.kind === 'portal') g.drawImage(img('art/monsters/portal.png'), Math.round(e.x), Math.round(e.y), 32, 32);
      else if (e.kind === 'chest') g.drawImage(img('art/monsters/cofre.png'), Math.round(e.x), Math.round(e.y), 24, 24);
      else if (e.kind === 'monster') {
        const size = e.evolved ? 36 : 32;
        const mx = Math.round(e.x);
        const my = Math.round(e.y + 32 - size);
        g.save();
        g.translate(mx + size, my);
        g.scale(-1, 1);
        g.drawImage(img(`art/monsters/${e.id}.png`), 0, 0, size, size);
        g.restore();
        if (e.evolved) g.drawImage(img('art/ui/brillo.png'), mx + size - 10, my - 4, 12, 12); // los evolucionados brillan
      } else if (e.kind === 'boss') {
        g.drawImage(img(`art/cave/dragon-${e.stage}.png`), Math.round(e.x), Math.round(e.y), 48, 48);
        if (e === boss) bar(e.x, e.y - 8, 48, e.hp / e.maxHp, '#f2a52b');
      }
    }

    // cerdito (con su piel y prendas) mirando a la derecha, con un saltito al correr
    const bob = boss || !grounded() ? 0 : Math.round(Math.abs(Math.sin(runTime * 14)) * 1.5);
    const y = Math.round(GROUND - 30 + pigY - bob);
    g.save();
    g.translate(PIG_X + 36, y);
    g.scale(-1, 1);
    for (const layer of pigLayers) g.drawImage(img(layer), 0, 0, 36, 30);
    g.restore();
    if (boss && Math.floor(runTime * 8) % 2 === 0) {
      g.fillStyle = '#fff1b8';
      g.fillRect(PIG_X + 36, y + 14, 4, 2); // chispa del golpe
    }

    g.font = '10px "Jersey 10", monospace';
    g.fillStyle = '#fff1b8';
    const metersLabel = `${Math.floor(metersNow())} m`;
    g.fillText(metersLabel, W / 2 - g.measureText(metersLabel).width / 2, 14);
    if (boss) g.fillText(`Jefe: ${Math.ceil(bossTimer)} s`, 6, 14);
    else if (bonus) g.fillText(`Bonus ${Math.ceil(bonusLeft)} s`, 6, 14);
    if (raging) {
      g.fillStyle = '#ff6b4a';
      g.fillText(`Furia ×${view?.runner.rageMult ?? 1} · ${Math.ceil(rageLeft)} s`, W - 86, 14);
    }

    // números que suben
    for (const f of floats) {
      g.globalAlpha = Math.max(0, 1 - f.age / 1.3);
      g.fillStyle = '#2a1e1a';
      g.fillText(f.text, Math.round(f.x) + 1, Math.round(f.y) + 1);
      g.fillStyle = f.color;
      g.fillText(f.text, Math.round(f.x), Math.round(f.y));
    }
    g.globalAlpha = 1;
  }

  function updateRage(): void {
    if (!view) return;
    const full = rageCharge >= view.runner.rageKills;
    setStyleProp(rageFill, 'width', `${((rageLeft > 0 ? rageLeft / view.runner.rageSeconds : rageCharge / view.runner.rageKills) * 100).toFixed(1)}%`);
    setText(rageText, rageLeft > 0 ? `¡Furia! ${Math.ceil(rageLeft)} s` : full ? '¡Furia!' : `Furia ${rageCharge}/${view.runner.rageKills}`);
    setDisabled(rageButton, !full || rageLeft > 0);
    setClass(rageRow, 'rage-active', rageLeft > 0);
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
    updateRage();
  }
  raf = requestAnimationFrame(frame);

  return {
    el,
    setView(next, state) {
      // si se ha renacido (los metros han bajado), se limpia la pantalla
      if (view && next.meters + 1 < view.meters) {
        entities = [];
        boss = null;
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
      el.remove();
    },
  };
}
