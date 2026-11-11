// Gerald's mail (act3.md § A3M4, `a3_m04_scene_mail`; T714): the staging under the scene's
// captions, full-screen over the frozen shelters before A3M4's card. The envelope lands shut and
// opens (the lead-in); then each of its three papers comes out as the caption that reads it shows:
// Bricks's pension form (Form P-19, the beneficiary line), the fire-control key's slip, and, from the
// bottom of Gerald's sack, Kip's slip with nothing on it but a batch number. The papers stay out,
// the newest lit, the ones before it dimmed. Pure: which paper shows is a function of the lines
// read so far, so the stage (mailStage.tsx) only draws. Silent; reduced motion holds stills (the
// envelope open, the papers in place, no slide).

/** The papers in Gerald's envelope, in the order the scene reads them. */
export type MailPaper = 'pension' | 'key' | 'kip';
export const MAIL_PAPERS: readonly MailPaper[] = ['pension', 'key', 'kip'];

/** The envelope as it lands, shut, before its flap opens (ms). */
export const ENVELOPE_SHUT_MS = 1000;
/** The flap opening (ms); the lead-in ends as it does. */
export const ENVELOPE_OPEN_MS = 600;
/** Under reduced motion: the envelope already open, a beat to see it before the first caption. */
export const ENVELOPE_STILL_MS = 800;

/** How long the envelope leads the captions (ms; `stagingLeadInMs` for `mail`). */
export function mailLeadInMs(still: boolean): number {
  return still ? ENVELOPE_STILL_MS : ENVELOPE_SHUT_MS + ENVELOPE_OPEN_MS;
}

/** The envelope's state `ms` after the staging starts. */
export function envelopeAt(ms: number, still: boolean): 'shut' | 'opening' | 'open' {
  if (still) return 'open';
  if (ms < ENVELOPE_SHUT_MS) return 'shut';
  return ms < ENVELOPE_SHUT_MS + ENVELOPE_OPEN_MS ? 'opening' : 'open';
}

/** The words a line says ('' for a silence). */
interface ReadLine {
  readonly text: string;
}

/**
 * How many papers are out once `said` (the lines shown so far, the current one included): one per
 * spoken caption (a silence brings none: "Nobody comments"), at most the three.
 */
export function papersOut(said: readonly ReadLine[]): number {
  return Math.min(MAIL_PAPERS.length, said.filter((l) => l.text !== '').length);
}

/** The papers on the desk once `out` are out, each lit (the newest) or not. */
export function papersShown(out: number): { paper: MailPaper; lit: boolean }[] {
  return MAIL_PAPERS.slice(0, Math.max(0, out)).map((paper, i) => ({ paper, lit: i === out - 1 }));
}

/** The pension form's printed fields (codex `codex_pension_form`: Form P-19). */
export const PENSION_FORM = {
  title: 'Form P-19',
  subtitle: 'Nomination of Beneficiary',
  fields: [
    ['Employee', 'Sgt. I. Okonkwo'],
    ['Service', '19 years'],
  ],
  beneficiaryLabel: 'Beneficiary',
  /** In his hand (act3.md § A3M4). */
  beneficiary: 'Pebble, c/o the Deep Halls.',
  signatureLabel: 'Signed',
  /** The stamp Gerald's delivery earns (his status line: "DELIVERY: COMPLETE."). */
  stamp: 'Received',
} as const;

/** The fire-control key's slip, in Bricks's hand (act3.md § A3M4). */
export const KEY_SLIP = 'Fire-control key. For Thorn. Point it at the bad stuff.';

/** Kip's slip: no words at all, only the plant's first batch number (act3.md § A3M4). */
export const KIP_BATCH = 'R2-0001';

/** The envelope's face. */
export const ENVELOPE = {
  from: 'Sgt. I. Okonkwo',
  to: 'Thorn',
  /** Gerald's mark (his status line, a3_m04_w08). */
  mark: 'Delivery: complete',
} as const;

/** The screen reader's account of the papers out (the stage is aria-hidden; the captions speak). */
export function mailLabel(out: number): string {
  const parts = [
    'Gerald’s envelope, open',
    'Bricks’s pension form, re-filed and signed',
    'a slip with a fire-control key',
    'a slip with only a batch number',
  ];
  return `${parts.slice(0, 1 + Math.max(0, Math.min(3, out))).join('; ')}.`;
}
