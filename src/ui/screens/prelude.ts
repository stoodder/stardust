// The prelude, "Arrival" (story/campaign/act1.md § Prelude · Arrival; core-loop.md § 6.1;
// T1001): `a1_m01_scene_prelude`, full-screen before the New Hire Intake on a new campaign
// (staging `prelude`). Seven shots over six code-generated stills (sprites/scenes/prelude/), turned
// by the lines' labels (stillCues.ts): the Everglow ad, the freighter, the viewport (Dawn's pose),
// the descent (a 320×300 still panned 0 → 120 px down, whole pixels), touchdown, Dome Row, and
// Gerald's delivery, on whose last line the still dims and the intake rises. The lines advance by
// themselves (staging.ts `autoAdvanceHoldMs`); Skip and Esc end the whole scene. Pure: the shot,
// still, frame, and pan offset are functions of the lines and the clock; the stage
// (preludeStage.tsx, in the prelude's lazy chunk) draws. Reduced motion: the pan rests at its end,
// crossfades cut, frame flips stay.
import type { PreludeStillId } from '../../content/sprites/scenes/prelude/index.ts';
import { cueIndex, type CuedLine, type LabelCue } from '../dialogue/stillCues.ts';

/** The prelude's scene id (the content gate's Act I; story.seen gets it as the intake is signed). */
export const PRELUDE_SCENE = 'a1_m01_scene_prelude';

/** A prelude cue: a line's label → the still and frame it brings up, and the shot it opens or is in. */
export interface PreludeCue extends LabelCue<PreludeStillId, string> {
  readonly shot: number;
}

/**
 * The cue table (seams: one row per labelled line, in scene order). The prelude's tests hold every
 * label to the scene's data and every frame to its still.
 */
export const PRELUDE_CUES: readonly PreludeCue[] = [
  { label: 'p_ad', still: 'scene.prelude_ad', frame: 'ad', shot: 1 },
  { label: 'p_small_print', still: 'scene.prelude_ad', frame: 'small_print', shot: 1 },
  { label: 'p_haul', still: 'scene.freighter', frame: 'cabin', shot: 2 },
  { label: 'p_view', still: 'scene.viewport', frame: 'ad_on', shot: 3 },
  { label: 'p_unplug', still: 'scene.viewport', frame: 'ad_off', shot: 3 },
  { label: 'p_descent', still: 'scene.descent', frame: 'still', shot: 4 },
  { label: 'p_touchdown', still: 'scene.touchdown', frame: 'one', shot: 5 },
  { label: 'p_incident', still: 'scene.touchdown', frame: 'zero', shot: 5 },
  { label: 'p_dome_row', still: 'scene.dome_row', frame: 'still', shot: 6 },
  { label: 'p_wave', still: 'scene.dome_row', frame: 'wave', shot: 6 },
  { label: 'p_delivery', still: 'scene.dome_row', frame: 'gerald', shot: 7 },
];

/** The system line's label: the still dims under it and the intake rises as the scene ends. */
export const PRELUDE_FORM_LABEL = 'p_form';

/** How many shots the prelude has. */
export const PRELUDE_SHOTS = 7;

/** What the stage shows. */
export interface PreludeShot {
  /** 1–7. */
  readonly shot: number;
  readonly still: PreludeStillId;
  readonly frame: string;
  /** The still dims under the system line (Form FF-1), the intake's cue. */
  readonly dim: boolean;
}

/** The first cue: what shows during the lead-in, before the first line. */
const FIRST: PreludeCue = PRELUDE_CUES[0]!; // a literal non-empty table

/** The shot on show: the last cue said or on screen (the ad before any). */
export function preludeShot(said: readonly CuedLine[], current: CuedLine | null): PreludeShot {
  const cue = PRELUDE_CUES[cueIndex(PRELUDE_CUES, said, current)] ?? FIRST;
  const dim = [...said, ...(current === null ? [] : [current])].some(
    (l) => l.label === PRELUDE_FORM_LABEL,
  );
  return { shot: cue.shot, still: cue.still, frame: cue.frame, dim };
}

