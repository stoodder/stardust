// The Act II Everglow Inbox: one memo per map (docs/story/campaign/act2.md, each map's *Memo after*
// line), in delivery order, plus the Q3 Bonus memo that lands on A2M4's results screen. This file
// is the home of their text (style-guide § 6.1; the voice is § 2's Act II row: the same template,
// creepier contents). Subjects and small print are the act file's, verbatim. `memo_a2_01`'s and
// `memo_a2_02`'s bodies came with their maps (T420, T421); T411 writes `memo_a2_03` and may revise
// them. `memo_a2_02` carries A2M2's KFA form as its last paragraph (the act file's "plus a KFA
// form"): the automated filing Sterling asks everyone to disregard, which calls it what it is.
import type { MemoDef } from './types.ts';

const STERLING = 'Director Joy Sterling, Frontier Operations';
const TO_447 = 'Employee #ED-447 (Junior Perimeter Technician)';
const SIGN_OFF = 'Stay Everglow! {glyph:sun} — Joy';

/** Every Act II memo, in delivery order. */
export const ACT2_MEMOS: readonly MemoDef[] = [
  {
    id: 'memo_a2_01',
    from: STERLING,
    to: TO_447,
    subject: 'Rig Nine: A Minor Operational Hiccup!',
    body:
      'Great news, team! Rig Nine is back on the schedule, thanks to #ED-447 and Sgt. Okonkwo! ' +
      'The rig crew are resting comfortably and enjoying some well-earned quiet time.\n\n' +
      'A quick reminder: field reports use the approved words. Hiccup. Minor. Resolved! ' +
      'Other words can worry people, and worry is bad for throughput.\n\n' +
      'Wellness tip: if a colleague seems quiet, give them space!',
    signOff: SIGN_OFF,
    smallPrint: 'Rig crew wellness events are covered under Plan B.',
    afterMap: 'a2_m01',
  },
  {
    id: 'memo_a2_02',
    from: STERLING,
    to: TO_447,
    subject: 'Re: Incident 2361-A. Please Use "Vandalism" in All Correspondence!',
    body:
      'Quick housekeeping, team! Some ridge reports used words like "construct," "intelligent," ' +
      'and "she." The approved word is vandalism. It is accurate, it is insurable, and Legal ' +
      'loves it!\n\n' +
      'An automated form went out by mistake. Please disregard it. It will stay pending!\n\n' +
      'KFA FORM 7-C · FIRST CONTACT INCIDENT 2361-A\n' +
      'Status: filed, pending.',
    signOff: SIGN_OFF,
    afterMap: 'a2_m02',
  },
];
