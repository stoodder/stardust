// Campaign progress: which maps the Shift board offers, and when each between-map system unlocks
// (docs/tech/meta-runtime.md § Progress and gating). The schedule is story/campaign.md's (§ 2 and
// § 4.6); design/progression.md says what each system is. The map order and names are
// content/campaign.ts's CAMPAIGN_PLAN, which includes maps whose content isn't built yet: the
// Shift board shows those as "coming soon", and the gates name them. Pure functions over a SaveData.
import { CAMPAIGN_PLAN, type CampaignMapId } from '../content/campaign.ts';
import { MAPS } from '../content/maps/index.ts';
import type { MapId } from '../content/types.ts';
import type { SaveData } from './saveData.ts';

/** How many campaign maps the Shift board lists (the M2 cut, D031: A1M1 and A1M2). */
export const SHIFT_BOARD_SIZE = 2;

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

/** The planned name of a campaign map id, or the id itself for a map outside the plan. */
export function mapName(id: string): string {
  return CAMPAIGN_PLAN.find((m) => m.id === id)?.name ?? id;
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
 * A planned map as the gating copy names it: its name while the Shift board lists it ("Orientation
 * Day"), else its position, so the copy never names a map the player can't see yet ("Shift 3
 * (coming soon)"). An id off the plan is itself.
 */
export function mapMilestone(id: string, size: number = SHIFT_BOARD_SIZE): string {
  const index = CAMPAIGN_PLAN.findIndex((m) => m.id === id);
  if (index < 0) return id;
  return index < size ? mapName(id) : `Shift ${index + 1} (coming soon)`;
}

/**
 * What opens a locked system, in words for its locked pane: "Opens after Orientation Day", or
 * "Opens after Shift 3 (coming soon)" for a map past the Shift board (mapMilestone).
 */
export function unlockHint(system: MetaSystem, size: number = SHIFT_BOARD_SIZE): string {
  return `Opens after ${mapMilestone(SYSTEM_UNLOCKS[system], size)}`;
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

function isRegistered(id: string): id is MapId {
  return Object.hasOwn(MAPS, id);
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
