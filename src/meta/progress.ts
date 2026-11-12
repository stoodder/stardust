// Campaign progress: which maps the campaign screen offers (the Shift board through Act I, then
// the star map's won maps and frontier), and when each between-map system unlocks
// (docs/tech/meta-runtime.md § Progress and gating). The schedule is story/campaign.md's (§ 2 and
// § 4.6); design/progression.md says what each system is. The map order and names are
// content/campaign.ts's CAMPAIGN_PLAN, which includes maps whose content isn't built yet: the
// Shift board runs to the last registered Act I map (an unregistered gap shows "coming soon"),
// and the gating copy names a map only once the campaign screen shows it. Pure functions over a
// SaveData.
import { CAMPAIGN_PLAN, type CampaignMapId } from '../content/campaign.ts';
import { MAPS } from '../content/maps/index.ts';
import { POST_GAME_MAPS } from '../content/postGame.ts';
import { STAR_MAP_AFTER } from '../content/starMap.ts';
import type { MapId } from '../content/types.ts';
import type { SaveData } from './saveData.ts';

function isRegistered(id: string): id is MapId {
  return Object.hasOwn(MAPS, id);
}

/** STAR_MAP_AFTER's campaign index: the Shift board's last row (Act I's last map). */
const ACT_ONE_END = CAMPAIGN_PLAN.findIndex((m) => m.id === STAR_MAP_AFTER);

/**
 * How many campaign maps the Shift board lists: the plan up to its last registered map, capped at
 * Act I (STAR_MAP_AFTER), so registering an Act II map never names it on the board (D102).
 */
export const SHIFT_BOARD_SIZE: number = Math.min(
  CAMPAIGN_PLAN.findLastIndex((m) => isRegistered(m.id)) + 1,
  ACT_ONE_END + 1,
);

/** Systems the campaign opens between maps. */
export type MetaSystem =
  'base' | 'rnd' | 'shop' | 'engineering' | 'xenotech' | 'loadout' | 'spareRunners';

export const META_SYSTEMS: readonly MetaSystem[] = [
  'base',
  'rnd',
  'shop',
  'engineering',
  'xenotech',
  'loadout',
  'spareRunners',
];

/**
 * Each system opens once this campaign map is won (story/campaign.md § 4.6):
 * - The base and R&D Command after A1M1 (Mk II and Rapport only at first).
 * - Zibzab's shop after A1M3; the loadout screen is first shown at A1M4, so it opens with A1M3 won.
 * - R&D Engineering (tier-4 specializations) after A1M4.
 * - The spare-runners filter from A2M1, so with A1M5 won.
 * - Ves'thara's Xenotech branch after A2M5.
 */
export const SYSTEM_UNLOCKS: Readonly<Record<MetaSystem, CampaignMapId>> = {
  base: 'a1_m01',
  rnd: 'a1_m01',
  shop: 'a1_m03',
  loadout: 'a1_m03',
  engineering: 'a1_m04',
  spareRunners: 'a1_m05',
  xenotech: 'a2_m05',
};

/**
 * The planned name of a campaign map id, a post-game map's name (content/postGame.ts; T863), or the
 * id itself for any other map.
 */
export function mapName(id: string): string {
  return (
    CAMPAIGN_PLAN.find((m) => m.id === id)?.name ??
    POST_GAME_MAPS.find((m) => m.id === id)?.name ??
    id
  );
}

/** True once `id` has been won in this save (an unregistered id never has). */
export function isMapWon(save: SaveData, id: string): boolean {
  const maps: Readonly<Record<string, { readonly completed: boolean } | undefined>> =
    save.campaign.maps;
  return Object.hasOwn(maps, id) && maps[id]?.completed === true;
}

/**
 * True when `system` is open: its map is won, or `devUnlocks` (the `?test=1&save=` dev hook only,
 * never a save or an import; D031) lists it.
 */
export function isSystemUnlocked(
  save: SaveData,
  system: MetaSystem,
  devUnlocks: readonly MetaSystem[] = [],
): boolean {
  return devUnlocks.includes(system) || isMapWon(save, SYSTEM_UNLOCKS[system]);
}

/**
 * The star map's frontier: the first plan map not won (null once the finale is won). It shows on
 * the campaign screen whether or not its content is built.
 */
export function frontierOf(save: SaveData): CampaignMapId | null {
  return CAMPAIGN_PLAN.find((m) => !isMapWon(save, m.id))?.id ?? null;
}

/**
 * Whether the campaign screen shows (and so the copy may name) a planned map: Act I's always (the
 * Shift board lists them all), a later one once it is won or is the frontier (D102). Without a
 * save, Act I's only.
 */
export function mapShown(id: string, save: SaveData | null = null): boolean {
  const index = CAMPAIGN_PLAN.findIndex((m) => m.id === id);
  if (index < 0) return false;
  if (index <= ACT_ONE_END) return true;
  return save !== null && (isMapWon(save, id) || frontierOf(save) === id);
}

