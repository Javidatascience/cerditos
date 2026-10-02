import { describe, expect, it } from 'vitest';
import { createVisitorScheduler, VISITOR_MAX_DELAY, VISITOR_MIN_DELAY } from './visitor.ts';

describe('visitante', () => {
  it('no aparece antes del mínimo de espera', () => {
    const v = createVisitorScheduler(() => 0);
    v.tick(VISITOR_MIN_DELAY - 1);
    expect(v.current()).toBeNull();
  });

  it('aparece tras la espera, se queda hasta aceptarlo y entonces programa otro', () => {
    const v = createVisitorScheduler(() => 0); // espera mínima y siempre 'injection'
    v.tick(VISITOR_MIN_DELAY);
    expect(v.current()).toBe('injection');
    v.tick(10_000); // no caduca
    expect(v.current()).toBe('injection');
    v.clear();
    expect(v.current()).toBeNull();
    v.tick(VISITOR_MIN_DELAY);
    expect(v.current()).toBe('injection');
  });

  it('el tipo depende del azar y la espera nunca supera el máximo', () => {
    const v = createVisitorScheduler(() => 0.99);
    v.tick(VISITOR_MAX_DELAY);
    expect(v.current()).toBe('boost');
  });
});
