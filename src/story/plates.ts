// A speaker's name plate (story/style-guide.md § 5.1; T600b, T613): the speaker registry's `names`
// rules, first match, else the speaker's own name. Bramble's plate reads "Chitterbloom" (Everglow's
// codename) until A3M1, then "Bramble". Every place that names a speaker reads it through here: the
// dialogue's lines (app/dialogue.ts `lineView`), a choice's "{Speaker} will remember that.", and
// the lines on the Results card (app/runResult.ts `spoken`). Pure.
import { SPEAKER_DEFS } from '../content/dialogue/speakers.ts';
import type { SpeakerId } from '../content/dialogue/types.ts';
import { evaluateCondition, type StoryContext } from './conditions.ts';

/** `speaker`'s name plate in `ctx`. */
export function plateName(speaker: SpeakerId, ctx: StoryContext): string {
  const def = SPEAKER_DEFS[speaker];
  return def.names?.find((r) => evaluateCondition(r.when, ctx))?.name ?? def.name;
}
