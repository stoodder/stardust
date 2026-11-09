// The links system (T202a): adjacency, each link once per tower, LinkFormed/LinkBroken, uptime,
// and every bonus it sums (static towerStat modifiers, tiles, links, auras) under the stacking
// formula; plus the towers and projectiles systems reading them (rate, range, vsStatus damage).
// Fixture links over fx_map's towers: fx_cross (gun + mortar, both +10% rate, like Crossfire),
// fx_ducks (mortar +20% damage vs Chilled, sprinkler +0.3 range, like Sitting Ducks). fx_map's
// pads are (1,1), (3,1), (4,2), (1,3) and its high ground (3,2); (3,1), (3,2), and (4,2) touch.
import { describe, expect, it } from 'vitest';
import type { CompiledContent, CompiledMapDef, CompiledTowerDef } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import type { IdSpace, RawContent, TowerDef } from '../../content/types.ts';
import { placeTower, spawn, WALKER } from '../__fixtures__/combat.ts';
import { SIM_FIXTURE, fixtureConfig } from '../__fixtures__/sim.ts';
import type { Modifier, SimConfig } from '../config.ts';
import type { SimEvent } from '../events.ts';
import { createSim } from '../sim.ts';
import { createState, type SimState } from '../state.ts';
import { createScratch, runTick, type TickContext } from '../tick.ts';
import { towerStats } from '../towerStats.ts';
import { isLinkActive, links, tileAndLinkRules } from './links.ts';

/** A support tower with a damage aura (Hum Choir's shape) and one with a lookout aura. */
const fxChoir: TowerDef<'fx_choir'> = {
  id: 'fx_choir',
  faction: 'skitterkin',
  role: 'Fixture: aura',
  sprites: { base: 'tower.sprinkler', icon: 'icon.tower.sprinkler' },
  tiers: [
    {
      cost: 100,
      targets: { ground: false, air: false },
      defaultPriority: null,
      auras: [{ kind: 'choir', radiusTiles: 2.5, stat: 'damage', pct: 0.2 }],
    },
    { cost: 80, auras: [{ kind: 'choir', radiusTiles: 2.5, stat: 'damage', pct: 0.3 }] },
    { cost: 150 },
  ],
};

const RAW: RawContent<IdSpace> = {
  ...SIM_FIXTURE,
  towers: { ...SIM_FIXTURE.towers, fx_choir: fxChoir },
  maps: {
    fx_map: {
      ...SIM_FIXTURE.maps.fx_map,
      startCredits: 2000,
      towerUnlockWave: {}, // everything buildable from the start
    },
  },
  links: {
    fx_cross: {
      id: 'fx_cross',
      name: 'Fixture Crossfire',
      partners: [
        { tower: 'fx_gun', bonuses: [{ stat: 'rate', pct: 0.1 }] },
        { tower: 'fx_mortar', bonuses: [{ stat: 'rate', pct: 0.1 }] },
      ],
    },
    fx_ducks: {
      id: 'fx_ducks',
      name: 'Fixture Ducks',
      partners: [
        { tower: 'fx_mortar', bonuses: [{ stat: 'damage', pct: 0.2, vsStatus: ['chilled'] }] },
        { tower: 'fx_sprinkler', bonuses: [{ stat: 'range', flat: 0.3 }] },
      ],
    },
  },
};
const CONTENT: CompiledContent<IdSpace> = compileContent(RAW);
const MAP = CONTENT.maps.fx_map!;
const GUN = CONTENT.towers.fx_gun!;
const MORTAR = CONTENT.towers.fx_mortar!;
const SPRINKLER = CONTENT.towers.fx_sprinkler!;
const CHOIR = CONTENT.towers.fx_choir!;

/** fx_map with (4,2) turned into a power node. */
const NODE_MAP: CompiledMapDef<IdSpace> = Object.freeze({
  ...MAP,
  tiles: MAP.tiles.map((t, i) => (i === 2 * MAP.cols + 4 ? '+' : t)),
});

function config(over: Partial<SimConfig<IdSpace>> = {}): SimConfig<IdSpace> {
  const base: SimConfig<IdSpace> = fixtureConfig();
  return { ...base, content: CONTENT, loadout: ['fx_gun', 'fx_mortar', 'fx_sprinkler'], ...over };
}

