// C5 on its stage (story/campaign/finale.md § FIN, *C5*; bible.md § 9; T810): the finale's last
// question, full-screen at dawn (`fin_m01_scene_c5`, staging `c5`). The KFA relay's answer is filed
// on a form at the top of the stage as each clause is read (the `kfa` lines said so far), so the
// terms stay up, whole, while the voices speak and the two lines are offered; the lines play below
// on their own, one at a time, with no history above them (D153: one thing at a time). Pure: the
// form is a function of the lines said; the stage (c5Stage.tsx) draws. Silent. Reduced motion
// shortens the lead-in and files each clause without its slide.

/** The quiet before the first line (ms; `stagingLeadInMs` for `c5`): the dawn, nothing else. */
export const C5_LEAD_IN_MS = 1400;
export const C5_LEAD_IN_STILL_MS = 600;

export function c5LeadInMs(still: boolean): number {
  return still ? C5_LEAD_IN_STILL_MS : C5_LEAD_IN_MS;
}

/** The speaker whose lines are the form's clauses (content/dialogue/speakers.ts). */
export const KFA_SPEAKER = 'kfa';

/** The form's header: the KFA's name, then what it is (UI copy; style-guide.md § 6). */
export const C5_FORM_BRAND = 'Kepler Frontier Authority';
export const C5_FORM_TITLE = 'Relay response · Tumble IV';

/** A line as the stage reads it. */
interface SaidLine {
  readonly speaker: string;
  readonly text: string;
}

/** The clauses filed so far: the KFA's lines already said, in order. */
export function filedClauses(said: readonly SaidLine[]): string[] {
  return said.filter((l) => l.speaker === KFA_SPEAKER).map((l) => l.text);
}

/** The screen reader's account of the stage (aria-hidden; the lines speak for themselves). */
export function c5Label(clauses: number): string {
  return clauses === 0
    ? 'Dawn over the valley.'
    : `Dawn over the valley. The KFA's answer, ${clauses} clause${clauses === 1 ? '' : 's'} filed.`;
}
