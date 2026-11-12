// The campaign's close on screen (T810; design/core-loop.md § 6.8): what the ending layer shows now
// (app/ending.ts writes it, one screen at a time), and the finale's own components. Those are in
// the finale's lazy chunk (app/acts/fin.ts registers them, `registerFinaleUi`), so the core holds
// only this file: the overlay draws `finaleUi`'s layer, and the C5 staging its stage, once
// registered (architecture.md § 5, *Bundle*).
import { signal } from '@preact/signals';
import type { ComponentType } from 'preact';
import type { EpilogueSlotId } from '../../content/dialogue/epilogue.ts';
import type { FlagValueOf } from '../../content/dialogue/flags.ts';
import type { MemoView } from '../../app/inbox.ts';

/** C5's answer: which ending's final image the epilogue closes on. */
export type EndingChoice = FlagValueOf<'ending_choice'>;

/** One epilogue card as shown: its slot and its text, tokens resolved. */
export interface EpilogueCardView {
  readonly slot: EpilogueSlotId;
  readonly text: string;
}

/**
 * The epilogue (core-loop.md § 6.8): the cards in slot order, the counter card (PESTS PROCESSED: 0
 * flipping to its own text, REMEMBERED: {n}), the credits, then the final image by ending.
 */
export interface EpilogueView {
  readonly kind: 'epilogue';
  /** Every card but the counter, in order. */
  readonly cards: readonly EpilogueCardView[];
  /** The counter card's text ("REMEMBERED: 1,234"), or null when no counter card matched. */
  readonly remembered: string | null;
  /** The final image's ending, or null (no answer to draw: none shows). */
  readonly ending: EndingChoice | null;
  /**
   * The first time through (the campaign's close, not "Watch the epilogue"): Esc skips nothing;
   * a click or a key still moves on one card at a time.
   */
  readonly first: boolean;
}

/** Sterling's farewell memo as a card before C5 (`memo_fin_01`, its letterhead). */
export interface MemoCardView {
  readonly kind: 'memo';
  readonly memo: MemoView;
}

/** What the ending layer shows, or null (nothing: the screen under it shows). */
export type EndingScreenView = MemoCardView | EpilogueView;

/** The ending screen on show (app/ending.ts sets and clears it). */
export const endingScreen = signal<EndingScreenView | null>(null);

/** The finale chunk's components: the ending layer, and the Dawn and C5 scenes' stages. */
export interface FinaleUi {
  /** Draws `endingScreen` over every screen (the overlay mounts it once registered). */
  readonly EndingLayer: ComponentType;
  /** C5's stage (staging `c5`), from its staging's start (performance.now()). */
  readonly C5Stage: ComponentType<{ readonly from: number }>;
  /** The First Dawn's stage (staging `dawn`, before the finale's card). */
  readonly DawnStage: ComponentType<{ readonly from: number }>;
}

/** The finale's components once its chunk has loaded (null before). */
export const finaleUi = signal<FinaleUi | null>(null);

/** Registers the finale's components (app/acts/fin.ts, as its chunk loads). */
export function registerFinaleUi(ui: FinaleUi): void {
  finaleUi.value = ui;
}
