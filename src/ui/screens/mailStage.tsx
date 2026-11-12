// Gerald's mail on the stage (act3.md § A3M4, `a3_m04_scene_mail`; T714; the rules and words are
// mail.ts): the envelope lands shut under a desk lamp's warm pool and opens, then each paper comes
// out as its caption shows (the pension form, the key's slip, Kip's blank slip), the newest lit
// and the ones before it dimmed. Drawn in DOM and pixel SVG at whole pixels; silent; aria-hidden
// with one label (the captions speak). Reduced motion: the envelope open, no slide.
import type { JSX } from 'preact';
import { prefersReducedMotion } from '../motion.ts';
import { dialogue } from '../dialogue/state.ts';
import { useStageClock } from '../dialogue/Staging.tsx';
import {
  ENVELOPE,
  envelopeAt,
  KEY_SLIP,
  KIP_BATCH,
  mailLabel,
  mailLeadInMs,
  PENSION_FORM,
  papersOut,
  papersShown,
  type MailPaper,
} from './mail.ts';
import './mail.css';

/** A pixel picture: `rows` of characters, each a 1 px cell in `colors[char]` ('.' is empty). */
export function Pixels({
  rows,
  colors,
  scale = 2,
  class: cls,
}: {
  rows: readonly string[];
  colors: Readonly<Record<string, string>>;
  scale?: number;
  class?: string;
}) {
  const w = Math.max(...rows.map((r) => r.length));
  const cells: { x: number; y: number; c: string }[] = [];
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const c = colors[r[x]!];
      if (c !== undefined) cells.push({ x, y, c });
    }
  });
  return (
    <svg
      class={cls}
      width={w * scale}
      height={rows.length * scale}
      viewBox={`0 0 ${w} ${rows.length}`}
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      {cells.map(({ x, y, c }) => (
        <rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill={c} />
      ))}
    </svg>
  );
}

/** The fire-control key, brass with a dark bit (k: edge, g: brass, h: highlight). */
const KEY_ROWS = [
  '.kkkk...........',
  'kghhgk..........',
  'kg..gkkkkkkkkkk.',
  'kg..gggggggggggk',
  'kghhgkkkkgkkgkk.',
  '.kkkk....k..k...',
];
const KEY_COLORS = { k: 'var(--sd-ink-1)', g: 'var(--sd-gold-3)', h: 'var(--sd-gold-4)' };

/** Two lines of pen, twice (the codex: "Signed twice, in pen."). */
const SIGNATURE_ROWS = [
  '..b.......b.....bb.....b....b.......',
  '.b.b..bb.b.b...b..b...b.b..b.b..bb..',
  'b...bb..b...b.b....bbb...bb...bb..b.',
  '............bb......................',
  '....b.....b......bb.....b....b......',
  '...b.b..bb.b....b..b...b.b..b.b..b..',
  '..b...bb....b..b....bbb...bb...bb.b.',
];
const PEN = { b: 'var(--sd-blue-2)' };

function Pension({ lit }: { lit: boolean }) {
  const f = PENSION_FORM;
  return (
    <div class={`ml-paper ml-pension${lit ? ' lit' : ''}`} data-paper="pension">
      <p class="ml-form-head">
        <span class="ml-form-title">{f.title}</span>
        <span class="ml-form-sub">{f.subtitle}</span>
      </p>
      <dl class="ml-form-fields">
        {f.fields.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p class="ml-form-label">{f.beneficiaryLabel}</p>
      <p class="ml-hand ml-beneficiary">{f.beneficiary}</p>
      <p class="ml-form-label">{f.signatureLabel}</p>
      <Pixels rows={SIGNATURE_ROWS} colors={PEN} class="ml-signature" />
      <span class="ml-stamp">{f.stamp}</span>
    </div>
  );
}

function KeySlip({ lit }: { lit: boolean }) {
  return (
    <div class={`ml-paper ml-slip ml-key${lit ? ' lit' : ''}`} data-paper="key">
      <Pixels rows={KEY_ROWS} colors={KEY_COLORS} class="ml-key-art" />
      <p class="ml-hand">{KEY_SLIP}</p>
    </div>
  );
}

function KipSlip({ lit }: { lit: boolean }) {
  return (
    <div class={`ml-paper ml-slip ml-kip${lit ? ' lit' : ''}`} data-paper="kip">
      <span class="ml-batch">{KIP_BATCH}</span>
    </div>
  );
}

const PAPER: Record<MailPaper, (p: { lit: boolean }) => JSX.Element> = {
  pension: Pension,
  key: KeySlip,
  kip: KipSlip,
};

/** The envelope: shut, its flap lifting, then open with the papers' edges showing. */
function Envelope({ state }: { state: 'shut' | 'opening' | 'open' }) {
  return (
    <div class={`ml-envelope ${state}`} data-envelope={state}>
      <span class="ml-flap" />
      <p class="ml-env-from">{ENVELOPE.from}</p>
      <p class="ml-env-to">{ENVELOPE.to}</p>
      <span class="ml-env-mark">{ENVELOPE.mark}</span>
    </div>
  );
}

/** The mail's stage, `from` its staging's start (performance.now()). */
export function MailStage({ from }: { from: number }) {
  const still = prefersReducedMotion();
  const lead = mailLeadInMs(still);
  // Redraw through the lead-in (still or not: the first paper comes out as it ends).
  const ms = useStageClock(from, (t) => t < lead + 50);
  const view = dialogue.scene.value;
  const said =
    view === null ? [] : [...view.transcript, ...(view.line === null ? [] : [view.line])];
  const out = ms < lead ? 0 : papersOut(said);
  return (
    <div
      class={`ml${still ? ' still' : ''}`}
      role="img"
      aria-label={mailLabel(out)}
      data-testid="stage-mail"
      data-voice="stage"
      data-out={out}
    >
      <div class="ml-desk" aria-hidden="true">
        <Envelope state={envelopeAt(ms, still)} />
        {papersShown(out).map(({ paper, lit }) => {
          const Paper = PAPER[paper];
          return <Paper key={paper} lit={lit} />;
        })}
      </div>
    </div>
  );
}
