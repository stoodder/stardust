// The prelude on screen (T1001; prelude.ts holds its rules): its stage is in the prelude's lazy
// chunk (app/acts/preludeUi.ts registers it as it loads; app/prelude.ts loads it before the scene
// plays), so the core holds only this registry, which the staging reads, and the intake's cue to
// rise (the scene's last line dims the still; the form comes up as it closes).
import { signal } from '@preact/signals';
import type { ComponentType } from 'preact';

/** The prelude chunk's components. */
export interface PreludeUi {
  /** The prelude's stage (staging `prelude`), from its staging's start (performance.now()). */
  readonly PreludeStage: ComponentType<{ readonly from: number }>;
  /**
   * The still the intake rises over (Dome Row with Gerald and the clipboard, where the form lands),
   * at the stage's 2×: its image URL and drawn size, or null if it couldn't be drawn.
   */
  readonly backdrop: () => { readonly url: string; readonly w: number; readonly h: number } | null;
}

/** The prelude's components once its chunk has loaded (null before). */
export const preludeUi = signal<PreludeUi | null>(null);

/** Registers the prelude's components (app/acts/preludeUi.ts, as its chunk loads). */
export function registerPreludeUi(ui: PreludeUi): void {
  preludeUi.value = ui;
}

/**
 * The intake opens straight off the prelude's last line (app/prelude.ts sets it; the intake
 * clears it as it first draws): the form rises into place instead of cutting in.
 */
export const intakeRises = signal(false);
