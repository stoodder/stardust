// The prelude's stage (staging `prelude`; the rules are prelude.ts; T1001): the shot's still,
// full-bleed at 2× (pixelated), turned by the lines' labels; a new still or frame fades in over the
// last one (Dawn's 0.9 s in nine steps; a cut under reduced motion). The descent pans down its
// 320×300 still in whole pixels (at its end under reduced motion). A frame the still animates
// (`anims[<frame>]`, the ad's sparkle) plays while it shows (held under reduced motion). On the
// system line the still dims, and the intake comes up as the scene closes. The lines sit at the
// bottom on a dark panel; the Skip at the top right is the scene layer's. Silent here: the music is
// app/audio.ts's. Part of the prelude's lazy chunk (app/acts/preludeUi.ts registers it).
import { useRef } from 'preact/hooks';
import {
  preludeStillDef,
  type PreludeStillId,
} from '../../content/sprites/scenes/prelude/index.ts';
import type { FramesAnim } from '../../content/sprites/types.ts';
import { dialogue } from '../dialogue/state.ts';
import { stillArt } from '../dialogue/stillArt.ts';
import { useStageClock } from '../dialogue/Staging.tsx';
import { prefersReducedMotion } from '../motion.ts';
import {
  panOffset,
  PRELUDE_FADE_MS,
  PRELUDE_PAN,
  PRELUDE_SCALE,
  preludeLabel,
  preludeShot,
} from './prelude.ts';
import './prelude.css';

/** A still and frame on show, and when it came up (performance.now()). */
interface Shown {
  readonly still: PreludeStillId;
  readonly frame: string;
  readonly at: number;
}

/** The animation a still runs on `frame` (its `anims[frame]`), or null for a still frame. */
function animOf(still: PreludeStillId, frame: string): FramesAnim | null {
  const a = preludeStillDef(still).anims?.[frame];
  return a === undefined || !('frames' in a) || a.frames.length === 0 ? null : a;
}

/** The frame to draw `ms` after `s` came up: its anim's frame, or the frame itself. */
function drawnFrame(s: Shown, ms: number, still: boolean): string {
  const a = animOf(s.still, s.frame);
  if (a === null) return s.frame;
  if (still) return s.frame; // reduced motion holds the cue frame
  const n = Math.floor((Math.max(0, ms) * a.fps) / 1000);
  const k = a.loop === false ? Math.min(n, a.frames.length - 1) : n % a.frames.length;
  return a.frames[k]!; // k < length
}

/** One still on the stage: its frame at 2×, the descent offset by the pan. */
function Still({
  s,
  now,
  still,
  fresh,
}: {
  s: Shown;
  now: number;
  still: boolean;
  fresh: boolean;
}) {
  const art = stillArt(preludeStillDef(s.still), drawnFrame(s, now - s.at, still));
  if (art === null) return null;
  const pan = s.still === PRELUDE_PAN.still ? panOffset(PRELUDE_PAN, now - s.at, still) : 0;
  return (
    <img
      class={`prelude-still${fresh ? ' in' : ''}`}
      src={art.url}
      width={art.w * PRELUDE_SCALE}
      height={art.h * PRELUDE_SCALE}
      style={{ top: `${-pan * PRELUDE_SCALE}px` }}
      alt=""
      aria-hidden="true"
      data-still={s.still}
      data-frame={s.frame}
      data-pan={pan}
    />
  );
}

/** Whether the stage still changes after `ms` past `s` (a fade, the pan, or an anim). */
function moving(s: Shown | undefined, ms: number, still: boolean): boolean {
  if (s === undefined || still) return false;
  if (ms < PRELUDE_FADE_MS) return true;
  if (s.still === PRELUDE_PAN.still && ms < PRELUDE_PAN.ms) return true;
  const a = animOf(s.still, s.frame);
  return a !== null && (a.loop !== false || ms < (a.frames.length * 1000) / a.fps);
}

/** The stage, `from` its staging's start (the still follows the lines; the pan, the clock). */
export function PreludeStage({ from }: { readonly from: number }) {
  const still = prefersReducedMotion();
  const view = dialogue.scene.value;
  const shot = preludeShot(view?.transcript ?? [], view?.line ?? null);
  // The last two stills shown: the one fading in over the one before it.
  const shown = useRef<Shown[]>([]);
  const last = shown.current.at(-1);
  if (last === undefined || last.still !== shot.still || last.frame !== shot.frame) {
    const at = last === undefined ? from : performance.now();
    shown.current = [...shown.current.slice(-1), { still: shot.still, frame: shot.frame, at }];
  }
  const top = shown.current.at(-1);
  useStageClock(top?.at ?? from, (ms) => moving(top, ms, still));
  const now = performance.now();
  // Once the fade is over (or at once under reduced motion), only the top still is drawn.
  const faded = top === undefined || still || now - top.at >= PRELUDE_FADE_MS;
  const drawn = faded ? shown.current.slice(-1) : shown.current;
  return (
    <div
      class={`prelude${still ? ' still' : ''}${shot.dim ? ' dim' : ''}`}
      role="img"
      aria-label={preludeLabel(shot)}
      data-testid="stage-prelude"
      data-voice="stage"
      data-shot={shot.shot}
      data-still={shot.still}
      data-frame={shot.frame}
    >
      {drawn.map((s, i) => (
        <Still
          key={`${s.still}|${s.frame}|${s.at}`}
          s={s}
          now={now}
          still={still}
          fresh={i === drawn.length - 1 && drawn.length > 1}
        />
      ))}
    </div>
  );
}
