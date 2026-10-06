import { describe, expect, it } from 'vitest';
import { createVisitorScheduler, VISITOR_MAX_DELAY, VISITOR_MIN_DELAY, VISITOR_STAY_SECONDS } from './visitor.ts';

describe('visitante', () => {
  it('no aparece antes del mínimo de espera (1 min)', () => {
    const v = createVisitorScheduler(() => 0);
    v.tick(VISITOR_MIN_DELAY - 1);
    expect(v.current()).toBeNull();
  });

  it('aparece entre 1 y 2 minutos, y el tipo depende del azar', () => {
    const early = createVisitorScheduler(() => 0);
    early.tick(VISITOR_MIN_DELAY);
    expect(early.current()).toBe('injection');
    // 1.ª llamada: espera; 2.ª: tipo; 3.ª: ¿dorado?
    const seq = (...values: number[]) => {
      let i = 0;
      return () => values[Math.min(i++, values.length - 1)]!;
    };
    const late = createVisitorScheduler(seq(0.99, 0.99, 0.5));
    late.tick(VISITOR_MAX_DELAY);
    expect(late.current()).toBe('boost');
    const golden = createVisitorScheduler(seq(0, 0.2, 0.95));
    golden.tick(VISITOR_MIN_DELAY);
    expect(golden.current()).toBe('golden');
  });

  it('se queda 20 s y se va si no se acepta; luego llega otro', () => {
    const v = createVisitorScheduler(() => 0);
    v.tick(VISITOR_MIN_DELAY);
    expect(v.secondsLeft()).toBe(VISITOR_STAY_SECONDS);
    v.tick(VISITOR_STAY_SECONDS - 1);
    expect(v.current()).toBe('injection');
    expect(v.secondsLeft()).toBe(1);
    v.tick(1);
    expect(v.current()).toBeNull();
    v.tick(VISITOR_MIN_DELAY);
    expect(v.current()).toBe('injection');
  });

  it('al aceptarlo se programa el siguiente', () => {
    const v = createVisitorScheduler(() => 0);
    v.tick(VISITOR_MIN_DELAY);
    v.clear();
    expect(v.current()).toBeNull();
    expect(v.secondsLeft()).toBe(0);
    v.tick(VISITOR_MIN_DELAY - 1);
    expect(v.current()).toBeNull();
  });
});
