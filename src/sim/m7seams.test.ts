// The M7 seams (T700a): the new state, stats, and entity fields start blank; FEATURE_GATES,
// SCRIPT_GATES, and HARNESS_GATES name the task that lifts each M7 row (D146); the Gloop Spitter
// and the Sproing Pad are refused whole until their tasks (STUB_TOWER_TASKS; System Reboot runs
// since T702: sim/jam.test.ts; C4 Purge's faction armor runs since T703: sim/factionArmor.test.ts); the `cleared` atom
// reads false and never settles until T706 judges it; the new content compiles to its rows; and the validators reject each malformed
// unit and tower seam shape. The dev maps and the map-level shapes: render/__fixtures__/
// devM7.test.ts; the flag-variant profiles: balance/flagProfile.test.ts.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { STUB_TOWER_TASKS, TOWERS } from '../content/towers/index.ts';
import type { EnemyDef, IdSpace, RawContent, TowerDef } from '../content/types.ts';
import { validate } from '../content/validate.ts';
import { SIM_FIXTURE, fixtureConfig } from './__fixtures__/sim.ts';
import { evaluateCondition, settledCondition } from './conditions.ts';
import { ALLY_BLANK, ENEMY_BLANK, TOWER_BLANK, ZONE_BLANK } from './entities.ts';
import { FEATURE_GATES, abilityRefusal, gateRefusals, towerRefusal } from './gates.ts';
import { createState } from './state.ts';
import { SCRIPT_GATES } from './systems/triggers.ts';
import { createScratch } from './tick.ts';

const LIVE = compileContent(RAW_CONTENT);
const FX = compileContent(SIM_FIXTURE);

describe('M7 state and entity fields', () => {
  it('start blank', () => {
    const state = createState(FX.maps.fx_map, 1);
    expect(state).toMatchObject({ tilesOpened: [], tilesOpenedTo: [], scriptGroupsSpawned: [] });
    expect(state.stats).toMatchObject({ jammedPeak: 0, takeoverJamTicks: 0, bearersHome: 0 });
    expect(TOWER_BLANK).toMatchObject({
      jamTicks: 0,
      jamImmuneTicks: 0,
      jammedBy: 0,
      linkCorrodedStacks: 0,
      linkPinTicks: 0,
      linkPreferMarked: false,
    });
    expect(ENEMY_BLANK).toMatchObject({
      jamTicks: 0,
      jamTellTicks: 0,
      jamTarget: 0,
      mergeTicks: 0,
    });
    expect(ZONE_BLANK).toMatchObject({ chillPct: 0, towerUid: 0 });
    // Leapers and bearers reuse the swarmling and refugee fields (no new ally fields).
    expect(ALLY_BLANK.swarmState).toBe('home');
  });
});

describe('FEATURE_GATES, SCRIPT_GATES, and HARNESS_GATES (T700a rows; D146)', () => {
  it('name the task that lifts each M7 mechanic', () => {
    expect(FEATURE_GATES).toMatchObject({
      'enemy.jam': null, // T702 lifted it (sim/jam.test.ts)
      'ability.reboot': null, // T702
      'enemy.healAura': null, // T703
      'modifier.enemyStat.faction': null, // T703
      'attack.leaper': 'T704',
      'tower.puddle': null, // T705 lifted it (sim/gloop.test.ts)
      'map.bearers': null, // T706
      'ally.flagGated': null, // T706
      'enemy.jam.ring': 'T707',
      'enemy.boss.hangar': 'T707',
      'enemy.boss.takeover': 'T707',
      'enemy.boss.jettison': 'T707',
      'enemy.boss.gather': 'T708',
      'enemy.boss.split': 'T708',
    });
    expect(SCRIPT_GATES).toMatchObject({ openTile: 'T707' });
    // T706's run: objectiveCompleted, spawnWave, and the `cleared` atom.
    for (const key of ['objectiveCompleted', 'spawnWave', 'cleared']) {
      expect(Object.hasOwn(SCRIPT_GATES, key), key).toBe(false);
    }
    // HARNESS_GATES.jamLimit (lifted by T702): balance/refusals.m5.test.ts.
  });

  it('refuse the M7 stubs whole, naming their task', () => {
    expect(STUB_TOWER_TASKS).toEqual({ sproing: 'T704' }); // T705 lifted the Gloop
    expect(towerRefusal(TOWERS.gloop)).toBeNull();
    expect(towerRefusal(TOWERS.sproing)).toBe("the 'sproing' tower is not simulated until T704");
    // Lifted from the stub list, each still waits on its own row.
    expect(towerRefusal(TOWERS.sproing, FEATURE_GATES, {})).toBe(
      "a 'leaper' attack (sproing) is not simulated until T704",
    );
    expect(towerRefusal(TOWERS.gloop, FEATURE_GATES, {})).toBeNull(); // the puddle is a spec's
    expect(abilityRefusal(LIVE.abilities.system_reboot)).toBeNull(); // T702 runs it
  });

  it("play C4 Purge's faction armor since T703", () => {
    const cfg = fixtureConfig({
      modifiers: [
        { kind: 'enemyStat', stat: 'armor', faction: 'everglow', flat: -2, source: 'c4:purge' },
      ],
    });
    expect(gateRefusals(cfg)).toEqual([]);
  });
});

