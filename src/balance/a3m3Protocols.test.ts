// A3M3's Thumper exam whatever protocol the player brings (D144 S1c; act3.md § A3M3). A3M3 has no
// core, so Emergency Bulkhead (A3M2's reference protocol) does nothing here; a player who carries it
// in, or equips nothing, plays without Head Start's tenth. The map's 770 credits are 700 plus that
// tenth paid to everyone (map.ts), so the exam reads the build, not the protocol slot:
//
// - a plain Zapcoil wherever par builds a Thumper (Bricks's briefing advice to the player whose
//   Thumper the Clean Exit took) holds W10 whole and the 50% floor through both doors;
// - no-splash (Mindspikes there) and Rivets there still lose at least two to W10's packed cluster,
//   the doom's preview (D143 R4c);
// - both alts hold the floor;
//
// on the reference profile with no protocol, and on the `after_a3m2_thumper` dev save (the save
// the smoke flows load: Seed Money 1, the Bulkhead equipped) both as saved and with Head Start,
// which is what the loadout preselects there once it benches the Bulkhead (D144 S1b). As tuned
// (convoy / warren, of 36): the Zapcoil swap 18 / 19 with no protocol, 20 / 21 as saved, 19 / 22
// with Head Start; no-splash loses 5 / 4 in W10 and Rivets 3 / 2 on each. The reference profile's
// own pins (Head Start on) are a3m3.test.ts's. The window is narrow on purpose: a few more start
// credits and a no-splash build's west-fork Mindspike is up before W10's cluster, so W10 stops
// showing that build its failure (a3m3.test.ts pins that edge on the reference profile).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { ProfileDef, ProtocolId, TowerId } from '../content/types.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { equippedProtocols, saveModifiers } from '../meta/loadout.ts';
import type { SaveData } from '../meta/saveData.ts';
import { runHeadless } from '../sim/index.ts';
import { buildFor } from './harness.ts';
import { profileModifiers, runConfig, type RunProfile } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a3_m03;
const DOORS = ['convoy', 'warren'] as const;
/** Half of A3M3's 36 refugees: the Holdout's Evacuated floor. */
const FLOOR = 18;

/** `build` with every `from` (its loadout slot and each build of it) swapped for `to`. */
function swapClass(build: CompiledBuild, from: TowerId, to: TowerId): CompiledBuild {
  return {
    ...build,
    loadout: build.loadout.map((t) => (t === from ? to : t)),
    steps: build.steps.map((s) =>
      s.kind === 'build' && s.tower === from ? { ...s, tower: to } : s,
    ),
  };
}

const par = (): CompiledBuild => buildFor('par', map, content)!;
const BUILDS = {
  'zapcoil swap': () => swapClass(par(), 'thumper', 'zapcoil'),
  'no-splash': () => buildFor('noCounter:splash', map, content)!,
  'rivets for thumpers': () => swapClass(par(), 'thumper', 'rivet'),
  'alt:coils': () => buildFor('alt:coils', map, content)!,
  'alt:no_everglow': () => buildFor('alt:no_everglow', map, content)!,
} as const;
type BuildName = keyof typeof BUILDS;

/** A Standard run profile from a profile definition (the reference's specs unless it has its own). */
const runProfile = (def: ProfileDef): RunProfile => ({
  kind: 'reference',
  difficulty: 'standard',
  modifiers: profileModifiers(def, content),
  specs: def.specs,
  leftOut: [],
});

const REF = map.builds.referenceProfile;
const SAVED = DEV_SAVES.after_a3m2_thumper.build();

/** `save` as a profile definition: what it owns and the protocols the battle equips from it. */
const savedDef = (save: SaveData): ProfileDef => ({
  ...REF,
  specs: save.unlocks.specs,
  shop: save.upgrades,
  protocols: equippedProtocols(save).equipped,
});

/** `save` with `protocols` equipped instead. */
const withProtocols = (save: SaveData, protocols: ProtocolId[]): SaveData => ({
  ...save,
  loadouts: { ...save.loadouts, protocols },
});

const PROFILES: Readonly<Record<string, ProfileDef>> = {
  'the reference profile with no protocol': { ...REF, protocols: [] },
  'after_a3m2_thumper as saved (the Bulkhead carried in)': savedDef(SAVED),
  'after_a3m2_thumper with Head Start (the loadout’s preselection)': savedDef(
    withProtocols(SAVED, ['head_start']),
  ),
};

/** `name`'s run through `door` on `def`: Evacuated and what W10 cost. */
function play(name: BuildName, def: ProfileDef, door: (typeof DOORS)[number]) {
  const build = BUILDS[name]();
  const r = runHeadless(
    runConfig(content, map, build, runProfile(def), 1, { door_choice: door }),
    build,
  );
  expect(r.forcedInputs, `${name} ${door}`).toEqual(['seal']);
  return { evacuated: r.stats.evacuated, w10: r.waves[9]!.refugeesLost, total: r.escortTotal };
}

// Each test plays whole maps: seconds, not milliseconds.
describe('A3M3 whatever the protocol', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it('reads after_a3m2_thumper the way the game does: Seed Money 1, the Bulkhead on', () => {
    expect(SAVED.loadouts.protocols).toEqual(['emergency_bulkhead']);
    expect(SAVED.unlocks.protocols).toContain('head_start');
    expect(SAVED.upgrades.seed_money).toBe(1);
    for (const save of [SAVED, withProtocols(SAVED, ['head_start'])]) {
      expect(profileModifiers(savedDef(save), content)).toEqual(saveModifiers(save));
    }
  });

  it('gives the Bulkhead nothing to do here: the same run as no protocol', () => {
    for (const door of DOORS) {
      expect(play('zapcoil swap', { ...REF, protocols: ['emergency_bulkhead'] }, door)).toEqual(
        play('zapcoil swap', { ...REF, protocols: [] }, door),
      );
    }
  });

  it.each(Object.entries(PROFILES))(
    'holds W10 whole and the floor with a Zapcoil-for-Thumper swap, both doors: %s',
    (_name, def) => {
      for (const door of DOORS) {
        const r = play('zapcoil swap', def, door);
        expect(r.total, door).toBe(36);
        expect(r.w10, door).toBe(0);
        expect(r.evacuated, door).toBeGreaterThanOrEqual(FLOOR);
      }
    },
  );

  it.each(Object.entries(PROFILES))(
    'shows no-splash and Rivets-for-Thumpers leaking in W10, both doors: %s',
    (_name, def) => {
      for (const door of DOORS) {
        for (const name of ['no-splash', 'rivets for thumpers'] as const) {
          const r = play(name, def, door);
          expect(r.w10, `${name} ${door}`).toBeGreaterThanOrEqual(2);
          expect(r.evacuated, `${name} ${door}`).toBeLessThan(FLOOR);
        }
      }
    },
  );

  it.each(Object.entries(PROFILES))('holds the floor with both alts, both doors: %s', (_n, def) => {
    for (const door of DOORS) {
      for (const name of ['alt:coils', 'alt:no_everglow'] as const) {
        expect(play(name, def, door).evacuated, `${name} ${door}`).toBeGreaterThanOrEqual(FLOOR);
      }
    }
  });
});