/** The stills in the order the shots first show them (each drawn once on the stage). */
export const PRELUDE_STILL_ORDER: readonly PreludeStillId[] = [
  ...new Set(PRELUDE_CUES.map((c) => c.still)),
];

// ─── Timing ──────────────────────────────────────────────────────────────────────────────────

/** The ad alone before the first line (ms; `stagingLeadInMs` for `prelude`). */
export const PRELUDE_LEAD_IN_MS = 1500;
export const PRELUDE_LEAD_IN_STILL_MS = 600;

export function preludeLeadInMs(still: boolean): number {
  return still ? PRELUDE_LEAD_IN_STILL_MS : PRELUDE_LEAD_IN_MS;
}

/**
 * Next, Skip, and Esc take no press this long from the start (ms; `stagingLockMs`), so the press
 * that started the shift can't carry through and skip it.
 */
export const PRELUDE_LOCK_MS = 700;

/** How one still crossfades into the next (ms; Dawn's; a cut under reduced motion). */
export const PRELUDE_FADE_MS = 900;

/** The stills' scale on the 640×360 stage (game px per still px; Dawn's). */
export const PRELUDE_SCALE = 2;

/**
 * The descent's pan (shot 4): the 320×300 still shows its top 180 rows as the shot opens and
 * tilts down to its bottom 180 over `ms`, in whole still pixels (no sub-pixel smear).
 */
export const PRELUDE_PAN = {
  still: 'scene.descent',
  from: 0,
  to: 120,
  ms: 9000,
} as const satisfies {
  readonly still: PreludeStillId;
  readonly from: number;
  readonly to: number;
  readonly ms: number;
};

/**
 * The pan's offset (still px, whole) `ms` after its still came up: `from` to `to` linearly, held at
 * `to` after; at `to` at once under reduced motion (`still`).
 */
export function panOffset(
  pan: { readonly from: number; readonly to: number; readonly ms: number },
  ms: number,
  still: boolean,
): number {
  if (still || ms >= pan.ms) return pan.to;
  const t = Math.max(0, ms) / pan.ms;
  return pan.from + Math.floor((pan.to - pan.from) * t);
}

// ─── Screen readers ──────────────────────────────────────────────────────────────────────────

/** What each still and frame shows, for the stage's label (aria; the lines speak for themselves). */
const LABELS: Readonly<Record<string, string>> = {
  'scene.prelude_ad|ad': 'An Everglow ad. Evie beams over a sunlit lettuce dome: BRIGHTER EVERY DAY!',
  'scene.prelude_ad|small_print': "The ad's small print scrolls past, too fast to read.",
  'scene.freighter|cabin':
    'A freighter cabin. The ad plays on a small bulkhead screen over crates stencilled CONFETTI. You sit strapped in, the helmet far too big.',
  'scene.viewport|ad_on':
    'You, from behind, at a round viewport. Tumble IV fills the glass: green valleys, pink clay, two moons.',
  'scene.viewport|ad_off': 'You, at the viewport. Behind you, the ad screen is dark.',
  'scene.descent|still':
    'The descent: cloud, the Spires, the terraces and domes, and far below a long line of small things all going one way.',
  'scene.touchdown|one':
    "The landing pad under a cyan sky. Evie's billboard beams. A sign: DAYS WITHOUT A PEST INCIDENT: 1.",
  'scene.touchdown|zero':
    'A Nibbler skitters past. The sign now reads 0. Something small watches from a rock.',
  'scene.dome_row|still': 'Dome Row: the domes, turrets on their pads, and one road out through the gate.',
  'scene.dome_row|wave': 'By the gate, a very large figure raises one hand. The other holds a cannon.',
  'scene.dome_row|gerald': 'Gerald, the mail drone, satchel open. A clipboard lies at your boots.',
};

/** The stage's screen-reader label for a shot (as `dawnLabel` is Dawn's). */
export function preludeLabel(s: Pick<PreludeShot, 'still' | 'frame'>): string {
  return LABELS[`${s.still}|${s.frame}`] ?? 'The arrival.';
}