describe('the `cleared` condition atom (T706; render/__fixtures__/devBearers.test.ts has its rules)', () => {
  it('reads false and stays open while the wreck stands before its wave', () => {
    const state = createState(FX.maps.fx_map, 1);
    const ctx = {
      content: FX,
      map: FX.maps.fx_map,
      config: fixtureConfig(),
      scratch: createScratch(),
    };
    const c = { cleared: ['wreck'], byWave: 2 } as const;
    expect(evaluateCondition(c, state, ctx)).toBe(false);
    expect(settledCondition(c, state, ctx)).toBeNull();
  });
});

describe('the M7 content (stubs under their final ids)', () => {
  it('compiles the jammers, the healer, and the bosses (enemies.md § 4–6; D146)', () => {
    const e = LIVE.enemies;
    expect(e.silencer.jam).toEqual({
      kind: 'tendril',
      periodTicks: 720,
      tellTicks: 120,
      radiusTiles: 2.5,
      radiusSq: 6.25,
      durationTicks: 240,
      preferChoir: true,
    });
    expect(e.auditor.jam).toMatchObject({ kind: 'ring', periodTicks: 600, durationTicks: 180 });
    expect(e.associate.healAura).toEqual({
      radiusTiles: 1.5,
      radiusSq: 2.25,
      hpPerTick: 0.2,
      body: 'mechanical',
    });
    expect([e.liability, e.gunship, e.blackbudget].map((d) => [d.hp, d.armor, d.layer])).toEqual([
      [600, 12, 'ground'],
      [300, 8, 'air'],
      [200, 6, 'ground'],
    ]);
    expect(e.blackbudget.cloaked).toBe(true);
    const sv = e.shareholder_value.boss!;
    expect(sv.phases.map((p) => [p.fromPct, p.hangar, p.takeover, p.jettison])).toEqual([
      [1, { enemy: 'compliance', count: 2, everyTicks: 480 }, null, null],
      [0.66, null, { tellTicks: 180, durationTicks: 240 }, null],
      [0.33, null, null, { hastePct: 0.4, plates: ['crash_1', 'crash_2', 'crash_3', 'crash_4'] }],
    ]);
    const maw = e.gathering_maw.boss!;
    expect(maw.phases[0]?.gather).toMatchObject({ everyTicks: 300, tellTicks: 90, radiusSq: 4 });
    expect(maw.phases[1]?.split).toEqual({
      part: 'gathering_maw_part',
      count: 3,
      hpPct: 0.2,
      mergeAfterTicks: 720,
      mergeHastePct: 0.3,
    });
    expect(e.gathering_maw.hushes).toBe(false); // a boss
    expect(e.silencer.hushes).toBe(true); // a Hollow unit
  });

  it('compiles the towers and System Reboot (towers.md § 7; core-loop.md § 3.2)', () => {
    const sproing = LIVE.towers.sproing;
    expect(sproing.tiers.map((t) => t.attack)).toMatchObject([
      { kind: 'leaper', damage: 25, leapers: 1, pinTicks: 90, splashTiles: 0, cooldownTicks: 120 },
      { damage: 35 },
      { pinTicks: 120, cooldownTicks: 100 },
    ]);
    expect(sproing.specs?.a.attack).toMatchObject({ leapers: 2 });
    expect(sproing.specs?.b.attack).toMatchObject({ damage: 90, splashTiles: 0.8 });
    const gloop = LIVE.towers.gloop;
    expect(gloop.tiers.map((t) => t.effects[0])).toMatchObject([
      { status: 'corroded', stacks: 1, maxStacks: 5 },
      { stacks: 1, maxStacks: 6 },
      { stacks: 2, maxStacks: 8 },
    ]);
    expect(gloop.specs?.a.puddle).toEqual({
      durationTicks: 180,
      radiusTiles: 1,
      radiusSq: 1,
      chillPct: 0.25,
      damagePerTick: 10 / 60,
      type: 'kinetic',
    });
    expect(gloop.specs?.b.effects[0]).toMatchObject({
      stacks: 3,
      maxStacks: 12,
      shieldRegenMul: 0.5,
    });
    expect(LIVE.abilities.system_reboot).toMatchObject({
      cooldownTicks: 2400,
      effect: { kind: 'reboot', immuneTicks: 360 },
      companion: null,
    });
  });
});

