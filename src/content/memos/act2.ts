// The Act II Everglow Inbox: one memo per map (docs/story/campaign/act2.md, each map's *Memo after*
// line), in delivery order, plus A2M2's KFA form and the Q3 Bonus memo that lands on A2M4's results
// screen (M5). This file is the home of their text (style-guide § 6.1; the voice is § 2's Act II
// row: the same template, creepier contents). Subjects and small print are the act file's,
// verbatim.
//
// The KFA form (`memo_a2_02_kfa`) is its own Inbox item, set as a form (`format: 'form'`): the
// automated filing that went out by mistake. It is delivered just before Sterling's memo, so her
// "Please disregard it" is the newest item and opens first, with the form right under it, unread.
// It speaks the KFA's dialect (races.md: numbered regulations, passive voice, "the undersigned")
// and calls the incident what it is.
import type { MemoDef } from './types.ts';

const STERLING = 'Director Joy Sterling, Frontier Operations';
const TO_447 = 'Employee #ED-447 (Junior Perimeter Technician)';
const SIGN_OFF = 'Stay Everglow! {glyph:sun} — Joy';
/** A2M3's memo is Bricks's, copied to the player: it's the one he reads aloud at the debrief. */
const TO_OKONKWO = 'Sgt. I. Okonkwo (Senior Perimeter Sergeant) · cc: Employee #ED-447';

/** Every Act II memo, in delivery order. */
export const ACT2_MEMOS: readonly MemoDef[] = [
  {
    id: 'memo_a2_01',
    from: STERLING,
    to: TO_447,
    subject: 'Rig Nine: A Minor Operational Hiccup!',
    body:
      'Great news, team! Rig Nine is back on the schedule, thanks to #ED-447 and Sgt. Okonkwo! ' +
      'The rig crew are resting comfortably, and will return to their duties as soon as they ' +
      'remember what they were.\n\n' +
      'A quick reminder: field reports use the approved words. Hiccup. Minor. Resolved! ' +
      'Other words can worry people, and worry is bad for throughput.\n\n' +
      'Wellness tip: if a colleague seems quiet, give them space!',
    signOff: SIGN_OFF,
    smallPrint: 'Rig crew wellness events are covered under Plan B.',
    afterMap: 'a2_m01',
  },
  {
    id: 'memo_a2_02_kfa',
    format: 'form',
    from: 'KFA Incident Relay, Tumble IV',
    to: 'Charter Holder (Everglow Dynamics) · cc: all personnel',
    subject: 'Form 7-C: First Contact Incident 2361-A',
    body:
      'The undersigned relay reports the following, as required under KFA Reg. 7.001.\n\n' +
      '1. Class: first contact. The contacted party is non-human, intelligent, and speaks.\n' +
      '2. Site: Ridge Rigs 7 and 8, Tumble IV.\n' +
      '3. Damage: extraction equipment only. Habitats: none. Persons: none.\n' +
      '4. Prior contact on file: none found. (1 related item, 2355: misfiled.)\n' +
      "5. Charter holder's description: vandalism.\n\n" +
      'The charter holder is to file Form 7-D (Review of Contact) within 30 days.\n\n' +
      'Status: filed, pending.',
    signOff: 'Signature: pending',
    smallPrint: 'Processing time: 11 weeks. Order to the Edge.',
    stamp: 'PENDING',
    afterMap: 'a2_m02',
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
      'Rigs 7 and 8 will be back online by Friday. Not one home was touched. Lucky us!\n\n' +
      'An automated form went out by mistake. Please disregard it. It will stay pending!',
    signOff: SIGN_OFF,
    smallPrint: 'Incident footage is retained by Legal. The vandal is not to be described as sad.',
    afterMap: 'a2_m02',
  },
  {
    id: 'memo_a2_03',
    from: STERLING,
    to: TO_OKONKWO,
    subject: 'Pension Restructuring Opportunity!',
    body:
      'Great news, Sergeant! After nineteen years of loyal service, your pension has been ' +
      'restructured into something even better: a Lifetime Company Store Coupon, good for one (1) ' +
      'Everglow item of your choice! No more counting down the days!\n\n' +
      'The Long Dusk calls for flexibility, and flexibility starts at the top. Near the top. ' +
      'It starts with you!\n\n' +
      'Wellness tip: retirement is a mindset. You can start it today, at your post!',
    signOff: SIGN_OFF,
    smallPrint:
      'Coupon not valid on stardust products. To name a beneficiary, file Form P-19 in person.',
    afterMap: 'a2_m03',
  },
];
