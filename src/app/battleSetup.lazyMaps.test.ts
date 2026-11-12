// Lazy maps (content/registry.ts `registerActMaps`; T862): a map a lazy chunk registers compiles
// into the battle's content exactly as a static one would, the compile cache takes it in once the
// registry's version moves, and a battle already built keeps the content it was built with. (Its
// own file: it mocks the compiler, so the module graph is its own and the re-registration below
// can't leak into other files.)
import { describe, expect, it, vi } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { CHALLENGE_MAPS } from '../content/maps/challenge.ts';
import { MAPS } from '../content/maps/index.ts';
import { contentVersion, RAW_CONTENT, registerActMaps } from '../content/registry.ts';
import { createSim, type SimConfig } from '../sim/index.ts';
import type { IdSpace, MapDef, RawContent } from '../content/types.ts';
import { battleConfig } from './battleSetup.ts';

const compiled = vi.hoisted(() => [] as unknown[]);
vi.mock('../content/compile.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('../content/compile.ts')>();
  return {
    ...real,
    compileContent: (...args: Parameters<typeof real.compileContent>) => {
      compiled.push(args[0]);
      return real.compileContent(...args);
    },
  };
});

/** `cfg`'s run, 40 s in with every wave called as it comes, as a hash. */
function runHash(cfg: SimConfig<IdSpace>): string {
  const sim = createSim(cfg);
  for (let i = 0; i < 2400; i++) {
    sim.enqueue({ type: 'callWave' });
    sim.step();
  }
  return sim.hash();
}

describe('lazy maps (T862)', () => {
  it('registers only what is new, and never over a static map', () => {
    const before = contentVersion();
    registerActMaps({ ...CHALLENGE_MAPS }); // the same defs again
    expect(contentVersion()).toBe(before);
    const a1: MapDef = MAPS.a1_m01;
    expect(() => registerActMaps({ a1_m01: a1 })).toThrow(/static map/);
    expect(Object.hasOwn(MAPS, 'ch_m01')).toBe(false);
    expect(Object.hasOwn(RAW_CONTENT.maps, 'ch_m01')).toBe(true);
  });

  it('a lazy map runs as a static one would; a re-registration recompiles, a running battle keeps its content', () => {
    const first = battleConfig('ch_m01', 7);
    const runs = compiled.length;
    battleConfig('ch_m01', 8);
    expect(compiled.length).toBe(runs); // cached while the version holds

    // The same map as a static entry (every map in one registry, compiled at once).
    const asStatic: RawContent = { ...RAW_CONTENT, maps: { ...RAW_CONTENT.maps } };
    const staticContent = compileContent(asStatic);
    expect(runHash({ ...first, content: staticContent })).toBe(runHash(first));

    // A new def under the same id bumps the version: the next config compiles it in.
    const before = contentVersion();
    const compiledBefore = compiled.length;
    const firstContent = first.content;
    registerActMaps({ ch_m01: { ...CHALLENGE_MAPS.ch_m01 } });
    try {
      expect(contentVersion()).toBe(before + 1);
      const second = battleConfig('ch_m01', 7);
      expect(compiled.length).toBe(compiledBefore + 1);
      expect(second.content).not.toBe(firstContent);
      expect(first.content).toBe(firstContent); // the battle built before keeps its content
      expect(runHash(second)).toBe(runHash(first));
    } finally {
      registerActMaps({ ch_m01: CHALLENGE_MAPS.ch_m01 });
    }
  });
});
