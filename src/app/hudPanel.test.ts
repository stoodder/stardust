// The tower panel's T202d parts (bonus lines, the tier-4 choice, modified stats, costs, sell) and
// the briefing's medals and threat intel, on the live A1M1 content.
import { describe, expect, it } from 'vitest';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { mapOrigin } from '../render/iso.ts';
import { VIEW_H, VIEW_W } from '../render/scale.ts';
import { createSim, type Modifier, type Sim, type SimState } from '../sim/index.ts';
import type { IdSpace } from '../content/types.ts';
import { CARD_CHARS, PANEL_CHARS, towerPanelHeight } from '../ui/hud/layout.ts';
import { battleConfig } from './battleSetup.ts';
import { selectedView } from './hudPanel.ts';
import { bonusTexts, specDescription, specLockText } from './hudText.ts';
import { buildSlots, holdingCount, medalViews, threatIntel } from './hudViews.ts';
import { towerStats } from '../sim/index.ts';

/** A1M1 with every tower and spec unlocked (the all_unlocked dev save), paused at tick 0. */
function a1m1(modifiers?: Modifier<IdSpace>[]): Sim<IdSpace> {
  const cfg = battleConfig('a1_m01', 1, DEV_SAVES.all_unlocked.build());
  return createSim({
    ...cfg,
    loadout: ['rivet', 'thumper'],
    modifiers: modifiers ?? [],
    specsUnlocked: ['rivet', 'thumper'],
  });
}

/** The sim's state, writable (tests set credits and unlocks directly). */
function mut(sim: Sim<IdSpace>): SimState {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  return sim.state as unknown as SimState;
}

function uidAt(sim: Sim<IdSpace>, col: number, row: number): number {
  const t = sim.state.towers.items.find((x) => x.alive && x.col === col && x.row === row);
  if (t === undefined) throw new Error(`no tower at ${col},${row}`);
  return t.uid;
}

const origin = mapOrigin(14, 10, VIEW_W, VIEW_H);

