// A3M5 played by a human caster, not a timer (D151). Par's builds with their scripted casts taken
// out, and the cluster-aware caster (`__fixtures__/clusterCaster.ts`) casting instead: Reboot on a
// tell, Stillness and Suppressing Fire on a boss or the biggest knot. It holds band min + 5 under
// every C4 answer when it heeds Kip's w13 line (its casts saved for the hunt's Silencers at the old
// intake, in W13 and W15), and under Keep and Purge without it. Under Rewrite there's no Reboot,
// and a caster that spends its casts on whatever knot comes first has nothing left when the hunt
// reaches the hub: it still wins, at 25.0 (act3.md § A3M5, As tuned).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { runA3m5 } from './__fixtures__/a3m5.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const BAND = content.maps.a3_m05.builds.marginBand!;
/** The floor a human caster holds: the band's minimum and 5 points (D151). */
const HUMAN_FLOOR = BAND.minPct + 5;

const KEEP = 'flag:quill_choice=keep';
const PURGE = 'flag:quill_choice=purge';
const REWRITE = 'flag:quill_choice=rewrite';

const margin = (r: { integrity: number; asset: number }): number =>
  Math.min(r.integrity / 22, r.asset / 12) * 100;

describe('A3M5 at a human caster (D151)', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it.each([
    [KEEP, 'heeds'],
    [PURGE, 'heeds'],
    [REWRITE, 'heeds'],
    [KEEP, 'plain'],
    [PURGE, 'plain'],
  ] as const)('%s, a caster who %s the w13 line, holds band min + 5', (label, human) => {
    const r = runA3m5(content, label, { human });
    expect(r.outcome, label).toBe('won');
    expect(margin(r), label).toBeGreaterThanOrEqual(HUMAN_FLOOR);
  });

  it("wins Rewrite with a caster who doesn't heed it (its casts spent before the hunt)", () => {
    const r = runA3m5(content, REWRITE, { human: 'plain' });
    expect(r.outcome).toBe('won');
    // The forgiving floor the alts hold (a3m5Shifts.test.ts); as tuned it ends at 25.0.
    expect(margin(r)).toBeGreaterThanOrEqual(20);
  });
});