// ── The validators reject each malformed seam shape ───────────────────────────────────────────

/** The live content with `over` patched in. */
function live(
  over: { enemies?: Record<string, EnemyDef>; towers?: Record<string, TowerDef> } = {},
): RawContent<IdSpace> {
  return {
    ...RAW_CONTENT,
    enemies: { ...RAW_CONTENT.enemies, ...over.enemies },
    towers: { ...RAW_CONTENT.towers, ...over.towers },
  };
}
/** The errors of rule `rule` in `raw`. */
function errors(raw: RawContent<IdSpace>, rule: string): string[] {
  return validate(raw).filter((e) => e.startsWith(`[${rule}] `));
}
const SV = RAW_CONTENT.enemies.shareholder_value;
const MAW = RAW_CONTENT.enemies.gathering_maw;

describe('validation of the M7 seams', () => {
  it('accepts the live content (the dev maps: render/__fixtures__/devM7.test.ts)', () => {
    // compileContent validates (a revisit composed first) and throws on any problem.
    expect(() => compileContent(RAW_CONTENT)).not.toThrow();
  });

  it('[enemy-ability]: jams tell ≥ 1.5 s and last ≤ 4 s; only a tendril picks', () => {
    const silencer = RAW_CONTENT.enemies.silencer;
    const bad = { ...silencer, jam: { ...silencer.jam!, tellSec: 1, durationSec: 5 } };
    expect(errors(live({ enemies: { silencer: bad } }), 'enemy-ability')).toEqual([
      '[enemy-ability] enemies.silencer.jam.tellSec: must be ≥ 1.5 s (JAM_MIN_TELL_SEC) and below periodSec',
      '[enemy-ability] enemies.silencer.jam.durationSec: must be in (0, 4] s (JAM_MAX_SEC)',
    ]);
    const auditor = RAW_CONTENT.enemies.auditor;
    const picky = { ...auditor, jam: { ...auditor.jam!, prefer: 'choir' as const } };
    expect(errors(live({ enemies: { auditor: picky } }), 'enemy-ability')).toEqual([
      "[enemy-ability] enemies.auditor.jam.prefer: only a 'tendril' picks its target",
    ]);
  });

  it('[jammer-source] and [enemy-traits]: only the listed jammers jam; the trait goes with a jam', () => {
    const liability = RAW_CONTENT.enemies.liability;
    const rogue = { ...liability, jam: RAW_CONTENT.enemies.auditor.jam! };
    expect(errors(live({ enemies: { liability: rogue } }), 'jammer-source')).toHaveLength(1);
    expect(errors(live({ enemies: { liability: rogue } }), 'enemy-traits')).toEqual([
      "[enemy-traits] enemies.liability.traits: 'jammer' goes with `jam` or a Hostile Takeover phase",
    ]);
    const associate = RAW_CONTENT.enemies.associate;
    const { healAura: _gone, ...noAura } = associate;
    expect(errors(live({ enemies: { associate: noAura } }), 'enemy-traits')).toEqual([
      "[enemy-traits] enemies.associate.traits: 'healer_aura' goes with `healAura`",
    ]);
  });

  it('[enemy-ability]: the M7 boss phases', () => {
    const [p1, p2, p3] = SV.boss!.phases;
    const sv: EnemyDef = {
      ...SV,
      boss: {
        ...SV.boss!,
        phases: [
          { ...p1!, hangar: { enemy: 'nobody', count: 0, everySec: 8 } },
          { ...p2!, takeover: { tellSec: 1, durationSec: 4 } },
          { ...p3!, jettison: { hastePct: 0.9, plates: [] } },
        ],
      },
    };
    expect(errors(live({ enemies: { shareholder_value: sv } }), 'enemy-ability')).toEqual([
      "[enemy-ability] enemies.shareholder_value.boss.phases[0].hangar.enemy: unknown enemy 'nobody'",
      '[enemy-ability] enemies.shareholder_value.boss.phases[0].hangar.count: must be a whole number ≥ 1',
      '[enemy-ability] enemies.shareholder_value.boss.phases[1].takeover.tellSec: a boss ability tells for at least 1.5 s',
      '[enemy-ability] enemies.shareholder_value.boss.phases[2].jettison.hastePct: must be in (0, 0.5]',
      '[enemy-ability] enemies.shareholder_value.boss.phases[2].jettison.plates: names at least one marker',
    ]);
    const [m1, m2] = MAW.boss!.phases;
    const maw: EnemyDef = {
      ...MAW,
      boss: {
        ...MAW.boss!,
        phases: [
          { ...m1!, gather: { ...m1!.gather!, tellSec: 6 } },
          { ...m2!, split: { ...m2!.split!, part: 'gathering_maw', count: 1, hpPct: 0 } },
        ],
      },
    };
    expect(errors(live({ enemies: { gathering_maw: maw } }), 'enemy-ability')).toEqual([
      '[enemy-ability] enemies.gathering_maw.boss.phases[0].gather.tellSec: must be > 0 and below everySec',
      '[enemy-ability] enemies.gathering_maw.boss.phases[1].split.enemy: an enemy may not spawn itself',
      '[enemy-ability] enemies.gathering_maw.boss.phases[1].split.part: a boss splits into parts, never itself',
      '[enemy-ability] enemies.gathering_maw.boss.phases[1].split.count: must be a whole number ≥ 2',
      '[enemy-ability] enemies.gathering_maw.boss.phases[1].split.hpPct: must be in (0, 1]',
    ]);
  });

  it('[tower-range]: a leaper attack and a puddle', () => {
    const sproing = RAW_CONTENT.towers.sproing;
    const [t1, t2, t3] = sproing.tiers;
    const noLeapers: TowerDef = {
      ...sproing,
      tiers: [{ ...t1, attack: { ...t1.attack!, kind: 'leaper', leapers: 0, pinSec: 0 } }, t2, t3],
    };
    expect(errors(live({ towers: { sproing: noLeapers } }), 'tower-range')).toContain(
      '[tower-range] towers.sproing.tiers[0].attack.leapers: must be a whole number ≥ 1',
    );
    const gloop = RAW_CONTENT.towers.gloop;
    const wet: TowerDef = {
      ...gloop,
      specs: {
        a: { ...gloop.specs!.a, puddle: { ...gloop.specs!.a.puddle!, chillPct: 0.9 } },
        b: gloop.specs!.b,
      },
    };
    expect(errors(live({ towers: { gloop: wet } }), 'tower-range')).toEqual([
      '[tower-range] towers.gloop.specs.a.puddle.chillPct: 0.9 must be in [0, 0.7] (it lands as Chilled)',
    ]);
  });
});