/**
 * A planned map as the gating copy names it: its name once the campaign screen shows it
 * ("Orientation Day", mapShown), else its position, "Shift 7", or "Shift 10 (coming soon)" while
 * its content isn't built, so the copy never names a map the player can't see yet (style-guide
 * § 2). An id off the plan is itself.
 */
export function mapMilestone(id: string, save: SaveData | null = null): string {
  const index = CAMPAIGN_PLAN.findIndex((m) => m.id === id);
  if (index < 0) return id;
  if (mapShown(id, save)) return mapName(id);
  return isRegistered(id) ? `Shift ${index + 1}` : `Shift ${index + 1} (coming soon)`;
}

/**
 * What opens a locked system, in words for its locked pane: "Opens after Special Delivery", or
 * "Opens after Shift 10 (coming soon)" for a map the campaign screen doesn't show yet.
 */
export function unlockHint(system: MetaSystem, save: SaveData | null = null): string {
  return `Opens after ${mapMilestone(SYSTEM_UNLOCKS[system], save)}`;
}

/** A Shift board row's state. */
export type ShiftState =
  /** Won before (replayable). */
  | 'won'
  /** Playable and not yet won. */
  | 'open'
  /** The previous campaign map isn't won yet. */
  | 'locked'
  /** In the plan but its content isn't built yet. */
  | 'coming_soon';

export interface ShiftEntry {
  readonly id: string;
  readonly name: string;
  /** 1-based campaign position. */
  readonly index: number;
  readonly state: ShiftState;
  /** Medal ids earned on the map, in the order earned. */
  readonly medals: readonly string[];
}

/**
 * The Shift board: the first `size` campaign maps in order, each won, open, locked (its
 * predecessor isn't won), or coming soon (not registered yet). `registered` defaults to the live
 * map registry (tests pass their own).
 */
export function shiftBoard(
  save: SaveData,
  size: number = SHIFT_BOARD_SIZE,
  registered: (id: string) => boolean = isRegistered,
): ShiftEntry[] {
  const maps: Readonly<Record<string, { readonly medals: readonly string[] } | undefined>> =
    save.campaign.maps;
  return CAMPAIGN_PLAN.slice(0, size).map((m, i): ShiftEntry => {
    const prev = CAMPAIGN_PLAN[i - 1];
    const state: ShiftState = !registered(m.id)
      ? 'coming_soon'
      : isMapWon(save, m.id)
        ? 'won'
        : prev === undefined || isMapWon(save, prev.id)
          ? 'open'
          : 'locked';
    return {
      id: m.id,
      name: m.name,
      index: i + 1,
      state,
      medals: Object.hasOwn(maps, m.id) ? [...(maps[m.id]?.medals ?? [])] : [],
    };
  });
}

/** The board's next map to play: the first open one, else the last won one, else null. */
export function nextShift(board: readonly ShiftEntry[]): ShiftEntry | null {
  return board.find((e) => e.state === 'open') ?? board.findLast((e) => e.state === 'won') ?? null;
}

/** A star map node's state: won (Replay), the frontier built (Start), or a teaser (Coming soon). */
export type StarMapState = 'won' | 'open' | 'coming_soon';

export interface StarMapEntry {
  readonly id: CampaignMapId;
  readonly name: string;
  /** 1-based campaign position (its shift number). */
  readonly index: number;
  readonly state: StarMapState;
  /** Medal ids earned on the map, in the order earned. */
  readonly medals: readonly string[];
}

/**
 * The star map's nodes (core-loop.md § 1.1): every won map, then the frontier (the first plan map
 * not won: `open` when registered, else a `coming_soon` teaser), in plan order. Nothing after the
 * frontier: later maps aren't drawn, named, or in the page. After the finale, every won map.
 */
export function starMapEntries(
  save: SaveData,
  registered: (id: string) => boolean = isRegistered,
): StarMapEntry[] {
  const maps: Readonly<Record<string, { readonly medals: readonly string[] } | undefined>> =
    save.campaign.maps;
  const frontier = frontierOf(save);
  const out: StarMapEntry[] = [];
  CAMPAIGN_PLAN.forEach((m, i) => {
    const won = isMapWon(save, m.id);
    if (!won && m.id !== frontier) return;
    out.push({
      id: m.id,
      name: m.name,
      index: i + 1,
      state: won ? 'won' : registered(m.id) ? 'open' : 'coming_soon',
      medals: Object.hasOwn(maps, m.id) ? [...(maps[m.id]?.medals ?? [])] : [],
    });
  });
  return out;
}

/** Whether the campaign screen is the star map for this save: once STAR_MAP_AFTER is won (D102). */
export function onStarMap(save: SaveData): boolean {
  return isMapWon(save, STAR_MAP_AFTER);
}
