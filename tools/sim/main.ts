// Simulador de economía de "Cerditos".
// Uso: node tools/sim/main.ts [--profile casual|activo|ocasional|todos] [--days 60] [--log] [--timeline] [--set mundo.ruta=valor]
// Requiere Node >= 22.18 / 23.6 (ejecuta TypeScript quitando los tipos, sin compilar).

import { PERKS, VARIETIES, WORLDS, WORLD_BY_ID, type WorldId } from './content.ts';
import { newSimState, produce, updateCollectionAndUnlocks, type SimEvent, type SimState } from './engine.ts';
import { autobuy, playerAct, resetStrategyMemory } from './strategy.ts';

// ---------------------------------------------------------------------------
// Perfiles de jugador. t = 0 es el día 1 a las 08:00.
// ---------------------------------------------------------------------------

interface Profile { id: string; description: string; isOnline: (t: number) => boolean }

const DAY = 86400;
const HOUR = 3600;

const PROFILES: Profile[] = [
  {
    id: 'casual',
    description: '1ª sesión de 30 min; luego visitas de 5 min cada 2 h de 08:00 a 24:00 (9 al día); noches sin jugar',
    isOnline: (t) => {
      if (t < 30 * 60) return true;
      const inDay = t % DAY;
      if (inDay > 16 * HOUR + 300) return false;
      return inDay % (2 * HOUR) < 300;
    },
  },
  {
    id: 'ocasional',
    description: '1ª sesión de 20 min; luego 3 visitas de 5 min al día (08:00, 14:00, 22:00)',
    isOnline: (t) => {
      if (t < 20 * 60) return true;
      const inDay = t % DAY;
      return [0, 6, 14].some((h) => inDay >= h * HOUR && inDay < h * HOUR + 300);
    },
  },
  {
    id: 'activo',
    description: 'Conectado de 08:00 a 24:00 todos los días (cota superior, nadie juega así)',
    isOnline: (t) => t % DAY < 16 * HOUR,
  },
];

// ---------------------------------------------------------------------------
// Objetivos de ritmo (docs/03-economia.md §9). Tiempos en horas desde el inicio.
// ---------------------------------------------------------------------------

interface Target { id: string; label: string; min: number; max: number; profiles: string[] }

const TARGETS: Target[] = [
  { id: 'asc:valle:1', label: '1ª ascensión Valle', min: 0.5, max: 3, profiles: ['casual'] },
  { id: 'asc:valle:2', label: '2ª ascensión Valle', min: 1.5, max: 10, profiles: ['casual'] },
  { id: 'asc:valle:10', label: '10ª ascensión Valle', min: 24, max: 96, profiles: ['casual'] },
  { id: 'unlock:bosque', label: 'Desbloqueo Bosque', min: 2 * 24, max: 5 * 24, profiles: ['casual'] },
  { id: 'unlock:huerta', label: 'Desbloqueo Huerta', min: 7 * 24, max: 14 * 24, profiles: ['casual'] },
  { id: 'unlock:balneario', label: 'Desbloqueo Balneario', min: 16 * 24, max: 30 * 24, profiles: ['casual'] },
  { id: 'collection:50', label: 'Colección 50 %', min: 10 * 24, max: 30 * 24, profiles: ['casual'] },
  { id: 'collection:100', label: 'Colección 100 %', min: 40 * 24, max: 75 * 24, profiles: ['casual'] },
  { id: 'unlock:bosque', label: 'Desbloqueo Bosque (ocasional)', min: 3 * 24, max: 8 * 24, profiles: ['ocasional'] },
  { id: 'unlock:balneario', label: 'Desbloqueo Balneario (ocasional)', min: 16 * 24, max: 40 * 24, profiles: ['ocasional'] },
  { id: 'unlock:balneario', label: 'Desbloqueo Balneario (activo)', min: 10 * 24, max: 25 * 24, profiles: ['activo'] },
];

// ---------------------------------------------------------------------------

