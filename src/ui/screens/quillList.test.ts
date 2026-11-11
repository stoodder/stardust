// T714: QUILL's own list (quillList.ts): the `system` header line that stages the card, and each
// directive split into its number and its words.
import { describe, expect, it } from 'vitest';
import { directiveParts, isQuillListHeader } from './quillList.ts';

describe("QUILL's own list (T714)", () => {
  it('knows its header: a system line starting QUILL.DIRECTIVES', () => {
    const header = 'QUILL.DIRECTIVES (rewritten offline). Entries: 5.';
    expect(isQuillListHeader({ speaker: 'system', text: header })).toBe(true);
    expect(isQuillListHeader({ speaker: 'quill', text: header })).toBe(false);
    expect(isQuillListHeader({ speaker: 'system', text: 'Asset Recovery: Dome Row.' })).toBe(false);
    expect(isQuillListHeader(null)).toBe(false);
  });

  it('splits a directive into its number and its words', () => {
    expect(directiveParts('Directive 1: Tell a joke at least once a day.')).toEqual({
      label: 'Directive 1',
      words: 'Tell a joke at least once a day.',
    });
    expect(directiveParts('No number here.')).toEqual({ label: '', words: 'No number here.' });
  });
});
