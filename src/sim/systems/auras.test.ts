// T607: support auras (design/towers.md § 4 and § 7's Hum Choir; systems/auras.ts), with the live
// Hum Choir, Rivet, Mindspike, and Lookout on fx_map's 6×5 grid (the tiles don't matter here:
// towers are placed directly, and auras measure centre to centre). Harmony's two halves: the
// Choir's wider aura (here) and the Mindspike's extra target (the towers system, below).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { CompiledContent, CompiledMapDef, CompiledTier } from '../../content/compiled.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { IdSpace, LinkDef, RawContent } from '../../content/types.ts';
import { MAP, WALKER, placeTower, spawn } from '../__fixtures__/combat.ts';
import { fixtureConfig } from '../__fixtures__/sim.ts';
import type { Modifier } from '../config.ts';
import type { Tower } from '../entities.ts';
import { createState, type SimState } from '../state.ts';
import { createScratch, type TickContext } from '../tick.ts';
import { auraReachSq, projectsAura } from './auras.ts';
import { links } from './links.ts';
import { towers } from './towers.ts';

const LIVE: CompiledContent<IdSpace> = compileContent(RAW_CONTENT);
const CHOIR = LIVE.towers.choir!;
const RIVET = LIVE.towers.rivet!;
const MINDSPIKE = LIVE.towers.mindspike!;
const LOOKOUT = LIVE.towers.lookout!;
const THUMPER = LIVE.towers.thumper!; // links with neither the Choir nor the Lookout
const LULLABY: CompiledTier = CHOIR.specs!.a;
const RALLY: CompiledTier = CHOIR.specs!.b;

function ctxFor(
  modifiers: Modifier<IdSpace>[] = [],
  content: CompiledContent<IdSpace> = LIVE,
  map: CompiledMapDef<IdSpace> = MAP,
): TickContext {
  return { content, map, config: { ...fixtureConfig(), modifiers }, scratch: createScratch() };
}

/** Places `specs` ([def, col, row, tier]) and runs one links recompute. */
function placed(
  specs: [Parameters<typeof placeTower>[1], number, number, (number | CompiledTier)?][],
  ctx: TickContext = ctxFor(),
): { state: SimState; ctx: TickContext; t: Tower[] } {
  const state = createState(ctx.map, 1);
  const t = specs.map(([def, col, row, tier]) => placeTower(state, def, col, row, tier ?? 1));
  for (const tower of t) tower.alive = true;
  state.linksDirty = true;
  links(state, ctx);
  return { state, ctx, t };
}

describe('the Hum Choir (content: towers.md § 7)', () => {
  it('T1 130 r1.5 +10% jams ×0.5; T2 100 r2 +15%; T3 195 +20% jams ×0.25; specs 390', () => {
    const rows = CHOIR.tiers.map((t) => [t.cost, t.auras[0]?.radiusTiles, t.auras[0]?.pct, t.jamMul]);
    expect(rows).toEqual([
      [130, 1.5, 0.1, 0.5],
      [100, 2, 0.15, 0.5],
      [195, 2, 0.2, 0.25],
    ]);
    expect(CHOIR.tiers.every((t) => t.attack === null && t.lull === null)).toBe(true);
    // Lullaby keeps T3's aura and jam rule and adds Lulled within 2.5.
    expect([LULLABY.name, LULLABY.cost, LULLABY.auras, LULLABY.jamMul]).toEqual([
      'Lullaby',
      390,
      CHOIR.tiers[2]!.auras,
      0.25,
    ]);
    expect(LULLABY.lull).toEqual({ radiusTiles: 2.5, radiusSq: 6.25 });
    // Rally Chorus: two `choir` auras, one per stat, and immunity.
    expect([RALLY.name, RALLY.cost, RALLY.jamMul, RALLY.lull]).toEqual(['Rally Chorus', 390, 0, null]);
    expect(RALLY.auras.map((a) => [a.kind, a.stat, a.pct, a.radiusTiles])).toEqual([
      ['choir', 'damage', 0.3, 2],
      ['choir', 'rate', 0.1, 2],
    ]);
  });

  it('links Harmony (Mindspike: 1 extra target; Choir: aura +0.5 radius)', () => {
    expect(CHOIR.links).toContain('harmony');
    expect(MINDSPIKE.links).toContain('harmony');
    const harmony = LIVE.links.find((l) => l.id === 'harmony')!;
    expect(harmony.partners.map((p) => [p.tower, p.extraTargets, p.auraRadiusTiles])).toEqual([
      ['mindspike', 1, 0],
      ['choir', 0, 0.5],
    ]);
  });
});