describe('the tower panel (T202d)', () => {
  it('shows the high-ground bonus and the modified range', () => {
    const sim = a1m1();
    sim.enqueue({ type: 'build', tile: [7, 2], tower: 'rivet' }); // A1M1's high ground
    sim.step();
    const v = selectedView(sim, uidAt(sim, 7, 2), origin, null)!; // built above
    expect(v.bonuses).toEqual(['+25% range (high ground)']);
    expect(v.stats).toBe('8 dmg · 2/s · range 3.75');
  });

  it('shows a link once both partners stand, and the rate it adds', () => {
    const sim = a1m1();
    mut(sim).lockedTowers.length = 0; // Thumper ships at W3 on A1M1; unlock it for the test
    sim.enqueue({ type: 'build', tile: [6, 1], tower: 'rivet' });
    sim.enqueue({ type: 'build', tile: [6, 2], tower: 'thumper' });
    sim.step();
    const v = selectedView(sim, uidAt(sim, 6, 1), origin, null)!; // built above
    expect(v.bonuses).toEqual(['+10% rate (Crossfire)']);
    // 30 ticks → 27 ticks (D037): 2.22/s.
    expect(v.stats).toBe('8 dmg · 2.22/s · range 3');
  });

  it('prices the upgrade and the specs through costFor, and sells at the run refund', () => {
    const mods = [
      { kind: 'towerCost', tower: 'rivet', tiers: 'all', pct: -0.1, source: 'test' },
    ] as Modifier<IdSpace>[];
    const sim = a1m1(mods);
    // Resale Value isn't simulated until M3: set the run's refund as its modifier would.
    mut(sim).economy.sellRefundPct = 0.8;
    sim.enqueue({ type: 'build', tile: [6, 1], tower: 'rivet' });
    sim.step();
    const uid = uidAt(sim, 6, 1);
    let v = selectedView(sim, uid, origin, null)!; // built above
    expect(v.upgradeCost).toBe(72); // 80 − 10%
    expect(v.refundPct).toBe(80);
    expect(v.specs).toBeNull();
    mut(sim).credits = 10_000;
    sim.enqueue({ type: 'upgrade', towerUid: uid });
    sim.enqueue({ type: 'upgrade', towerUid: uid });
    sim.step();
    v = selectedView(sim, uid, origin, v)!;
    expect(v.tier).toBe(3);
    expect(v.upgradeCost).toBeNull();
    expect(v.specs?.locked).toBe(false);
    expect(v.specs?.options.map((o) => [o.name, o.cost])).toEqual([
      ['Rivet Storm', 270],
      ['Railspike', 270],
    ]);
    // One format for every card (D059): the numbers, then what's special.
    expect(v.specs?.options[0].description).toBe('9 dmg · 7.5/s · range 3 · 1 s spin-up');
    expect(v.specs?.options[1].description).toBe('120 dmg · 0.5/s · range 6 · ignores armor');
    for (const o of v.specs!.options) {
      for (const l of o.descLines) expect(l.length).toBeLessThanOrEqual(CARD_CHARS);
    }
    sim.enqueue({ type: 'specialize', towerUid: uid, spec: 'b' });
    sim.step();
    v = selectedView(sim, uid, origin, v)!;
    expect(v).toMatchObject({ tier: 4, specName: 'Railspike', specs: null, upgradeCost: null });
    // Built, the panel's stat line reads exactly like its card did.
    expect(v.stats).toBe('120 dmg · 0.5/s · range 6 · ignores armor');
  });

  it("shows a Cluster Thumper's bomblets and splash on its card and stat line (D059)", () => {
    const thumper = battleConfig('a1_m01', 1).content.towers.thumper!;
    const spec = thumper.specs!.a;
    const text = specDescription(towerStats(thumper, 4, undefined, [], 'a'), spec);
    expect(text).toMatch(/^\d+ dmg · [\d.]+\/s · range [\d.]+ · splash [\d.]+ · \+4 bomblets$/);
  });

  it('locks the choice with what unlocks it', () => {
    const cfg = battleConfig('a1_m01', 1);
    const sim = createSim({ ...cfg, specsUnlocked: [] });
    mut(sim).credits = 10_000;
    sim.enqueue({ type: 'build', tile: [6, 1], tower: 'rivet' });
    sim.step();
    const uid = uidAt(sim, 6, 1);
    sim.enqueue({ type: 'upgrade', towerUid: uid });
    sim.enqueue({ type: 'upgrade', towerUid: uid });
    sim.step();
    const v = selectedView(sim, uid, origin, null, specLockText(false))!; // built above
    expect(v.specs?.locked).toBe(true);
    expect(v.specs?.lockLines.join(' ')).toBe('Engineering unlocks after Shift 4');
    expect(specLockText(true)).toBe('Unlock in Engineering');
    // The panel grows with its rows: the choice is taller than one Upgrade button.
    expect(towerPanelHeight(v)).toBeGreaterThan(
      towerPanelHeight({ statsLines: ['s'], bonuses: [], deltaLines: [], specs: null }),
    );
  });

  it('wraps a long "Next:" line instead of clipping it (T213)', () => {
    const sim = a1m1();
    mut(sim).credits = 10_000;
    sim.enqueue({ type: 'build', tile: [6, 1], tower: 'rivet' });
    sim.step();
    const uid = uidAt(sim, 6, 1);
    sim.enqueue({ type: 'upgrade', towerUid: uid });
    sim.step();
    const v = selectedView(sim, uid, origin, null)!; // built above
    expect(v.upgradeDelta).toBe('+0.5/s · +3 pierce');
    for (const l of v.deltaLines) expect(l.length).toBeLessThanOrEqual(PANEL_CHARS);
    expect(v.deltaLines.join(' · ')).toBe('Next: +0.5/s · +3 pierce');
  });

  it('names a power node and a conditional link bonus', () => {
    const sim = a1m1();
    const link = sim.config.content.links.find((l) => l.id === 'sitting_ducks')!; // registered
    const lines = bonusTexts(
      '+',
      { linkMask: link.bit, def: { id: 'thumper' } },
      true,
      sim.config.content.links,
      [{ kind: 'linkBonus', pct: 0.5, source: 'test' }] as Modifier<IdSpace>[],
    );
    expect(lines).toEqual(['+20% rate (power node)', '+30% dmg vs Chilled (Sitting Ducks)']);
  });
});

