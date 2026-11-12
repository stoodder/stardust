// The campaign's close as played (T810; design/core-loop.md § 6.8; story/campaign/finale.md § FIN):
// once a won finale's card is dismissed (app/runFlow.ts `leaveResults`), the steps app/finaleFlow.ts
// gives, in order. The first win (C5 unanswered): Sterling's farewell memo as a card, C5's scene
// full-screen (its choice commits `ending_choice` through meta's `resolveC5`, app/dialogue.ts), the
// epilogue (the cards, the counter, the credits, the final image), then the post-game star map,
// whatever way on the player picked. A later win plays only the post-game step, and only on the
// way on (Continue). "Watch the epilogue" (the post-game star map, T863) replays the epilogue.
//
// The memo, C5, and the epilogue are story: they play only while dialogue does (`?test=1` turns
// it off unless `&dialogue=1`, the scenes' rule), so a smoke flow that dismisses the finale's card
// isn't held 90 s by the credits. C5 is asked with Esc held (`noSkip`): it is the campaign's last
// question, asked once. The screens draw from ui/screens/epilogueState.ts; their components are
// in the finale's lazy chunk (app/acts/fin.ts).
import { sceneById } from '../content/dialogue/index.ts';
import { epilogueFor, EPILOGUE_SLOTS, type EpilogueFlag } from '../content/dialogue/epilogue.ts';
import type { EndingStep } from '../content/dialogue/resultsFlow.ts';
import { C5_CHOICES, type SaveData } from '../meta/index.ts';
import { resolveText } from '../story/text.ts';
import {
  endingScreen,
  type EndingChoice,
  type EndingScreenView,
  type EpilogueView,
} from '../ui/screens/epilogueState.ts';
import { ensureActs } from './actContent.ts';
import { dialogueEnabled, playScene } from './dialogue.ts';
import { endingPlaceholder } from './finaleFlow.ts';
import { loadFinaleScreens } from './finaleScreens.ts';
import { markMemoRead, memoView, textContext } from './inbox.ts';
import { logError } from './log.ts';
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

/** What runs as the ending screen on show is closed (its Continue, or the epilogue's end). */
let onScreenDone: (() => void) | null = null;

function show(view: EndingScreenView, done: () => void): void {
  onScreenDone = done;
  endingScreen.value = view;
}

/** Closes the ending screen on show and goes on (its Continue, or the epilogue's last beat). */
export function closeEndingScreen(): void {
  const done = onScreenDone;
  onScreenDone = null;
  endingScreen.value = null;
  done?.();
}

/** The flags the epilogue reads: the save's, with C5's pick over them (the fixture's isn't saved). */
export function epilogueFlags(
  save: Pick<SaveData, 'story'> | null,
  pick: EndingChoice | null,
): Partial<Record<EpilogueFlag, unknown>> {
  const flags: Partial<Record<EpilogueFlag, unknown>> = { ...(save?.story.flags ?? {}) };
  if (pick !== null) flags.ending_choice = pick;
  return flags;
}

/** The counter card's slot (EPILOGUE_SLOTS' `counter`). */
const COUNTER_SLOTS: readonly string[] = EPILOGUE_SLOTS.filter((s) => s.counter === true).map(
  (s) => s.id,
);

/**
 * The epilogue over `flags` (`epilogueFor`: per slot, its first matching card; the finale's chunk
 * must have registered them), its tokens resolved for `save`: the cards, the counter card's text
 * apart, and the ending its final image shows.
 */
export function epilogueView(
  flags: Partial<Record<EpilogueFlag, unknown>>,
  save: SaveData | null,
  first: boolean,
): EpilogueView {
  const ctx = save === null ? null : textContext(save);
  const text = (t: string): string => (ctx === null ? t : resolveText(t, ctx));
  const all = epilogueFor(flags);
  const counter = all.find((c) => COUNTER_SLOTS.includes(c.slot));
  const ending = flags.ending_choice;
  return {
    kind: 'epilogue',
    cards: all
      .filter((c) => !COUNTER_SLOTS.includes(c.slot))
      .map((c) => ({ slot: c.slot, text: text(c.text) })),
    remembered: counter === undefined ? null : text(counter.text),
    ending: C5_CHOICES.find((c) => c === ending) ?? null,
    first,
  };
}

/**
 * Plays the close `steps` (app/finaleFlow.ts `endingSteps`) after a won finale's card, then `go`
 * (the way on), unless it reached the post-game step, which takes its place. A replay's close
 * (no C5) plays only on the way on; none at all goes straight to `go`.
 */
export function playEnding(
  steps: readonly EndingStep[],
  opts: EndingOptions,
  go: () => void,
): void {
  if (steps.length === 0 || (!asksC5(steps) && !opts.onward)) {
    go();
    return;
  }
  const story = dialogueEnabled();
  let pick: EndingChoice | null = null;
  const at = (i: number): void => {
    const step = steps[i];
    if (step === undefined) {
      go();
      return;
    }
    const next = (): void => at(i + 1);
    if ('screen' in step && step.screen === 'post_game') {
      // The campaign's last screen: it replaces the way on (T863 builds its own; the star map
      // at dawn meanwhile).
      postGameRoute();
      return;
    }
    // A step whose piece hasn't landed (app/finaleFlow.ts) is passed over, as story is with
    // dialogue off.
    if (endingPlaceholder(step) !== null || !story) {
      next();
      return;
    }
    const save = activeSave();
    if ('memo' in step) {
      const memo = save === null ? null : memoView(save, step.memo);
      if (memo === null) {
        next();
        return;
      }
      show({ kind: 'memo', memo }, () => {
        if (opts.record) markMemoRead(step.memo);
        next();
      });
      return;
    }
    if ('scene' in step) {
      const scene = sceneById(step.scene);
      if (scene === undefined) {
        next();
        return;
      }
      playScene(scene, {
        mode: 'fullscreen',
        record: opts.record,
        noSkip: true,
        onEnd: (effects) => {
          const said = effects.flags.ending_choice;
          pick = C5_CHOICES.find((c) => c === said) ?? pick;
          next();
        },
      });
      return;
    }
    let view: EpilogueView;
    try {
      view = epilogueView(epilogueFlags(activeSave(), pick), activeSave(), true);
    } catch (err) {
      // The finale's chunk always precedes its card (app/contentGate.ts); never strand the close.
      logError('ending: the epilogue could not be built', err);
      next();
      return;
    }
    show(view, next);
  };
  at(0);
}

/**
 * "Watch the epilogue" (T863's post-game star map): the epilogue again over the save in play, Esc
 * skipping it, then back to the screen under it. Loads the finale's chunk first (its cards and
 * screen). Resolves once it has closed; rejects without a save or with C5 unanswered.
 */
export function watchEpilogue(): Promise<void> {
  const save = activeSave();
  if (save === null || save.story.flags.ending_choice === undefined) {
    return Promise.reject(new Error('ending: the epilogue waits for C5'));
  }
  return Promise.all([ensureActs('finale'), loadFinaleScreens()]).then(
    () =>
      new Promise<void>((resolve) => {
        show(epilogueView(epilogueFlags(save, null), save, false), resolve);
      }),
  );
}
