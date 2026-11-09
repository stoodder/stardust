// The one door for screen changes from the UI (the menu and Results buttons), the way commands.ts
// is for battle actions: components call these, never the router directly. Save actions that
// change screens (New game, Continue, Load, Import) go through here too; the rest are app/save.ts.
import type { SaveData, SlotId } from '../meta/index.ts';
import { logError } from './log.ts';
import type { Router } from './router.ts';
import {
  continueSlot,
  firstEmptySlot,
  hasAnySave,
  importInto,
  newGame as newSave,
  nextMapId,
  openSlot,
  systemOpen,
  type SaveResult,
} from './save.ts';

let router: Router | null = null;

/** Points navigation at the app's router (boot.ts). */
export function setNavigator(next: Router | null): void {
  router = next;
}

function run(what: string, go: (r: Router) => Promise<void>): void {
  if (router === null) return;
  go(router).catch((err: unknown) => {
    logError(`navigation: ${what} failed`, err);
  });
}

/** Opens a map's battle (with its briefing): the Shift board's Start. */
export function playMap(mapId: string): void {
  run('play', (r) => r.goto('battle', { mapId }));
}

/** Plays the save's next map, or shows the Shift board when there is none. */
function playNext(): void {
  const next = nextMapId();
  if (next === null) toCampaign();
  else playMap(next);
}

/**
 * Title → Start shift (no saves yet): a new campaign in the first empty slot, straight into its
 * first map's briefing. With saves, Title offers New game (a slot pick) instead.
 */
export function startGame(): SaveResult {
  if (hasAnySave()) return { ok: false, message: 'Pick a slot for the new campaign.' };
  const slot = firstEmptySlot();
  if (slot === null) return { ok: false, message: 'Every slot is taken.' };
  return newGame(slot);
}

/** Title → New game → a slot: a new campaign there, into its first map's briefing. */
export function newGame(slot: SlotId): SaveResult {
  const r = newSave(slot);
  if (r.ok) playNext();
  return r;
}

/** Title → Continue: the slot written last, on its Shift board. */
export function continueGame(): SaveResult {
  const slot = continueSlot();
  if (slot === null) return { ok: false, message: 'No save to continue.' };
  return loadGame(slot);
}

/** Title → Load → a slot: that campaign's Shift board. */
export function loadGame(slot: SlotId): SaveResult {
  const r = openSlot(slot);
  if (r.ok) toCampaign();
  return r;
}

/** Import → a slot (the player confirmed any overwrite): that campaign's Shift board. */
export function importGame(slot: SlotId, save: SaveData): SaveResult {
  const r = importInto(slot, save);
  if (r.ok) toCampaign();
  return r;
}

/** The Shift board of the save in play. */
export function toCampaign(): void {
  run('campaign', (r) => r.goto('campaign'));
}

/** The base (R&D, Shop, Engineering), once it's open. */
export function toBase(): void {
  run('base', (r) => r.goto('base'));
}

/** Results → Continue after a win: the base if it's open, else the Shift board. */
export function afterWin(): void {
  if (systemOpen('base')) toBase();
  else toCampaign();
}

/** Opens Settings; Back returns to the menu it was opened from. */
export function openSettings(): void {
  run('settings', (r) => r.goto('settings'));
}

/** Settings → Back. */
export function closeSettings(): void {
  run('settings back', (r) => r.closeSettings());
}

/** Results → Retry: replays the last battle's map. */
export function retryRun(): void {
  run('retry', (r) => r.retry());
}

/** Back to the Title (leaves the save in play). */
export function toTitle(): void {
  run('title', (r) => r.goto('title'));
}
