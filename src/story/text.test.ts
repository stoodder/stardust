// Text substitution (story-runtime.md § Text substitution; conventions.md § Story runner): every
// token with each pronoun set, verb agreement, capitals, the counter's format and live value,
// glyphs, the no-profile fallback, unknown tokens, and the worst-case measure.
import { describe, expect, it } from 'vitest';
import type { PlayerProfile, PronounId } from '../content/dialogue/profile.ts';
import {
  GLYPH_CHARS,
  NO_PROFILE,
  resolveText,
  tokenProblems,
  worstCaseLength,
  type TextContext,
} from './text.ts';

const ctx = (pronouns: PronounId, over: Partial<TextContext> = {}): TextContext => {
  const profile: PlayerProfile = { name: "Jo O'Neil", pronouns, callsign: 'thorn' };
  return { profile, pestsProcessed: 1234567, evacuated: 42, ...over };
};

describe('resolveText', () => {
  it.each([
    ['she', 'she her her hers herself | She Her Her Hers Herself | is was'],
    ['he', 'he him his his himself | He Him His His Himself | is was'],
    ['they', 'they them their theirs themself | They Them Their Theirs Themself | are were'],
  ] as const)('resolves every pronoun form for %s', (p, want) => {
    const text =
      '{they} {them} {their} {theirs} {themself} | {They} {Them} {Their} {Theirs} {Themself} | {v:are|is} {v:were|was}';
    expect(resolveText(text, ctx(p))).toBe(want);
  });

  it('resolves the name, callsign, counter, meter, and glyphs', () => {
    expect(resolveText('{name}, {callsign}.', ctx('she'))).toBe("Jo O'Neil, Thorn.");
    expect(resolveText('Processed: {pests_processed}', ctx('she'))).toBe('Processed: 1,234,567');
    expect(resolveText('Evacuated: {evacuated}.', ctx('she'))).toBe('Evacuated: 42.');
    expect(resolveText('{evacuated}', ctx('she', { evacuated: null }))).toBe('0');
    expect(resolveText('Evie{glyph:sun} {glyph:star}', ctx('she'))).toBe(
      `Evie${GLYPH_CHARS.sun} ${GLYPH_CHARS.star}`,
    );
  });

  it('leaves plain text, emphasis, and parentheticals alone', () => {
    const t = 'It *is* Wednesday. (hum, six notes) (Per policy.)';
    expect(resolveText(t, ctx('they'))).toBe(t);
    expect(resolveText('', ctx('they'))).toBe('');
  });

  it('falls back to the no-profile forms before the intake', () => {
    expect(NO_PROFILE.pronouns).toBe('they');
    const none = ctx('she', { profile: null });
    expect(resolveText('{name} {callsign}: {They} {v:are|is}', none)).toBe(
      'Technician Sprout: They are',
    );
  });

  it('throws on an unknown or malformed token', () => {
    expect(() => resolveText('{nmae}', ctx('she'))).toThrow('unknown token');
    expect(() => resolveText('{v:are}', ctx('she'))).toThrow('malformed');
    expect(() => resolveText('{glyph:moon}', ctx('she'))).toThrow('unknown glyph');
    expect(() => resolveText('oops {name', ctx('she'))).toThrow("unclosed '{'");
  });
});

describe('worstCaseLength and tokenProblems', () => {
  it('counts tokens at their worst case (style-guide § 5.4)', () => {
    expect(worstCaseLength('{name}')).toBe(16);
    expect(worstCaseLength('{callsign}')).toBe(9);
    expect(worstCaseLength('{pests_processed}')).toBe(9);
    expect(worstCaseLength('{they}{them}{their}{theirs}{themself}')).toBe(4 + 4 + 5 + 6 + 8);
    expect(worstCaseLength('{Themself}')).toBe(8);
    expect(worstCaseLength('{v:were|was}')).toBe(4);
    expect(worstCaseLength('{glyph:sun}')).toBe(1);
    expect(worstCaseLength('Hi, {name}!')).toBe(4 + 16 + 1);
    expect(worstCaseLength('—…')).toBe(2);
  });

  it('lists every problem, and none for good text', () => {
    expect(tokenProblems('Do it, {name}. {v:are|is} {glyph:star}')).toEqual([]);
    expect(tokenProblems('{x} {glyph:moon} {v:a|} }')).toHaveLength(4);
  });
});
