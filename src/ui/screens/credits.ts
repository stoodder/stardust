// The credits roll (T810; design/core-loop.md § 6.8): after the epilogue's counter card, before the
// final image. Data: the blocks in order, each a heading and its lines. The cast is the story's
// (story/characters.md, by their full names), the protagonist last, by the player's name over
// "Waykeeper"; then what the game is made of (its libraries and its two SIL Open Font License
// fonts, art-direction.md § Fonts). Copy is UI copy (style-guide.md § 6): plain, no jokes, no
// exclamation marks. Part of the finale's chunk.

import { resolveText, type TextContext } from '../../story/text.ts';

/** One block of the roll: a small heading over its lines. */
export interface CreditBlock {
  /** Small, in the act accent's dim (null: the title block, which has none). */
  readonly heading: string | null;
  readonly lines: readonly string[];
}

/** The game's name, alone at the top of the roll. */
export const CREDITS_TITLE = 'Stardust';

/** The roll, top to bottom. */
export const CREDITS: readonly CreditBlock[] = [
  { heading: null, lines: [CREDITS_TITLE] },
  {
    heading: 'With',
    lines: [
      'Sgt. Ikenna "Bricks" Okonkwo',
      'QUILL',
      'Marigold "Goldie" Pak',
      'Kip Vandermeer',
      'Director Joy Sterling',
      'Zibzab',
      "Ves'thara",
      'Pebble',
    ],
  },
  {
    heading: 'And',
    lines: [
      'Old Thrum',
      'Bramble',
      'Ishael',
      'Gerald',
      'Compliance Officer Prim',
      'The Everglow PA',
    ],
  },
  { heading: 'The choir', lines: ['Every voice that walked the Long Walk'] },
  // The player's own name over the one Pebble gave them (`{name}`: the roll's text resolves it,
  // story/text.ts `resolveText`).
  { heading: 'And you', lines: ['{name}', 'Waykeeper'] },
  {
    heading: 'Made with',
    lines: ['TypeScript', 'Phaser', 'Preact', 'Vite'],
  },
  {
    heading: 'Fonts',
    lines: [
      'Silkscreen, by Jason Kottke',
      'Pixelify Sans, by Stefie Justprince',
      'SIL Open Font License',
    ],
  },
  { heading: 'Built with', lines: ['Claude, by Anthropic'] },
  { heading: null, lines: ['Thank you for playing.'] },
];

/** Every line of the roll, headings included, in order (its screen reader text). */
export function creditsText(blocks: readonly CreditBlock[] = CREDITS): string {
  return blocks.map((b) => [b.heading, ...b.lines].filter((l) => l !== null).join('. ')).join('. ');
}

/** What the roll's tokens read with no save in play (`{name}`: the no-profile address). */
const NO_SAVE_TEXT: TextContext = { profile: null, pestsProcessed: 0, evacuated: null };

/**
 * The roll with its tokens resolved for the save in play (`{name}` in "And you": the player's
 * name over "Waykeeper"), the same way the epilogue's cards resolve theirs (app/endingPlay.ts).
 */
export function resolvedCredits(
  ctx: TextContext | null,
  blocks: readonly CreditBlock[] = CREDITS,
): CreditBlock[] {
  const c = ctx ?? NO_SAVE_TEXT;
  return blocks.map((b) => ({
    heading: b.heading === null ? null : resolveText(b.heading, c),
    lines: b.lines.map((l) => resolveText(l, c)),
  }));
}
