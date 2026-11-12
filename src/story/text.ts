// Text substitution (docs/tech/story-runtime.md § Text substitution): resolves `{name}`,
// `{callsign}`, the pronoun tokens, `{v:<plural>|<singular>}`, `{pests_processed}`, `{evacuated}`,
// and `{glyph:<id>}` on every line, bark, choice, memo, codex version, tip, results line, and
// epilogue card. The grammar and the worst-case lengths validation measures are content rule
// data (content/dialogue/rules.ts); they are re-exported here for story's callers.
import { CALLSIGNS, PRONOUN_SETS, type PlayerProfile } from '../content/dialogue/profile.ts';
import { parseText, pronounToken } from '../content/dialogue/rules.ts';
import type { GlyphId } from '../content/dialogue/types.ts';
import { formatCount } from './counter.ts';

export { tokenProblems, worstCaseLength } from '../content/dialogue/rules.ts';

/** What tokens resolve against. */
export interface TextContext {
  /** Null before the intake (a v1 save): tokens fall back to `NO_PROFILE`. */
  readonly profile: PlayerProfile | null;
  readonly pestsProcessed: number;
  /** The current map's meter count (Evacuated, Sheltered, or Voices); null outside one (reads 0). */
  readonly evacuated: number | null;
}

/**
 * What tokens read with no profile (a v1 save before its intake runs on Continue): Everglow's own
 * form of address, the first callsign, and they/them. Nothing should play before the intake; this
 * keeps a stray line readable instead of throwing.
 */
export const NO_PROFILE: PlayerProfile = {
  name: 'Technician',
  address: 'tech',
  pronouns: 'they',
  callsign: 'sprout',
};

/**
 * How `{glyph:<id>}` reaches the text: a private-use character the pixel-font renderer swaps for
 * the glyph (T302b draws them). One character each, as validation counts them.
 */
export const GLYPH_CHARS: Readonly<Record<GlyphId, string>> = { sun: '\u{E000}', star: '★' };

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** `text` with every token resolved. Throws on an unknown token (validation catches them first). */
export function resolveText(text: string, ctx: TextContext): string {
  const { parts, problems } = parseText(text);
  const first = problems[0];
  if (first !== undefined) throw new Error(`story: ${first.message} in "${text}"`);
  const profile = ctx.profile ?? NO_PROFILE;
  const pronouns = PRONOUN_SETS[profile.pronouns];
  let out = '';
  for (const p of parts) {
    switch (p.kind) {
      case 'text':
        out += p.text;
        break;
      case 'verb':
        out += pronouns.agreement === 'plural' ? p.plural : p.singular;
        break;
      case 'glyph':
        out += GLYPH_CHARS[p.glyph];
        break;
      case 'token': {
        const pr = pronounToken(p.token);
        if (pr !== null) {
          const form = pronouns[pr.form];
          out += pr.cap ? capitalize(form) : form;
        } else if (p.token === 'name') out += profile.name;
        else if (p.token === 'callsign') out += CALLSIGNS[profile.callsign];
        else if (p.token === 'pests_processed') out += formatCount(ctx.pestsProcessed);
        else out += formatCount(ctx.evacuated ?? 0);
        break;
      }
    }
  }
  return out;
}
