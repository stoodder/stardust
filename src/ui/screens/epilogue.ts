// The epilogue's timeline (T810; design/core-loop.md § 6.8; story/bible.md § 10): after C5, one
// thing at a time on a dark stage (D153). The cards, one per slot in order, each up about 6 s
// (longer for a long one) or until a click or a key; then the counter card, PESTS PROCESSED: 0
// held a breath before it flips to REMEMBERED: {n} (where the music cues `dawn_major`); then the
// credits roll, coming to rest on "And you" (the player's name) over "Thank you for playing.",
// held there until a click or a key (a click while it rolls brings it to rest at once: the roll
// always ends on the player; S2-2); then the final image by ending, held until a click or a key,
// or FINAL_MS. Pure: the beats and their lengths; the layer (epilogueLayer.tsx) draws and runs the
// clock. Reduced motion keeps every beat and its timing but nothing slides or fades: cards cut, the
// roll steps a block at a time to the same rest, and the final image holds still.
import type { EndingChoice, EpilogueView } from './epilogueState.ts';
import { assertNever } from '../../shared/types.ts';
import { CREDITS, CREDITS_YOU, type CreditBlock } from './credits.ts';
import { FINALE_HEADLINE } from './presentationText.ts';

/** A card's time on screen: about 6 s, plus reading time past 120 characters (ms). */
export const CARD_MS = 6000;
export const CARD_READ_MS_PER_CHAR = 40;
export const CARD_READ_FROM = 120;

export function cardMs(text: string): number {
  return CARD_MS + Math.max(0, text.length - CARD_READ_FROM) * CARD_READ_MS_PER_CHAR;
}

/** How long a card fades in and out (ms; none under reduced motion). */
export const FADE_MS = 600;

/**
 * The counter before its flip: the number Everglow kept, at zero (UI copy, bible.md § 10 #13), the
 * line the finale's Results card headlined (`FINALE_HEADLINE`).
 */
export const COUNTER_ZERO = FINALE_HEADLINE;
/** How long the zero holds before it flips, and the flip itself (ms). */
export const COUNTER_ZERO_MS = 2400;
export const COUNTER_FLIP_MS = 400;
/** How long REMEMBERED holds once flipped (ms). */
export const COUNTER_HOLD_MS = 6000;

/** The roll's speed (game px a second). */
export const CREDITS_PX_PER_SEC = 24;
/** Under reduced motion: one step at a time, each held this long (ms). */
export const CREDITS_BLOCK_MS = 2600;
/** The roll's height per line and per block gap (game px; epilogue.css's metrics). */
export const CREDIT_LINE_PX = 12;
export const CREDIT_GAP_PX = 20;
/** A title line's height (the game's name, the thanks, the player's name; epilogue.css). */
export const CREDIT_TITLE_PX = 16;
/** The stage's height the roll crosses (game px). */
export const STAGE_PX = 360;

/** One block's height on the roll, its gap included (game px). */
export function creditBlockPx(b: Pick<CreditBlock, 'heading' | 'lines' | 'style'>): number {
  const lines = b.lines.reduce(
    (h, _l, i) =>
      h +
      (b.style === 'title' || (b.style === 'you' && i === 0) ? CREDIT_TITLE_PX : CREDIT_LINE_PX),
    0,
  );
  return (b.heading === null ? 0 : CREDIT_LINE_PX) + lines + CREDIT_GAP_PX;
}

/** The roll's own height (game px). */
export function creditsHeightPx(blocks: readonly CreditBlock[] = CREDITS): number {
  return blocks.reduce((h, b) => h + creditBlockPx(b), 0);
}

/**
 * Where the roll comes to rest (its offset up from the stage's bottom edge, game px): "And you"
 * and the thanks under it (every block from CREDITS_YOU on) centred on the stage.
 */
