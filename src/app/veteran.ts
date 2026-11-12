// Veteran replays in the app (design/progression.md § 6; T860): the briefing's picker reads and
// writes the save's record (meta/veteran.ts), and Results names the Veteran medal. A toggle writes
// the save at once; as the briefing closes, the router sees the config changed
// (app/storyMeta.ts `briefingChangedBattle`) and restarts the battle, still on its first tick, on
// the same seed with the picks applied (app/battleSetup.ts).
import type { IdSpace, MapId } from '../content/types.ts';
import { MAPS } from '../content/maps/index.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { isCampaignMapId } from '../content/dialogue/rules.ts';
import {
  earnsVeteranMedal,
  hasVeteranMedal,
  VETERAN_BONUS_PCT,
  VETERAN_COPY,
  VETERAN_MEDAL_ID,
  VETERAN_MEDAL_NAME,
  VETERAN_MEDAL_PCT,
  veteranModsOf,
  veteranOffers,
  veteranRecord,
  withVeteranPick,
  type VeteranModifierId,
} from '../meta/veteran.ts';
import type { SaveData } from '../meta/saveData.ts';
import type { SimConfig } from '../sim/index.ts';
import type { MapMedal } from './runResult.ts';
import { logError } from './log.ts';
import { activeSave, updateActiveSave } from './save.ts';

/** One toggle in the picker. */
export interface VeteranRowView {
  readonly id: VeteranModifierId;
  readonly name: string;
  readonly short: string;
  readonly effect: string;
  readonly quip: string;
  /** Its Stardust bonus, in percent. */
  readonly bonus: number;
  /** Picked (and it bites here). */
  readonly on: boolean;
  readonly available: boolean;
  /** Why it's dimmed, or null. */
  readonly why: string | null;
}

/** The briefing's picker for a replay. */
export interface VeteranPickerView {
  readonly mapId: MapId;
  readonly rows: readonly VeteranRowView[];
  /** The picks' total bonus, in percent. */
  readonly total: number;
  /** The Veteran medal: on file, and whether the picks reach it (+100%). */
  readonly medal: { readonly held: boolean; readonly reached: boolean; readonly at: number };
  /** The best bonus a win here carried (0 before one). */
  readonly best: number;
}

/** The map's id when it is a campaign map (the picker's maps), else null. */
function campaignMap(mapId: string | null): MapId | null {
  if (mapId === null || !isCampaignMapId(mapId) || !Object.hasOwn(MAPS, mapId)) return null;
  return mapId;
}

/**
 * The picker for `mapId` on `save`, or null where none shows: no save, not a campaign map, or a
 * map not won yet (modifiers unlock on Victory).
 */
export function veteranPickerView(
  save: SaveData | null,
  mapId: string | null,
): VeteranPickerView | null {
  const id = campaignMap(mapId);
  if (save === null || id === null) return null;
  const offers = veteranOffers(save, RAW_CONTENT.maps[id]);
  if (offers.length === 0) return null;
  const record = veteranRecord(save, id);
  const picked = record?.mods ?? [];
  const rows = offers.map((o): VeteranRowView => {
    const copy = VETERAN_COPY[o.id];
    return {
      id: o.id,
      name: copy.name,
      short: copy.short,
      effect: copy.effect,
      quip: copy.quip,
      bonus: VETERAN_BONUS_PCT[o.id],
      on: o.available && picked.includes(o.id),
      available: o.available,
      why: o.why,
    };
  });
  const total = rows.reduce((sum, r) => sum + (r.on ? r.bonus : 0), 0);
  const medals = save.campaign.maps[id]?.medals ?? [];
  return {
    mapId: id,
    rows,
    total,
    medal: {
      held: hasVeteranMedal(medals),
      reached: total >= VETERAN_MEDAL_PCT,
      at: VETERAN_MEDAL_PCT,
    },
    best: record?.best ?? 0,
  };
}

/**
 * Turns `id` on or off on `mapId` for the save in play (the picker's toggle) and writes the save.
 * A dimmed modifier never toggles. Returns whether the pick changed.
 */
export function toggleVeteran(mapId: string, id: VeteranModifierId): boolean {
  const save = activeSave();
  const view = veteranPickerView(save, mapId);
  if (save === null || view === null) return false;
  const row = view.rows.find((r) => r.id === id);
  if (row === undefined || !row.available) return false;
  const on = view.rows.filter((r) => r.on).map((r) => r.id);
  const next = row.on ? on.filter((m) => m !== id) : [...on, id];
  const result = updateActiveSave((s) => withVeteranPick(s, view.mapId, next));
  if (!result.ok) logError(`veteran: ${result.message}`);
  return true;
}

/** Results' medal row for the Veteran medal when the run's modifiers reach +100%, else none. */
export function veteranMedalOffered(cfg: SimConfig<IdSpace>): MapMedal[] {
  return earnsVeteranMedal(veteranModsOf(cfg))
    ? [{ id: VETERAN_MEDAL_ID, name: VETERAN_MEDAL_NAME }]
    : [];
}
