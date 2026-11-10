// M3 review round 1 (D097), the HUD: the threat strip's glyphs (U-H2), Gerald's MAIL row in the
// preview (R9), the bottom-center hints (R4: the salvage teach, Hold Fire's second lesson), the
// wreck refusal's words, the Shift board's teaser row (R6), and the slot price key (C6).
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN } from '../content/campaign.ts';
import { MAPS } from '../content/maps/index.ts';
import { createSim } from '../sim/index.ts';
import { SHIFT_BOARD_SIZE } from '../meta/index.ts';
import { pickHint } from '../ui/hud/Notices.tsx';
import { battleConfig } from './battleSetup.ts';
import { holdFireOneHintShows, salvageHintShows } from './hud.ts';
import { CLEAR_FIRST_TEXT, refusalText } from './hudText.ts';
import { threatIntel, threatNames, wavePreview } from './hudViews.ts';
import { teaserRow } from './save.ts';

const mapIds = Object.keys(MAPS);

describe('the threat strip (U-H2)', () => {
  it.each(mapIds)(
    '%s: every threat has a glyph and no label repeats (briefing and loadout)',
    (id) => {
      const map = createSim(battleConfig(id, 1)).map;
      const threats = threatIntel(map, [], []).threats;
      for (const t of threats) expect(t.glyph, `${id}: ${t.label}`).not.toBeNull();
      const labels = threats.map((t) => t.label);
      expect(new Set(labels).size).toBe(labels.length);
      const glyphs = threats.map((t) => t.glyph);
      expect(new Set(glyphs).size).toBe(glyphs.length);
      expect(threatNames(map)).toEqual(labels);
    },
  );

  it('draws a trait through its tell (Burrowing is the burrower glyph) and never lists Gerald', () => {
    const a1m5 = createSim(battleConfig('a1_m05', 1)).map;
    const threats = threatIntel(a1m5, [], []).threats;
    expect(threats.find((t) => t.id === 'burrowing')?.glyph).toBe('icon.tell.burrower');
    expect(threats.find((t) => t.id === 'splitting')?.glyph).toBe('icon.tell.splitter');
    expect(threats.map((t) => t.label)).not.toContain('Burrower');
  });
});

describe('runners on the threat strip (D134)', () => {
  it('one Skittish chip stands for every fleeing unit; the strip lists only real threats', () => {
    const a2m1 = createSim(battleConfig('a2_m01', 1)).map;
    const threats = threatIntel(a2m1, [], []).threats;
    expect(threats.map((t) => t.label)).toEqual(['Skittish', 'Hollow clusters']);
    expect(threats[0]?.glyph).toBe('icon.tell.skittish');
    expect(threats[0]?.tip).toBe(
      "Runners: fast, flying, burrowing, armored, splitting, huddle · They don't hurt the core.",
    );
    expect(threats[1]?.tip).toBeNull();
  });

  it("keeps a trait a real threat brings too, and no fleeing Hauler's Carrier", () => {
    const a2m3 = createSim(battleConfig('a2_m03', 1)).map;
    const labels = threatNames(a2m3);
    expect(labels[0]).toBe('Skittish');
    expect(labels).toContain('Armored'); // the Aelari's, not only the runners'
    expect(labels).not.toContain('Fast');
    expect(labels).not.toContain('Carrier');
    // Act I has no runners: no chip stands in, every trait is its own.
    expect(threatNames(createSim(battleConfig('a1_m04', 1)).map)).toEqual([
      'Fast',
      'Armored',
      'Splitting',
      'Huddle',
      'Carrier',
    ]);
  });
});

describe("Gerald's preview row (R9)", () => {
  it('reads MAIL: never NEW, never AIR', () => {
    const a1m3 = createSim(battleConfig('a1_m03', 1)).map;
    const w1 = wavePreview(a1m3, 0)!;
    const gerald = w1.groups.find((g) => g.enemy === 'gerald')!;
    expect(gerald).toMatchObject({ neutral: true, isNew: false, air: false });
    expect(w1.groups.filter((g) => g.enemy !== 'gerald').every((g) => !g.neutral)).toBe(true);
  });
});

describe('the bottom-center hints (R4)', () => {
  it("teaches the salvage drone from W2's countdown until it is first sent", () => {
    expect(salvageHintShows(true, true, false, true)).toBe(true);
    expect(salvageHintShows(false, true, false, true)).toBe(false);
    expect(salvageHintShows(true, false, false, true)).toBe(false);
    expect(salvageHintShows(true, true, true, true)).toBe(false);
    expect(salvageHintShows(true, true, false, false)).toBe(false);
  });

  it("names both Hold Fire keys from Gerald's second pass until one turret holds", () => {
    expect(holdFireOneHintShows(1, 1, false, true)).toBe(false);
    expect(holdFireOneHintShows(1, 2, false, true)).toBe(true);
    expect(holdFireOneHintShows(0, 2, false, true)).toBe(false);
    expect(holdFireOneHintShows(1, 3, true, true)).toBe(false);
  });

  it('shows one hint at a time, the most urgent first', () => {
    const none = {
      holdFireOne: false,
      holdFireTeach: false,
      holdFireAll: false,
      timeDilation: false,
      salvage: false,
      upgrade: false,
      selected: false,
    };
    expect(pickHint(none)).toBeNull();
    expect(pickHint({ ...none, upgrade: true })).toBe('upgrade');
    expect(pickHint({ ...none, upgrade: true, selected: true })).toBeNull();
    expect(pickHint({ ...none, upgrade: true, salvage: true })).toBe('salvage');
    expect(pickHint({ ...none, salvage: true, holdFireTeach: true })).toBe('holdAll');
    expect(pickHint({ ...none, holdFireTeach: true, holdFireAll: true })).toBeNull();
    expect(pickHint({ ...none, holdFireTeach: true, holdFireOne: true })).toBe('holdOne');
  });

  it('tells an armed click on a wreck how to clear it', () => {
    expect(refusalText('clearFirst')).toBe(CLEAR_FIRST_TEXT);
    expect(CLEAR_FIRST_TEXT).toBe('Click it (no tower armed) to send the drone');
  });
});

describe("the Shift board's teaser (R6, D102)", () => {
  it('adds the map after Act I, padlocked and never named, and nothing past the plan', () => {
    const next = CAMPAIGN_PLAN[SHIFT_BOARD_SIZE]!;
    // Never named (style-guide §2): the star map names Rig Nine once A1M5 is won.
    const [row] = teaserRow();
    expect(row).toEqual({
      id: next.id,
      name: '',
      index: SHIFT_BOARD_SIZE + 1,
      state: 'locked',
      medals: 0,
      teaser: true,
    });
    // "Shift 6 · Coming soon" while its map isn't built.
    expect(teaserRow(SHIFT_BOARD_SIZE, () => false)[0]?.state).toBe('coming_soon');
    expect(teaserRow(CAMPAIGN_PLAN.length)).toEqual([]);
  });
});
