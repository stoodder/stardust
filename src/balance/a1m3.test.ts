// A1M3's tuning is robust where it matters (T304e): with W6–W8's Haulers released a little closer
// together or further apart, Gerald's passes a little earlier or later, W4's Chonks ±0.2 s apart,
// and W5–W8's other groups shifted ±0.2 s, the harness's verdicts still hold: par wins in band and
// earns Return to Sender, Orbital Strike Mk II still changes par's result (T228), both no-counter
// builds lose (also on the full catalog), early calls stay winnable, and the alt builds keep their
// floors and the no-single-wave-wall rule. The shifts run as two compound shifts, each moving
// several groups at once (T460: the gate's time; T304e checked each one alone). The waves and
// builds are documented in docs/story/campaign/act1.md § A1M3.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import {
  both,
  bothWays,
  delay,
  enemy,
  judgeShift,
  shiftedContent,
  spaced,
} from './__fixtures__/shifts.ts';
import { runMap } from './harness.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const raw = RAW_CONTENT.maps.a1_m03;
const content = compileContent(RAW_CONTENT);

/** W6–W8's Haulers `d` s further apart. */
const haulers = (d: number) => spaced(enemy('hauler'), d);

/** The compound shifts, each run both ways (`s` = ±1). */
const SHIFTS = {
  'Gerald’s passes (1 s), W5–W8’s groups (0.2 s), and W6–W8’s Haulers (0.5 s)': (s: number) => ({
    4: delay(enemy('gerald'), s),
    5: delay(enemy('zoomer'), 0.2 * s),
    6: both(delay(enemy('puffwing'), 0.2 * s), haulers(0.5 * s)),
    7: both(delay(enemy('nibbler'), 0.2 * s), delay(enemy('gerald'), s), haulers(0.5 * s)),
    8: both(delay(enemy('zoomer'), 0.2 * s), haulers(0.5 * s)),
  }),
  // Mk II still decides W4's Chonks.
  'W4’s Chonks (0.2 s) and W6–W8’s Haulers (1 s)': (s: number) => ({
    4: spaced(enemy('chonk'), 0.2 * s),
    6: haulers(s),
    7: haulers(s),
    8: haulers(s),
  }),
} as const;

// Each test re-runs a whole map's harness (with its R&D pick): seconds, not milliseconds.
describe('A1M3 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it('passes every harness check as tuned', () => {
    const report = runMap(content, 'a1_m03', { seeds: 1 });
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
  });

  it.each(bothWays(SHIFTS))('holds with %s shifted %s', (_name, _way, patches) => {
    expect(judgeShift(shiftedContent('a1_m03', patches), 'a1_m03').failed).toEqual([]);
  });

  it('spaces W4’s Chonks wider than a Mk I strike covers and within Mk II’s (T228)', () => {
    const chonks = raw.waves[3]!.groups.find((g) => g.enemy === 'chonk')!;
    const strike = content.abilities.orbital_strike.effect;
    expect(strike.kind).toBe('strike');
    const radius = strike.kind === 'strike' ? strike.radiusTiles : 0;
    const speed = content.enemies.chonk.speedTilesPerTick * 60;
    const length = (chonks.count - 1) * chonks.intervalSec! * speed;
    expect(length).toBeGreaterThan(2 * radius); // Mk I (1.5): 3 tiles
    expect(length).toBeLessThanOrEqual(2 * (radius + 0.5)); // Mk II (2.0): 4 tiles
  });

  it('releases W6–W8’s Haulers one at a time, further apart than a strike covers (D052)', () => {
    const strike = content.abilities.orbital_strike.effect;
    const radius = strike.kind === 'strike' ? strike.radiusTiles + 0.5 : Infinity;
    for (const w of [5, 6, 7]) {
      const h = raw.waves[w]!.groups.find((g) => g.enemy === 'hauler')!;
      expect(h.intervalSec! * content.enemies.hauler.speedTilesPerTick * 60).toBeGreaterThan(
        2 * radius,
      );
    }
  });
});
