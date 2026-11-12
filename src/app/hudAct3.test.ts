// T631, the Act III HUD's pure rules: the Holdout's meter on A3M3's own run (the run's refugee
// total, no lost row), Act III's "Next time." in the trackers, Bramble's column on the objective
// tracker, the M6 towers' panel lines (the Den's family and DoT, the Choir's reach, the Bloom's
// field) and their "Next:" lines, Underfoot's aim (path tiles, its hint), the Choir's and Bloom's
// placement rings, and Bricks's empty pocket at the Gap.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import type { IdSpace } from '../content/types.ts';
import { mapOrigin } from '../render/iso.ts';
import { previewRing } from '../render/input/ringRange.ts';
import { slotAimsAtPath } from '../render/input/tileFacts.ts';
import { VIEW_H, VIEW_W } from '../render/scale.ts';
import { createSim, towerStats, type Sim, type SimState } from '../sim/index.ts';
import { hud } from '../ui/state.ts';
import type { StoryContext } from '../story/conditions.ts';
import { battleConfig } from './battleSetup.ts';
import { lineView } from './dialogue.ts';
import { createHost } from './host.ts';
import { bindEscortMeter } from './hudEscort.ts';
import { selectedView } from './hudPanel.ts';
import { nextTimeMark, statLineText, tierExtrasDelta } from './hudText.ts';
import { aimHintText, groupWalking, objectiveGroups, objectiveViews } from './hudViews.ts';

vi.mock('./battle.ts', () => ({ startBattle: () => undefined }));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

/** The sim's state, writable (tests set it up directly). */
function mut(sim: Sim<IdSpace>): SimState {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  return sim.state as unknown as SimState;
}

let unbind = (): void => {};
afterEach(() => {
  unbind();
  unbind = () => {};
});

describe("the Holdout's meter (A3M3)", () => {
  it("shows Evacuated of the run's refugees (one door's), with no lost row", () => {
    const sim = createSim(battleConfig('a3_m03', 1, null));
    const host = createHost<IdSpace>(sim);
    unbind = bindEscortMeter(host);
    const m = hud.escort.value;
    expect(m).not.toBeNull();
    expect(m).toMatchObject({ holdout: true, pips: null, maxLost: null, evacuated: 0 });
    // The chosen door's groups only (the gated ones left out), never every group of the map.
    expect(m?.total).toBe(sim.state.refugeeTotal);
    expect(m?.total).toBeLessThan(sim.map.escort?.total ?? 0);
    expect(hud.meterLabel.value).toBe('Evacuated');
  });

  it("reads an Escort's total from the run too (A3M1 cleared: Thrum's group never walks)", () => {
    const sim = createSim(battleConfig('a3_m01', 1, null));
    const host = createHost<IdSpace>(sim);
    unbind = bindEscortMeter(host);
    expect(hud.escort.value?.total).toBe(sim.state.refugeeTotal);
    expect(hud.escort.value?.holdout).toBe(false);
  });
});

describe('the trackers\' "Next time" (style-guide § 2: no system "!" from Act III)', () => {
  it('keeps the cheer through Act II and drops it from Act III', () => {
    expect(nextTimeMark('1')).toBe('Next time!');
    expect(nextTimeMark('2')).toBe('Next time!');
    expect(nextTimeMark('3')).toBe('Next time.');
    expect(nextTimeMark('finale')).toBe('Next time.');
  });
});

describe("Bramble's column on the tracker (A3M1's The Matriarch's Young)", () => {
  it('follows her group, counts its walkers, and shows them only while some walk', () => {
    const sim = createSim(battleConfig('a3_m01', 1, null));
    const groups = objectiveGroups(sim.map);
    const i = sim.map.escort?.groups.findIndex((g) => g.id === 'bramble') ?? -1;
    expect(groups).toEqual({ matriarchs_young: i });
    expect(groupWalking(sim.state.allies, i)).toBe(0);
    const pool = {
      used: 3,
      items: [
        { alive: true, group: i, pebble: false },
        { alive: true, group: i, pebble: true },
        { alive: false, group: i, pebble: false },
      ],
    };
    expect(groupWalking(pool, i)).toBe(1);
    const [walking] = objectiveViews(sim.map, {}, [], { matriarchs_young: 6 });
    expect(walking?.walking).toBe(6);
    expect(objectiveViews(sim.map)[0]).not.toHaveProperty('walking');
  });
});

/** A1M1 with the M6 towers in the loadout and credits to spare, paused at tick 0. */
function m6Towers(): Sim<IdSpace> {
  const cfg = battleConfig('a1_m01', 1, DEV_SAVES.all_unlocked.build());
  const sim = createSim({
    ...cfg,
    loadout: ['burrow', 'choir', 'bloom'],
    modifiers: [],
    specsUnlocked: ['burrow', 'choir', 'bloom'],
  });
  mut(sim).credits = 9999;
  mut(sim).lockedTowers.length = 0;
  return sim;
}

