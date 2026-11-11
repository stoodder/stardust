// T714: QUILL's own list (quillList.ts): the `system` header line that stages the card, and each
// directive split into its number and its words.
import { describe, expect, it } from 'vitest';
import { directiveParts, isQuillListHeader, quillListUp } from './quillList.ts';

describe("QUILL's own list (T714)", () => {
  it('knows its header: a system line starting QUILL.DIRECTIVES', () => {
    const header = 'QUILL.DIRECTIVES (rewritten offline). Entries: 5.';
    expect(isQuillListHeader({ speaker: 'system', text: header })).toBe(true);
    expect(isQuillListHeader({ speaker: 'quill', text: header })).toBe(false);
    expect(isQuillListHeader({ speaker: 'system', text: 'Asset Recovery: Dome Row.' })).toBe(false);
    expect(isQuillListHeader(null)).toBe(false);
  });

  it("stays up through QUILL's line after the header (its payoff; D151), then goes", () => {
    const header = { speaker: 'system', text: 'QUILL.DIRECTIVES (rewritten offline).' };
    const ask = { speaker: 'quill', text: 'I wrote them while I was dark. Do you want to see?' };
    const payoff = { speaker: 'quill', text: 'Directive 1, written by me: tell a joke.' };
    expect(quillListUp(ask, null)).toBe(false);
    expect(quillListUp(header, ask)).toBe(true);
    expect(quillListUp(payoff, header)).toBe(true);
    expect(quillListUp({ speaker: 'kip', text: 'Hm.' }, header)).toBe(false);
    expect(quillListUp(null, payoff)).toBe(false);
    expect(quillListUp(payoff, ask)).toBe(false);
  });

  it('splits a directive into its number and its words', () => {
    expect(directiveParts('Directive 1: Tell a joke at least once a day.')).toEqual({
      label: 'Directive 1',
      words: 'Tell a joke at least once a day.',
    });
    expect(directiveParts('No number here.')).toEqual({ label: '', words: 'No number here.' });
  });
});
