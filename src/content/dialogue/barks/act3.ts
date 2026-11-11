// Act III's act-wide barks (story/campaign/act3.md § Act III barks, verbatim): barks that fire on
// more than one Act III map, each gated by its own `when` and by presence. One file for the act,
// as Act II's. Ids are `<speaker>_<trigger>_a3_<nn>`, so the canon test reads them against
// act3.md. A map's own barks (`a3/<map>/barks.ts`) sit beside these.
//
// Prim's PA greets each of Everglow Security's part-two units (T703) the first time the save meets
// it (`new_enemy`, wherever that is: A3M4's Liability, A3M5's Associate, A3M6's Gunship and Black
// Budget Operative). She is on the radio on any map whose waves send Everglow Security
// (app/dialogue.ts `presentSpeakers`), so these play under C4 Rewrite too, with QUILL offline.
import { defineBarks } from '../define.ts';
import type { Condition } from '../types.ts';

const ACT3: Condition = { act: 3 };

export const act3Barks = defineBarks([
  {
    id: 'prim_new_enemy_a3_01',
    speaker: 'prim',
    text: 'Maintenance Associate on site. Repairs: 12 per second. Please hold.',
    trigger: { on: 'new_enemy', enemy: 'associate' },
    when: ACT3,
  },
  {
    id: 'prim_new_enemy_a3_02',
    speaker: 'prim',
    text: 'Liability-Class Enforcer deployed. All liability now transfers to you.',
    trigger: { on: 'new_enemy', enemy: 'liability' },
    when: ACT3,
  },
  {
    id: 'prim_new_enemy_a3_03',
    speaker: 'prim',
    text: 'Asset Recovery Gunship inbound at 40 meters. Please remain on the ground.',
    trigger: { on: 'new_enemy', enemy: 'gunship' },
    when: ACT3,
  },
  {
    id: 'prim_new_enemy_a3_04',
    speaker: 'prim',
    text: 'No unit detected. No budget allocated. Please disregard the footsteps.',
    trigger: { on: 'new_enemy', enemy: 'blackbudget' },
    when: ACT3,
  },
]);
