// The star map's content (design/core-loop.md § 1.1; art-direction.md § 10; architecture.md § UI):
// every campaign map's node on the Sector map (its place in the valley, its tagline, and its
// glyph's centre in chart pixels), the chart's phases, its region labels, the Long Walk's trail,
// and the corner chrome the chart keeps clear. The tagline lives here, not on MapDef, because a
// teaser shows one for a map that isn't built. Pure data plus its checks (starMap.test.ts).
import type { CampaignMapId } from './campaign.ts';

/** The chart's size in game px (the #ui box). */
export const CHART_W = 640;
export const CHART_H = 360;

/**
 * The Shift board's last map: it is Act I's view, and the star map replaces it, for good, once
 * this map is won (D102).
 */
export const STAR_MAP_AFTER: CampaignMapId = 'a1_m05';

/** The `story.seen` id the star map's first visit adds (D102; no SaveData change). */
export const STAR_MAP_SEEN_ID = 'star_map_opened';

/** One campaign map on the chart. */
export interface StarMapNode {
  /** Where in the valley (story/campaign.md § 2's biome column): "The Diggings". */
  readonly place: string;
  /** The italic line under the map's heading in its act file, verbatim (tools/ checks it). */
  readonly tagline: string;
  /** The glyph's centre in chart px (art-direction § 10 *Node positions*). */
  readonly x: number;
  readonly y: number;
}

/** Every planned campaign map's node. Act III and the finale are provisional (their milestones). */
export const STAR_MAP_NODES: Readonly<Record<CampaignMapId, StarMapNode>> = {
  a1_m01: {
    place: 'Dome Row',
    tagline: 'Your first shift: keep the adorable pests out of the lettuce.',
    x: 304,
    y: 292,
  },
  a1_m02: {
    place: 'The Terraces',
    tagline: 'Big, slow Brood Haulers waddle down the terraces with glittering sacks. High bounty!',
    x: 264,
    y: 160,
  },
  a1_m03: {
    place: 'Mail Road',
    tagline: 'Gerald the mail drone flies the path. Gerald is not a pest. Do NOT shoot Gerald.',
    x: 440,
    y: 236,
  },
  a1_m04: {
    place: 'Admin Plaza',
    tagline: 'Compliance Officer Prim is auditing you. Smile. Sterling has your back.',
    x: 336,
    y: 252,
  },
  a1_m05: {
    place: 'Northern Gate',
    tagline:
      "It's the Spring Surge, the Quarterly Results party is on, and something big is coming " +
      'down the north road.',
    x: 312,
    y: 204,
  },
  a2_m01: {
    place: 'The Diggings',
    tagline: 'Rig Nine stopped answering. Go take a peek. Minor operational hiccup!',
    x: 500,
    y: 88,
  },
  a2_m02: {
    place: 'Ridge Rigs',
    tagline: 'Someone is shattering the extraction rigs, and only the rigs.',
    x: 400,
    y: 100,
  },
  a2_m03: {
    place: 'The Terraces at dusk',
    tagline: 'The terraces again, at dusk. Same road. Everything on it is running south.',
    x: 280,
    y: 152,
  },
  a2_m04: {
    place: 'Reclamation Facility 2',
    tagline:
      "Kip's new plant smells like burnt sugar. The Tidybots unload here. Ask Zibzab where " +
      'stardust comes from.',
    x: 472,
    y: 168,
  },
  a2_m05: {
    place: 'Preserve Road',
    tagline:
      "Ves'thara comes for the Preserve Road in a glass giant. Then the Hollow comes for " +
      'everyone on it.',
    x: 176,
    y: 164,
  },
  a2_m06: {
    place: 'Colony perimeter',
    tagline:
      'The first Hollow assault on the colony itself. Everyone on the wall. The sun goes down.',
    x: 352,
    y: 200,
  },
  a3_m01: {
    place: 'The Preserve',
    tagline: 'The Hollow is inside the Preserve, where you led them. Get them out.',
    x: 152,
    y: 208,
  },
  a3_m02: {
    place: 'Admin Plaza at night',
    tagline: 'The Admin Plaza again, at night. Sterling is on the line. She sounds... cheerful.',
    x: 352,
    y: 260,
  },
  a3_m03: {
    place: "Okonkwo's Gap",
    tagline:
      'An unwinnable surge. Bricks holds the choke in person. The score is how many get out.',
    x: 372,
    y: 136,
  },
  a3_m04: {
    place: 'The Shelters',
    tagline: 'The shelters. His portrait is dark. The mail still comes.',
    x: 296,
    y: 248,
  },
  a3_m05: {
    place: 'Second Harvest at night',
    tagline:
      'Second Harvest at maximum throughput. Kip opens the vats. The bearers carry the dead home.',
    x: 488,
    y: 176,
  },
  a3_m06: {
    place: 'Dome Row at night',
    tagline:
      "Dome Row again, at night. The valley's Skitterkin come to the domes. Goldie opens them.",
    x: 320,
    y: 300,
  },
  fin_m01: {
    place: 'The Long Walk to the Deep Halls',
    tagline:
      'Walk them home. The choir sings the jingle as a funeral hymn, and your counter counts ' +
      'down to zero.',
    x: 412,
    y: 60,
  },
};