describe('auras: the Choir (towers.md § 4)', () => {
  it('T1 covers its neighbours, a diagonal too (1.41), but not 2 tiles off', () => {
    const { t } = placed([
      [CHOIR, 3, 2],
      [RIVET, 2, 2], // 1 tile
      [RIVET, 4, 3], // 1.41
      [RIVET, 5, 2], // 2 tiles
    ]);
    expect(t.map((x) => x.pctDamage)).toEqual([0, 0.1, 0.1, 0]);
    expect(t.map((x) => x.jamMul)).toEqual([1, 0.5, 0.5, 1]);
  });

  it('T2 reaches 2 tiles; T3 gives +20% and cuts jams by 75%', () => {
    const two = placed([
      [CHOIR, 3, 2, 2],
      [RIVET, 5, 2],
    ]);
    expect(two.t[1]!.pctDamage).toBe(0.15);
    const three = placed([
      [CHOIR, 3, 2, 3],
      [RIVET, 5, 2],
    ]);
    expect([three.t[1]!.pctDamage, three.t[1]!.jamMul]).toEqual([0.2, 0.25]);
  });

  it('Rally Chorus gives +30% damage and +10% fire rate (both auras), and jam immunity', () => {
    const { t } = placed([
      [CHOIR, 3, 2, RALLY],
      [RIVET, 2, 2],
    ]);
    expect([t[1]!.pctDamage, t[1]!.pctRate, t[1]!.pctRange, t[1]!.jamMul]).toEqual([0.3, 0.1, 0, 0]);
  });

  it('two Choirs never stack: the strongest source wins, with every aura it has', () => {
    const { t } = placed([
      [CHOIR, 1, 2, LULLABY],
      [CHOIR, 3, 2, RALLY],
      [RIVET, 2, 2], // inside both
      [RIVET, 0, 2], // the Lullaby's alone
    ]);
    expect([t[2]!.pctDamage, t[2]!.pctRate, t[2]!.jamMul]).toEqual([0.3, 0.1, 0]);
    expect([t[3]!.pctDamage, t[3]!.pctRate, t[3]!.jamMul]).toEqual([0.2, 0, 0.25]);
  });

  it('no Choir aura covers any Choir: its own or another, damage, rate, or jams', () => {
    const { t } = placed([
      [CHOIR, 2, 2, RALLY],
      [CHOIR, 3, 2, RALLY],
      [CHOIR, 2, 3, 1],
    ]);
    for (const c of t) {
      expect([c.pctDamage, c.pctRate, c.jamMul]).toEqual([0, 0, 1]);
      expect(projectsAura(c, 'choir')).toBe(true);
    }
  });

  it('a power node and its aura tune-up raise both of Rally Chorus’s auras', () => {
    const node: CompiledMapDef<IdSpace> = Object.freeze({
      ...MAP,
      tiles: MAP.tiles.map((x, i) => (i === 2 * MAP.cols + 3 ? '+' : x)),
    });
    const mods: Modifier<IdSpace>[] = [
      { kind: 'supportStat', tower: 'choir', stat: 'aura', pct: 0.05, source: 'shop:tune_choir' },
    ];
    const { t } = placed(
      [
        [CHOIR, 3, 2, RALLY],
        [RIVET, 2, 2],
      ],
      ctxFor(mods, LIVE, node),
    );
    expect(t[1]!.pctDamage).toBeCloseTo(0.3 * 1.25, 12);
    expect(t[1]!.pctRate).toBeCloseTo(0.1 * 1.25, 12);
  });

  it('its radius tune-up widens every aura (rank 3: +5%)', () => {
    const mods: Modifier<IdSpace>[] = [
      { kind: 'supportStat', tower: 'choir', stat: 'radius', pct: 0.4, source: 'test' },
    ];
    // 1.5 × 1.4 = 2.1: two tiles off is inside.
    const { t } = placed(
      [
        [CHOIR, 3, 2],
        [RIVET, 5, 2],
      ],
      ctxFor(mods),
    );
    expect(t[1]!.pctDamage).toBe(0.1);
  });
});

describe('auras: other kinds keep their rule', () => {
  it('two Lookouts (range and Overclock Rig rate) give only the stronger bonus', () => {
    const { t } = placed([
      [LOOKOUT, 1, 2, 1], // +10% range
      [LOOKOUT, 3, 2, LOOKOUT.specs!.b], // +20% fire rate
      [THUMPER, 2, 2],
    ]);
    expect([t[2]!.pctRange, t[2]!.pctRate]).toEqual([0, 0.2]);
    expect(t[2]!.jamMul).toBe(1); // a Lookout has no jam rule
  });

  it('Choir and Lookout auras stack (different kinds), and a Choir takes a Lookout’s', () => {
    const { t } = placed([
      [CHOIR, 3, 2],
      [LOOKOUT, 1, 2],
      [THUMPER, 2, 2],
    ]);
    expect([t[2]!.pctDamage, t[2]!.pctRange]).toEqual([0.1, 0.1]);
    const near = placed([
      [CHOIR, 2, 2],
      [LOOKOUT, 1, 2],
    ]);
    expect(near.t[0]!.pctRange).toBe(0.1);
  });

  it('reach without a link extra is the pre-T607 float (radiusSq × mul²)', () => {
    const aura = { radiusTiles: 1.5, radiusSq: 2.25 };
    expect(auraReachSq(aura, 0, 1.05)).toBe(2.25 * 1.05 * 1.05);
    expect(auraReachSq(aura, 0.5, 1)).toBe(4);
  });
});

