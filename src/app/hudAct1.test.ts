// T312c: the Act I HUD's view models: prices as the sim charges them (Clearance Sale, Rapid
// Deploy; D077), the ability slots' states (an untargeted cast, a cooldown in waves, a sale's
// charges, Ready Room's FREE), the Hold Fire teach, the wave preview's NEW tags and spawns, the
// objective tracker, and the tower panel's live tile (D082).
import { describe, expect, it } from 'vitest';
import type { CompiledMapDef, CompiledRoute, CompiledWaveGroup } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { mapOrigin } from '../render/iso.ts';
import { VIEW_H, VIEW_W } from '../render/scale.ts';
import { createSim, type Modifier, type Sim, type SimState } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import { holdFireTeachShows } from './hud.ts';
import { selectedView } from './hudPanel.ts';
import {
  abilitySlots,
  aimOf,
  buildSlots,
  cooldownChip,
  cooldownView,
  cooldownWords,
  LIST_PRICE_STATE,
  objectiveViews,
  priceKey,
  priceOf,
  readyInWaves,
  saleText,
  saleView,
  wavePreview,
} from './hudViews.ts';

/** The sim's state, writable (tests set it up directly). */
function mut(sim: Sim<IdSpace>): SimState {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  return sim.state as unknown as SimState;
}

function simOn(mapId: string, modifiers: Modifier<IdSpace>[] = []): Sim<IdSpace> {
  const cfg = battleConfig(mapId, 1);
  return createSim({ ...cfg, modifiers: [...cfg.modifiers, ...modifiers] });
}

const RAPID: Modifier<IdSpace> = { kind: 'firstBuildFree', source: 'test' };

describe('prices as the sim charges them (D077)', () => {
  it('shows list prices, then the sale price while Clearance Sale has charges', () => {
    const s = simOn('dev_market');
    const towers = s.config.content.towers;
    const list = buildSlots(towers, s.config.loadout, {}, [], [], s.state);
    expect(list.map((x) => [x.cost, x.price])).toEqual([
      [100, 'list'],
      [125, 'list'],
    ]);
    const before = priceKey(s.state);
    s.enqueue({ type: 'callWave' });
    s.enqueue({ type: 'ability', slot: 2 });
    s.step();
    expect(s.state.discountCharges).toBe(3);
    expect(priceKey(s.state)).not.toBe(before);
    const sale = buildSlots(towers, s.config.loadout, {}, [], [], s.state);
    // round(100 × 0.6), round(125 × 0.6): what the sim takes.
    expect(sale.map((x) => [x.cost, x.listCost, x.price])).toEqual([
      [60, 100, 'sale'],
      [75, 125, 'sale'],
    ]);
    expect(saleView(s.state, null)).toEqual({ charges: 3, pct: 40 });
    expect(saleText({ charges: 3, pct: 40 })).toBe('Sale -40% x3');
    const credits = s.state.credits;
    s.enqueue({ type: 'build', tower: 'dev_rivet', tile: [3, 1] });
    s.step();
    expect(credits - s.state.credits).toBe(60);
    expect(saleView(s.state, null)).toEqual({ charges: 2, pct: 40 });
  });

  it('prices the panel upgrade and the slots on sale, and keeps a view while nothing changed', () => {
    const s = simOn('dev_market');
    s.enqueue({ type: 'build', tower: 'dev_rivet', tile: [3, 1] });
    s.step();
    const uid = s.state.towers.items.find((t) => t.alive)!.uid; // built above
    const origin = mapOrigin(s.map.cols, s.map.rows, VIEW_W, VIEW_H);
    const listed = selectedView(s, uid, origin, null)!; // live
    expect(listed.upgradePrice).toBe('list');
    expect(selectedView(s, uid, origin, listed)).toBe(listed);
    mut(s).discountCharges = 3;
    mut(s).discountPct = 0.4;
    const onSale = selectedView(s, uid, origin, listed)!; // live
    expect(onSale).not.toBe(listed);
    expect(onSale.upgradePrice).toBe('sale');
    expect(onSale.upgradeCost).toBe(Math.round((listed.upgradeCost ?? 0) * 0.6));
  });

  it('shows the first build free under Rapid Deploy, and only the first', () => {
    const s = simOn('dev_range', [RAPID]);
    const slots = buildSlots(s.config.content.towers, s.config.loadout, {}, [RAPID], [], s.state);
    expect(slots.map((x) => [x.cost, x.price])).toEqual([
      [0, 'free'],
      [0, 'free'],
    ]);
    s.enqueue({ type: 'build', tower: 'dev_rivet', tile: [3, 1] });
    s.step();
    const after = buildSlots(s.config.content.towers, s.config.loadout, {}, [RAPID], [], s.state);
    expect(after.map((x) => x.price)).toEqual(['list', 'list']);
  });

  it('reads list prices with nothing in play (the loadout screen)', () => {
    expect(priceOf(LIST_PRICE_STATE, [RAPID], 'rivet', 100, 'build')).toEqual({
      cost: 100,
      price: 'list',
    });
  });
});

