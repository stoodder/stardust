// The M3 seams (T300a): the new command, events, state fields, and stub systems are declared and
// behave as no-ops; FEATURE_GATES refuses each new mechanic, naming the task that lifts it; the
// live M3 content is registered and refused until then; ProjectileHit carries `reduced`.
import { describe, expect, it } from 'vitest';
import { RAW_CONTENT } from '../content/registry.ts';
import { compileContent } from '../content/compile.ts';
import type {
  CompiledContent,
  CompiledEnemyDef,
  CompiledMapDef,
  CompiledWaveGroup,
} from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { GUN, MAP, enemyDef, placeTower, setup, spawn } from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig, fixtureSim, type FixtureIds } from './__fixtures__/sim.ts';
import { armorReduces } from './combat/damage.ts';
import { copyCommand, type Command } from './commands.ts';
import { ENEMY_BLANK } from './entities.ts';
import { FEATURE_GATES, abilityRefusal, gateRefusals, towerRefusal } from './gates.ts';
import type { SimConfig } from './config.ts';
import { towers } from './systems/towers.ts';
import { wreckage } from './systems/wreckage.ts';
import { createState } from './state.ts';
import type { SimEvent } from './events.ts';

const LIVE = compileContent(RAW_CONTENT);

/** fx_map with every wave group patched by `group` (and the map itself by `map`). */
function contentWithGroups(
  group: Partial<CompiledWaveGroup<IdSpace>>,
  map: Partial<CompiledMapDef<IdSpace>> = {},
): CompiledContent<FixtureIds> {
  const waves = MAP.waves.map((w) =>
    Object.assign({}, w, { groups: w.groups.map((g) => Object.assign({}, g, group)) }),
  );
  const fx = Object.assign({}, MAP, { waves }, map);
  return { ...FIXTURE_CONTENT, maps: { fx_map: fx } };
}

/** fx_map with every wave group's enemy replaced by `def`. */
function contentWith(
  def: CompiledEnemyDef,
  map: Partial<CompiledMapDef<IdSpace>> = {},
): CompiledContent<FixtureIds> {
  return contentWithGroups({ enemy: def }, map);
}

function refusedWith(def: CompiledEnemyDef): string[] {
  return gateRefusals(fixtureConfig({ content: contentWith(def) }));
}

describe('the clear command (T304b)', () => {
  it('is declared, copied deeply, and logged (live since T304b: systems/wreckage.test.ts)', () => {
    const cmd: Command<FixtureIds> = { type: 'clear', tile: [4, 3] };
    const copy = copyCommand(cmd);
    expect(copy).toEqual(cmd);
    expect(copy).not.toBe(cmd);
    if (copy.type === 'clear' && cmd.type === 'clear') expect(copy.tile).not.toBe(cmd.tile);
    const sim = fixtureSim();
    sim.enqueue(cmd);
    sim.applyPending();
    const out: SimEvent<FixtureIds>[] = [];
    sim.drainEvents(out);
    // fx_map's (4, 3) is wreckage: the drone takes it.
    expect(out).toEqual([]);
    expect(sim.state.wreckage.queue).toEqual([3 * 6 + 4]);
    expect(sim.state.commandLog).toHaveLength(1);
  });
});

describe('M3 state fields', () => {
  it('start blank', () => {
    const state = createState(MAP, 1);
    expect(state.abilityCooldownWaves).toEqual([0, 0]);
    expect(state.discountCharges).toBe(0);
    expect(state.discountPct).toBe(0);
    expect(state.wreckage).toEqual({ queue: [], progressTicks: 0, cleared: [] });
    expect(state.stats).toMatchObject({ neutralHits: 0, wreckageCleared: 0, lateSells: 0 });
    expect(ENEMY_BLANK).toMatchObject({
      abilityTicks: 0,
      abilityCount: 0,
      paceMul: 1,
      burrowed: false,
      huddleUid: 0,
      bossPhase: 0,
      invulnerableTicks: 0,
      leaving: false,
    });
  });

  it('are hashed', () => {
    const base = fixtureSim().hash();
    const pokes: [string, (s: object) => void][] = [
      ['neutralHits', (s) => Reflect.set(Reflect.get(s, 'stats'), 'neutralHits', 1)],
      ['discountCharges', (s) => Reflect.set(s, 'discountCharges', 3)],
      ['abilityCooldownWaves', (s) => Reflect.set(Reflect.get(s, 'abilityCooldownWaves'), 0, 4)],
      ['wreckage', (s) => Reflect.set(Reflect.get(s, 'wreckage'), 'progressTicks', 1)],
    ];
    for (const [name, poke] of pokes) {
      const sim = fixtureSim();
      poke(sim.state);
      expect(sim.hash(), name).not.toBe(base);
    }
  });
});