function setup(
  modifiers: Modifier<IdSpace>[] = [],
  map: CompiledMapDef<IdSpace> = MAP,
): { state: SimState; ctx: TickContext } {
  return {
    state: createState(map, 1),
    ctx: { content: CONTENT, map, config: config({ modifiers }), scratch: createScratch() },
  };
}

/** Places towers and runs the links system once. */
function placed(
  towers: readonly (readonly [CompiledTowerDef, number, number, number?])[],
  modifiers: Modifier<IdSpace>[] = [],
  map: CompiledMapDef<IdSpace> = MAP,
): { state: SimState; ctx: TickContext } {
  const s = setup(modifiers, map);
  for (const [def, col, row, tier] of towers) placeTower(s.state, def, col, row, tier ?? 1);
  s.state.linksDirty = true;
  links(s.state, s.ctx);
  return s;
}

const tower = (state: SimState, slot: number) => state.towers.items[slot]!;

describe('link content', () => {
  it('compiles each partner’s bonuses, a bit per link, and every tower’s link list', () => {
    expect(CONTENT.links.map((l) => [l.id, l.index, l.bit])).toEqual([
      ['fx_cross', 0, 1],
      ['fx_ducks', 1, 2],
    ]);
    expect(CONTENT.links[1]!.partners).toEqual([
      expect.objectContaining({ tower: 'fx_mortar', pctDamage: 0, vsStatusMask: 1, vsStatusPct: 0.2 }),
      expect.objectContaining({ tower: 'fx_sprinkler', flatRange: 0.3 }),
    ]);
    expect(MORTAR.links).toEqual(['fx_cross', 'fx_ducks']);
    expect(GUN.links).toEqual(['fx_cross']);
    expect(CHOIR.links).toEqual([]);
  });
});

describe('links: adjacency (towers.md § 6.1)', () => {
  it('links towers that share an edge or a corner, never two tiles apart', () => {
    const edge = placed([
      [GUN, 3, 1],
      [MORTAR, 3, 2],
    ]);
    expect(edge.state.linkPairs).toEqual([0, 1, 2]);
    expect(tower(edge.state, 0).linkMask).toBe(1);
    expect(tower(edge.state, 1).linkMask).toBe(1);
    const corner = placed([
      [GUN, 3, 1],
      [MORTAR, 4, 2],
    ]);
    expect(corner.state.linkPairs).toEqual([0, 1, 2]);
    const apart = placed([
      [GUN, 1, 1],
      [MORTAR, 1, 3],
    ]);
    expect(apart.state.linkPairs).toEqual([]);
    expect(tower(apart.state, 0).pctRate).toBe(0);
  });

  it('counts each link type once per tower, however many partners touch it', () => {
    // The mortar at (3,1) touches guns at (3,2) and (4,2): two pairs, one Crossfire each.
    const { state } = placed([
      [MORTAR, 3, 1],
      [GUN, 3, 2],
      [GUN, 4, 2],
    ]);
    expect(state.linkPairs).toEqual([0, 1, 2, 0, 1, 3]);
    expect(tower(state, 0).pctRate).toBeCloseTo(0.1, 12);
    expect(tower(state, 1).pctRate).toBeCloseTo(0.1, 12);
  });

  it('gives a tower several different links, each partner its own side', () => {
    const { state } = placed([
      [MORTAR, 3, 1],
      [GUN, 3, 2],
      [SPRINKLER, 4, 2],
    ]);
    const [m, g, s] = [tower(state, 0), tower(state, 1), tower(state, 2)];
    expect(m.linkMask).toBe(3);
    expect(m).toMatchObject({ vsStatusMask: 1, vsStatusPct: 0.2 });
    expect(m.pctRate).toBeCloseTo(0.1, 12);
    expect(g.linkMask).toBe(1);
    expect(s.linkMask).toBe(2);
    expect(s.flatRange).toBeCloseTo(0.3, 12);
  });
});

