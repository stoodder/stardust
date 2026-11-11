// The forced single input in the app (design/core-loop.md § 2.11: A3M3's SEAL; T605's hook, T614's
// screen). The HUD's `forcedInput` follows the sim's pending input (ForcedInputRequested /
// ForcedInputResolved, and the state as the battle binds). While it waits:
// - **Armed late.** Its one button takes no press for ARM_DELAY_MS, and after that only from a
//   key-down or pointer-down that began after it armed (`pressAccepted`), so a key held or mashed
//   through the cue, or a click already on its way, can't seal the door.
// - **Every control locked.** The HUD is inert but for the Menu and the speaker (ui/hud/index.tsx),
//   a veil takes clicks off the playfield, and the keys go through `sealKey` first (a capture
//   listener ahead of app/keys.ts): Enter or Space press the button (it has the focus), Esc opens
//   the pause menu, M mutes, Tab moves between the three, and every other game key is held back.
//   With the pause menu or a scene open, keys go to them.
// - **The line after 20 s.** A story timer on real time (never sim ticks), started as the input is
//   requested and running only while it shows (not under the pause menu, not in a hidden tab), plays
//   the map's `<map>_cue_<id>_wait` scene once after WAIT_LINE_MS (A3M3: Bricks's "Kid. It's okay.").
// - **The hum.** HUM_SFX re-struck every HUM_EVERY_MS of real time while it waits (a sound the
//   registry doesn't have yet plays nothing; T650 makes it).
// A press issues the `scriptInput` command, so the moment is in the command log like any other;
// the sim rejects every other command while it waits (sim/forcedInput.ts), with no notice.
import { effect } from '@preact/signals';
import { SCENES } from '../content/dialogue/index.ts';
import type { IdSpace } from '../content/types.ts';
import { isSfxId } from '../audio/index.ts';
import { sceneBlocks } from '../ui/dialogue/state.ts';
import { forcedInput, forcedInputArmed } from '../ui/hud/forcedInputState.ts';
import { pauseMenu } from '../ui/pause/state.ts';
import { playSfx } from './audio.ts';
import { cancel, issue } from './commands.ts';
import { dialogueEnabled, playScene } from './dialogue.ts';
import type { Host } from './host.ts';

/** How long the button waits before it takes a press (ms; D141's 700 ms, as C3's options). */
export const ARM_DELAY_MS = 700;
/** Real time before the waiting line plays (ms; act3.md § A3M3: "After 20 s, once"). */
export const WAIT_LINE_MS = 20_000;
/** The hum's sound and how often it is struck again while the input waits (ms). */
export const HUM_SFX = 'door_hum';
export const HUM_EVERY_MS = 3000;

/** The scene the waiting line plays: `<map>_cue_<input>_wait` (A3M3: `a3_m03_cue_seal_wait`). */
export function waitSceneId(map: string, input: string): string {
  return `${map}_cue_${input}_wait`;
}

/**
 * Whether a press counts: from a down (key or pointer) at `downAt` that began once the button armed
 * (`shownAt + ARM_DELAY_MS`) and isn't a key's auto-repeat; a click with no down behind it (a
 * screen reader's) counts once the button is armed `now`.
 */
export function pressAccepted(p: {
  readonly shownAt: number;
  readonly downAt: number | null;
  readonly now: number;
  readonly repeat?: boolean;
}): boolean {
  const armedAt = p.shownAt + ARM_DELAY_MS;
  if (p.repeat === true) return false;
  return p.downAt === null ? p.now >= armedAt : p.downAt >= armedAt;
}

/** What a key-down does while the input waits (`sealKey`). */
export type SealKeyAction =
  /** Enter or Space: a press (`pressAccepted` decides whether it lands). */
  | 'press'
  /** Let it through untouched (Esc, M, Tab, browser keys; anything while a menu or scene is up). */
  | 'pass'
  /** A focused Menu or speaker button acts on it itself; the game's binding doesn't. */
  | 'native'
  /** A game key: held back. */
  | 'block';

/** The key-down's part of the lock: see the header. `onOther` is focus on another live button. */
export function sealKey(
  e: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'altKey'>,
  ctx: { readonly menuOrScene: boolean; readonly onOther: boolean },
): SealKeyAction {
  if (ctx.menuOrScene || e.ctrlKey || e.metaKey || e.altKey) return 'pass';
  const { code } = e;
  if (code === 'Escape' || code === 'KeyM' || code === 'Tab' || /^F\d+$/.test(code)) return 'pass';
  if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
    return ctx.onOther ? 'native' : 'press';
  }
  return 'block';
}

/** What the SEAL's clocks do in the world: injectable for the unit tests. */
export interface SealDeps {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(id: unknown): void;
  /** Plays the waiting line's scene, if the map has one (once). */
  playWaitLine(map: string, input: string): void;
  /** Strikes the hum once. */
  hum(): void;
  /** Issues the press. */
  press(input: string): void;
  /** Whether the waiting line's clock runs now (no pause menu up, the tab shown). */
  clockRuns(): boolean;
}

const defaultDeps: SealDeps = {
  now: () => performance.now(),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (id) => globalThis.clearTimeout(id as ReturnType<typeof globalThis.setTimeout>),
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: (id) => globalThis.clearInterval(id as ReturnType<typeof globalThis.setInterval>),
  playWaitLine(map, input) {
    const scene = SCENES[waitSceneId(map, input)];
    if (scene !== undefined && dialogueEnabled()) playScene(scene);
  },
  hum() {
    if (isSfxId(HUM_SFX)) playSfx(HUM_SFX);
  },
  press(input) {
    issue({ type: 'scriptInput', id: input });
  },
  clockRuns: () =>
    !pauseMenu.value && (typeof document === 'undefined' || document.visibilityState !== 'hidden'),
};

