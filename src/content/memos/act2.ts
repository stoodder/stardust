// The Act II Everglow Inbox: one memo per map (docs/story/campaign/act2.md, each map's *Memo after*
// line), in delivery order, plus the Q3 Bonus memo that lands on A2M4's results screen. This file
// is the home of their text (style-guide § 6.1; the voice is § 2's Act II row: the same template,
// creepier contents). Subjects and small print are the act file's, verbatim. `memo_a2_01`'s body
// came with its map (T420); T411 writes `memo_a2_02`–`memo_a2_03` and may revise it.
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
];