describe('links: events and uptime', () => {
  type Ev = SimEvent<IdSpace>;
  const linkEvents = (evs: readonly Ev[]) =>
    evs.filter((e) => e.type === 'LinkFormed' || e.type === 'LinkBroken');

  it('emits LinkFormed when a partner is built and LinkBroken when one is sold', () => {
    const sim = createSim(config());
    const out: Ev[] = [];
    sim.enqueue({ type: 'build', tile: [3, 1], tower: 'fx_gun' });
    sim.enqueue({ type: 'build', tile: [3, 2], tower: 'fx_mortar' });
    sim.step();
    sim.drainEvents(out);
    expect(linkEvents(out)).toEqual([{ type: 'LinkFormed', link: 'fx_cross', a: 1, b: 2 }]);
    expect(isLinkActive(sim.state, CONTENT, 'fx_cross')).toBe(true);
    expect(isLinkActive(sim.state, CONTENT, 'fx_ducks')).toBe(false);
    sim.step();
    sim.step();
    // Uptime counts every tick with the link up, the forming tick included.
    expect(sim.state.stats.linkTicks).toEqual({ fx_cross: 3 });
    out.length = 0;
    sim.enqueue({ type: 'sell', towerUid: 2 });
    sim.step();
    sim.drainEvents(out);
    expect(linkEvents(out)).toEqual([{ type: 'LinkBroken', link: 'fx_cross', a: 1, b: 2 }]);
    expect(isLinkActive(sim.state, CONTENT, 'fx_cross')).toBe(false);
    expect(sim.state.towers.items[0]!.linkMask).toBe(0);
    expect(sim.state.towers.items[0]!.pctRate).toBe(0);
    sim.step();
    expect(sim.state.stats.linkTicks).toEqual({ fx_cross: 3 });
  });

  it('keeps a link through an upgrade (no events) and recomputes only when dirty', () => {
    const sim = createSim(config());
    const out: Ev[] = [];
    sim.enqueue({ type: 'build', tile: [3, 1], tower: 'fx_gun' });
    sim.enqueue({ type: 'build', tile: [3, 2], tower: 'fx_mortar' });
    sim.step();
    sim.drainEvents(out);
    out.length = 0;
    sim.enqueue({ type: 'upgrade', towerUid: 1 });
    sim.step();
    sim.drainEvents(out);
    expect(linkEvents(out)).toEqual([]);
    expect(sim.state.linksDirty).toBe(false);
    expect(sim.state.towers.items[0]!.linkMask).toBe(1);
  });
});

describe('links: tile bonuses (maps.md § 3)', () => {
  it('high ground: +25% range; tileBonus raises it (High Ground Training: 40%)', () => {
    const plain = placed([[GUN, 3, 2]]);
    expect(tower(plain.state, 0).pctRange).toBe(0.25);
    const trained = placed(
      [[GUN, 3, 2]],
      [{ kind: 'tileBonus', tile: 'highGround', flat: 0.15, source: 'protocol:hgt' }],
    );
    expect(tower(trained.state, 0).pctRange).toBeCloseTo(0.4, 12);
    expect(towerStats(GUN, 1, tower(trained.state, 0)).rangeTiles).toBe(4.2);
    expect(tower(placed([[GUN, 1, 1]]).state, 0).pctRange).toBe(0);
  });

  it('power node: +20% fire rate, or +20% aura strength for a support tower', () => {
    const { state } = placed(
      [
        [GUN, 4, 2],
        [CHOIR, 3, 1],
      ],
      [],
      NODE_MAP,
    );
    expect(tower(state, 0).pctRate).toBe(0.2);
    // The choir isn't on the node: its aura is plain.
    expect(tower(state, 0).pctDamage).toBe(0.2);
    const boosted = placed(
      [
        [CHOIR, 4, 2],
        [GUN, 3, 1],
      ],
      [],
      NODE_MAP,
    );
    expect(tower(boosted.state, 0).pctRate).toBe(0); // no attack: no rate bonus
    expect(tower(boosted.state, 1).pctDamage).toBeCloseTo(0.24, 12);
  });
});

describe('links: auras (towers.md § 4)', () => {
  it('takes the strongest same-kind aura, never the sum, and never covers its own tower', () => {
    const { state } = placed([
      [CHOIR, 3, 1, 1],
      [CHOIR, 4, 2, 2],
      [GUN, 3, 2],
    ]);
    expect(tower(state, 2).pctDamage).toBeCloseTo(0.3, 12); // not 0.5
    expect(tower(state, 1).pctDamage).toBeCloseTo(0.2, 12); // the other choir's, not its own
    expect(tower(state, 0).pctDamage).toBeCloseTo(0.3, 12);
  });

  it('reaches only within its radius', () => {
    const { state } = placed([
      [CHOIR, 1, 1],
      [GUN, 4, 2], // 3.16 tiles away
    ]);
    expect(tower(state, 1).pctDamage).toBe(0);
  });
});