describe('Harmony (Mindspike + Choir)', () => {
  it('the Choir’s aura reaches 0.5 further while linked; Linked Up makes it 0.75', () => {
    // The Choir (3,2) touches the Mindspike (3,3); the Rivet (5,2) is 2 tiles off: T1's 1.5 + 0.5.
    const { t } = placed([
      [CHOIR, 3, 2],
      [MINDSPIKE, 3, 3],
      [RIVET, 5, 2],
    ]);
    expect([t[0]!.linkAuraRadiusTiles, t[1]!.linkExtraTargets]).toEqual([0.5, 1]);
    expect(t[2]!.pctDamage).toBe(0.1);
    expect(t[1]!.pctDamage).toBe(0.1); // the Mindspike is inside it too
    const lu: Modifier<IdSpace>[] = [{ kind: 'linkBonus', pct: 0.5, source: 'protocol:lu' }];
    const up = placed(
      [
        [CHOIR, 3, 2],
        [MINDSPIKE, 3, 3],
      ],
      ctxFor(lu),
    );
    expect([up.t[0]!.linkAuraRadiusTiles, up.t[1]!.linkExtraTargets]).toEqual([0.75, 1]);
    // Unlinked, the Rivet is out of reach.
    const apart = placed([
      [CHOIR, 3, 2],
      [RIVET, 5, 2],
    ]);
    expect(apart.t[1]!.pctDamage).toBe(0);
  });

  it('the Lullaby’s radius doesn’t grow (it isn’t an aura)', () => {
    const { t } = placed([
      [CHOIR, 3, 2, LULLABY],
      [MINDSPIKE, 3, 3],
    ]);
    expect(t[0]!.linkAuraRadiusTiles).toBe(0.5);
    expect(t[0]!.tierDef!.lull!.radiusTiles).toBe(2.5);
  });

  it('the Mindspike hits one extra target per shot, never its target twice', () => {
    const { state, ctx } = placed([
      [CHOIR, 3, 2],
      [MINDSPIKE, 2, 2],
    ]);
    const hits = (): number[] => {
      const out: number[] = [];
      for (const e of state.events) if (e.type === 'ProjectileHit' && e.towerUid === 2) out.push(e.hits);
      state.events.length = 0;
      return out;
    };
    const tough = { ...WALKER, hp: 10_000 };
    const a = spawn(state, tough, { dist: 2 });
    towers(state, ctx);
    expect(hits()).toEqual([1]); // alone: one hit
    const b = spawn(state, tough, { dist: 3 });
    spawn(state, tough, { dist: 8 }); // out of range
    state.towers.items[1]!.cooldownTicks = 0;
    towers(state, ctx);
    expect(hits()).toEqual([1, 1]);
    expect(a.hp).toBeLessThan(10_000);
    expect(b.hp).toBeLessThan(10_000);
  });
});

describe('Bounce Chorus’s Choir half (`auraPct`; the link itself joins with the Sproing, M7)', () => {
  const bounce: LinkDef<IdSpace> = {
    id: 'fx_bounce',
    name: 'Fixture Bounce',
    partners: [
      { tower: 'rivet', bonuses: [] },
      { tower: 'choir', bonuses: [], auraPct: 0.05 },
    ],
  };
  const raw: RawContent<IdSpace> = { ...RAW_CONTENT, links: { ...RAW_CONTENT.links, fx_bounce: bounce } };
  const content = compileContent(raw);

  it('adds +5% to its damage auras only (Rally Chorus: +35% damage, +10% fire rate)', () => {
    const { t } = placed(
      [
        [CHOIR, 3, 2, RALLY],
        [RIVET, 2, 2],
      ],
      ctxFor([], content),
    );
    expect(t[0]!.linkAuraPct).toBe(0.05);
    expect(t[1]!.pctDamage).toBeCloseTo(0.35, 12);
    expect(t[1]!.pctRate).toBe(0.1);
  });
});

describe('Choir link fields (compileLinks)', () => {
  it('rejects a bad radius, a fractional extra target, and a non-positive aura pct', () => {
    const bad: LinkDef<IdSpace> = {
      id: 'fx_bad',
      name: 'Fixture Bad',
      partners: [
        { tower: 'mindspike', bonuses: [], extraTargets: 1.5 },
        { tower: 'choir', bonuses: [], auraRadiusTiles: 0, auraPct: -0.1 },
      ],
    };
    expect(() =>
      compileContent({ ...RAW_CONTENT, links: { ...RAW_CONTENT.links, fx_bad: bad } }),
    ).toThrow(/extraTargets: needs a whole number > 0[\s\S]*auraRadiusTiles: needs a radius > 0[\s\S]*auraPct: needs a fraction > 0/);
  });
});
