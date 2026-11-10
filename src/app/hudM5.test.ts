// T531: the HUD's words and views for M5: beams read as damage per second with their ramp (never
// damage × ticks), the live ramp row, the M5 spec cards reading apart (Echo Spike / Dread,
// All-Seeing / Truthlight, Refractor / Sunlance; D059), Sundown's line in the tower panel, the
// Escort's Perfect on the briefing, the threat strip's aura names, and the Escort meter's pips,
// alarm, and layout.
import { describe, expect, it } from 'vitest';
import type { CompiledTowerDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import type { DeepReadonly } from '../shared/types.ts';
import { towerStats, type Sim } from '../sim/index.ts';
import { ESCORT_EXTRA_H, HUD_CORNERS, hudCorners, towerPanelHeight } from '../ui/hud/layout.ts';
import { battleConfig } from './battleSetup.ts';
import { escortMeterView, lostPips, lostWords, MAX_LOST_PIPS } from './hudEscort.ts';
import { selectedRamp } from './hudPanel.ts';
import {
  beamDps,
  darkTexts,
  deltaText,
  rampNow,
  rampText,
  specDescription,
  statLineText,
  threatLabel,
} from './hudText.ts';
import { ESCORT_PERFECT, medalViews, threatNames } from './hudViews.ts';

const content = battleConfig('a1_m01', 1, DEV_SAVES.all_unlocked.build()).content;
const tower = (id: string): DeepReadonly<CompiledTowerDef> => {
  const def = content.towers[id];
  if (def === undefined) throw new Error(`no tower ${id}`);
  return def;
};

/** A2M5, the pivot map (Defend, then Escort). */
const a2m5 = () => {
  const map = content.maps['a2_m05'];
  if (map === undefined) throw new Error('no a2_m05');
  return map;
};

/** A tower's stat line at an in-map tier, as authored. */
const line = (id: string, tier: number): string =>
  statLineText(towerStats(tower(id), tier), tower(id).tiers[tier - 1]);

/** A spec card's description, as authored. */
const card = (id: string, spec: 'a' | 'b'): string =>
  specDescription(
    towerStats(tower(id), 4, undefined, [], spec),
    tower(id).specs![spec],
    tower(id).tiers[2],
  );

describe('beams in the tower panel (T531)', () => {
  it('reads a beam as its damage per second, never damage × ticks', () => {
    // 12 Energy/s in 0.25 s ticks (towers.md § Prism Spire): 12 dmg/s, not 48.
    expect(line('prism', 1)).toBe('12 dmg/s · range 3 · ramp ×4 in 6 s');
    expect(line('prism', 3)).toBe('16 dmg/s · range 3.5 · ramp ×5 in 8 s');
    expect(beamDps({ damage: 12, ratePerSec: 4 }, 0.25)).toBe(12);
    // A rate bonus means more ticks of the same size: more damage per second.
    expect(beamDps({ damage: 12, ratePerSec: 4.8 }, 0.25)).toBeCloseTo(14.4);
  });

  it("says what an upgrade does to a beam's damage and ramp", () => {
    const prism = tower('prism');
    const t1 = towerStats(prism, 1);
    expect(deltaText(t1.next, 4)).toBe('+4 dmg/s');
    const t2 = towerStats(prism, 2);
    expect(deltaText(t2.next, 0, [rampText(5, 0.5 / 60)])).toBe('+0.5 range · ramp ×5 in 8 s');
    // Other towers keep their per-hit reading.
    expect(deltaText({ ...t1.next!, damage: 3, ratePerSec: 0.5 })).toBe('+3 dmg · +0.5/s');
  });

  it('reads the live ramp to a tenth', () => {
    expect(rampNow(1)).toBe('×1.0');
    expect(rampNow(2.4999)).toBe('×2.4');
    expect(rampNow(4)).toBe('×4.0');
  });

  it("follows the selected tower's strongest lit beam", () => {
    const beam = tower('prism').tiers[0];
    const t = {
      alive: true,
      uid: 7,
      tierDef: beam,
      targetUid: 3,
      beamRamp: 2.46,
      beam2Uid: 0,
      beam2Ramp: 3.9, // dark beam: ignored
      beam3Uid: 5,
      beam3Ramp: 3.13,
    };
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a stub with only the towers
    const sim = { state: { towers: { used: 1, items: [t] } } } as unknown as Sim<IdSpace>;
    expect(selectedRamp(sim, 7)).toBe(3.1);
    expect(selectedRamp(sim, 8)).toBeNull();
    t.targetUid = 0;
    t.beam3Uid = 0;
    expect(selectedRamp(sim, 7)).toBe(1);
    t.tierDef = tower('rivet').tiers[0];
    expect(selectedRamp(sim, 7)).toBeNull();
  });
});

describe("M5's spec cards read apart (D059)", () => {
  it("Prism: Refractor's beams, Sunlance's ramp", () => {
    expect(card('prism', 'a')).toBe('16 dmg/s · range 3.5 · 3 beams · ramp ×3 in 4 s');
    expect(card('prism', 'b')).toBe('16 dmg/s · range 3.5 · ramp ×10 in 9 s');
  });

  it("Mindspike: Echo Spike's echo, Dread's Unnerved", () => {
    expect(card('mindspike', 'a')).toBe('34 dmg · 1/s · range 3 · echo 50% · 1.2 tiles');
    expect(card('mindspike', 'b')).toBe('50 dmg · 1/s · range 3 · Unnerves 1.5 s');
    expect(card('mindspike', 'a')).not.toBe(line('mindspike', 3));
  });

  it("Lantern: All-Seeing's area Mark, Truthlight's no-evade Mark", () => {
    expect(line('lantern', 1)).toBe('4 dmg/s · range 3 · Mark +15% · detect 3');
    const allSeeing = card('lantern', 'a');
    const truthlight = card('lantern', 'b');
    expect(allSeeing).toContain('Marks all in 3.5 +15%');
    expect(truthlight).toContain('Mark +35% · no evading');
    expect(allSeeing).toContain('2 beams');
    expect(truthlight).not.toContain('beams');
    // What Truthlight gives up (D138): tier 3's second beam.
    expect(truthlight).toContain('1 beam');
  });
});

describe("Sundown's line (T531)", () => {
  it('says what the dark takes, or that the light holds', () => {
    expect(darkTexts(0.15, false, 1)).toEqual(['-15% range (dark)']);
    expect(darkTexts(0.0525, false, 0.35)).toEqual(['-5.3% range (dark)']);
    expect(darkTexts(0, true, 0.6)).toEqual(['Lit: full range']);
    expect(darkTexts(0, true, 0)).toEqual([]);
  });
});

describe('briefing and strips (T531)', () => {
  it("names Perfect Core as an Escort's on Escort maps", () => {
    const open = { victory: 'open', perfectCore: 'open', challenge: 'open' } as const;
    const perfect = (map: Parameters<typeof medalViews>[0]): string | undefined =>
      medalViews(map, open, []).find((m) => m.kind === 'perfectCore')?.description;
    expect(perfect({ medals: null })).toBe('Win with no leaks.');
    expect(perfect({ medals: null, objective: 'escort', escort: null })).toBe(
      ESCORT_PERFECT.escort,
    );
    expect(perfect(a2m5())).toBe(ESCORT_PERFECT.pivot);
  });

  it("names M5's threats as campaign.md § 4.8 does", () => {
    expect(threatLabel('shield_aura')).toBe('Shield aura');
    expect(threatLabel('phasing')).toBe('Phasing');
    expect(threatNames(a2m5())).toEqual(
      expect.arrayContaining(['Shield aura', 'Cloaked', 'Blink', 'Boss', 'Hollow clusters']),
    );
  });
});

describe('the Escort meter (T531)', () => {
  it('draws a pip per allowed loss, filled as refugees are lost', () => {
    expect(lostPips(2, 6)).toEqual([true, true, false, false, false, false]);
    expect(lostPips(0, null)).toBeNull();
    expect(lostPips(3, MAX_LOST_PIPS + 1)).toBeNull();
    expect(lostWords(3, null)).toBe('3');
    expect(lostWords(3, 20)).toBe('3/20');
  });

  it("sounds the alarm with the bark's threshold (few losses left)", () => {
    expect(escortMeterView('escort', 9, 9, 36, 14)?.low).toBe(false);
    expect(escortMeterView('escort', 9, 11, 36, 14)?.low).toBe(true);
    expect(escortMeterView('escort', 0, 50, 36, null)?.low).toBe(false);
  });

  it('grows the status corner by its two small rows', () => {
    expect(hudCorners(0, false, true)[0]!.h).toBe(HUD_CORNERS[0]!.h + ESCORT_EXTRA_H);
    expect(hudCorners(0)).toBe(HUD_CORNERS);
  });

  it("counts the ramp row and Sundown's line in the tower panel's height", () => {
    const base = { statsLines: ['a'], bonuses: [], deltaLines: [], specs: null };
    const h = towerPanelHeight(base);
    expect(towerPanelHeight({ ...base, rampCap: 4 })).toBe(h + 10);
    expect(towerPanelHeight({ ...base, dark: ['-15% range (dark)'] })).toBe(h + 10);
    expect(towerPanelHeight({ ...base, rampCap: null, dark: [] })).toBe(h);
  });
});
