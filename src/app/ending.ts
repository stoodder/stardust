// The campaign's close (T810; design/core-loop.md § 6.8; story/campaign/finale.md § FIN): once a
// won finale's card is dismissed (app/runFlow.ts `leaveResults`), the steps app/finaleFlow.ts
// gives, in order. The first win (C5 unanswered): Sterling's farewell memo as a card, C5's scene
// full-screen (its choice commits `ending_choice` through meta's `resolveC5`, app/dialogue.ts), the
// epilogue (the cards, the counter, the credits, the final image), then the post-game star map,
// whatever way on the player picked. A later win plays only the post-game step, and only on the
// way on (Continue). "Watch the epilogue" (the post-game star map, T863) replays the epilogue.
// This is the core's half: the cues, the post-game route, and the entry points. The first win's
// close is played by app/endingPlay.ts, in the finale's screens chunk (app/acts/finUi.ts
// registers it, `registerEnding`), so none of it is in the initial JS.
import type { EndingStep } from '../content/dialogue/resultsFlow.ts';
import { ensureActs } from './actContent.ts';
import { loadFinaleScreens } from './finaleScreens.ts';
import { activeSave } from './save.ts';

/**
 * The moments the close cues its music (T850 installs the player, `setEndingCuePlayer`): the
 * counter's flip, where `dawn_major` (the jingle in a major key, hummed by many voices) starts and
 * plays under the credits and the final image; and the epilogue's end, where it lets go.
 */
export type EndingCue = 'counter_flip' | 'epilogue_end';

/** The music each cue starts (architecture.md § Audio's `dawn_major`), or null to stop. */
export const ENDING_MUSIC: Readonly<Record<EndingCue, 'dawn_major' | null>> = {
  counter_flip: 'dawn_major',
  epilogue_end: null,
};

let cuePlayer: (cue: EndingCue) => void = () => {};

/** Installs the close's cue player (T850: the audio; tests: a recorder). */
export function setEndingCuePlayer(play: (cue: EndingCue) => void): void {
  cuePlayer = play;
}

/** Cues the close's music at `cue` (the epilogue screen calls it as each moment arrives). */
export function endingCue(cue: EndingCue): void {
  cuePlayer(cue);
}

/**
 * Where the post-game step goes: the post-game star map. Until T863 builds its own screen, the
 * campaign screen, which after the finale is the star map at dawn (navigation.ts installs it).
 */
let postGameRoute: () => void = () => {};

/** Installs the post-game step's route (navigation.ts: the campaign screen). */
export function setPostGameRoute(go: () => void): void {
  postGameRoute = go;
}

/** How the close plays: whether it saves (not on the results fixture), and the way on. */
export interface EndingOptions {
  /** False on the results fixture: C5's pick drives the epilogue, nothing reaches the save. */
  readonly record: boolean;
  /** The way on is Continue: a replay's close plays only then. */
  readonly onward: boolean;
}

/** Whether `steps` are a first win's close (C5 to ask), not a replay's. */
export function asksC5(steps: readonly EndingStep[]): boolean {
  return steps.some((s) => 'scene' in s);
}

/** Goes to the post-game star map (the route navigation.ts installs). */
export function toPostGameRoute(): void {
  postGameRoute();
}

/** The close's lazy half (app/endingPlay.ts), once the finale's screens chunk has registered it. */
export interface EndingPlayer {
  /** Plays a first win's close `steps`, then the post-game (or `go` if it never gets there). */
  play(steps: readonly EndingStep[], opts: EndingOptions, go: () => void): void;
  /** "Watch the epilogue" over the save in play; resolves once it has closed. */
  watch(): Promise<void>;
}

let player: EndingPlayer | null = null;

/** Registers the close's lazy half (app/acts/finUi.ts, as the chunk loads). */
export function registerEnding(next: EndingPlayer): void {
  player = next;
}

/**
 * Plays the close `steps` (app/finaleFlow.ts `endingSteps`) after a won finale's card, then `go`
 * (the way on) unless it reached the post-game step, which takes its place. A replay's close (no
 * C5) is the post-game alone, and only on the way on; none at all goes straight to `go`.
 */
export function playEnding(
  steps: readonly EndingStep[],
  opts: EndingOptions,
  go: () => void,
): void {
  if (steps.length === 0) {
    go();
    return;
  }
  if (!asksC5(steps)) {
    if (opts.onward && steps.some((s) => 'screen' in s && s.screen === 'post_game')) {
      postGameRoute();
    } else {
      go();
    }
    return;
  }
  // The screens chunk is in before any finale card shows (app/contentGate.ts); never strand it.
  if (player === null) postGameRoute();
  else player.play(steps, opts, go);
}

/**
 * "Watch the epilogue" (T863's post-game star map): the epilogue again over the save in play, Esc
 * skipping it, then back to the screen under it. Loads the finale's content and screens first.
 * Resolves once it has closed; rejects without a save or with C5 unanswered.
 */
export function watchEpilogue(): Promise<void> {
  const save = activeSave();
  if (save === null || save.story.flags.ending_choice === undefined) {
    return Promise.reject(new Error('ending: the epilogue waits for C5'));
  }
  return Promise.all([ensureActs('finale'), loadFinaleScreens()]).then(() => {
    if (player === null) throw new Error('ending: the finale screens did not register');
    return player.watch();
  });
}