describe('links: modifiers', () => {
  it('folds static towerStat modifiers in, for that tower or every tower', () => {
    const { state } = placed(
      [
        [GUN, 1, 1],
        [MORTAR, 1, 3],
      ],
      [
        { kind: 'towerStat', tower: 'fx_gun', stat: 'damage', pct: 0.05, source: 'shop:tune1' },
        { kind: 'towerStat', tower: '*', stat: 'range', flat: 0.5, source: 'test' },
      ],
    );
    expect(tower(state, 0)).toMatchObject({ pctDamage: 0.05, flatRange: 0.5 });
    expect(tower(state, 1)).toMatchObject({ pctDamage: 0, flatRange: 0.5 });
  });

  it('scales every link bonus by linkBonus (Linked Up: +50%)', () => {
    const mods: Modifier<IdSpace>[] = [{ kind: 'linkBonus', pct: 0.5, source: 'protocol:lu' }];
    expect(tileAndLinkRules(mods).linkMult).toBe(1.5);
    const { state } = placed(
      [
        [MORTAR, 3, 1],
        [SPRINKLER, 4, 2],
      ],
      mods,
    );
    expect(tower(state, 0).vsStatusPct).toBeCloseTo(0.3, 12);
    expect(tower(state, 1).flatRange).toBeCloseTo(0.45, 12);
  });
});

describe('the towers system under bonuses', () => {
  it('Crossfire: a 2/s gun fires every 27 ticks, not 30', () => {
    const { state, ctx } = placed([
      [GUN, 3, 1],
      [MORTAR, 3, 2],
    ]);
    spawn(state, { ...WALKER, hp: 10_000 }, { dist: 2 });
    const shots: number[] = [];
    for (let i = 0; i < 70; i++) {
      const tick = state.tick;
      runTick(state, ctx);
      for (const e of state.events) {
        if (e.type === 'ProjectileFired' && e.towerUid === 1) shots.push(tick);
      }
      state.events.length = 0;
    }
    expect(shots.length).toBeGreaterThanOrEqual(2);
    expect(shots[1]! - shots[0]!).toBe(27);
  });

  it('range: high ground reaches an enemy the same tower on a pad can’t', () => {
    // An enemy just past the gun's 3 tiles, inside its 3.75 on high ground.
    const { state, ctx } = placed([[GUN, 3, 2]]);
    const e = spawn(state, { ...WALKER, hp: 10_000 }, { dist: 0.6 }); // (1.1, 0.5)
    const d = Math.hypot(e.x - 3.5, e.y - 2.5);
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(3.75);
    runTick(state, ctx);
    expect(tower(state, 0).targetUid).toBe(e.uid);
    const pad = setup();
    placeTower(pad.state, GUN, 3, 1); // a pad: no bonus
    const far = spawn(pad.state, { ...WALKER, hp: 10_000 }, { dist: 0 }); // (0.5, 0.5)
    expect(Math.hypot(far.x - 3.5, far.y - 1.5)).toBeGreaterThan(3);
    runTick(pad.state, pad.ctx);
    expect(tower(pad.state, 0).targetUid).toBe(0);
  });

  it('Sitting Ducks: a shell deals +20% to the Chilled victims only, checked on impact', () => {
    const { state, ctx } = placed([
      [MORTAR, 3, 1],
      [SPRINKLER, 4, 2],
    ]);
    const m = tower(state, 0);
    expect(m.vsStatusMask).toBe(1);
    // Two walkers side by side at the shell's aim, one Chilled.
    const a = spawn(state, { ...WALKER, hp: 1000, speedTilesPerTick: 0 }, { dist: 6.0 });
    const b = spawn(state, { ...WALKER, hp: 1000, speedTilesPerTick: 0 }, { dist: 6.1 });
    a.chillPct = 0.25;
    a.chillMul = 0.75;
    a.chillTicks = 10_000;
    // Keep the sprinkler quiet so only the shell hurts.
    tower(state, 1).cooldownTicks = 10_000;
    for (let i = 0; i < 60 && a.hp === 1000; i++) runTick(state, ctx);
    expect(1000 - a.hp).toBeCloseTo(24, 9);
    expect(1000 - b.hp).toBeCloseTo(20, 9);
  });
});