function fmtTime(t: number): string {
  const d = Math.floor(t / DAY) + 1;
  const h = Math.floor((t % DAY) / HOUR) + 8;
  const m = Math.floor((t % HOUR) / 60);
  const hh = h >= 24 ? h - 24 : h;
  const dd = h >= 24 ? d + 1 : d;
  return `d${dd} ${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtDur(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
}

function fmtNum(x: number): string {
  if (x < 1e4) return x.toFixed(0);
  return x.toExponential(2).replace('e+', 'e');
}

interface RunResult { state: SimState; milestones: Map<string, number>; timeline: string[] }

function simulate(profile: Profile, days: number): RunResult {
  resetStrategyMemory();
  const s = newSimState();
  const milestones = new Map<string, number>();
  const mark = (id: string) => { if (!milestones.has(id)) milestones.set(id, s.time); };
  const end = days * DAY;
  let seenEvents = 0;
  let collectionCheck = 0;
  let nextSnapshot = DAY;
  const timeline: string[] = [];

  while (s.time < end) {
    const online = profile.isOnline(s.time);
    const minRun = Math.min(...WORLDS.filter((w) => s.worlds[w.id].unlocked).map((w) => s.worlds[w.id].runTime));
    const dt = online ? Math.min(10, Math.max(1, minRun * 0.05)) : 60;
    produce(s, dt);
    collectionCheck += dt;
    if (collectionCheck >= 30 || online) { updateCollectionAndUnlocks(s); collectionCheck = 0; }
    for (const def of WORLDS) {
      if (!s.worlds[def.id].unlocked) continue;
      if (online) playerAct(s, def.id);
      else autobuy(s, def.id);
    }
    // Hitos a partir de los eventos nuevos
    for (; seenEvents < s.events.length; seenEvents++) {
      const e = s.events[seenEvents];
      if (e.kind === 'ascension') mark(`asc:${e.world}:${s.worlds[e.world!].ascensions}`);
      if (e.kind === 'unlock') mark(`unlock:${e.world}`);
      if (e.kind === 'variety') {
        const pct = (s.varieties.size / VARIETIES.length) * 100;
        for (const p of [25, 50, 75, 100]) if (pct >= p) mark(`collection:${p}`);
      }
    }
    if (s.time >= nextSnapshot) {
      nextSnapshot += DAY;
      for (const def of WORLDS) {
        const w = s.worlds[def.id];
        if (!w.unlocked) continue;
        const extra = def.mechanic === 'harmony' ? ` armonía máx ${w.maxHarmony}` : '';
        timeline.push(`d${Math.round(s.time / DAY)} ${def.id}: asc ${w.ascensions}, plumas ${fmtNum(w.plumasTotal)}, vida ${fmtNum(w.lifetimeEarned)}, máx comprados [${w.maxBought.join(',')}]${extra}`);
      }
    }
    for (const def of WORLDS) {
      const finite = PERKS.filter((p) => p.world === def.id && p.maxLevel !== null);
      if (finite.every((p) => (s.worlds[def.id].perks[p.id] ?? 0) >= p.maxLevel!)) mark(`perksMax:${def.id}`);
    }
  }
  return { state: s, milestones, timeline };
}

/** Huecos largos sin nada nuevo (ventaja comprada, variedad, mundo, nivel nuevo). Ignora ascensiones. */
function longestGaps(events: SimEvent[], from: number, n: number): { start: number; hours: number }[] {
  const ts = events.filter((e) => e.kind !== 'ascension' && e.t >= from).map((e) => e.t);
  const gaps: { start: number; hours: number }[] = [];
  for (let i = 1; i < ts.length; i++) gaps.push({ start: ts[i - 1], hours: (ts[i] - ts[i - 1]) / HOUR });
  return gaps.sort((a, b) => b.hours - a.hours).slice(0, n);
}

function report(profile: Profile, days: number, log: boolean, showTimeline: boolean): boolean {
  const t0 = Date.now();
  const { state: s, milestones, timeline } = simulate(profile, days);
  const out: string[] = [];
  out.push(`\n## Perfil: ${profile.id} — ${profile.description}`);
  out.push(`Simulados ${days} días en ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);

  out.push('### Hitos');
  out.push('| Hito | Momento | Horas |');
  out.push('|---|---|---|');
  const order = [
    ...[1, 2, 3, 5, 10, 20, 50, 100].map((n) => `asc:valle:${n}`),
    'unlock:bosque', 'asc:bosque:1', 'asc:bosque:10',
    'unlock:huerta', 'asc:huerta:1', 'asc:huerta:10',
    'unlock:balneario', 'asc:balneario:1', 'asc:balneario:10',
    'collection:25', 'collection:50', 'collection:75', 'collection:100',
    ...WORLDS.map((w) => `perksMax:${w.id}`),
  ];
  for (const id of order) {
    const t = milestones.get(id);
    out.push(`| ${id} | ${t === undefined ? '—' : fmtTime(t)} | ${t === undefined ? '—' : fmtDur(t / HOUR)} |`);
  }

  out.push('\n### Estado final por mundo');
  out.push('| Mundo | Ascensiones | Plumas totales | Ganado (vida) | Nivel Abono | Ronda actual |');
  out.push('|---|---|---|---|---|---|');
  for (const def of WORLDS) {
    const w = s.worlds[def.id];
    out.push(`| ${def.name} | ${w.ascensions} | ${fmtNum(w.plumasTotal)} | ${fmtNum(w.lifetimeEarned)} | ${w.perks[`${def.id}.abono`] ?? 0} | ${fmtDur(w.runTime / HOUR)} |`);
  }
  out.push(`\nColección: ${s.varieties.size}/${VARIETIES.length}`);

  // Duración de las rondas por mundo (mediana por tramos)
  out.push('\n### Duración de ronda (entre ascensiones)');
  for (const def of WORLDS) {
    const asc = s.events.filter((e) => e.kind === 'ascension' && e.world === def.id).map((e) => e.t);
    if (asc.length < 2) continue;
    const durs = asc.slice(1).map((t, i) => (t - asc[i]) / HOUR);
    const buckets = [0, 0.25, 0.5, 0.75, 1].map((q) => durs[Math.min(durs.length - 1, Math.floor(q * (durs.length - 1)))]);
    out.push(`- ${def.name}: ${asc.length} ascensiones; ronda en el 0/25/50/75/100 % del recorrido: ${buckets.map(fmtDur).join(' / ')}`);
  }

  out.push('\n### Huecos más largos sin novedades (después del día 1)');
  for (const g of longestGaps(s.events, DAY, 5)) out.push(`- ${fmtDur(g.hours)} desde ${fmtTime(g.start)}`);

  let ok = true;
  const targets = TARGETS.filter((t) => t.profiles.includes(profile.id));
  if (targets.length > 0) {
    out.push('\n### Objetivos de ritmo');
    out.push('| Objetivo | Rango | Real | ¿OK? |');
    out.push('|---|---|---|---|');
    for (const tg of targets) {
      const t = milestones.get(tg.id);
      const h = t === undefined ? Infinity : t / HOUR;
      const pass = h >= tg.min && h <= tg.max;
      ok &&= pass;
      out.push(`| ${tg.label} | ${fmtDur(tg.min)} – ${fmtDur(tg.max)} | ${t === undefined ? 'no alcanzado' : fmtDur(h)} | ${pass ? 'sí' : 'NO'} |`);
    }
  }

  if (showTimeline) {
    out.push('\n### Evolución diaria');
    out.push(...timeline);
  }
  if (log) {
    out.push('\n### Registro');
    for (const e of s.events) if (e.kind !== 'newTier' || e.t < DAY) out.push(`${fmtTime(e.t)}  ${e.text}`);
  }
  console.log(out.join('\n'));
  return ok;
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/**
 * --set mundo.ruta=valor (repetible) cambia una constante de un mundo antes de simular.
 * Ej.: --set valle.costGrowth=1.16 --set huerta.harmony.perLevel=0.03
 * Útil para análisis de sensibilidad sin tocar content.ts.
 */
function applyOverrides(): string[] {
  const applied: string[] = [];
  process.argv.forEach((a, i) => {
    if (a !== '--set') return;
    const [path, value] = (process.argv[i + 1] ?? '').split('=');
    const [world, ...keys] = path.split('.');
    let obj: Record<string, unknown> = WORLD_BY_ID[world as WorldId] as unknown as Record<string, unknown>;
    if (!obj || keys.length === 0) throw new Error(`--set inválido: ${path}`);
    for (const k of keys.slice(0, -1)) obj = obj[k] as Record<string, unknown>;
    const last = keys[keys.length - 1];
    if (typeof obj?.[last] !== 'number') throw new Error(`--set: ${path} no es una constante numérica`);
    obj[last] = Number(value);
    applied.push(`${path}=${value}`);
  });
  return applied;
}

const overrides = applyOverrides();
if (overrides.length > 0) console.log(`Constantes modificadas: ${overrides.join(', ')}`);
const profileArg = arg('profile', 'todos');
const days = Number(arg('days', '60'));
const log = process.argv.includes('--log');
const showTimeline = process.argv.includes('--timeline');
const chosen = profileArg === 'todos' ? PROFILES : PROFILES.filter((p) => p.id === profileArg);
if (chosen.length === 0) {
  console.error(`Perfil desconocido: ${profileArg}. Usa: ${PROFILES.map((p) => p.id).join(', ')}, todos`);
  process.exit(2);
}
let allOk = true;
for (const p of chosen) allOk = report(p, days, log, showTimeline) && allOk;
console.log(allOk ? '\nTodos los objetivos de ritmo se cumplen.' : '\nHay objetivos de ritmo fuera de rango.');
process.exit(allOk ? 0 : 1);