/**
 * The chart's phase (art-direction § 10 *The north edge and the palette by phase*): the
 * frontier's, so the chart darkens with the maps. `dawn` once the finale is won.
 */
export type StarMapPhase = 'act2.gold' | 'act2.dusk' | 'act3' | 'dawn';

/** Each phase from its first frontier on, in campaign order. Before the first, `act2.gold`. */
export const STAR_MAP_PHASES: readonly {
  readonly from: CampaignMapId;
  readonly phase: StarMapPhase;
}[] = [
  { from: 'a2_m01', phase: 'act2.gold' },
  { from: 'a2_m04', phase: 'act2.dusk' },
  { from: 'a3_m01', phase: 'act3' },
];

/** The UI theme (`data-act`, art-direction § 9 *Act themes*) each phase carries. */
export const STAR_MAP_PHASE_ACT: Readonly<Record<StarMapPhase, '2' | '3' | 'finale'>> = {
  'act2.gold': '2',
  'act2.dusk': '2',
  act3: '3',
  dawn: 'finale',
};

/** A region label on the chart (art-direction § 10 *Region labels*), anchored at its centre. */
export interface StarMapRegion {
  readonly id: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  /**
   * Everglow's label corrected once this map is won: the new words show, with the old ones struck
   * through above them (the codex annotations' look).
   */
  readonly corrected?: { readonly after: CampaignMapId; readonly text: string };
}

/** The labels; the Deep Halls join only once a map has named them (M6). */
export const STAR_MAP_REGIONS: readonly StarMapRegion[] = [
  { id: 'north', text: 'No survey data', x: 344, y: 10 },
  { id: 'spires', text: 'The Spires', x: 272, y: 64 },
  { id: 'gardens', text: 'Everglow Gardens', x: 222, y: 278 },
  {
    id: 'long_walk',
    text: 'Surge corridor',
    x: 252,
    y: 336,
    corrected: { after: 'a2_m05', text: 'The Long Walk' },
  },
];

/**
 * The Long Walk's trail (art-direction § 10): from the north edge past the Halls' mouth and
 * Okonkwo's Gap, through the north and south gates, and out across the south edge.
 */
export const STAR_MAP_LONG_WALK: readonly { readonly x: number; readonly y: number }[] = [
  { x: 420, y: 0 },
  { x: 412, y: 60 },
  { x: 372, y: 136 },
  { x: 312, y: 196 },
  { x: 304, y: 304 },
  { x: 296, y: 360 },
];

/** A rectangle in chart px. */
export interface ChartRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** The corner chrome (header, banks, footer): ground only under them, never a node or label. */
export const STAR_MAP_RESERVED: readonly ChartRect[] = [
  { x: 8, y: 8, w: 208, h: 40 },
  { x: 512, y: 8, w: 120, h: 28 },
  { x: 392, y: 328, w: 240, h: 24 },
];

/** A node's hit box (and its glyph's frame): 16×16 around its centre. */
export const NODE_BOX = { dx: -8, dy: -8, w: 16, h: 16 } as const;

/**
 * What the node panel keeps clear of around a node: its glyph, its pips, and its name plate
 * below (a plate up to 80 px wide).
 */
export const NODE_CLEAR_BOX = { dx: -40, dy: -9, w: 80, h: 36 } as const;

/** The nearest two nodes may stand, on at least one axis (px). */
export const NODE_SPACING = 16;

function overlaps(a: ChartRect, b: ChartRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Problems with the star map's data (empty when it holds): `starMap.test.ts` asserts none. */
export function starMapProblems(
  nodes: Readonly<Record<string, StarMapNode>> = STAR_MAP_NODES,
): string[] {
  const out: string[] = [];
  const entries = Object.entries(nodes);
  for (const [id, n] of entries) {
    const box = { x: n.x + NODE_BOX.dx, y: n.y + NODE_BOX.dy, w: NODE_BOX.w, h: NODE_BOX.h };
    if (box.x < 0 || box.y < 0 || box.x + box.w > CHART_W || box.y + box.h > CHART_H) {
      out.push(`${id}: outside the chart`);
    }
    for (const r of STAR_MAP_RESERVED) {
      if (overlaps(box, r)) out.push(`${id}: under the corner chrome at (${r.x}, ${r.y})`);
    }
    if (n.tagline.trim() === '' || n.place.trim() === '') out.push(`${id}: no place or tagline`);
  }
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [a, na] = entries[i]!;
      const [b, nb] = entries[j]!;
      if (Math.abs(na.x - nb.x) < NODE_SPACING && Math.abs(na.y - nb.y) < NODE_SPACING) {
        out.push(`${a} and ${b}: closer than ${NODE_SPACING} px on both axes`);
      }
    }
  }
  return out;
}
