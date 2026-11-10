// The star map's view (core-loop.md § 1.1): what the Sector map shows for a save, and nothing
// past the frontier.
import { afterEach, describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN } from '../content/campaign.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { campaign, type CampaignView } from '../ui/screens/state.ts';
import { MemoryStore } from '../meta/index.ts';
import { initSaves, loadDevSave } from './save.ts';
import { campaignScreenName, phaseFor, starMapView, STAR_MAP_SEEN_ID } from './starMap.ts';

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

  it("after A2M6 (Act II's close): the night chart, The Preserve as a teaser, nothing past it", () => {
    const view = starMapView(DEV_SAVES.after_a2m6.build());
    expect(view.phase).toBe('act3');
    expect(view.act).toBe('3');
    expect(view.marker).toBe('a2_m06');
    expect(view.frontier).toBe('a3_m01');
    expect(view.nodes).toHaveLength(12);
    expect(view.nodes.slice(0, 11).every((n) => n.state === 'won')).toBe(true);
    const teaser = view.nodes.at(-1)!;
    // Coming soon: its name, place, and tagline only (no briefing facts, no Start).
    expect(teaser).toMatchObject({
      id: 'a3_m01',
      state: 'coming_soon',
      name: 'The Preserve',
      place: 'The Preserve',
      brief: null,
      tagline: 'The Hollow is inside the Preserve, where you led them. Get them out.',
    });
    expect(teaser.label).toBe(
      'Shift 12, The Preserve, The Preserve. Coming soon. The Hollow is inside the Preserve, ' +
        'where you led them. Get them out.',
    );
    // The leg from Sundown to the Preserve is the accent's (Act III's red), the rest steel.
    expect(view.legs.map((l) => l.accent)).toEqual([...Array<boolean>(10).fill(false), true]);
    // The Long Walk is named; nothing later than the teaser is, in any field.
    expect(view.regions.find((r) => r.id === 'long_walk')).toMatchObject({
      text: 'The Long Walk',
      struck: 'Surge corridor',
    });
    const text = JSON.stringify(view);
    for (const m of CAMPAIGN_PLAN.slice(12)) expect(text).not.toContain(m.name);
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

describe('campaignScreenName', () => {
  it('names the campaign screen for the buttons that go back to it', () => {
    expect(campaignScreenName()).toBe('Shift board');
    campaign.value = { ...campaignView(), mode: 'starMap' };
    expect(campaignScreenName()).toBe('Sector map');
    campaign.value = { ...campaignView(), mode: 'shiftBoard' };
    expect(campaignScreenName()).toBe('Shift board');
  });
});
