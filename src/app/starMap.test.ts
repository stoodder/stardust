// The star map's view (core-loop.md § 1.1): what the Sector map shows for a save, and nothing
// past the frontier.
import { afterEach, describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN } from '../content/campaign.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { campaign, type CampaignView } from '../ui/screens/state.ts';
import { MemoryStore } from '../meta/index.ts';
import { activeSave, initSaves, loadDevSave } from './save.ts';
import { POST_GAME_PLATE } from '../content/postGame.ts';
import {
  campaignScreenName,
  GO_KICKER,
  headerKicker,
  phaseFor,
  showsStateLine,
  starKicker,
  starMapView,
  STAR_MAP_SEEN_ID,
  technicianLine,
  UNANSWERED_KICKER,
  WAYSIDE_LABEL,
} from './starMap.ts';

/** A campaign view to vary (any save's). */
function campaignView(): CampaignView {
  initSaves(new MemoryStore());
  loadDevSave('after_a1m5_ref');
  const v = campaign.value;
  if (v === null) throw new Error('no campaign view');
  return v;
}

afterEach(() => {
  campaign.value = null;
});

describe('starMapView', () => {
  it('after A1M5: Act I cleared, Rig Nine next up with its briefing facts, in the gold phase', () => {
    const view = starMapView(DEV_SAVES.after_a1m5_ref.build());
    expect(view.phase).toBe('act2.gold');
    expect(view.act).toBe('2');
    expect(view.nodes.map((n) => n.id)).toEqual([
      'a1_m01',
      'a1_m02',
      'a1_m03',
      'a1_m04',
      'a1_m05',
      'a2_m01',
    ]);
    expect(view.marker).toBe('a1_m05');
    expect(view.frontier).toBe('a2_m01');
    expect(view.firstVisit).toBe(true);
    const rig = view.nodes.at(-1)!;
    expect(rig).toMatchObject({ state: 'open', name: 'Rig Nine', place: 'The Diggings', x: 500 });
    expect(rig.label).toBe('Shift 6, Rig Nine, The Diggings. Next up. 0 of 3 medals.');
    expect(rig.tagline).toBe(
      'Rig Nine stopped answering. Go take a peek. Minor operational hiccup!',
    );
    expect(rig.brief?.threats.map((t) => t.label)).toContain('Skittish');
    expect(rig.brief?.required).toEqual(['Splash']);
    expect(rig.brief?.medals.map((m) => m.name)).toEqual([
      'Victory',
      'Perfect Core',
      'Hiccup Contained',
    ]);
    expect(rig.brief?.medals.some((m) => m.earned)).toBe(false);
    expect(rig.brief?.objectives.map((o) => o.name)).toEqual(['Crew Logs']);
    // Cleared nodes carry their medals; the legs join them in order, the last in the accent.
    expect(view.nodes[0]?.label).toMatch(
      /^Shift 1, Orientation Day, Dome Row\. Cleared\. \d of 3 medals\.$/,
    );
    expect(view.nodes[0]?.brief?.medals.some((m) => m.earned)).toBe(true);
    expect(view.legs).toHaveLength(5);
    expect(view.legs.map((l) => l.accent)).toEqual([false, false, false, false, true]);
    expect(view.regions.find((r) => r.id === 'long_walk')).toMatchObject({
      text: 'Surge corridor',
      struck: null,
    });
  });

  it('after A2M3: Second Harvest next up, the dusk phase, the marker on A2M3', () => {
    const view = starMapView(DEV_SAVES.after_a2m3.build());
    expect(view.phase).toBe('act2.dusk');
    expect(view.marker).toBe('a2_m03');
    expect(view.frontier).toBe('a2_m04');
    expect(view.firstVisit).toBe(false);
    expect(view.nodes.at(-1)).toMatchObject({ id: 'a2_m04', state: 'open' });
  });

  it('after A2M4: The Long Walk next up, the marker on A2M4', () => {
    const view = starMapView(DEV_SAVES.after_a2m4_returned.build());
    expect(view.phase).toBe('act2.dusk');
    expect(view.marker).toBe('a2_m04');
    expect(view.frontier).toBe('a2_m05');
    const next = view.nodes.at(-1)!;
    expect(next).toMatchObject({ id: 'a2_m05', state: 'open' });
    expect(next.label).toBe('Shift 10, The Long Walk, Preserve Road. Next up. 0 of 3 medals.');
    expect(next.brief?.medals.map((m) => m.id)).toEqual(['victory', 'perfect_core', 'kneel']);
    // Nothing past the frontier, in any field.
    const later = CAMPAIGN_PLAN.slice(10).map((m) => m.name);
    const text = JSON.stringify(view);
    for (const name of later) expect(text).not.toContain(name);
  });

  it("after A2M6 (Act II's close): the night chart, The Preserve next up, nothing past it", () => {
    const view = starMapView(DEV_SAVES.after_a2m6.build());
    expect(view.phase).toBe('act3');
    expect(view.act).toBe('3');
    expect(view.marker).toBe('a2_m06');
    expect(view.frontier).toBe('a3_m01');
    expect(view.nodes).toHaveLength(12);
    expect(view.nodes.slice(0, 11).every((n) => n.state === 'won')).toBe(true);
    // A3M1 is playable (T620): next up, with its briefing facts.
    const next = view.nodes.at(-1)!;
    expect(next).toMatchObject({
      id: 'a3_m01',
      state: 'open',
      name: 'The Preserve',
      place: 'The Preserve',
      tagline: 'The Hollow is inside the Preserve, where you led them. Get them out.',
    });
    expect(next.label).toBe('Shift 12, The Preserve, The Preserve. Next up. 0 of 3 medals.');
    expect(next.brief?.medals.map((m) => m.id)).toEqual([
      'victory',
      'perfect_core',
      'nothing_gathered',
    ]);
    // The leg from Sundown to the Preserve is the accent's (Act III's red), the rest steel.
    expect(view.legs.map((l) => l.accent)).toEqual([...Array<boolean>(10).fill(false), true]);
    // The Long Walk is named; nothing later than the Preserve is, in any field.
    expect(view.regions.find((r) => r.id === 'long_walk')).toMatchObject({
      text: 'The Long Walk',
      struck: 'Surge corridor',
    });
    const text = JSON.stringify(view);
    for (const m of CAMPAIGN_PLAN.slice(12)) expect(text).not.toContain(m.name);
  });

  it('across Act III (T612): A3M1 cleared → License Revoked next, then The Gap, on the night chart', () => {
    const after1 = starMapView(DEV_SAVES.after_a3m1_spared.build());
    expect(after1).toMatchObject({ phase: 'act3', act: '3', marker: 'a3_m01', frontier: 'a3_m02' });
    const revoked = after1.nodes.at(-1)!;
    expect(revoked).toMatchObject({
      id: 'a3_m02',
      state: 'open',
      name: 'License Revoked',
      place: 'Admin Plaza at night',
      x: 352,
      y: 260,
    });
    expect(revoked.label).toBe(
      'Shift 13, License Revoked, Admin Plaza at night. Next up. 0 of 3 medals.',
    );
    expect(revoked.brief?.medals.map((m) => m.name)).toContain('Back on Your Feet');
    for (const m of CAMPAIGN_PLAN.slice(13)) expect(JSON.stringify(after1)).not.toContain(m.name);

    const after2 = starMapView(DEV_SAVES.after_a3m2_rivet.build());
    expect(after2).toMatchObject({ phase: 'act3', marker: 'a3_m02', frontier: 'a3_m03' });
    expect(after2.nodes.at(-1)).toMatchObject({
      id: 'a3_m03',
      state: 'open',
      name: 'The Gap',
      place: "Okonkwo's Gap",
      x: 372,
      y: 136,
    });
    expect(after2.legs.at(-1)).toMatchObject({ accent: true, to: { x: 372, y: 136 } });
    for (const m of CAMPAIGN_PLAN.slice(14)) expect(JSON.stringify(after2)).not.toContain(m.name);
  });

  it('after A3M3: Empty Slot is open (M7 built it), and nothing later is named yet', () => {
    const view = starMapView(DEV_SAVES.after_a3m3_convoy.build());
    expect(view).toMatchObject({ phase: 'act3', act: '3', marker: 'a3_m03', frontier: 'a3_m04' });
    expect(view.nodes).toHaveLength(15);
    expect(view.nodes.slice(0, 14).every((n) => n.state === 'won')).toBe(true);
    const next = view.nodes.at(-1)!;
    expect(next).toMatchObject({
      id: 'a3_m04',
      state: 'open',
      name: 'Empty Slot',
      place: 'The Shelters',
      tagline: 'The shelters. His portrait is dark. The mail still comes.',
      x: 296,
      y: 248,
    });
    // Its briefing card: the jammer first, jam, armor and air required, and its medals.
    expect(next.brief?.threats[0]?.id).toBe('jammer');
    expect(next.brief?.required).toEqual(['Jam', 'Armor', 'Air']);
    expect(next.brief?.medals.map((m) => m.name)).toContain('Keep the Lights On');
    expect(next.brief?.objectives.map((o) => o.name)).toEqual(['Signature: Received']);
    // The leg from the Gap to it wears the accent; nothing later is named anywhere.
    expect(view.legs.at(-1)).toMatchObject({ accent: true, from: { x: 372, y: 136 } });
    const text = JSON.stringify(view);
    for (const m of CAMPAIGN_PLAN.slice(15)) expect(text).not.toContain(m.name);
    // The Deep Halls are named by A3M4's mail: the chart labels them only once it is won.
    expect(view.regions.map((r) => r.id)).not.toContain('deep_halls');
    expect(text).not.toContain('Deep Halls');
  });

  it('labels the Deep Halls once A3M4, the map that names them, is won', () => {
    const save = DEV_SAVES.after_a3m3_convoy.build();
    const maps: Record<string, unknown> = save.campaign.maps;
    maps.a3_m04 = { completed: true, medals: ['victory'], bestMeter: 1 };
    expect(starMapView(save).regions.find((r) => r.id === 'deep_halls')).toMatchObject({
      text: 'The Deep Halls',
      struck: null,
    });
  });

  it('marks the first visit until the save has seen it', () => {
    const save = DEV_SAVES.after_a1m5_ref.build();
    save.story.seen.push(STAR_MAP_SEEN_ID);
    expect(starMapView(save).firstVisit).toBe(false);
  });

  it("corrects Everglow's label once the Long Walk is won", () => {
    const save = DEV_SAVES.after_a2m3.build();
    const maps: Record<string, unknown> = save.campaign.maps;
    maps.a2_m05 = { completed: true, medals: [], bestMeter: 1 };
    expect(starMapView(save).regions.find((r) => r.id === 'long_walk')).toMatchObject({
      text: 'The Long Walk',
      struck: 'Surge corridor',
    });
  });
});

