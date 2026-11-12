// FIN's Mindspike-free answer (T874; pillar 2, the finale has no single required tower; finale.md
// § FIN, Alt builds): at least one of the map's winning builds carries no Mindspike, and the pinned
// one, `alt:no_mindspike` (Thumper, Hum Choir, Sproing Pad, Harpoon; its only casts are Suppressing
// Fire's, slot 1, so it doesn't lean on the companion), wins on Standard on every seed, with each
// companion on the pick list, through the warren's longer column, and on Story.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { runHeadless } from '../sim/index.ts';
import { flagsFor, marginOf } from './checks.ts';
import { buildFor } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.fin_m01;
const LABEL = 'alt:no_mindspike';

function play(
  build: CompiledBuild,
  opts: { seed?: number; flagLabel?: string; story?: boolean } = {},
) {
  const flags = flagsFor(opts.flagLabel ?? 'par', map) ?? {};
  const profile = referenceRunProfile(
    map,
    content,
    opts.story === true ? 'story' : 'standard',
    undefined,
    flags,
  );
  return runHeadless(runConfig(content, map, build, profile, opts.seed ?? 1, flags), build);
}

describe('FIN without a Mindspike', { timeout: HARNESS_TEST_TIMEOUT_MS * 2 }, () => {
  const build = buildFor(LABEL, map, content)!;

  it('has at least one winning alt with no Mindspike in its loadout', () => {
    const free = Object.entries(map.builds.altBuilds).filter(
      ([, b]) => !b.loadout.includes('mindspike'),
    );
    expect(free.map(([name]) => name)).toContain('no_mindspike');
    expect(build.loadout).not.toContain('mindspike');
    expect(build.steps.some((s) => s.kind === 'ability' && s.slot === 2)).toBe(false);
  });

  it('wins on Standard on seeds 1–5, with ≥ 20% (the alt floor)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = play(build, { seed });
      expect(r.outcome, `seed ${seed}`).toBe('won');
      expect(marginOf(r), `seed ${seed}`).toBeGreaterThanOrEqual(20);
    }
  });

  it('wins with every companion on the pick list, through the warren, and on Story', () => {
    const pick = map.companion !== null && 'pick' in map.companion ? map.companion.pick : [];
    expect(pick.length).toBeGreaterThan(1);
    for (const companion of pick) {
      const r = play({ ...build, companion });
      expect(r.outcome, companion).toBe('won');
    }
    expect(play(build, { flagLabel: 'flag:door_choice=warren' }).outcome).toBe('won');
    expect(play(build, { story: true }).outcome).toBe('won');
  });
});
