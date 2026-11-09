// Act II's act-wide barks (story/campaign/act2.md § Act II barks, verbatim): barks that fire on more
// than one Act II map, each gated by its own `when` (act, map, flags) and by presence. One file for
// the act, where Act I keeps one per trigger (this file may split by trigger as it grows). Ids are
// `<speaker>_<trigger>_a2_<nn>`, so the canon test reads them against act2.md. A map's own barks
// (`a2/<map>/barks.ts`) sit beside these and pick by specificity like Act I's.
import { defineBarks } from '../define.ts';
import type { Condition } from '../types.ts';

const ACT2: Condition = { act: 2 };
/** Before Second Harvest, where the jingle turns minor (A2M4): out here it only *feels* off. */
const ACT2_EARLY: Condition = { all: [{ act: 2 }, { not: { mapAtLeast: 'a2_m04' } }] };

export const act2Barks = defineBarks([
  // A runner fleeing the Hollow killed by the player (core-loop.md § 6.3; once per map).
  {
    id: 'quill_skitterkin_killed_ahead_a2_01',
    speaker: 'quill',
    expression: 'worried',
    text: 'That one was running. From it.',
    trigger: { on: 'skitterkin_killed_ahead' },
    when: ACT2,
  },
  // The first hush on a map (enemies.md § The hush rule).
  {
    id: 'quill_skitterkin_hushed_a2_01',
    speaker: 'quill',
    expression: 'worried',
    text: "It caught one. It's heavier now. Faster. ...Logging it.",
    trigger: { on: 'skitterkin_hushed' },
    when: ACT2,
  },
  // The first Mote the save meets, wherever that is.
  {
    id: 'quill_new_enemy_a2_01',
    speaker: 'quill',
    expression: 'worried',
    text: "Unknown signature. It isn't on any list. I've checked every list.",
    trigger: { on: 'new_enemy', enemy: 'mote' },
    when: ACT2,
  },
  // The jingle, A2M1–A2M3.
  {
    id: 'bricks_wave_cleared_a2_01',
    speaker: 'bricks',
    text: 'Jingle sounds different out here.',
    trigger: { on: 'wave_cleared' },
    when: ACT2_EARLY,
  },
]);