describe('Hold fire in the tower panel (T206c)', () => {
  it('shows the tower holding, rebuilds on a change, and counts the holding towers', () => {
    const sim = a1m1();
    sim.enqueue({ type: 'build', tile: [6, 1], tower: 'rivet' });
    sim.enqueue({ type: 'build', tile: [7, 2], tower: 'rivet' });
    sim.step();
    const uid = uidAt(sim, 6, 1);
    const off = selectedView(sim, uid, origin, null)!; // built above
    expect(off.holdFire).toBe(false);
    sim.enqueue({ type: 'holdFire', target: uid, on: true });
    sim.step();
    const on = selectedView(sim, uid, origin, off)!;
    expect(on).not.toBe(off);
    expect(on.holdFire).toBe(true);
    expect(holdingCount(sim.state.towers)).toBe(1);
    sim.enqueue({ type: 'holdFire', target: 'all', on: true });
    sim.step();
    expect(holdingCount(sim.state.towers)).toBe(2);
  });

  it('hides Spare runners until it unlocks, then offers it on attacking towers', () => {
    const sim = a1m1();
    sim.enqueue({ type: 'build', tile: [6, 1], tower: 'rivet' });
    sim.step();
    const uid = uidAt(sim, 6, 1);
    expect(selectedView(sim, uid, origin, null)!.spareRunners).toBeNull(); // built above
    const open = selectedView(sim, uid, origin, null, specLockText(false), true)!;
    expect(open.spareRunners).toBe(false);
    expect(towerPanelHeight(open)).toBe(towerPanelHeight({ ...open, spareRunners: null }) + 18);
  });
});

describe('the briefing (T202d)', () => {
  it("lists the map's medals with what the save holds", () => {
    const sim = a1m1();
    const medals = medalViews(sim.map, sim.state.medals, ['victory']);
    expect(medals.map((m) => [m.kind, m.name, m.held, m.status])).toEqual([
      ['victory', 'Victory', true, 'open'],
      ['perfectCore', 'Perfect Core', false, 'open'],
      ['challenge', 'Teamwork Makes the Dream Work™', false, 'open'],
    ]);
    expect(medals[2]?.description).toBe('Win with a Crossfire link active.');
    const after = medalViews(sim.map, { ...sim.state.medals, perfectCore: 'forfeited' }, []);
    expect(after[1]?.status).toBe('forfeited');
  });

  it('reads every "&" as "and" in the view model, not in the component (D059, T234)', () => {
    const sim = a1m1();
    const challenge = {
      ...sim.map.medals!.challenge,
      name: 'Rest & Relaxation',
      description: 'R&D',
    };
    const map = { ...sim.map, medals: { challenge } };
    const medals = medalViews(map, sim.state.medals, []);
    expect([medals[2]?.name, medals[2]?.description]).toEqual(['Rest and Relaxation', 'R and D']);
  });

  it("shows the threat intel's glyphs and who answers a required counter", () => {
    const sim = a1m1();
    const map = { ...sim.map, requiredCounters: ['armor' as const] };
    const intel = threatIntel(map, ['rivet', 'thumper', 'sprinkler'], ['thumper']);
    // Bunker Buster (spec b) answers armor in any act; on an Act III map it's Thumper's only one.
    const act3 = threatIntel({ ...map, act: 3 }, ['thumper'], ['thumper']);
    expect(act3.required[0]?.answers).toEqual(['Thumper [Bunker Buster]']);
    expect(intel.threats[0]).toEqual({ id: 'fast', label: 'Fast', glyph: 'icon.tell.fast' });
    expect(intel.required).toEqual([
      { counter: 'armor', label: 'Armor', answers: ['Rivet T3', 'Thumper'] },
    ]);
    expect(threatIntel(sim.map, [], []).required).toEqual([]);
  });
});

describe('build slot prices (D037)', () => {
  it('show what the sim charges after towerCost modifiers', () => {
    const sim = a1m1([
      { kind: 'towerCost', tower: 'rivet', tiers: 'all', pct: -0.05, source: 'test' },
    ] as Modifier<IdSpace>[]);
    const slots = buildSlots(
      sim.config.content.towers,
      ['rivet', 'thumper'],
      {},
      sim.config.modifiers,
    );
    expect(slots.map((s) => s.cost)).toEqual([95, 125]);
    sim.enqueue({ type: 'build', tile: [6, 1], tower: 'rivet' });
    sim.step();
    expect(sim.state.credits).toBe(sim.config.content.maps.a1_m01!.startCredits - 95);
  });
});
