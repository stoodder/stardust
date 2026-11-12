// The campaign's close, played (T810; app/ending.ts is the core's half and says what plays when).
// In the finale's screens chunk (app/acts/finUi.ts registers `ENDING_PLAYER`). A first win's close,
// step by step: Sterling's memo as a card (read once shown), C5's scene full-screen with Esc held
// (it is the campaign's last question, asked once; its pick carries to the epilogue even on the
// results fixture, which saves nothing), the epilogue, then the post-game route. The memo, C5,
// and the epilogue are story: with dialogue off (`?test=1` without `&dialogue=1`, the scenes'
// rule) they are passed over, so a smoke flow that dismisses the finale's card isn't held 90 s by
// the credits. The screens draw from ui/screens/epilogueState.ts.
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
import { dialogueEnabled, playScene } from './dialogue.ts';
import { toPostGameRoute, type EndingOptions, type EndingPlayer } from './ending.ts';
import { endingPlaceholder } from './finaleFlow.ts';
import { markMemoRead, memoView, textContext } from './inbox.ts';
import { logError } from './log.ts';
import { activeSave } from './save.ts';

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
  const flags: Partial<Record<EpilogueFlag, unknown>> = { ...save?.story.flags };
  if (pick !== null) flags.ending_choice = pick;
  return flags;
}

/** The counter card's slot (EPILOGUE_SLOTS' `counter`). */
const COUNTER_SLOTS: ReadonlySet<string> = new Set(
  EPILOGUE_SLOTS.filter((s) => s.counter === true).map((s) => s.id),
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
  const counter = all.find((c) => COUNTER_SLOTS.has(c.slot));
  const ending = flags.ending_choice;
  return {
    kind: 'epilogue',
    cards: all
      .filter((c) => !COUNTER_SLOTS.has(c.slot))
      .map((c) => ({ slot: c.slot, text: text(c.text) })),
    remembered: counter === undefined ? null : text(counter.text),
    ending: C5_CHOICES.find((c) => c === ending) ?? null,
    first,
  };
}

/** Plays a first win's close `steps` (C5 among them), then the post-game route, or `go`. */
export function playFirstEnding(
  steps: readonly EndingStep[],
  opts: EndingOptions,
  go: () => void,
): void {
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
      // The campaign's last screen: it replaces the way on.
      toPostGameRoute();
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

/** "Watch the epilogue" over the save in play (C5 answered): resolves once it has closed. */
export function watchAgain(): Promise<void> {
  const save = activeSave();
  return new Promise<void>((resolve) => {
    show(epilogueView(epilogueFlags(save, null), save, false), resolve);
  });
}

/** The close's lazy half, as app/ending.ts calls it. */
export const ENDING_PLAYER: EndingPlayer = { play: playFirstEnding, watch: watchAgain };
