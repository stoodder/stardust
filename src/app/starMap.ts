// The star map's view (design/core-loop.md § 1.1; architecture.md § UI: DOM overlay): what the
// Sector map shows for a save. The phase (the frontier's) and its UI act; the nodes in campaign
// order, each with its state, medals, place, tagline, and, for a built map, the briefing's threat
// strip, its medals by name, and its optional objectives; the marker's node (the latest won); the
// legs between the visible nodes; the region labels; and whether this is the save's first visit.
// Maps past the frontier are never in it. Pure over a SaveData (the screen reads it through
// `starMapView`, and `campaignScreenName` names the campaign screen for the buttons that go back).
import { CAMPAIGN_PLAN, type CampaignMapId } from '../content/campaign.ts';
import {
  STAR_MAP_NODES,
  STAR_MAP_PHASE_ACT,
  STAR_MAP_PHASES,
  STAR_MAP_REGIONS,
  STAR_MAP_SEEN_ID,
  type StarMapPhase,
} from '../content/starMap.ts';
import type { IdSpace } from '../content/types.ts';
import type { CompiledMapDef } from '../content/compiled.ts';
import {
  frontierOf,
  isMapWon,
  specsOwned,
  starMapEntries,
  type SaveData,
  type StarMapState,
} from '../meta/index.ts';
import { campaign } from '../ui/screens/state.ts';
import { silkText } from '../ui/silk.ts';
import { battleConfig } from './battleSetup.ts';
import { medalViews, objectiveViews, threatIntel } from './hudViews.ts';
import { logError } from './log.ts';
import { activeSave, updateActiveSave } from './save.ts';

export { STAR_MAP_SEEN_ID };

/** The first-visit notice (story/style-guide.md § 2). */
export const STAR_MAP_ACCESS_NOTICE = 'Access upgraded! Perimeter Ops now covers the whole valley.';

/** The chart's one-line description for screen readers (style-guide § 2). */
export const STAR_MAP_CHART_LABEL =
  'Sector map of the valley: the colony in the south, the Spires in the north';

/** A threat on a node's panel: its tell glyph (if drawn), its name, and its tooltip (or null). */
export interface StarThreatView {
  readonly id: string;
  readonly label: string;
  readonly glyph: string | null;
  readonly tip: string | null;
}

/** A built map's briefing facts on its panel. */
export interface StarBriefView {
  readonly threats: readonly StarThreatView[];
  /** "Armor": each counter the map requires an answer to. */
  readonly required: readonly string[];
  /** The three medals by name, earned (on file) or not. */
  readonly medals: readonly {
    readonly id: string;
    readonly name: string;
    readonly earned: boolean;
  }[];
  readonly objectives: readonly {
    readonly id: string;
    readonly name: string;
    readonly done: boolean;
  }[];
}

export interface StarNodeView {
  readonly id: CampaignMapId;
  /** Shift number (1-based campaign position). */
  readonly index: number;
  readonly name: string;
  readonly place: string;
  readonly tagline: string;
  readonly state: StarMapState;
  /** Glyph centre in chart px. */
  readonly x: number;
  readonly y: number;
  /** Medals on file, of 3. */
  readonly medals: number;
  /** The briefing's facts for a built map; null for a teaser. */
  readonly brief: StarBriefView | null;
  /** The node's accessible name: "Shift 6, Rig Nine, The Diggings. Next up. 0 of 3 medals." */
  readonly label: string;
}

/** A dashed leg between two visible nodes, in chart px; `accent` from the marker to the frontier. */
export interface StarLegView {
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
  readonly accent: boolean;
}

/** A region label as shown: its words, and Everglow's struck-through old words when corrected. */
export interface StarRegionView {
  readonly id: string;
  readonly text: string;
  readonly struck: string | null;
  readonly x: number;
  readonly y: number;
}

export interface StarMapView {
  readonly phase: StarMapPhase;
  /** The UI theme's `data-act`. */
  readonly act: '2' | '3' | 'finale';
  readonly nodes: readonly StarNodeView[];
  /** The latest won map: the "you are here" marker's node (null before any win). */
  readonly marker: CampaignMapId | null;
  /** The frontier (Next up or Coming soon), or null after the finale. */
  readonly frontier: CampaignMapId | null;
  readonly legs: readonly StarLegView[];
  readonly regions: readonly StarRegionView[];
  /** Until the save's `story.seen` holds STAR_MAP_SEEN_ID: the sweep and the notice. */
  readonly firstVisit: boolean;
}

/** The chart's phase for a frontier (null: the finale is won, `dawn`). */
export function phaseFor(frontier: CampaignMapId | null): StarMapPhase {
  if (frontier === null) return 'dawn';
  const at = CAMPAIGN_PLAN.findIndex((m) => m.id === frontier);
  let phase: StarMapPhase = STAR_MAP_PHASES[0]?.phase ?? 'act2.gold';
  for (const p of STAR_MAP_PHASES) {
    if (CAMPAIGN_PLAN.findIndex((m) => m.id === p.from) <= at) phase = p.phase;
  }
  return phase;
}

