// The prelude, "Arrival" (T1001; design/core-loop.md § 1 and § 6.1; story-runtime.md § Dialogue in
// play): `a1_m01_scene_prelude`, full-screen between New game and the New Hire Intake. It plays
// once per new campaign: never on Continue, Load, or Import; held as seen in memory once it has
// started (Back → Title → Start shift goes straight to the intake), and written to `story.seen`
// as the intake is signed (app/profile.ts). With dialogue off it doesn't play; `?test=1` turns it
// off unless `&prelude=1` (boot.ts). Settings' "Watch the arrival" replays it over the screen
// it's opened from, saving nothing. Its stage is its own lazy chunk (app/acts/preludeUi.ts).
import { sceneById } from '../content/dialogue/index.ts';
import { PRELUDE_SCENE } from '../ui/screens/prelude.ts';
import { intakeRises, preludeUi } from '../ui/screens/preludeState.ts';
import { dialogueEnabled, playScene } from './dialogue.ts';

let enabled = true;
let heldSeen = false;

/** Whether a new campaign plays the prelude (on for players; `?test=1` without `&prelude=1`: off). */
export function setPreludeEnabled(on: boolean): void {
  enabled = on;
}

/**
 * Holds the prelude as seen in memory (true as it starts; false once a campaign's intake is
 * signed, since the save then has it in `story.seen`, so the next new campaign plays it again).
 */
export function holdPreludeSeen(seen: boolean): void {
  heldSeen = seen;
}

/** Whether New game plays the prelude before the intake now. */
export function preludeBeforeIntake(): boolean {
  return enabled && dialogueEnabled() && !heldSeen && sceneById(PRELUDE_SCENE) !== undefined;
}

let pending: Promise<void> | null = null;

/** Loads the prelude's stage, once (a failed fetch may be retried by the next call). */
export function loadPreludeScreens(): Promise<void> {
  if (preludeUi.value !== null) return Promise.resolve();
  pending ??= import('./acts/preludeUi.ts').then(
    () => undefined,
    (err: unknown) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}

/**
 * Plays the prelude full-screen over the screen in play, its stage loaded first; resolves as it
 * closes (played out, or skipped). It saves nothing as it ends (the intake's signing does); a
 * missing scene resolves at once. `toIntake`: the intake opens off its last line (it rises).
 */
export function playPrelude(opts: { readonly toIntake: boolean }): Promise<void> {
  const scene = sceneById(PRELUDE_SCENE);
  if (scene === undefined) return Promise.resolve();
  return loadPreludeScreens().then(
    () =>
      new Promise<void>((resolve) => {
        playScene(scene, {
          mode: 'fullscreen',
          record: false,
          onEnd: () => {
            if (opts.toIntake) intakeRises.value = true;
            resolve();
          },
        });
      }),
  );
}
