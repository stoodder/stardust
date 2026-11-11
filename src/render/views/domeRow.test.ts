// A3M6's Dome Row (domeRow.ts; T730b): Dome 1 frosts over in two steps as the night goes on, a
// refugee at the gate turns in at its door and is gone (fading where it stands under reduced
// motion), and the apron's domes open one after another on the win (all at once, still).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import {
  DOME_ONE,
  domeFrost,
  domeOpensAt,
  TURN_IN_STILL_TICKS,
  TURN_IN_TICKS,
  turnInPose,
  type TurnInPose,
} from './domeRow.ts';

const pose = (): TurnInPose => ({ share: 0, alpha: 1, done: false });

describe('Dome 1 (T730b)', () => {
  it('stands open, then frosts over in two steps across A3M6’s eighteen waves', () => {
    const a3m6 = compileContent(RAW_CONTENT).maps['a3_m06'];
    expect(a3m6?.markers[DOME_ONE]).toBeDefined();
    const n = a3m6?.waves.length ?? 0;
    expect(n).toBe(18);
    const looks = Array.from({ length: n + 1 }, (_, w) => domeFrost(w, n));
    expect(looks.slice(0, 7).every((l) => l === 'open')).toBe(true);
    expect(looks[7]).toBe('frost_1');
    expect(looks[13]).toBe('frost_1');
    expect(looks[14]).toBe('frost_2');
    expect(looks[18]).toBe('frost_2');
    // Never thaws.
    const order = ['open', 'frost_1', 'frost_2'];
    for (let w = 1; w <= n; w++) {
      expect(order.indexOf(looks[w]!)).toBeGreaterThanOrEqual(order.indexOf(looks[w - 1]!));
    }
    expect(domeFrost(5, 0)).toBe('open');
  });
});

describe('the turn-in (T730b)', () => {
  it('walks from the gate to the door, fading in stepped quarters, and is gone', () => {
    const p = pose();
    expect(turnInPose(0, false, p)).toEqual({ share: 0, alpha: 1, done: false });
    turnInPose(TURN_IN_TICKS / 2, false, p);
    expect(p.share).toBeCloseTo(0.5);
    expect(p.alpha).toBe(1);
    const alphas = new Set<number>();
    for (let t = 0; t < TURN_IN_TICKS; t++) alphas.add(turnInPose(t, false, p).alpha);
    for (const a of alphas) expect([0, 0.25, 0.5, 0.75, 1]).toContain(a);
    expect(alphas.size).toBeGreaterThan(2);
    expect(turnInPose(TURN_IN_TICKS, false, p)).toEqual({ share: 1, alpha: 0, done: true });
  });

  it('fades where it stands under reduced motion', () => {
    const p = pose();
    for (let t = 0; t < TURN_IN_STILL_TICKS; t++) expect(turnInPose(t, true, p).share).toBe(0);
    expect(turnInPose(TURN_IN_STILL_TICKS, true, p).done).toBe(true);
  });
});

/** app/router.ts's RESULTS_DELAY_MS (its module needs a browser): the hold before Results. */
const RESULTS_DELAY_MS = 1500;

describe('the domes opening on the win (T730b)', () => {
  it('one after another, all inside the hold before Results; all at once when still', () => {
    expect(domeOpensAt(1, false)).toBeGreaterThan(domeOpensAt(0, false));
    expect(domeOpensAt(3, false)).toBeLessThan(RESULTS_DELAY_MS);
    expect([0, 1, 2].map((k) => domeOpensAt(k, true))).toEqual([0, 0, 0]);
  });
});
