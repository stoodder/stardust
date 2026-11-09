// A dialogue line's text as it types (art-direction.md § Dialogue presentation): a typewriter at
// TYPE_CPS that a click or Enter finishes, `*word*` in italics, the Evie sun glyph, and the
// Hollow's distortion (re-rolled every 6 frames; plain grey under reduced motion). Screen readers
// get the whole line at once: the typed copy is hidden from them.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { SpeakerId } from '../../content/dialogue/types.ts';
import { prefersReducedMotion } from '../motion.ts';
import {
  distort,
  plainText,
  restSegments,
  revealedAt,
  revealSegments,
  typedLength,
  type TextSegment,
} from './text.ts';
import type { LineView } from './state.ts';

/** How often the typewriter (and the Hollow's flicker) redraws, in ms. */
const TICK_MS = 25;
/** The Hollow's distortion re-rolls every 6 frames (art-direction.md § Dialogue presentation). */
const HOLLOW_ROLL_MS = 100;

let typeTick: ((speaker: SpeakerId) => void) | null = null;

/** A hook for each character the typewriter types (T314's tick sound); null for none. */
export function setTypeTick(fn: ((speaker: SpeakerId) => void) | null): void {
  typeTick = fn;
}

export interface Typewriter {
  /** Characters shown. */
  readonly shown: number;
  readonly done: boolean;
  /** Shows the rest of the line now (a click or Enter while it types). */
  readonly finish: () => void;
}

/**
 * Types `line` from the moment its id first renders. `instant` (dialogue off under `?test=1`) and
 * reduced motion show it whole; a silence has nothing to type.
 */
export function useTypewriter(line: LineView | null, instant: boolean): Typewriter {
  const total = line === null ? 0 : typedLength(line.text);
  const whole = instant || prefersReducedMotion() || total === 0;
  const start = useRef({ id: -1, at: 0, finished: false, ticked: 0 });
  if (line !== null && start.current.id !== line.id) {
    start.current = { id: line.id, at: performance.now(), finished: whole, ticked: 0 };
  }
  const [, redraw] = useState(0);
  const s = start.current;
  const shown =
    line === null ? 0 : s.finished ? total : revealedAt(line.text, performance.now() - s.at);
  const done = shown >= total;
  useEffect(() => {
    if (line === null || done) return undefined;
    const id = setInterval(() => redraw((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, [line?.id, done]);
  if (line !== null && !s.finished && shown > s.ticked) {
    s.ticked = shown;
    typeTick?.(line.speaker);
  }
  return {
    shown,
    done,
    finish: () => {
      if (start.current.finished) return;
      start.current = { ...start.current, finished: true };
      redraw((n) => n + 1);
    },
  };
}

function Runs({ runs }: { runs: readonly TextSegment[] }) {
  return (
    <>
      {runs.map((r, i) =>
        r.kind === 'sun' ? (
          <span key={i} class="dlg-glyph-sun" />
        ) : r.em ? (
          <em key={i}>{r.text}</em>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}

/** The Hollow's line: dropped letters and glyphs nudged a pixel, re-rolled as it flickers. */
function HollowText({ text, shown }: { text: string; shown: number }) {
  const still = prefersReducedMotion();
  const [roll, setRoll] = useState(1);
  useEffect(() => {
    if (still) return undefined;
    const id = setInterval(() => setRoll((n) => n + 1), HOLLOW_ROLL_MS);
    return () => clearInterval(id);
  }, [still]);
  const plain = plainText(text).slice(0, shown);
  if (still) return <span class="dlg-hollow-plain">{plain}</span>;
  return (
    <>
      {distort(plain, roll * 2_654_435_761).map((c, i) => (
        <span key={i} class={c.dy === 0 ? undefined : c.dy < 0 ? 'up' : 'down'}>
          {c.ch}
        </span>
      ))}
    </>
  );
}

/**
 * A line's text: the typed part visible (aria-hidden) and the whole line for screen readers. The
 * caller passes the typewriter (so its click can finish it).
 */
export function LineText({ line, typed }: { line: LineView; typed: Typewriter }) {
  if (line.silence) return <span class="dlg-text dlg-silence" />;
  return (
    <span class={`dlg-text${line.frame === 'distorted' ? ' dlg-hollow' : ''}`}>
      <span class="dlg-sr">{plainText(line.text)}</span>
      <span aria-hidden="true">
        {line.frame === 'distorted' ? (
          <HollowText text={line.text} shown={typed.shown} />
        ) : (
          <>
            <Runs runs={revealSegments(line.text, typed.shown)} />
            {/* The rest, hidden, so the panel doesn't grow as the line types. */}
            {!typed.done && (
              <span class="dlg-untyped">
                <Runs runs={restSegments(line.text, typed.shown)} />
              </span>
            )}
          </>
        )}
      </span>
    </span>
  );
}
