// A3M6's Dome Row as rules (act3.md § A3M6 *Layout and revisit dressing* and *Debrief*;
// art-direction §6 *Dome Row*; T730b; DomeRowView draws it). Pure, so it is unit-tested.
// - **Dome 1** (the `dome_1` marker, beside the gate) stands open to the Long Night (`open`), and
//   as the night goes on the cold gets in: its panes frost over in two steps (`frost_1` from 40%
//   of the map's waves, `frost_2` from 75%: W7 and W14 of A3M6's 18).
// - **The turn-in:** a refugee who reaches the gate (the safe exit) doesn't vanish there; it turns
//   in at Dome 1's door, a few steps from the gate to the door, and is gone inside (on sim ticks:
//   pause holds it). Under reduced motion it doesn't walk: it fades where it stands.
// - **All of them:** as the map is won, the Long Night's dark domes on the apron open one after
//   another (Goldie: "Open the domes. All of them."), in the hold before Results (real time: the
//   sim is frozen then); under reduced motion all at once. Dome 1 stays as it is.

/** Dome 1's marker and the frames it steps through. */
export const DOME_ONE = 'dome_1';
export const DOME_SPRITE = 'prop.dome' as const;
export type DomeFrost = 'open' | 'frost_1' | 'frost_2';

/** The share of the map's waves after which each frost step shows. */
export const FROST_1_SHARE = 0.4;
export const FROST_2_SHARE = 0.75;

/** Dome 1's look in wave `wave` (0 in setup) of `waveCount`. */
export function domeFrost(wave: number, waveCount: number): DomeFrost {
  if (waveCount <= 0) return 'open';
  if (wave >= Math.round(waveCount * FROST_2_SHARE)) return 'frost_2';
  if (wave >= Math.round(waveCount * FROST_1_SHARE)) return 'frost_1';
  return 'open';
}

/** The turn-in (sim ticks), and under reduced motion the fade where it stands. */
export const TURN_IN_TICKS = 40;
export const TURN_IN_STILL_TICKS = 20;
/** How far toward Dome 1's tile centre the walk goes (it ends at the door, inside the shell). */
export const TURN_IN_REACH = 0.75;
/** The last share of the walk fades it out (gone in through the door). */
const FADE_FROM = 0.55;

/** Where a turning-in refugee is. */
export interface TurnInPose {
  /** How far from the gate toward the door (0–1 of TURN_IN_REACH). */
  share: number;
  alpha: number;
  done: boolean;
}

/** The pose `ticks` into a turn-in (into `out`); `still`: reduced motion. */
export function turnInPose(ticks: number, still: boolean, out: TurnInPose): TurnInPose {
  const total = still ? TURN_IN_STILL_TICKS : TURN_IN_TICKS;
  const t = Math.max(0, ticks) / total;
  out.done = t >= 1;
  const k = Math.min(1, t);
  out.share = still ? 0 : k;
  const fade = still ? k : k <= FADE_FROM ? 0 : (k - FADE_FROM) / (1 - FADE_FROM);
  // Stepped alpha (art-direction §7): quarters, never a smooth ramp.
  out.alpha = out.done ? 0 : Math.max(0, Math.ceil((1 - fade) * 4) / 4);
  return out;
}

/** Each apron dome opens this long after the one before it, as the map is won (ms). */
export const OPEN_STAGGER_MS = 260;
/** The first one opens this long after the win (the last shot's moment first). */
export const OPEN_LEAD_MS = 200;

/** When the `k`-th apron dome opens after the win (ms); `still`: all at once. */
export function domeOpensAt(k: number, still: boolean): number {
  return still ? 0 : OPEN_LEAD_MS + k * OPEN_STAGGER_MS;
}
