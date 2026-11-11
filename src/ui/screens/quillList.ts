// QUILL's own list (act3.md § A3M6, *Briefing*, under C4 Rewrite; T714): in A3M6's briefing,
// between QUILL's "Do you want to see?" and its Directive 1, a `system` line heads the list it
// wrote while it was dark ("QUILL.DIRECTIVES (rewritten offline). Entries: 5.", T722's), and while
// that line is on screen the list itself shows as a card over the briefing: the five directives in
// its own words (content/dialogue/a3/a3_m06/quillList.ts `QUILL_LIST`). Pure; the card is
// quillListCard.tsx.

/** The header line's opening words: a `system` line starting so heads QUILL's list. */
export const QUILL_LIST_HEADER = 'QUILL.DIRECTIVES';

/** A line as the briefing shows it. */
interface ListLine {
  readonly speaker: string;
  readonly text: string;
}

/** Whether `l` is the list's header (the card shows while it is the line on screen). */
export function isQuillListHeader(l: ListLine | null): boolean {
  return l !== null && l.speaker === 'system' && l.text.startsWith(QUILL_LIST_HEADER);
}

/** One directive split for the card: "Directive 1" and its words (the whole entry without one). */
export function directiveParts(entry: string): { readonly label: string; readonly words: string } {
  const m = /^(Directive \d+):\s*(.*)$/u.exec(entry);
  return m === null ? { label: '', words: entry } : { label: m[1]!, words: m[2]! };
}
