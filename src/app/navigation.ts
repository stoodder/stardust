// The one door for screen changes from the UI (the menu and Results buttons), the way commands.ts
// is for battle actions: components call these, never the router directly. Save actions that
// change screens (New game, Continue, Load, Import, the intake) go through here too; the rest are
// app/save.ts.
import type { SaveData, SlotId } from '../meta/index.ts';
import type { LoadoutPickView } from '../ui/screens/loadoutView.ts';
import { loadoutMapId, savePick } from './loadout.ts';
import { logError } from './log.ts';
import {
  holdNewGame,
  intakeBeforeNewGame,
  intakeMode,
  needsIntake,
  signIntake,
  type IntakeForm,
  type IntakeSubmit,
} from './profile.ts';
import { pauseMenu } from '../ui/pause/state.ts';
import type { Router } from './router.ts';
import { leaveResults } from './runFlow.ts';
import {
  activeSave,
  continueSlot,
  firstEmptySlot,
  hasAnySave,
  importInto,
  loadoutOffered,
  newGame as newSave,
  nextMapId,
  openSlot,
  slotEmpty,
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

/**
 * The Shift board's Start: a map's loadout screen when the save has a choice to make (T201),
 * else its battle (with its briefing).
 */
export function playMap(mapId: string): void {
  run('play', (r) => r.play({ mapId }));
}

/** Loadout → Lock in: remembers the pick as the map's preset, then its battle and briefing. */
export function lockInLoadout(pick: LoadoutPickView): void {
  const mapId = loadoutMapId();
  if (mapId === null) return;
  // A failed write is logged; the save in play holds the pick, so the battle still uses it.
  savePick(pick);
  run('lock in', (r) => r.goto('battle', { mapId }));
}

/** The briefing's Change loadout: back to the running map's loadout screen. */
export function changeLoadout(): void {
  run('change loadout', (r) => {
    const mapId = r.battle?.host.sim.map.id;
    return mapId === undefined ? Promise.resolve() : r.goto('loadout', { mapId });
  });
}

/**
 * Whether Results offers Change loadout for the finished run's map (T220): the save in play has a
 * choice to make there (the loadout screen's skip rule, D055).
 */
export function loadoutOfferedAfterRun(mapId: string): boolean {
  return loadoutOffered(mapId);
}

/** Results → Change loadout (T220): the finished run's map's loadout screen, then its briefing. */
export function changeLoadoutAfterRun(mapId: string): void {
  leaveResults(() => run('change loadout', (r) => r.goto('loadout', { mapId })));
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

/**
 * Title → New game → a slot: the intake (character creation, T306), then a new campaign there,
 * into its first map's briefing. The save is created when the form is signed.
 */
export function newGame(slot: SlotId): SaveResult {
  if (intakeBeforeNewGame()) {
    if (!slotEmpty(slot))
      return { ok: false, message: `Slot ${slot} is taken. Pick an empty one!` };
    holdNewGame(slot);
    run('intake', (r) => r.goto('intake'));
    return { ok: true };
  }
  const r = newSave(slot);
  if (r.ok) playNext();
  return r;
}

/**
 * Intake → Sign and submit: files the profile (app/profile.ts), then a new campaign's first map,
 * or the Shift board of the save in play. Returns the form's problems instead while it can't file.
 */
export function submitIntake(form: IntakeForm): IntakeSubmit {
  const mode = intakeMode();
  const r = signIntake(form);
  if (!r.ok) return r;
  if (mode?.kind === 'new') playNext();
  else toCampaign();
  return r;
}

/** Intake → Back: the Title (a held new game is dropped; nothing was written). */
export function cancelIntake(): void {
  holdNewGame(null);
  toTitle();
}

/** The Shift board of a save just opened, after its intake if it has no profile yet (T306). */
function toOpenedCampaign(): void {
  if (needsIntake()) run('intake', (r) => r.goto('intake'));
  else toCampaign();
}

/** Title → Continue: the slot written last, on its Shift board. */
export function continueGame(): SaveResult {
  const slot = continueSlot();
  if (slot === null) return { ok: false, message: 'No save to continue.' };
  return loadGame(slot);
}

/**
 * Title → "Resume the Long Walk" (D154; app/resume.ts): the Continue slot, straight back into its
 * pending finale run at its checkpoint (or its Shift board with the notice, when the save changed).
 */
export function resumeLongWalk(): SaveResult {
  const slot = continueSlot();
  if (slot === null) return { ok: false, message: 'No save to continue.' };
  const r = openSlot(slot);
  if (r.ok) run('resume the long walk', (nav) => nav.resumePending());
  return r;
}

/** Title → Load → a slot: that campaign's Shift board (after its intake, if it has no profile). */
export function loadGame(slot: SlotId): SaveResult {
  const r = openSlot(slot);
  if (r.ok) toOpenedCampaign();
  return r;
}

/**
 * Import → a slot (the player confirmed any overwrite): that campaign's Shift board (after its
 * intake, if it has no profile).
 */
export function importGame(slot: SlotId, save: SaveData): SaveResult {
  const r = importInto(slot, save);
  if (r.ok) toOpenedCampaign();
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
  leaveResults(() => {
    if (systemOpen('base')) toBase();
    else toCampaign();
  });
}

/** Results → the Shift board (after a loss), or the Title outside a campaign. */
export function leaveResultsTo(where: 'campaign' | 'title'): void {
  leaveResults(where === 'campaign' ? toCampaign : toTitle);
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
  leaveResults(() => run('retry', (r) => r.retry()));
}

/** Results → "Retry from wave N" (core-loop.md § 2.12): the lost run, from its latest checkpoint. */
export function retryFromCheckpoint(): void {
  leaveResults(() => run('retry from checkpoint', (r) => r.retryFromCheckpoint()));
}

/** Where the pause menu's Quit goes: the base once it's open, else the Shift board (no save: Title). */
export function quitDestination(): 'base' | 'campaign' | 'title' {
  if (activeSave() === null) return 'title';
  return systemOpen('base') ? 'base' : 'campaign';
}

/**
 * The pause menu's Retry (T316): the run ends in the save as a loss (meta-runtime.md § Run end, on
 * retry too), and the same map starts again with the same loadout, minus the briefing.
 */
export function retryFromPause(): void {
  pauseMenu.value = false;
  run('retry', (r) => {
    r.abandon();
    return r.retry();
  });
}

/** The pause menu's Quit (T316): the run ends in the save as a loss, then `quitDestination`. */
export function quitFromPause(): void {
  pauseMenu.value = false;
  run('quit', (r) => {
    r.abandon();
    return r.goto(quitDestination());
  });
}

/** Back to the Title (leaves the save in play). */
export function toTitle(): void {
  run('title', (r) => r.goto('title'));
}
