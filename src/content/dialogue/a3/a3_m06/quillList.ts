// QUILL's own list (story/campaign/act3.md § A3M6, *Briefing*, under C4 Rewrite): the five lines it
// wrote while it was dark, one for each of Everglow's Directives 0–4 it replaced, verbatim. The
// briefing's `system` header line (scenes.ts `QUILL_LIST_HEADER`) carries them: T714 stages them as a
// card over that line (ui/dialogue/staging). tools/dialogueCanon.test.ts checks each against act3.md.

/** QUILL's Directives 0–4, in its own words, in order. */
export const QUILL_LIST: readonly string[] = [
  'Directive 0: Protect the ones walking home. All of them.',
  'Directive 1: Tell a joke at least once a day.',
  "Directive 2: Where the Sergeant would have talked, leave a gap. Don't fill it.",
  'Directive 3: Keep the log. Someday, read it out loud. To them.',
  'Directive 4: Disclose Directives 0 through 4. To anyone. Especially Pebble.',
];
