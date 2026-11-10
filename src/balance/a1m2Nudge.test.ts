// T229 (D096): QUILL's bank nudge reaches A1M2's never-spend player before the W7 wall. The
// player is par without its upgrades and without the W6 Thumper (act1.md § A1M2): it buys nothing
// after W4, so W5's and W6's build phases pass idle and W7's opens with a Thumper affordable but
// short of the 250 rule. The nudge's rule is content/rules.ts's; app/dialogue.ts plays it
// (app/bankNudge.test.ts).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { BANK_NUDGE_CREDITS, BANK_NUDGE_IDLE_PHASES } from '../content/rules.ts';
import { runHeadless } from '../sim/index.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

describe(
  'the bank nudge before A1M2’s W7 wall (T229)',
  { timeout: HARNESS_TEST_TIMEOUT_MS },
  () => {
    it("reaches the never-spend player at W7's countdown, with a Thumper's worth banked", () => {
      const content = compileContent(RAW_CONTENT);
      const map = content.maps.a1_m02;
      const thumper = content.towers.thumper.tiers[0].cost;
      const alt = map.builds.altBuilds.no_upgrades!;
      // No upgrades and nothing bought after W4: the W6 Thumper is the one purchase it lacks.
      const build = {
        ...alt,
        steps: alt.steps.filter((s) => !(s.wave === 6 && s.kind === 'build')),
      };
      const lastBuy = Math.max(...build.steps.filter((s) => s.kind === 'build').map((s) => s.wave));
      expect(lastBuy).toBe(4);
      const run = runHeadless(
        runConfig(content, map, build, referenceRunProfile(map, content), 1),
        build,
      );
      // The wall is still there for this player (W7's Haulers), so the nudge must land before it.
      expect(run.outcome).toBe('lost');
      expect(run.waves[6]!.integrityLost).toBeGreaterThan(0);
      // W5's and W6's build phases pass with no purchase; W7's opens with a Thumper affordable but
      // short of the 250 rule, so only the idle rule reaches this player in time.
      expect(lastBuy + 1 + BANK_NUDGE_IDLE_PHASES).toBe(7);
      const bank = run.waves[6]!.bankAtPhase;
      expect(bank).toBeGreaterThanOrEqual(thumper);
      expect(bank).toBeLessThan(BANK_NUDGE_CREDITS);
    });
  },
);