const STATE_WORDS: Readonly<Record<StarMapState, string>> = {
  won: 'Cleared',
  open: 'Next up',
  coming_soon: 'Coming soon',
};

/** A node's state in words ("Next up"). */
export function starStateText(state: StarMapState): string {
  return STATE_WORDS[state];
}

type MapDef = CompiledMapDef<IdSpace>;

/** The compiled maps, keyed by id (one compile serves every node), or null if none can be built. */
function compiledMaps(
  ids: readonly string[],
  save: SaveData,
): Readonly<Record<string, MapDef>> | null {
  const first = ids[0];
  if (first === undefined) return null;
  try {
    return battleConfig(first, 0, save).content.maps;
  } catch (err) {
    logError(`starMap: no content for '${first}'`, err);
    return null;
  }
}

function briefOf(map: MapDef, save: SaveData): StarBriefView {
  const owned = save.unlocks.towers.filter((t) => !save.unlocks.revokedTowers.includes(t));
  const intel = threatIntel(map, owned, specsOwned(save));
  const records: Readonly<
    Record<string, { readonly medals: readonly string[]; readonly objectives?: readonly string[] }>
  > = save.campaign.maps;
  const record = Object.hasOwn(records, map.id) ? records[map.id] : undefined;
  const held = record?.medals ?? [];
  const done = record?.objectives ?? [];
  const open = { victory: 'open', perfectCore: 'open', challenge: 'open' } as const;
  return {
    threats: intel.threats.map((t) => ({ id: t.id, label: t.label, glyph: t.glyph, tip: t.tip })),
    required: intel.required.map((r) => r.label),
    medals: medalViews(map, open, held).map((m) => ({ id: m.id, name: m.name, earned: m.held })),
    objectives: objectiveViews(map).map((o) => ({
      id: o.id,
      name: o.name,
      done: done.includes(o.id),
    })),
  };
}

/** The star map for `save` (core-loop.md § 1.1). */
export function starMapView(save: SaveData): StarMapView {
  const entries = starMapEntries(save);
  const frontier = frontierOf(save);
  const phase = phaseFor(frontier);
  const built = entries.filter((e) => e.state !== 'coming_soon').map((e) => e.id);
  const maps = compiledMaps(built, save);
  const nodes = entries.map((e): StarNodeView => {
    const n = STAR_MAP_NODES[e.id];
    const map = maps !== null && Object.hasOwn(maps, e.id) ? maps[e.id] : undefined;
    const name = silkText(e.name);
    const place = silkText(n.place);
    const tagline = silkText(n.tagline);
    const medals = e.medals.length;
    const head = `Shift ${e.index}, ${name}, ${place}. ${STATE_WORDS[e.state]}.`;
    return {
      id: e.id,
      index: e.index,
      name,
      place,
      tagline,
      state: e.state,
      x: n.x,
      y: n.y,
      medals,
      brief: e.state === 'coming_soon' || map === undefined ? null : briefOf(map, save),
      label: e.state === 'coming_soon' ? `${head} ${tagline}` : `${head} ${medals} of 3 medals.`,
    };
  });
  const marker = entries.findLast((e) => e.state === 'won')?.id ?? null;
  const legs: StarLegView[] = [];
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1]!;
    const b = nodes[i]!;
    legs.push({
      from: { x: a.x, y: a.y },
      to: { x: b.x, y: b.y },
      accent: a.id === marker && b.state !== 'won',
    });
  }
  const named = STAR_MAP_REGIONS.filter(
    (r) => r.shownAfter === undefined || isMapWon(save, r.shownAfter),
  );
  const regions = named.map((r): StarRegionView => {
    const fixed =
      r.corrected !== undefined && isMapWon(save, r.corrected.after) ? r.corrected : null;
    return {
      id: r.id,
      text: fixed === null ? r.text : fixed.text,
      struck: fixed === null ? null : r.text,
      x: r.x,
      y: r.y,
    };
  });
  return {
    phase,
    act: STAR_MAP_PHASE_ACT[phase],
    nodes,
    marker,
    frontier,
    legs,
    regions,
    firstVisit: !save.story.seen.includes(STAR_MAP_SEEN_ID),
  };
}

/**
 * The campaign screen's name for the buttons that go back to it (the Base's footer, the loadout
 * screen's back, Results after a loss, the pause menu's Quit): "Sector map" once the star map has
 * replaced the Shift board, else "Shift board" (D102).
 */
export function campaignScreenName(): 'Sector map' | 'Shift board' {
  return campaign.value?.mode === 'starMap' ? 'Sector map' : 'Shift board';
}

/**
 * Marks the star map's first visit shown in the save in play (`story.seen`, once; D102), so the
 * sweep and the notice never repeat. A failed write is logged and harmless.
 */
export function markStarMapOpened(): void {
  const save = activeSave();
  if (save === null || save.story.seen.includes(STAR_MAP_SEEN_ID)) return;
  updateActiveSave((s) => ({
    ...s,
    story: { ...s.story, seen: [...s.story.seen, STAR_MAP_SEEN_ID] },
  }));
}

/** The star map for the save in play, or null without one. */
export function activeStarMap(): StarMapView | null {
  const save = activeSave();
  return save === null ? null : starMapView(save);
}
