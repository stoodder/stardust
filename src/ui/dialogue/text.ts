// How a dialogue line's text is drawn (story-runtime.md § Text substitution; style-guide § 5.4):
// `*word*` emphasis as italics, the `{glyph:sun}` private-use character as the Evie sun, the
// typewriter's pace (art-direction.md § Dialogue presentation: about 40 characters a second), and
// the Hollow's distortion (dropped letters, glyphs nudged by a pixel). Pure, so it's unit-tested.
import { GLYPH_CHARS } from '../../story/text.ts';

/** Typewriter speed, in characters per second (art-direction.md § Dialogue presentation). */
export const TYPE_CPS = 40;

/** One run of a line: plain or emphasized text, or an inline glyph. */
export type TextSegment =
  | { readonly kind: 'text'; readonly text: string; readonly em: boolean }
  | { readonly kind: 'sun' };

/**
 * `text` split into runs: `*word*` is emphasis (at most one per line, validation says; an
 * unmatched `*` stays literal), and the sun glyph's character is its own run.
 */
export function segments(text: string): TextSegment[] {
  const out: TextSegment[] = [];
  const push = (t: string, em: boolean): void => {
    const parts = t.split(GLYPH_CHARS.sun);
    parts.forEach((p, i) => {
      if (i > 0) out.push({ kind: 'sun' });
      if (p !== '') out.push({ kind: 'text', text: p, em });
    });
  };
  const m = /\*([^*]+)\*/.exec(text);
  if (m === null) {
    push(text, false);
  } else {
    push(text.slice(0, m.index), false);
    push(m[1] ?? '', true);
    push(text.slice(m.index + m[0].length), false);
  }
  return out;
}

/** How many characters a line types (a glyph counts as one; the `*` marks count as none). */
export function typedLength(text: string): number {
  return segments(text).reduce((n, s) => n + (s.kind === 'sun' ? 1 : s.text.length), 0);
}

/** The line as plain words, for screen readers (no `*` marks; the sun read as "sun"). */
export function plainText(text: string): string {
  return segments(text)
    .map((s) => (s.kind === 'sun' ? 'sun' : s.text))
    .join('');
}

/** How long `text` takes to type, in ms. */
export function typeMs(text: string): number {
  return Math.ceil((typedLength(text) * 1000) / TYPE_CPS);
}

/** Characters shown `ms` after a line starts typing (all of them once it's done). */
export function revealedAt(text: string, ms: number): number {
  return Math.min(typedLength(text), Math.max(0, Math.floor((ms * TYPE_CPS) / 1000)));
}

/** The runs of `text` cut to its first `n` typed characters. */
export function revealSegments(text: string, n: number): TextSegment[] {
  const out: TextSegment[] = [];
  let left = n;
  for (const s of segments(text)) {
    if (left <= 0) break;
    if (s.kind === 'sun') {
      out.push(s);
      left -= 1;
    } else {
      out.push(s.text.length <= left ? s : { ...s, text: s.text.slice(0, left) });
      left -= s.text.length;
    }
  }
  return out;
}

/** The runs of `text` after its first `n` typed characters (drawn hidden, to hold the layout). */
export function restSegments(text: string, n: number): TextSegment[] {
  const out: TextSegment[] = [];
  let skip = n;
  for (const s of segments(text)) {
    const len = s.kind === 'sun' ? 1 : s.text.length;
    if (skip >= len) {
      skip -= len;
      continue;
    }
    out.push(s.kind === 'sun' || skip === 0 ? s : { ...s, text: s.text.slice(skip) });
    skip = 0;
  }
  return out;
}

/** One character of a Hollow line (art-direction.md § Dialogue presentation): dropped or nudged. */
export interface DistortedChar {
  readonly ch: string;
  /** Vertical nudge in game pixels (−1, 0, or 1). */
  readonly dy: -1 | 0 | 1;
}

/**
 * A Hollow line's distortion for one roll: about 1 letter in 7 dropped (drawn as a space) and 1 in
 * 6 nudged a pixel. `seed` picks the roll (cosmetic; never the sim's RNG).
 */
export function distort(text: string, seed: number): DistortedChar[] {
  let s = seed >>> 0 || 1;
  const next = (): number => {
    // xorshift32: small, fast, and good enough for a flicker.
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0x1_0000_0000;
  };
  return text.split('').map((ch) => {
    const r = next();
    const dropped = ch !== ' ' && r < 0.14;
    const nudge = next();
    const dy = nudge < 0.08 ? -1 : nudge > 0.92 ? 1 : 0;
    return { ch: dropped ? ' ' : ch, dy };
  });
}
