// Text substitution (docs/tech/story-runtime.md § Text substitution): resolves `{name}`,
// `{callsign}`, the pronoun tokens, `{v:<plural>|<singular>}`, `{pests_processed}`, `{evacuated}`,
// and `{glyph:<id>}` on every line, bark, choice, memo, codex version, tip, results line, and
// epilogue card; and measures text at its worst case for validation (style-guide.md § 5.4).
import type { PlayerProfile } from '../content/dialogue/profile.ts';
import { notImplemented } from './notImplemented.ts';

/** What tokens resolve against. */
export interface TextContext {
  /** Null before the intake (a v1 save): tokens fall back to neutral forms (T302a decides). */
  readonly profile: PlayerProfile | null;
  readonly pestsProcessed: number;
  /** The current map's meter count (Evacuated, Sheltered, or Voices); null outside one. */
  readonly evacuated: number | null;
}

/** `text` with every token resolved. Throws on an unknown token (validation catches them first). */
export function resolveText(text: string, ctx: TextContext): string {
  void text;
  void ctx;
  return notImplemented('resolveText', 'T302a');
}

/** The length of `text` after worst-case substitution (`{name}` 16, `{callsign}` 9, …). */
export function worstCaseLength(text: string): number {
  void text;
  return notImplemented('worstCaseLength', 'T302a');
}

/** Problems with the tokens in `text` (unknown tokens, malformed `{v:…}`, unknown glyphs). */
export function tokenProblems(text: string): string[] {
  void text;
  return notImplemented('tokenProblems', 'T302a');
}