describe('phaseFor', () => {
  it('follows the frontier: gold, dusk from A2M4, Act III, then dawn', () => {
    expect(phaseFor('a2_m01')).toBe('act2.gold');
    expect(phaseFor('a2_m03')).toBe('act2.gold');
    expect(phaseFor('a2_m04')).toBe('act2.dusk');
    expect(phaseFor('a2_m06')).toBe('act2.dusk');
    // Act II's close: A2M6 won makes A3M1 the frontier (built or not), so the chart goes to night.
    expect(phaseFor('a3_m01')).toBe('act3');
    expect(phaseFor('a3_m06')).toBe('act3');
    expect(phaseFor('fin_m01')).toBe('act3');
    expect(phaseFor(null)).toBe('dawn');
  });
});

describe('the node panel (T803c)', () => {
  it("names the place in the kicker unless it is the map's own name", () => {
    expect(starKicker({ index: 6, place: 'The Diggings', name: 'Rig Nine' })).toBe(
      'Shift 6 · The Diggings',
    );
    expect(starKicker({ index: 12, place: 'The Preserve', name: 'The Preserve' })).toBe('Shift 12');
    expect(starKicker({ index: 12, place: 'the preserve ', name: 'The Preserve' })).toBe(
      'Shift 12',
    );
  });

  it('drops "Next up" beside Start, and keeps Cleared and Coming soon', () => {
    expect(showsStateLine('open')).toBe(false);
    expect(showsStateLine('won')).toBe(true);
    expect(showsStateLine('coming_soon')).toBe(true);
  });

  it('every built node of the A3M1 save names its place or its shift', () => {
    const view = starMapView(DEV_SAVES.after_a2m6.build());
    const preserve = view.nodes.find((n) => n.id === 'a3_m01');
    expect(preserve === undefined ? null : starKicker(preserve)).toBe('Shift 12');
  });
});

