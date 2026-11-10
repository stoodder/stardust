// The save session (tech/meta-runtime.md § The app's save session): which campaign is in play,
// its slot, and every read and write of it, through meta/'s save API over a localStorage
// KeyValueStore. It keeps the menus' view models (ui/screens/state.ts: `campaign`, `slots`) in
// step. The dev hook `?test=1&save=<id>` plays a dev save in an in-memory scratch slot that never
// touches localStorage, with the dev save's `devUnlocks`.
import { CAMPAIGN, CAMPAIGN_PLAN } from '../content/campaign.ts';
import { MAPS } from '../content/maps/index.ts';
import type { MapId } from '../content/types.ts';
import { DEV_SAVES, type DevSaveId } from '../meta/__fixtures__/devSaves.ts';
import {
  type HintId,
  type ImportProblemCode,
  type KeyValueStore,
  type LoadoutPick,
  type MetaSystem,
  type Offer,
  type PurchaseItem,
  type Refusal,
  type StorePane,
  type RunEndInput,
  type RunEndSummary,
  type SaveData,
  type SlotId,
  type SlotLoad,
  type SlotWrite,
  MemoryStore,
  SAVE_KEYS,
  buy,
  createNewSave,
  deleteSlot,
  exportCode,
  getLastSlot,
  hintSeen,
  importCode,
  isSystemUnlocked,
  listSlots,
  loadSlot,
  newlyIssuedTowers,
  newTowerHint,
  nextShift,
  onStarMap,
  runEnd,
  shelf,
  SHIFT_BOARD_SIZE,
  shiftBoard,
  showsLoadoutScreen,
  starMapEntries,
  unlockHint,
  withHintsSeen,
  withIssuedTowers,
  withPreset,
  writeSlot,
} from '../meta/index.ts';
import {
  campaign,
  menuNotice,
  slots,
  type CampaignView,
  type Difficulty,
  type ProfileView,
  type ShiftView,
  type SlotView,
  type SystemView,
} from '../ui/screens/state.ts';
import { assertNever } from '../shared/types.ts';
import { logError } from './log.ts';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** localStorage as a KeyValueStore. Reads and removes never throw; `set` may (quota, privacy). */
export function browserKeyValueStore(): KeyValueStore {
  return {
    get(key) {
      try {
        return storage()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set(key, value) {
      const s = storage();
      if (s === null) throw new Error('storage is unavailable');
      s.setItem(key, value);
    },
    remove(key) {
      try {
        storage()?.removeItem(key);
      } catch {
        // Nothing to do: the key stays, and the next read shows it.
      }
    },
  };
}

interface Session {
  readonly store: KeyValueStore;
  readonly slot: SlotId;
  /** The dev hook's in-memory slot: never written to the browser's storage. */
  readonly scratch: boolean;
  readonly devUnlocks: readonly MetaSystem[];
  save: SaveData;
}

let store: KeyValueStore = new MemoryStore();
let clock: () => number = () => Date.now();
let session: Session | null = null;

/** Points the saves at their storage and clock (boot: localStorage and Date.now; tests: memory). */
export function initSaves(next: KeyValueStore, now: () => number = () => Date.now()): void {
  store = next;
  clock = now;
  session = null;
  refresh();
}

/** The save in play, or null (on the Title, or in a dev battle opened by `?map=`). */
export function activeSave(): SaveData | null {
  return session?.save ?? null;
}

/** True when `system` is open for the save in play (its map is won, or the dev hook opens it). */
export function systemOpen(system: MetaSystem): boolean {
  return session !== null && isSystemUnlocked(session.save, system, session.devUnlocks);
}

/** The Shift board's next map for the save in play (the first open one), or null. */
export function nextMapId(): string | null {
  return session === null ? null : (nextShift(shiftBoard(session.save))?.id ?? null);
}

/** True when a save exists in any slot (the Title offers Continue and Load). */
export function hasAnySave(): boolean {
  return slots.value.some((s) => s.status !== 'empty');
}

/** The first empty slot, or null when all three hold something. */
export function firstEmptySlot(): SlotId | null {
  return slots.value.find((s) => s.status === 'empty')?.slot ?? null;
}

/** The slot written last, if it still holds a readable save. */
export function continueSlot(): SlotId | null {
  const last = getLastSlot(store);
  return last !== null && slots.value.find((s) => s.slot === last)?.status === 'ok' ? last : null;
}

export type SaveResult = { ok: true } | { ok: false; message: string };

const WRITE_FAILED =
  "Records couldn't file that (the browser refused to store it). Your progress is safe for " +
  'this session; export a code from Settings to keep it.';

function writeFailure(w: Exclude<SlotWrite, { ok: true }>): SaveResult {
  logError(`save: write failed (${w.code}): ${w.message}`, w.errors);
  return { ok: false, message: WRITE_FAILED };
}

/** Writes the save in play to its slot (and refreshes the views). */
function persist(): SaveResult {
  if (session === null) return { ok: false, message: 'No save is loaded.' };
  const w = writeSlot(session.store, session.slot, session.save, clock());
  refresh();
  return w.ok ? { ok: true } : writeFailure(w);
}

/** Whether `slot` holds nothing (New game may start there). */
export function slotEmpty(slot: SlotId): boolean {
  return loadSlot(store, slot).status === 'empty';
}

/**
 * Starts a new campaign in an empty slot and makes it the save in play. `init` fills in the new
 * save before its first write (the intake's profile, app/profile.ts).
 */
export function newGame(slot: SlotId, init?: (save: SaveData) => SaveData): SaveResult {
  if (!slotEmpty(slot)) {
    return { ok: false, message: `Slot ${slot} is taken. Pick an empty one!` };
  }
  const fresh = createNewSave();
  session = {
    store,
    slot,
    scratch: false,
    devUnlocks: [],
    save: init === undefined ? fresh : init(fresh),
  };
  menuNotice.value = null;
  return persist();
}

/** Loads a slot and makes it the save in play. */
export function openSlot(slot: SlotId): SaveResult {
  const load = loadSlot(store, slot);
  if (load.status !== 'ok') {
    return {
      ok: false,
      message:
        load.status === 'empty'
          ? `Slot ${slot} is empty.`
          : `Slot ${slot} couldn't be read. Copy its raw data to keep it safe.`,
    };
  }
  session = { store, slot, scratch: false, devUnlocks: [], save: withIssuedTowers(load.save) };
  menuNotice.value = null;
  refresh();
  return { ok: true };
}

/**
 * Loads a dev save into the in-memory scratch slot (`?test=1&save=<id>` only: boot checks the
 * flag). Its `devUnlocks` open the gated systems. False for an unknown id.
 */
export function loadDevSave(id: string): boolean {
  if (!isDevSaveId(id)) return false;
  const dev = DEV_SAVES[id];
  const scratch = new MemoryStore();
  session = {
    store: scratch,
    slot: 1,
    scratch: true,
    devUnlocks: dev.devUnlocks ?? [],
    save: withIssuedTowers(dev.build()),
  };
  menuNotice.value = null;
  const w = writeSlot(scratch, 1, session.save, clock());
  if (!w.ok) logError(`save: dev save '${id}' failed to write`, w.errors);
  refresh();
  return true;
}

function isDevSaveId(id: string): id is DevSaveId {
  return Object.hasOwn(DEV_SAVES, id);
}

/** Leaves the save in play (back to the Title). */
export function closeSession(): void {
  session = null;
  menuNotice.value = null;
  refresh();
}

/** What a run end paid, and whether the slot write held. */
export interface RecordedRun extends RunEndSummary {
  /** The slot write failed: the run holds for this session only (the message says so). */
  readonly writeFailed: string | null;
  /**
   * Where the Stardust goes, while it can't be spent yet (paid > 0 and Zibzab's shop still
   * locked): the payroll's Stardust line adds it (G8). Null otherwise.
   */
  readonly stardustNote: string | null;
}

/** The payroll's note on Stardust paid before the shop opens (style-guide.md § 2). */
export function stardustNoteText(): string {
  return `Banked for Zibzab's shop. ${unlockHint('shop')}.`;
}

/**
 * Ends a run in the save in play (meta-runtime.md § Run end: Pests Processed, medals, rewards) and
 * writes it. Returns what the run paid with the write's status, or null without a save or for a
 * non-campaign map (a `?map=` dev battle), which leave no record. A failed write is logged; the
 * session keeps the new save, and Results says so.
 */
export function recordRun(
  input: Omit<RunEndInput, 'mapId'> & { readonly mapId: string },
): RecordedRun | null {
  if (session === null || !isCampaignMap(input.mapId)) return null;
  const { save, summary } = runEnd(session.save, { ...input, mapId: input.mapId });
  session.save = save;
  const w = persist();
  const unspendable = summary.stardust.amount > 0 && !systemOpen('shop');
  return {
    ...summary,
    writeFailed: w.ok ? null : w.message,
    stardustNote: unspendable ? stardustNoteText() : null,
  };
}

function isCampaignMap(id: string): id is MapId {
  const campaignMaps: readonly string[] = CAMPAIGN;
  return campaignMaps.includes(id);
}

/**
 * Replaces the save in play with `update(save)` and writes it (the intake and Settings' profile,
 * app/profile.ts). A failed write is logged; the session keeps the new save, and the message says so.
 */
export function updateActiveSave(update: (save: SaveData) => SaveData): SaveResult {
  if (session === null) return { ok: false, message: 'No save is loaded.' };
  session.save = update(session.save);
  return persist();
}

/** Sets the campaign's difficulty (Settings; any time between maps, progression.md § 9). */
export function setDifficulty(difficulty: Difficulty): SaveResult {
  if (session === null) return { ok: false, message: 'Load a save to choose its difficulty.' };
  if (session.save.settings.difficulty === difficulty) return { ok: true };
  session.save = { ...session.save, settings: { ...session.save.settings, difficulty } };
  return persist();
}

/**
 * Whether the loadout screen comes before `mapId` for the save in play (meta/loadout.ts: the
 * system is open and there's a choice to make). Never for a non-campaign map (a `?map=` battle).
 */
export function loadoutOffered(mapId: string): boolean {
  return (
    session !== null && isCampaignMap(mapId) && showsLoadoutScreen(session.save, session.devUnlocks)
  );
}

/** Remembers a locked-in loadout as `mapId`'s preset and the last one (T201), and writes it. */
export function rememberLoadout(mapId: string, pick: LoadoutPick): SaveResult {
  if (session === null) return { ok: false, message: 'No save is loaded.' };
  if (!isCampaignMap(mapId)) return { ok: false, message: `'${mapId}' is not a campaign map.` };
  session.save = withPreset(session.save, mapId, pick);
  return persist();
}

/** Whether the save in play has shown `hint` (meta/hints.ts); false without a save. */
export function hintShown(hint: HintId): boolean {
  return session !== null && hintSeen(session.save, hint);
}

/** The loadout's newly issued towers for the save in play (meta/hints.ts); none without one. */
export function newTowersIn(loadout: readonly string[]): string[] {
  return session === null ? [] : newlyIssuedTowers(session.save, loadout);
}

/**
 * Marks `hints` shown in the save in play and writes it (once each; nothing without a save). A
 * failed write is logged (persist) and otherwise harmless: the session keeps the hints.
 */
export function markHintsShown(hints: readonly HintId[]): void {
  if (session === null) return;
  const next = withHintsSeen(session.save, hints);
  if (next === session.save) return;
  session.save = next;
  persist();
}

/** Marks the loadout's newly issued towers as fielded (their `new:` hints) in the save in play. */
export function markNewTowersShown(loadout: readonly string[]): void {
  if (session === null) return;
  markHintsShown(newlyIssuedTowers(session.save, loadout).map(newTowerHint));
}

/** One base pane's offers for the save in play (empty without one). */
export function storeShelf(pane: StorePane): Offer[] {
  return session === null ? [] : shelf(session.save, pane, session.devUnlocks);
}

/** A purchase at the base: what was bought (and whether the write held), or why not. */
export type PurchaseResult =
  | {
      readonly ok: true;
      readonly offer: Offer;
      /** The slot write failed: the purchase holds for this session only (the message says so). */
      readonly writeFailed: string | null;
    }
  | { readonly ok: false; readonly reason: Refusal; readonly message: string };

/**
 * Buys `item` for the save in play (meta/purchase.ts: pane open, stocked, next rank, affordable)
 * and writes the save at once (meta-runtime.md § Save system: after purchases).
 */
export function purchase(item: PurchaseItem): PurchaseResult {
  if (session === null) return { ok: false, reason: 'unknown', message: 'No save is loaded.' };
  const r = buy(session.save, item, session.devUnlocks);
  if (!r.ok) return r;
  session.save = r.save;
  const w = persist();
  return { ok: true, offer: r.offer, writeFailed: w.ok ? null : w.message };
}

/** The save in play as an SD code (Settings → Export). */
export async function exportActive(): Promise<string | null> {
  if (session === null) return null;
  return exportCode(session.save, clock());
}

/** A checked import: the save to write, or a message in Everglow's voice. */
export type ImportCheck =
  | { ok: true; save: SaveData; summary: string }
  | { ok: false; code: ImportProblemCode; message: string };

/**
 * Why a code didn't import, in the Act I voice: cheerful, never scolding (story/style-guide.md).
 * The fault is always the transport's, never the player's.
 */
export const IMPORT_MESSAGES: Readonly<Record<ImportProblemCode, string>> = {
  format: "That doesn't look like a shift code (they start with SD). Try copying it again!",
  checksum: 'A few characters got lost in transit. Copy the whole code and paste it again!',
  too_new: 'This code comes from a newer Everglow build. Update the game, then try again!',
  too_large: 'That code is far too big to be a shift record. Paste a fresh copy!',
  corrupt: 'This code got scrambled along the way. Paste a fresh copy!',
  json: 'This code got scrambled along the way. Paste a fresh copy!',
  bad_version: 'This code got scrambled along the way. Paste a fresh copy!',
  migration_failed: "Records couldn't update this code to the current format. Sorry about that!",
  invalid: "The paperwork in this code doesn't add up, so Records can't file it. Try a fresh copy!",
};

/** Checks a pasted code (Title → Import, Settings → Import). Never throws. */
export async function checkImport(text: string): Promise<ImportCheck> {
  if (text.trim() === '') {
    return { ok: false, code: 'format', message: 'Paste a shift code first!' };
  }
  const r = await importCode(text);
  if (!r.ok) {
    if (r.errors.length > 0) logError(`save: import refused (${r.code}): ${r.message}`, r.errors);
    return { ok: false, code: r.code, message: IMPORT_MESSAGES[r.code] };
  }
  return { ok: true, save: r.save, summary: summarize(r.save).progress };
}

/**
 * Writes an imported save into a slot (the player confirmed any overwrite) and makes it the save
 * in play. The old value rotates into the slot's backup.
 */
export function importInto(slot: SlotId, save: SaveData): SaveResult {
  const caughtUp = withIssuedTowers(save);
  const w = writeSlot(store, slot, caughtUp, clock());
  if (!w.ok) {
    refresh();
    return writeFailure(w);
  }
  session = { store, slot, scratch: false, devUnlocks: [], save: caughtUp };
  menuNotice.value = null;
  refresh();
  return { ok: true };
}

/** Deletes a slot and its backup (Load → Delete, confirmed by the player). */
export function deleteSave(slot: SlotId): void {
  deleteSlot(store, slot);
  if (session !== null && !session.scratch && session.slot === slot) session = null;
  refresh();
}

/** The raw text of an unreadable slot, for "Copy raw data". */
export function rawSlotText(slot: SlotId): string | null {
  return store.get(SAVE_KEYS.slot(slot)) ?? store.get(SAVE_KEYS.bak(slot));
}

// ── Views ────────────────────────────────────────────────────────────────────────────────────

function summarize(save: SaveData): { progress: string; mapsWon: number } {
  // The next map to play: the Shift board's, or the star map's frontier once it shows (D102).
  const next = onStarMap(save)
    ? starMapEntries(save).find((e) => e.state === 'open')
    : shiftBoard(save).find((e) => e.state === 'open');
  const mapsWon = Object.values(save.campaign.maps).filter(
    (m) => m !== undefined && m.completed,
  ).length;
  const progress =
    next !== undefined
      ? `Shift ${next.index} · ${next.name}`
      : `${mapsWon} shift${mapsWon === 1 ? '' : 's'} cleared`;
  return { progress, mapsWon };
}

function slotView(slot: SlotId, load: SlotLoad): SlotView {
  switch (load.status) {
    case 'empty':
      return { slot, status: 'empty' };
    case 'ok': {
      const { progress, mapsWon } = summarize(load.save);
      return {
        slot,
        status: 'ok',
        progress,
        mapsWon,
        stardust: load.save.currencies.stardust,
        intel: load.save.currencies.intel,
        savedAt: load.savedAt,
        fromBackup: load.source === 'bak',
      };
    }
    case 'unreadable':
      return { slot, status: 'unreadable', raw: load.mainRaw ?? load.bakRaw ?? '' };
    default:
      return assertNever(load);
  }
}

function profileView(save: SaveData): ProfileView | null {
  const p = save.profile;
  if (p === null) return null;
  const arrival = save.story.flags.arrival_reason;
  return {
    name: p.name,
    pronouns: p.pronouns,
    callsign: p.callsign,
    arrival: arrival === 'bonus' || arrival === 'family' || arrival === 'lettuce' ? arrival : null,
  };
}

function systemView(s: Session, id: MetaSystem): SystemView {
  return { unlocked: isSystemUnlocked(s.save, id, s.devUnlocks), hint: unlockHint(id, s.save) };
}

/**
 * The Shift board's dimmed, padlocked sixth row (D097 R6, D102): the plan's next map after Act I,
 * so the board never ends in a dead end. It never names its map (the star map names Rig Nine
 * once A1M5 is won): "Shift 6 · Coming soon" while that map isn't built, "Shift 6 · Locked" once
 * it is. None once the plan runs out.
 */
export function teaserRow(
  size: number = SHIFT_BOARD_SIZE,
  registered: (id: string) => boolean = (id) => Object.hasOwn(MAPS, id),
): ShiftView[] {
  const next = CAMPAIGN_PLAN[size];
  if (next === undefined) return [];
  return [
    {
      id: next.id,
      name: '',
      index: size + 1,
      state: registered(next.id) ? 'locked' : 'coming_soon',
      medals: 0,
      teaser: true,
    },
  ];
}

function campaignView(s: Session): CampaignView {
  return {
    // The star map replaces the Shift board, for good, once Act I is won (D102).
    mode: onStarMap(s.save) ? 'starMap' : 'shiftBoard',
    slot: s.scratch ? null : s.slot,
    stardust: s.save.currencies.stardust,
    intel: s.save.currencies.intel,
    pestsProcessed: s.save.stats.pestsProcessed,
    difficulty: s.save.settings.difficulty,
    profile: profileView(s.save),
    board: [
      ...shiftBoard(s.save).map((e): ShiftView => ({
        id: e.id,
        name: e.name,
        index: e.index,
        state: e.state,
        medals: e.medals.length,
        teaser: false,
      })),
      ...teaserRow(),
    ],
    systems: {
      base: systemView(s, 'base'),
      rnd: systemView(s, 'rnd'),
      shop: systemView(s, 'shop'),
      engineering: systemView(s, 'engineering'),
    },
  };
}

/** Rebuilds the menus' view models from storage and the session. */
function refresh(): void {
  slots.value = listSlots(store).map(({ slot, load }) => slotView(slot, load));
  campaign.value = session === null ? null : campaignView(session);
}