function selectAt(sim: Sim<IdSpace>, col: number, row: number) {
  const t = sim.state.towers.items.find((x) => x.alive && x.col === col && x.row === row);
  if (t === undefined) throw new Error(`no tower at ${col},${row}`);
  return selectedView(sim, t.uid, mapOrigin(sim.map.cols, sim.map.rows, VIEW_W, VIEW_H), null)!;
}

describe('the M6 towers in the tower panel', () => {
  it("reads the Den as its family and each one's DoT, with the latch, and +1 swarmling next", () => {
    const sim = m6Towers();
    sim.enqueue({ type: 'build', tile: [6, 1], tower: 'burrow' });
    sim.step();
    sim.step();
    const v = selectAt(sim, 6, 1);
    expect(v.stats).toBe(
      '3 swarmlings · 5 dmg/s each · range 2.5 · latch 4 s · Chilled 10% · ×2.5 burrowed',
    );
    expect(v.upgradeDelta).toBe('+1 swarmling');
  });

  it("reads the Choir's damage aura with its reach, and the Bloom's field", () => {
    const sim = m6Towers();
    sim.enqueue({ type: 'build', tile: [6, 2], tower: 'choir' });
    sim.enqueue({ type: 'build', tile: [6, 1], tower: 'bloom' });
    sim.step();
    expect(selectAt(sim, 6, 2).stats).toBe('+10% damage in 1.5');
    expect(selectAt(sim, 6, 2).upgradeDelta).toBe('+5% damage · +0.5 reach');
    expect(selectAt(sim, 6, 1).stats).toBe('field 2 · Chilled 30% · Stasis 1.5 s every 10 s');
    expect(selectAt(sim, 6, 1).upgradeDelta).toBe('pulse 2 s sooner');
  });

  it('describes the specs the same way (Brave Hearts, Lullaby, Gravity Well)', () => {
    const content = createSim(battleConfig('a3_m01', 1, null)).config.content;
    const burrow = content.towers['burrow']!;
    const choir = content.towers['choir']!;
    const bloom = content.towers['bloom']!;
    const line = (def: typeof burrow, spec: 'a' | 'b') =>
      statLineText(towerStats(def, 4, undefined, [], spec), def.specs![spec]);
    expect(line(burrow, 'b')).toBe(
      '3 Champions · 20 dmg/s each · range 2.5 · latch 5 s · Chilled 15% · ×2.5 burrowed · air too',
    );
    expect(line(choir, 'a')).toBe('+20% damage in 2 · Lulls in 2.5');
    expect(line(bloom, 'a')).toBe(
      'field 2.5 · Chilled 30% · Stasis 2 s every 8 s · pulls 1.5 (20 s)',
    );
    expect(tierExtrasDelta(bloom.tiers[1], bloom.tiers[2])).toEqual([
      '+0.5 field',
      'Stasis +0.5 s',
    ]);
    expect(tierExtrasDelta(burrow.tiers[1], burrow.tiers[2])).toEqual(['latch +1 s']);
  });
});

describe("Underfoot's aim", () => {
  it('aims at path tiles only, and says so', () => {
    const sim = createSim(battleConfig('a3_m01', 1, null));
    const slot = sim.config.abilities.slot2 === 'underfoot' ? 2 : 1;
    expect(slotAimsAtPath(sim, slot)).toBe(true);
    expect(aimHintText('pathTrap')).toBe('Pick a path tile');
    expect(aimHintText('segment')).toBe('Pick a stretch of path');
    expect(aimHintText('strike')).toBe('Pick a target');
  });
});

const lit = (): boolean => true;
const unlit = (): boolean => false;

describe("the Choir's and the Bloom's placement rings (the aura preview)", () => {
  const ring = { rangeTiles: 0, dimmed: false };
  it("previews the song's reach and the field's, with the radius tune-up", () => {
    const content = createSim(battleConfig('a3_m01', 1, null)).config.content;
    expect(previewRing(content.towers['choir']!.tiers[0], 0, lit, ring).rangeTiles).toBe(1.5);
    expect(previewRing(content.towers['bloom']!.tiers[0], 0, lit, ring).rangeTiles).toBe(2);
    expect(
      previewRing(content.towers['bloom']!.tiers[0], 0, lit, ring, 0.1).rangeTiles,
    ).toBeCloseTo(2.2);
    // Never dimmed by the dark: neither has an attack.
    expect(previewRing(content.towers['choir']!.tiers[0], 1, unlit, ring).dimmed).toBe(false);
  });
});

const ctx = (map: 'a3_m02' | 'a3_m03'): StoryContext => ({
  flags: {},
  map,
  pestsProcessed: 0,
  seen: [],
  run: null,
});
const TEXT = { profile: null, pestsProcessed: 0, evacuated: null };
const bricks = (c: StoryContext) =>
  lineView({ speaker: 'bricks', text: 'Kid.' }, c, TEXT, null).portrait?.variant ?? null;

describe("Bricks's pocket at the Gap (A3M3: Pebble walks with Goldie's convoy)", () => {
  it('empties his pocket on A3M3 only', () => {
    expect(bricks(ctx('a3_m02'))).toBe('pebble');
    expect(bricks(ctx('a3_m03'))).toBeNull();
  });
});