describe('campaignScreenName', () => {
  it('names the campaign screen for the buttons that go back to it', () => {
    expect(campaignScreenName()).toBe('Shift board');
    campaign.value = { ...campaignView(), mode: 'starMap' };
    expect(campaignScreenName()).toBe('Sector map');
    campaign.value = { ...campaignView(), mode: 'shiftBoard' };
    expect(campaignScreenName()).toBe('Shift board');
  });
});

describe("the Sector map's header (S3-5, T900)", () => {
  it("reads Everglow's in the campaign, and the ending's after the finale", () => {
    const campaignMap = { postGame: false, ending: null } as const;
    expect(headerKicker(campaignMap)).toBe('Everglow · Perimeter Ops');
    expect(technicianLine(campaignMap, 'Ada')).toBe('JPT-1 Ada · #ED-447');
    // Stay: the colony is Wayside now; Go: the world left behind, from the ship; C5 unanswered
    // (a won finale, the tab closed in C5): the world's name alone.
    expect(headerKicker({ postGame: true, ending: 'stay' })).toBe(WAYSIDE_LABEL);
    expect(headerKicker({ postGame: true, ending: 'go' })).toBe(GO_KICKER);
    expect(headerKicker({ postGame: true, ending: null })).toBe(UNANSWERED_KICKER);
    // The kicker names the ending, never the plate's heading under it (UA-5).
    for (const ending of ['stay', 'go', null] as const) {
      expect(headerKicker({ postGame: true, ending })).not.toBe(POST_GAME_PLATE.heading);
    }
    // Either way, the name Pebble gave, and no Everglow badge.
    expect(technicianLine({ postGame: true }, 'Ada')).toBe('Waykeeper Ada');
  });

  it('heads the post-game dev saves by their ending', () => {
    for (const [id, kicker] of [
      ['after_fin_stay', 'Wayside'],
      ['after_fin_go', 'Tumble IV, from orbit'],
    ] as const) {
      initSaves(new MemoryStore());
      loadDevSave(id);
      const save = activeSave();
      expect(save).not.toBeNull();
      if (save === null) continue;
      expect(headerKicker(starMapView(save))).toBe(kicker);
    }
  });
});
