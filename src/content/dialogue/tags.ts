// Bricks's name tags as content (docs/story/campaign.md § 6.3; docs/design/towers.md § 8): his tag
// list, in order and append-only, each name bound to the map where he gives it, so a replay
// reuses that map's name. src/story/tags.ts picks the tower; the save's `bricksTagIndex` is the
// list position after the furthest map tagged. A3M4's tag moment is a silence, so it has no entry.
import type { CampaignMapId } from '../campaign.ts';

/** One name tag. */
export interface NameTagDef {
  readonly map: CampaignMapId;
  /** The plate's text; it may use `{name}` (A3M3). ≤ 16 characters at worst case. */
  readonly name: string;
  /**
   * Which tower carries it: `earliest`, the earliest-built attacking tower still standing, tagged at
   * the map's first wave clear; `latest`, the most recently built attacking tower, moving to each
   * newer one until the map ends (A3M3: the last turret built before the SEAL).
   */
  readonly pick: 'earliest' | 'latest';
}

/** Bricks's tag list (campaign.md § 6.3), in campaign order. */
export const NAME_TAGS: readonly NameTagDef[] = [
  { map: 'a1_m02', name: 'Denise', pick: 'earliest' },
  { map: 'a1_m05', name: 'Marguerite', pick: 'earliest' },
  { map: 'a2_m01', name: 'Biscuit', pick: 'earliest' },
  { map: 'a2_m03', name: 'Auntie Funmi', pick: 'earliest' },
  { map: 'a2_m05', name: 'Dele', pick: 'earliest' },
  { map: 'a3_m02', name: 'Lucky', pick: 'earliest' },
  { map: 'a3_m03', name: '{name}', pick: 'latest' },
];
