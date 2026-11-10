// A2M6's Stillness lesson binds to a phase that holds in every reference run (D137, D138):
// Ves'thara's `a2_m06_w08` ("Keep my Stillness for the many") plays as W8's build phase opens, and
// that has to come before W8's few Rift Moths reach the merge. A cast on them would still be
// returning (Stillness: 45 s) when W9's flock crosses the merge, and in par W8 clears only as W9
// starts, so W9's build phase would be too late. The line is canon in story/campaign/act2.md
// § A2M6 (tools/dialogueCanon.test.ts).
import { describe, expect, it } from 'vitest';
import { buildFor } from '../../../../balance/harness.ts';
import { referenceRunProfile, runConfig } from '../../../../balance/profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from '../../../../balance/rules.ts';
import { secToTicks } from '../../../../shared/time.ts';
import { createBuildExecutor, createSim, type SimEvent } from '../../../../sim/index.ts';
import { compileContent } from '../../../compile.ts';
import { RAW_CONTENT } from '../../../registry.ts';
import { scenes } from './scenes.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a2_m06;
/** The merge's tile centre (act2.md § A2M6, Layout data: the merge is (8,5)). */
const MERGE = { x: 8.5, y: 5.5 };
/** "Reaches the merge": within this many tiles of its centre. */
const MERGE_REACH = 1.5;
/** The least time from the line to W8’s first Moth at the merge: to read it and hold the cast. */
const READ_SEC = 15;

/** The ticks W8's build phase opens and W8's first Rift Moth reaches the merge, in one run. */
function beat(label: string, difficulty: 'standard' | 'story' = 'standard') {
  const build = buildFor(label, map, content)!;
  const sim = createSim(
    runConfig(content, map, build, referenceRunProfile(map, content, difficulty), 1),
  );
  const exec = createBuildExecutor(sim, build);
  const st = sim.state;
  const out: SimEvent[] = [];
  let countdown = -1;
  let atMerge = -1;
  const read = (): void => {
    for (const e of out) {
      if (e.type === 'CountdownStarted' && e.wave === 8 && countdown < 0) countdown = st.tick;
    }
    out.length = 0;
  };
  while (st.outcome === 'playing' && atMerge < 0) {
    exec.beforeTick();
    sim.drainEvents(out);
    read();
    sim.step();
    sim.drainEvents(out);
    read();
    for (let i = 0; i < st.enemies.used; i++) {
      const e = st.enemies.items[i]!;
      if (!e.alive || e.wave !== 8 || e.def?.id !== 'riftmoth') continue;
      if (Math.hypot(e.x - MERGE.x, e.y - MERGE.y) <= MERGE_REACH) atMerge = st.tick;
    }
  }
  return { countdown, atMerge };
}

describe("A2M6's Stillness lesson", () => {
  it('is a W8 radio scene, Ves’thara’s, in her voice (no contractions)', () => {
    const w08 = scenes.find((s) => s.id === 'a2_m06_w08');
    expect(w08).toBeDefined();
    const lines = w08!.nodes.filter((n) => n.kind === 'line');
    expect(lines.map((n) => n.speaker)).toEqual(['vesthara']);
    for (const n of lines) {
      expect(n.text).toContain('Stillness');
      expect(n.text).not.toMatch(/\w'\w/);
    }
  });

  it(
    'plays before W8’s Rift Moths reach the merge, in every reference run',
    () => {
      const runs: [string, 'standard' | 'story'][] = [
        ['par', 'standard'],
        ...Object.keys(map.builds.altBuilds).map((n): [string, 'standard'] => [
          `alt:${n}`,
          'standard',
        ]),
        ['alwaysCallEarly', 'standard'],
        ['par', 'story'],
      ];
      for (const [label, difficulty] of runs) {
        const { countdown, atMerge } = beat(label, difficulty);
        const run = `${label} (${difficulty})`;
        expect(countdown, run).toBeGreaterThanOrEqual(0);
        expect(atMerge, run).toBeGreaterThan(0);
        expect(atMerge - countdown, run).toBeGreaterThanOrEqual(secToTicks(READ_SEC));
      }
    },
    HARNESS_TEST_TIMEOUT_MS,
  );
});