/** One forced input on screen: its arming, its waiting line's clock, and its hum. */
export interface Seal {
  readonly input: string;
  readonly shownAt: number;
  /** Whether the waiting line has played. */
  readonly waited: boolean;
  /** Real time the waiting line's clock has run (ms). */
  waitedMs(): number;
  /** A pointer went down on the button. */
  pointerDown(): void;
  /** The button was clicked (by the pointer that went down, or a screen reader): maybe a press. */
  click(): boolean;
  /** Enter or Space went down: maybe a press. */
  keyPress(repeat: boolean): boolean;
  /** The pause menu opened or closed, or the tab hid or showed: re-check the clock. */
  clockChanged(): void;
  /** Stops every timer. */
  stop(): void;
}

/** Shows forced input `input` on map `map` (app state is left to the caller). */
export function startSeal(map: string, input: string, deps: SealDeps = defaultDeps): Seal {
  const shownAt = deps.now();
  let downAt: number | null = null;
  let pressed = false;
  let waited = false;
  let ranMs = 0;
  let runningSince: number | null = null;
  let waitTimer: unknown = null;
  forcedInputArmed.value = false;
  const armTimer = deps.setTimeout(() => {
    forcedInputArmed.value = true;
  }, ARM_DELAY_MS);
  deps.hum();
  const humTimer = deps.setInterval(() => deps.hum(), HUM_EVERY_MS);

  const pauseClock = (): void => {
    if (runningSince !== null) ranMs += deps.now() - runningSince;
    runningSince = null;
    if (waitTimer !== null) deps.clearTimeout(waitTimer);
    waitTimer = null;
  };
  const runClock = (): void => {
    if (waited || runningSince !== null) return;
    runningSince = deps.now();
    waitTimer = deps.setTimeout(
      () => {
        waitTimer = null;
        pauseClock();
        waited = true;
        deps.playWaitLine(map, input);
      },
      Math.max(0, WAIT_LINE_MS - ranMs),
    );
  };
  const tryPress = (accepted: boolean): boolean => {
    if (!accepted || pressed) return false;
    pressed = true;
    deps.press(input);
    return true;
  };
  if (deps.clockRuns()) runClock();

  return {
    input,
    shownAt,
    get waited() {
      return waited;
    },
    waitedMs: () => ranMs + (runningSince === null ? 0 : deps.now() - runningSince),
    pointerDown() {
      downAt = deps.now();
    },
    click() {
      const down = downAt;
      downAt = null;
      return tryPress(pressAccepted({ shownAt, downAt: down, now: deps.now() }));
    },
    keyPress(repeat) {
      const now = deps.now();
      return tryPress(pressAccepted({ shownAt, downAt: now, now, repeat }));
    },
    clockChanged() {
      if (deps.clockRuns()) runClock();
      else pauseClock();
    },
    stop() {
      deps.clearTimeout(armTimer);
      deps.clearInterval(humTimer);
      pauseClock();
      forcedInputArmed.value = false;
    },
  };
}

/** The forced input on screen now (the button and the key lock act through it). */
let current: Seal | null = null;

/** The seal on screen, for the button (ui/hud/ForcedInputButton.tsx). */
export function currentSeal(): Seal | null {
  return current;
}

/** The capture-phase key lock (see the header), ahead of app/keys.ts's window listener. */
function onKeyDown(e: KeyboardEvent): void {
  const seal = current;
  if (seal === null) return;
  const focused = document.activeElement;
  const onOther =
    focused instanceof HTMLButtonElement && focused.dataset['testid'] !== 'forced-input';
  const action = sealKey(e, { menuOrScene: pauseMenu.value || sceneBlocks.value, onOther });
  if (action === 'pass') return;
  e.stopPropagation();
  if (action === 'native') return;
  e.preventDefault();
  if (action === 'press') seal.keyPress(e.repeat);
}

/** Keeps the HUD's `forcedInput` in sync with `host`'s sim; returns the unbind. */
export function bindForcedInput(host: Host<IdSpace>, deps: SealDeps = defaultDeps): () => void {
  const map = host.sim.map.id;
  const show = (id: string): void => {
    if (current?.input === id) return;
    current?.stop();
    // Nothing armed, aimed, or selected under the lock: Esc goes straight to the pause menu.
    cancel();
    current = startSeal(map, id, deps);
    forcedInput.value = id;
  };
  const hide = (): void => {
    current?.stop();
    current = null;
    forcedInput.value = null;
  };
  if (host.sim.state.pendingInput !== null) show(host.sim.state.pendingInput);
  const offs = [
    host.bus.on('ForcedInputRequested', (e) => show(e.id)),
    host.bus.on('ForcedInputResolved', hide),
    // The waiting line's clock stops under the pause menu.
    effect(() => {
      void pauseMenu.value;
      current?.clockChanged();
    }),
  ];
  const onVisibility = (): void => current?.clockChanged();
  const win = typeof window === 'undefined' ? null : window;
  win?.addEventListener('keydown', onKeyDown, true);
  win?.document.addEventListener('visibilitychange', onVisibility);
  return () => {
    for (const off of offs) off();
    win?.removeEventListener('keydown', onKeyDown, true);
    win?.document.removeEventListener('visibilitychange', onVisibility);
    hide();
  };
}

/**
 * Presses the pending forced input as a screen reader's click or a test hook would: once it has
 * armed (`pressAccepted` with no down). Nothing if none waits or it isn't armed yet.
 */
export function pressForcedInput(): boolean {
  return current?.click() ?? false;
}
