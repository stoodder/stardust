// The finale's checkpoints (D156; design/core-loop.md § 2.12): its Phase 1 takes wave checkpoints
// as Act II on does (W5, W10, W15), its Phase 2 none but the Halls' script checkpoint, and each one
// is a run the save can keep (app/resume.ts `pendingRunOf`), so a tab closed in the Descent resumes
// at its latest wave checkpoint and a late loss doesn't restart from wave 1.
import { describe, expect, it } from 'vitest';
import { checkpointOf, type Checkpoint } from '../src/app/checkpoints.ts';
import { pendingRunOf } from '../src/app/resume.ts';
import { flagsFor } from '../src/balance/checks.ts';
import { buildFor } from '../src/balance/harness.ts';
import { referenceRunProfile, runConfig } from '../src/balance/profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from '../src/balance/rules.ts';
import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import { createBuildExecutor, createSim, type SimEvent } from '../src/sim/index.ts';

describe("the finale's checkpoints", { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it('takes W5, W10 and W15 in Phase 1 and the Halls at Phase 2, each one a run the save keeps', () => {
    const content = compileContent(RAW_CONTENT);
    const map = content.maps.fin_m01;
    const build = buildFor('par', map, content)!;
    const flags = flagsFor('par', map) ?? {};
    const profile = referenceRunProfile(map, content, 'standard', undefined, flags);
    const sim = createSim(runConfig(content, map, build, profile, 1, flags));
    const exec = createBuildExecutor(sim, build);
    const taken: Checkpoint[] = [];
    let atW10: ReturnType<typeof pendingRunOf> = null;
    const out: SimEvent[] = [];
    while (sim.state.outcome === 'playing' && sim.state.phase < 2) {
      exec.beforeTick();
      sim.step();
      out.length = 0;
      sim.drainEvents(out);
      for (const e of out) {
        if (e.type !== 'CheckpointReached') continue;
        const c = checkpointOf(e, sim.state.commandLog);
        taken.push(c);
        // What the router writes to the save as the checkpoint is taken (app/router.ts).
        if (c.wave === 10) atW10 = pendingRunOf(sim.config, c, sim.state.commandLog, 0, null);
      }
    }
    expect(taken.map((c) => c.label ?? c.wave)).toEqual([5, 10, 15, 'halls']);
    expect(atW10).not.toBeNull();
    expect(atW10!.map).toBe('fin_m01');
    expect(atW10!.checkpoint.wave).toBe(10);
    expect(atW10!.checkpoint.label).toBeUndefined();
    expect(atW10!.log.length).toBe(atW10!.checkpoint.commandCount);
  });
});