describe('stub systems', () => {
  it('wreckage changes nothing with an empty queue', () => {
    const { state, ctx } = setup();
    spawn(state, LIVE.enemies.digger);
    const before = JSON.stringify(state);
    wreckage(state, ctx);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('ProjectileHit.reduced (the plink)', () => {
  it('is true when armor blunts the hit, after pierce and Corroded', () => {
    const armored = enemyDef('fx_armored', { hp: 1000, armor: 2 });
    const e = spawn(setup().state, armored);
    expect(armorReduces(e, 'kinetic')).toBe(true);
    expect(armorReduces(e, 'psionic')).toBe(false);
    expect(armorReduces(e, 'kinetic', { armorPierce: 2, ignoresArmor: false })).toBe(false);
    expect(armorReduces(e, 'kinetic', { armorPierce: 0, ignoresArmor: true })).toBe(false);
    e.corrodedStacks = 2;
    expect(armorReduces(e, 'kinetic')).toBe(false);
  });

  it('rides on a tower hit', () => {
    for (const [armor, reduced] of [
      [0, false],
      [3, true],
    ] as const) {
      const { state, ctx } = setup();
      spawn(state, enemyDef(`fx_armor_${armor}`, { hp: 1000, armor }));
      placeTower(state, GUN, 1, 1);
      towers(state, ctx);
      const hit = state.events.find((ev) => ev.type === 'ProjectileHit');
      expect(hit, `armor ${armor}`).toMatchObject({ reduced });
    }
  });
});

describe('FEATURE_GATES (T300a rows)', () => {
  it('names the lifting task for every M3 mechanic', () => {
    expect(FEATURE_GATES).toMatchObject({
      'attack.projectile': null, // T304a
      'attack.chain': null, // T304b
      'enemy.flying': null, // T304a
      'enemy.neutral': null, // T304a
      'enemy.burrow': null, // T304c
      'enemy.split': null, // T304c
      'enemy.huddle': null, // T304c
      'enemy.boss': null, // T304c
      'enemy.boss.pivot': null, // the Penitent (T506)
      'enemy.boss.layToRest': 'M7',
      'ability.slowAll': null, // T304d
      'ability.discount': null, // T304d
      'modifier.firstBuildFree': null, // T304d
      'modifier.freeCast': null, // T304d
      'modifier.economy.salvage': null, // T304b
      'modifier.economy.clearSpeed': null, // T304b
      'map.objectives': null, // T304f
    });
  });

  it("refuses a map whose waves use a new enemy mechanic, once each, naming the enemy's id", () => {
    const e = LIVE.enemies;
    // T304a's rows are open: flyers and neutral units play (closed again here to show the use).
    const t304a = { ...FEATURE_GATES, 'enemy.flying': 'T304a', 'enemy.neutral': 'T304a' } as const;
    expect(refusedWith(e.puffwing)).toEqual([]);
    expect(refusedWith(e.gerald)).toEqual([]);
    expect(gateRefusals(fixtureConfig({ content: contentWith(e.puffwing) }), t304a)).toEqual([
      'flyers (puffwing) is not simulated until T304a',
    ]);
    expect(gateRefusals(fixtureConfig({ content: contentWith(e.gerald) }), t304a)).toEqual([
      'flyers (gerald) is not simulated until T304a',
      'a neutral unit (gerald) is not simulated until T304a',
    ]);
    // T304c's rows are open too (closed again here to show the use).
    const t304c = {
      ...FEATURE_GATES,
      'enemy.burrow': 'T304c',
      'enemy.split': 'T304c',
      'enemy.huddle': 'T304c',
      'enemy.boss': 'T304c',
    } as const;
    const closed = (def: CompiledEnemyDef): string[] =>
      gateRefusals(fixtureConfig({ content: contentWith(def) }), t304c);
    for (const id of ['digger', 'bunchling', 'elder', 'chitterbloom'] as const) {
      expect(refusedWith(e[id]), id).toEqual([]);
    }
    expect(closed(e.digger)).toEqual(['burrowing (digger) is not simulated until T304c']);
    expect(closed(e.bunchling)).toEqual(['splitting (bunchling) is not simulated until T304c']);
    expect(closed(e.elder)).toEqual(['a huddle (elder) is not simulated until T304c']);
    expect(closed(e.chitterbloom)).toEqual(['a boss (chitterbloom) is not simulated until T304c']);
    // Boss endings Act I doesn't use stay refused (`pivot` runs since T506).
    for (const [ending, owner] of [['layToRest', 'M7']] as const) {
      const boss = { ...e.chitterbloom.boss!, ending };
      expect(refusedWith({ ...e.chitterbloom, boss })).toEqual([
        `a boss ending '${ending}' (chitterbloom) is not simulated until ${owner}`,
      ]);
    }
    // A ground unit on an air lane is a flyer too.
    const air = { ...MAP.routes.a!, kind: 'air' as const, layer: 'air' as const };
    const content = contentWithGroups({ route: air });
    expect(gateRefusals(fixtureConfig({ content }), t304a)[0]).toMatch(/^flyers \(fx_walker\)/);
    // Lifted per row.
    const lifted = { ...FEATURE_GATES, 'enemy.flying': null };
    expect(gateRefusals(fixtureConfig({ content: contentWith(e.puffwing) }), lifted)).toEqual([]);
  });

  it('plays optional objectives (T304f) and the new ability effects (T304d)', () => {
    const objective = {
      id: 'clean_audit',
      name: 'Clean Audit',
      description: 'x',
      condition: { stat: 'lateSells', lte: 0 } as const,
      intel: 1,
      onComplete: [],
    };
    const fxWalker = FIXTURE_CONTENT.enemies.fx_walker;
    const content = contentWith(fxWalker, { objectives: [objective] });
    expect(gateRefusals(fixtureConfig({ content }))).toEqual([]);
    const closedObjectives = { ...FEATURE_GATES, 'map.objectives': 'T304f' } as const;
    expect(gateRefusals(fixtureConfig({ content }), closedObjectives)).toEqual([
      'optional objectives (clean_audit) is not simulated until T304f',
    ]);
    // The live abilities, slotted on the fixture map.
    const withLive = {
      ...FIXTURE_CONTENT,
      abilities: { ...FIXTURE_CONTENT.abilities, ...LIVE.abilities },
    };
    const cfg = (slot1: string): SimConfig<IdSpace> => ({
      ...fixtureConfig(),
      content: withLive,
      abilities: { slot1, slot2: null, slot2State: 'none' },
    });
    expect(gateRefusals(cfg('time_dilation'))).toEqual([]);
    expect(gateRefusals(cfg('clearance_sale'))).toEqual([]);
    const closed = { ...FEATURE_GATES, 'ability.discount': 'T304d' } as const;
    expect(gateRefusals(cfg('clearance_sale'), closed)).toEqual([
      "the 'discount' ability (clearance_sale) is not simulated until T304d",
    ]);
  });

  it('towerRefusal and abilityRefusal judge one raw or compiled definition (meta pools)', () => {
    expect(towerRefusal(RAW_CONTENT.towers.rivet)).toBeNull();
    expect(towerRefusal(RAW_CONTENT.towers.skyhook)).toBeNull(); // T304a
    expect(
      towerRefusal(RAW_CONTENT.towers.skyhook, { ...FEATURE_GATES, 'attack.projectile': 'T304a' }),
    ).toMatch(/'projectile' attack .* T304a$/);
    expect(towerRefusal(LIVE.towers.zapcoil)).toBeNull(); // T304b
    expect(
      towerRefusal(RAW_CONTENT.towers.zapcoil, { ...FEATURE_GATES, 'attack.chain': 'T304b' }),
    ).toMatch(/'chain' attack .* T304b$/);
    expect(abilityRefusal(RAW_CONTENT.abilities.orbital_strike)).toBeNull();
    expect(abilityRefusal(RAW_CONTENT.abilities.time_dilation)).toBeNull(); // T304d
    expect(abilityRefusal(LIVE.abilities.clearance_sale)).toBeNull();
    const closed = { ...FEATURE_GATES, 'ability.slowAll': 'T304d' } as const;
    expect(abilityRefusal(RAW_CONTENT.abilities.time_dilation, closed)).toMatch(/T304d$/);
  });

  it('leaves the live campaign maps playable', () => {
    for (const mapId of LIVE.campaign) {
      const map = LIVE.maps[mapId];
      const cfg: SimConfig<IdSpace> = {
        content: LIVE,
        mapId,
        seed: 1,
        loadout: map.builds.parBuild.loadout,
        companion: null,
        modifiers: [],
        difficulty: 'standard',
        abilities: { slot1: 'orbital_strike', slot2: null, slot2State: 'none' },
        scriptFlags: {},
        specsUnlocked: [],
      };
      expect(gateRefusals(cfg), mapId).toEqual([]);
    }
  });
});