describe('the ability slots (D077, D082)', () => {
  it('casts the untargeted abilities on the press, and aims the others', () => {
    expect(aimOf('slowAll')).toBe('none');
    expect(aimOf('discount')).toBe('none');
    expect(aimOf('strike')).toBe('area');
    expect(aimOf('segment')).toBe('path');
    const sky = simOn('dev_sky');
    expect(abilitySlots(sky.config).map((a) => [a.ability, a.aim, a.wavesCooldown])).toEqual([
      ['dev_strike', 'area', false],
      ['time_dilation', 'none', false],
    ]);
    const market = simOn('dev_market');
    expect(abilitySlots(market.config)[1]).toMatchObject({
      ability: 'clearance_sale',
      aim: 'none',
      wavesCooldown: true,
    });
  });

  it('shows a wave cooldown as waves left, a wipe by waves, and charges and FREE', () => {
    const extras = { wavesLeft: 3, totalWaves: 4, free: false, charges: 2 };
    const cd = cooldownView(0, 0, null, extras);
    expect(cd).toEqual({ secondsLeft: 0, wavesLeft: 3, remaining: 0.75, free: false, charges: 2 });
    expect(cooldownView(0, 0, cd, extras)).toBe(cd);
    expect(cooldownChip(cd)).toBe('3 waves');
    expect(cooldownWords(cd)).toBe('3 waves');
    expect(cooldownWords(cooldownView(450, 900, null))).toBe('8 s');
    expect(readyInWaves(1)).toBe('Ready in 1 wave');
    expect(cooldownChip(cooldownView(450, 900, null))).toBe('8s');
    const free = cooldownView(0, 900, null, {
      wavesLeft: 0,
      totalWaves: 0,
      free: true,
      charges: 0,
    });
    expect(free).toMatchObject({ secondsLeft: 0, wavesLeft: 0, free: true });
  });
});

describe('the Hold Fire teach (core-loop §2.7)', () => {
  it('pulses while a neutral unit is out and Hold (all) has not been used this run', () => {
    expect(holdFireTeachShows(1, false, true)).toBe(true);
    expect(holdFireTeachShows(0, false, true)).toBe(false);
    expect(holdFireTeachShows(1, true, true)).toBe(false);
    expect(holdFireTeachShows(1, false, false)).toBe(false);
  });
});

describe('the wave preview (core-loop §2.2)', () => {
  it('tags types never met with NEW, but not ones the save or an earlier wave has shown', () => {
    const sky = simOn('dev_sky');
    const first = wavePreview(sky.map, 0)!; // W1 is next
    expect(first.groups.map((g) => [g.enemy, g.isNew])).toEqual([
      ['nibbler', true],
      ['gerald', true],
      ['puffwing', true],
    ]);
    const met = wavePreview(sky.map, 0, new Set(['nibbler']))!;
    expect(met.groups.map((g) => g.isNew)).toEqual([false, true, true]);
    // W2 brings Nibblers and Puffwings again: W1 showed them.
    expect(wavePreview(sky.map, 1)!.groups.every((g) => !g.isNew)).toBe(true);
  });

  it('never tags the Quiet Wave, and names spawns only on a map with two', () => {
    const sky = simOn('dev_sky');
    expect(wavePreview(sky.map, 0)!.groups.every((g) => g.spawn === null)).toBe(true);
    const w = sky.map.waves[0]!; // dev_sky has two waves
    const g = w.groups[0]!; // and W1 has groups
    const east: CompiledRoute = {
      ...g.route,
      id: 'east',
      tiles: [[5, 0], ...g.route.tiles.slice(1)],
    };
    const quietGroup: CompiledWaveGroup<IdSpace> = { ...g, tags: ['quiet_wave'] };
    const twoSpawns: Pick<CompiledMapDef<IdSpace>, 'waves'> = {
      waves: [w, { ...w, groups: [{ ...g, route: east }, quietGroup] }],
    };
    const second = wavePreview(twoSpawns, 1, new Set())!; // W2 is next
    expect(second.groups.map((x) => [x.spawn, x.newSpawn])).toEqual([
      ['East', true],
      ['A', false],
    ]);
    const quiet: Pick<CompiledMapDef<IdSpace>, 'waves'> = {
      waves: [{ ...w, groups: [quietGroup] }],
    };
    expect(wavePreview(quiet, 0)!.groups[0]?.isNew).toBe(false); // W1 is next
  });
});

describe('the objective tracker', () => {
  it("lists the map's objectives, open until the sim settles them (T304f)", () => {
    const map: Pick<CompiledMapDef<IdSpace>, 'objectives'> = {
      objectives: [
        {
          id: 'clean_audit',
          name: 'Clean Audit',
          description: 'Sell no turret after its build phase.',
          condition: { stat: 'lateSells', lte: 0 },
          intel: 1,
          onComplete: [],
        },
      ],
    };
    expect(objectiveViews(map)).toEqual([
      {
        id: 'clean_audit',
        name: 'Clean Audit',
        description: 'Sell no turret after its build phase.',
        intel: 1,
        status: 'open',
      },
    ]);
    expect(objectiveViews(map, { clean_audit: 'failed' })[0]?.status).toBe('failed');
  });
});

describe('the tower panel reads the live tile (D082)', () => {
  it('shows a power node uncovered under wreckage', () => {
    const s = simOn('dev_sky');
    mut(s).credits = 10_000;
    s.enqueue({ type: 'clear', tile: [1, 4] });
    for (let i = 0; i < 60 * 30 && !s.state.wreckage.cleared.length; i++) s.step();
    expect(s.state.wreckage.cleared.length).toBe(1);
    s.enqueue({ type: 'build', tower: 'rivet', tile: [1, 4] });
    s.step();
    const t = s.state.towers.items.find((x) => x.alive && x.col === 1 && x.row === 4)!; // built
    const origin = mapOrigin(s.map.cols, s.map.rows, VIEW_W, VIEW_H);
    expect(selectedView(s, t.uid, origin, null)?.bonuses).toEqual(['+20% rate (power node)']);
  });
});
