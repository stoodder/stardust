// Act II's act-wide barks (story/campaign/act2.md: the act's shared pools, verbatim): barks that
// fire on more than one Act II map, each gated by its own `when` (act, map, flags) and by presence.
// One file for the act, where Act I keeps one per trigger (this file may split by trigger as it
// grows). Ids are `<speaker>_<trigger>_a2_<nn>`, so the canon test reads them against act2.md.
// Registered empty (T400b); A2M1's task (T420) writes the first ones.
import { defineBarks } from '../define.ts';

export const act2Barks = defineBarks([]);