export function creditsStopPx(blocks: readonly CreditBlock[] = CREDITS): number {
  const top = creditsHeightPx(blocks.slice(0, CREDITS_YOU));
  const group = creditsHeightPx(blocks.slice(CREDITS_YOU)) - CREDIT_GAP_PX;
  return Math.round(STAGE_PX / 2 + top + group / 2);
}

/**
 * The steps under reduced motion: each block before "And you" alone, then "And you" with the
 * thanks under it (the rest), as indices into the roll.
 */
export function creditsSteps(n: number = CREDITS.length): number[][] {
  const steps: number[][] = [];
  for (let i = 0; i < CREDITS_YOU; i++) steps.push([i]);
  steps.push(Array.from({ length: n - CREDITS_YOU }, (_, k) => CREDITS_YOU + k));
  return steps;
}

/** How long the roll takes to come to rest on "And you" (ms); it holds there until a press. */
export function creditsRestMs(still: boolean): number {
  if (still) return (creditsSteps().length - 1) * CREDITS_BLOCK_MS;
  return Math.ceil((creditsStopPx() / CREDITS_PX_PER_SEC) * 1000);
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

/**
 * How long `beat` stays before it moves on by itself (ms), or null for one that holds until a click
 * or a key (the credits, at rest on the player).
 */
export function beatMs(beat: EpilogueBeat, view: EpilogueView): number | null {
  switch (beat.kind) {
    case 'card':
      return cardMs(view.cards[beat.index]?.text ?? '');
    case 'counter':
      return COUNTER_ZERO_MS + COUNTER_FLIP_MS + COUNTER_HOLD_MS;
    case 'credits':
      return null;
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

/** The roll's offset `ms` into it (game px up from the stage's bottom edge), at most its rest. */
export function creditsOffsetPx(ms: number): number {
  return Math.min(creditsStopPx(), Math.floor((Math.max(0, ms) * CREDITS_PX_PER_SEC) / 1000));
}

/** Under reduced motion, the blocks on show `ms` into the roll (`creditsSteps`; the last holds). */
export function creditsBlockAt(ms: number): readonly number[] {
  const steps = creditsSteps();
  return steps[Math.min(steps.length - 1, Math.floor(Math.max(0, ms) / CREDITS_BLOCK_MS))]!;
}

/** Whether the roll has come to rest on the player `ms` into it. */
export function creditsAtRest(ms: number, still: boolean): boolean {
  return ms >= creditsRestMs(still);
}

/** The epilogue stills' resting frame (T843's; the stage draws them at dawn.ts `STILL_SCALE`). */
export const FINAL_STILL_FRAME = 'still';

/**
 * The final image by ending (bible.md § 10): Stay, the HUD's old status line reading PERIMETER
 * STATUS: OPEN over Wayside at dawn; Go, Tumble IV from orbit, QUILL's relay over the valley at
 * dusk. The still is T843's (`ENDING_STILL`, frame `still`, 320×180 drawn at 2×, full-bleed; the
 * orbit's relay blinks on its `blink` anim, held `still` under reduced motion); the Stay line is
 * DOM over it. `label` is the screen reader's account.
 */
export const FINAL_IMAGES: Readonly<Record<EndingChoice, { readonly label: string }>> = {
  stay: { label: 'Wayside at dawn. The old status line reads: Perimeter status: open.' },
  go: { label: 'Tumble IV from orbit at dusk. A relay blinks over the valley.' },
};

/**
 * The orbit's frame `ms` into the final image: its `blink` anim (`frames` at `fps`, looping), or
 * `still` under reduced motion or without the anim.
 */
export function stillFrameAt(
  anim: { readonly frames: readonly string[]; readonly fps: number } | undefined,
  ms: number,
  still: boolean,
): string {
  if (still || anim === undefined || anim.frames.length === 0) return FINAL_STILL_FRAME;
  return anim.frames[Math.floor((Math.max(0, ms) * anim.fps) / 1000) % anim.frames.length]!;
}

/** The old HUD status line in the Stay image (bible.md § 10, Ending A). */
export const PERIMETER_OPEN = 'PERIMETER STATUS: OPEN';
