// The epilogue's timeline (T810; design/core-loop.md § 6.8; story/bible.md § 10): after C5, one
// thing at a time on a dark stage (D153). The cards, one per slot in order, each up about 6 s
// (longer for a long one) or until a click or a key; then the counter card, PESTS PROCESSED: 0
// held a breath before it flips to REMEMBERED: {n} (where the music cues `dawn_major`); then the
// credits roll; then the final image by ending, held until a click or a key, or FINAL_MS. Pure:
// the beats and their lengths; the layer (epilogueLayer.tsx) draws and runs the clock. Reduced
// motion keeps every beat and its timing but nothing slides or fades: cards cut, the roll shows a
// block at a time, and the final image holds still.
import type { EndingChoice, EpilogueView } from './epilogueState.ts';
import { assertNever } from '../../shared/types.ts';
import { CREDITS } from './credits.ts';

/** A card's time on screen: about 6 s, plus reading time past 120 characters (ms). */
export const CARD_MS = 6000;
export const CARD_READ_MS_PER_CHAR = 40;
export const CARD_READ_FROM = 120;

export function cardMs(text: string): number {
  return CARD_MS + Math.max(0, text.length - CARD_READ_FROM) * CARD_READ_MS_PER_CHAR;
}

/** How long a card fades in and out (ms; none under reduced motion). */
export const FADE_MS = 600;

/** The counter before its flip: the number Everglow kept, at zero (UI copy, bible.md § 10 #13). */
export const COUNTER_ZERO = 'PESTS PROCESSED: 0';
/** How long the zero holds before it flips, and the flip itself (ms). */
export const COUNTER_ZERO_MS = 2400;
export const COUNTER_FLIP_MS = 400;
/** How long REMEMBERED holds once flipped (ms). */
export const COUNTER_HOLD_MS = 6000;

/** The roll's speed (game px a second) and its length: the blocks pass, then it ends (ms). */
export const CREDITS_PX_PER_SEC = 24;
/** Under reduced motion: one block at a time, each held this long (ms). */
export const CREDITS_BLOCK_MS = 2600;
/** The roll's height per line and per block gap (game px; epilogue.css's metrics). */
export const CREDIT_LINE_PX = 12;
export const CREDIT_GAP_PX = 20;
/** The stage's height the roll crosses (game px). */
export const STAGE_PX = 360;

/** The roll's own height (game px). */
export function creditsHeightPx(
  blocks: readonly { heading: string | null; lines: readonly string[] }[] = CREDITS,
): number {
  return blocks.reduce(
    (h, b) =>
      h +
      (b.heading === null ? 0 : CREDIT_LINE_PX) +
      b.lines.length * CREDIT_LINE_PX +
      CREDIT_GAP_PX,
    0,
  );
}

/** How long the roll runs: from below the stage until its last line has left the top (ms). */
export function creditsMs(still: boolean): number {
  if (still) return CREDITS.length * CREDITS_BLOCK_MS;
  return Math.ceil(((STAGE_PX + creditsHeightPx()) / CREDITS_PX_PER_SEC) * 1000);
}

/** How long the final image holds before the close goes on by itself (ms). */
export const FINAL_MS = 12000;

/** One beat of the epilogue. */
export type EpilogueBeat =
  | { readonly kind: 'card'; readonly index: number }
  | { readonly kind: 'counter' }
  | { readonly kind: 'credits' }
  | { readonly kind: 'final'; readonly ending: EndingChoice };

/** The beats `view` plays, in order. */
export function epilogueBeats(view: EpilogueView): EpilogueBeat[] {
  return [
    ...view.cards.map((_, index) => ({ kind: 'card', index }) as const),
    ...(view.remembered === null ? [] : [{ kind: 'counter' } as const]),
    { kind: 'credits' },
    ...(view.ending === null ? [] : [{ kind: 'final', ending: view.ending } as const]),
  ];
}

/** How long `beat` stays before it moves on by itself (ms). */
export function beatMs(beat: EpilogueBeat, view: EpilogueView, still: boolean): number {
  switch (beat.kind) {
    case 'card':
      return cardMs(view.cards[beat.index]?.text ?? '');
    case 'counter':
      return COUNTER_ZERO_MS + COUNTER_FLIP_MS + COUNTER_HOLD_MS;
    case 'credits':
      return creditsMs(still);
    case 'final':
      return FINAL_MS;
    default:
      return assertNever(beat);
  }
}

/** Whether the counter has flipped to REMEMBERED `ms` into its beat. */
export function counterFlipped(ms: number): boolean {
  return ms >= COUNTER_ZERO_MS;
}

/** The roll's offset `ms` into it (game px up from the stage's bottom edge). */
export function creditsOffsetPx(ms: number): number {
  return Math.floor((Math.max(0, ms) * CREDITS_PX_PER_SEC) / 1000);
}

/** Under reduced motion, the block on show `ms` into the roll. */
export function creditsBlockAt(ms: number): number {
  return Math.min(CREDITS.length - 1, Math.floor(Math.max(0, ms) / CREDITS_BLOCK_MS));
}

/** The epilogue stills' frame and their scale on the 640×360 stage. */
export const FINAL_STILL_FRAME = 'still';
export const FINAL_STILL_SCALE = 2;

/**
 * The final image by ending (bible.md § 10): Stay, the HUD's old status line reading PERIMETER
 * STATUS: OPEN over Wayside at dawn; Go, Tumble IV from orbit, QUILL's relay over the valley at
 * dusk. `still` is T843's epilogue still (a `scene.*` id, frame `still`, 320×180 drawn at 2×,
 * full-bleed); until it is painted the layer draws a placeholder (a dawn sky; the planet's limb and
 * the relay). The Stay line is DOM over either. `label` is the screen reader's account.
 */
export const FINAL_IMAGES: Readonly<
  Record<EndingChoice, { readonly still: string; readonly label: string }>
> = {
  stay: {
    still: 'scene.wayside',
    label: 'Wayside at dawn. The old status line reads: Perimeter status: open.',
  },
  go: {
    still: 'scene.orbit',
    label: 'Tumble IV from orbit at dusk. A relay blinks over the valley.',
  },
};

/** The old HUD status line in the Stay image (bible.md § 10, Ending A). */
export const PERIMETER_OPEN = 'PERIMETER STATUS: OPEN';
