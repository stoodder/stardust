// The campaign's close on screen (T810; design/core-loop.md § 6.8; the timeline is epilogue.ts):
// over everything, one thing at a time on a dark stage (D153). Sterling's farewell memo as a card
// on its letterhead, with one way on; then (after C5, a scene) the epilogue: each card alone,
// centered, in the narrator's plain voice; the counter (PESTS PROCESSED: 0, then REMEMBERED: {n} in
// gold); the credits rolling up; and the final image by ending (Stay: the old status line reads
// PERIMETER STATUS: OPEN; Go: Tumble IV from orbit). A click or Enter, Space, or → moves on one
// beat; Esc skips nothing the first time and closes "Watch the epilogue". The stage is a modal:
// Tab stays on it, and keys stop here. Part of the finale's lazy chunk (app/acts/fin.ts).
import { useEffect, useRef, useState } from 'preact/hooks';
import { endingCue } from '../../app/ending.ts';
import { closeEndingScreen } from '../../app/endingPlay.ts';
import { assertNever } from '../../shared/types.ts';
import { prefersReducedMotion } from '../motion.ts';
import { silkText } from '../silk.ts';
import { creditsText, type CreditBlock } from './credits.ts';
import {
  beatMs,
  COUNTER_ZERO,
  counterFlipped,
  creditsAtRest,
  creditsBlockAt,
  creditsOffsetPx,
  creditsRestMs,
  epilogueBeats,
  FINAL_IMAGES,
  PERIMETER_OPEN,
  STAGE_PX,
  stillFrameAt,
  type EpilogueBeat,
} from './epilogue.ts';
import { endingScreen, type EpilogueView, type MemoCardView } from './epilogueState.ts';
import { ENDING_STILL, finaleSceneDef } from '../../content/sprites/scenes/finale.ts';
import { finaleSceneSprite } from '../dialogue/finaleSceneArt.ts';
import { STILL_SCALE } from './dawn.ts';
import { Letter } from './Inbox.tsx';
import { STORY_CHOICE_LOCK_MS } from '../../app/dialogue.ts';
import './epilogue.css';

/** Keys that move the epilogue on one beat. */
const NEXT_KEYS = new Set(['Enter', 'NumpadEnter', 'Space', 'ArrowRight']);

/** The ending layer: whatever app/ending.ts has on show, or nothing. */
export function EndingLayer() {
  const view = endingScreen.value;
  if (view === null) return null;
  return view.kind === 'memo' ? (
    <MemoCard key={view.memo.id} view={view} />
  ) : (
    <Epilogue key="epilogue" view={view} />
  );
}

/** Keeps Tab on `el` and its controls, and keys from the game's listener. */
function holdKeys(e: KeyboardEvent): void {
  if (e.key === 'Tab') {
    const root = e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
    const items = root === null ? [] : [...root.querySelectorAll<HTMLElement>('button')];
    e.preventDefault();
    (items.find((b) => b !== document.activeElement) ?? items[0] ?? root)?.focus();
  }
  e.stopPropagation();
}

/**
 * Sterling's farewell (`memo_fin_01`) on its letterhead, alone, then Continue. The button waits a
 * beat (the story choice's 700 ms), so the Enter that left the card doesn't also leave the memo.
 */
function MemoCard({ view }: { view: MemoCardView }) {
  const [ready, setReady] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
    const id = setTimeout(() => setReady(true), STORY_CHOICE_LOCK_MS);
    return () => clearTimeout(id);
  }, []);
  return (
    <div class="end-stage end-memo" data-testid="ending-memo" data-voice="memo">
      <section
        class="end-memo-card"
        role="dialog"
        aria-modal="true"
        aria-label="Memo"
        onKeyDown={holdKeys}
      >
        <div class="end-memo-letter">
          <Letter memo={view.memo} />
        </div>
        <button
          ref={button}
          type="button"
          class="sd-button sd-button-primary end-memo-go"
          aria-disabled={ready ? undefined : 'true'}
          onClick={() => {
            if (ready) closeEndingScreen();
          }}
        >
          Continue
        </button>
      </section>
    </div>
  );
}

/** Milliseconds since `from`, redrawn every `tickMs` while `live`. */
function useClock(from: number, live: boolean, tickMs = 50): number {
  const [, redraw] = useState(0);
  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => redraw((n) => n + 1), tickMs);
    return () => clearInterval(id);
  }, [from, live, tickMs]);
  return performance.now() - from;
}

/** The epilogue: its beats one at a time, then the close goes on. */
function Epilogue({ view }: { view: EpilogueView }) {
  const still = prefersReducedMotion();
  const beats = epilogueBeats(view);
  const [at, setAt] = useState({ i: 0, from: performance.now() });
  const root = useRef<HTMLDivElement>(null);
  const flipped = useRef(false);
  const closed = useRef(false);
  const beat = beats[at.i];
  /** Ends the epilogue once (its last beat, or Esc on "Watch the epilogue"). */
  const close = (): void => {
    if (closed.current) return;
    closed.current = true;
    endingCue('epilogue_end');
    closeEndingScreen();
  };
  const advance = (): void => {
    // A press while the roll climbs brings it to rest on the player at once (S2-2): the credits
    // always end on "And you", and the next press goes on.
    const now = performance.now();
    if (beat?.kind === 'credits' && !creditsAtRest(now - at.from, still)) {
      setAt({ i: at.i, from: now - creditsRestMs(still) });
      return;
    }
    if (at.i + 1 >= beats.length) close();
    else setAt({ i: at.i + 1, from: now });
  };
  // Each beat moves on by itself when its time is up (the credits hold at rest until a press).
  useEffect(() => {
    if (beat === undefined) return undefined;
    const ms = beatMs(beat, view);
    if (ms === null) return undefined;
    const id = setTimeout(advance, ms);
    return () => clearTimeout(id);
  }, [at]);
  useEffect(() => {
    root.current?.focus();
  }, []);
  // The counter and the roll move on a clock; so does the orbit's relay blink.
  const moving =
    beat?.kind === 'counter' ||
    beat?.kind === 'credits' ||
    (beat?.kind === 'final' && beat.ending === 'go' && !still);
  const ms = useClock(at.from, moving);
  // The counter's flip cues the music (once): the jingle in a major key, many voices.
  if (beat?.kind === 'counter' && counterFlipped(ms) && !flipped.current) {
    flipped.current = true;
    endingCue('counter_flip');
  }
  const onKey = (e: KeyboardEvent): void => {
    if (NEXT_KEYS.has(e.code) && !e.repeat) {
      e.preventDefault();
      advance();
    } else if (e.code === 'Escape' && !e.repeat) {
      e.preventDefault();
      // The first time through, nothing skips; "Watch the epilogue" closes.
      if (!view.first) close();
    }
    holdKeys(e);
  };
  return (
    <div
      ref={root}
      class={`end-stage end-epilogue${still ? ' still' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Epilogue"
      tabIndex={-1}
      data-testid="epilogue"
      data-beat={beat?.kind}
      data-index={at.i}
      onClick={advance}
      onKeyDown={onKey}
    >
      {beat !== undefined && <Beat key={at.i} beat={beat} view={view} ms={ms} still={still} />}
    </div>
  );
}

function Beat({
  beat,
  view,
  ms,
  still,
}: {
  beat: EpilogueBeat;
  view: EpilogueView;
  ms: number;
  still: boolean;
}) {
  switch (beat.kind) {
    case 'card': {
      const card = view.cards[beat.index];
      return (
        <p
          class="end-card"
          role="status"
          data-testid="epilogue-card"
          data-voice="epilogue-card"
          data-slot={card?.slot}
        >
          {card?.text}
        </p>
      );
    }
    case 'counter': {
      const flipped = counterFlipped(ms);
      const text = flipped ? (view.remembered ?? '') : COUNTER_ZERO;
      return (
        <p
          class={`end-counter${flipped ? ' flipped' : ''}`}
          role="status"
          data-testid="epilogue-counter"
          data-voice="counter"
          data-flipped={flipped ? 'true' : 'false'}
        >
          {silkText(text)}
        </p>
      );
    }
    case 'credits':
      return <Credits blocks={view.credits} ms={ms} still={still} />;
    case 'final':
      return <FinalImage ending={beat.ending} ms={ms} still={still} />;
    default:
      return assertNever(beat);
  }
}

/**
 * The roll (`all`: its blocks, tokens resolved for the save; the player's name over "Waykeeper"):
 * up from under the stage to rest on "And you" over the thanks (a block at a time under reduced
 * motion, to the same rest), `data-rest` once it holds there.
 */
function Credits({
  blocks: all,
  ms,
  still,
}: {
  blocks: readonly CreditBlock[];
  ms: number;
  still: boolean;
}) {
  const blocks = still ? creditsBlockAt(ms).map((i) => all[i]!) : all;
  const style = still
    ? undefined
    : { transform: `translateY(${STAGE_PX - creditsOffsetPx(ms)}px)` };
  return (
    <div
      class="end-credits"
      data-testid="epilogue-credits"
      data-voice="credits"
      data-rest={creditsAtRest(ms, still) ? 'true' : undefined}
    >
      <p class="sd-visually-hidden" role="status">
        {creditsText(all)}
      </p>
      <div class={`end-roll${still ? ' block' : ''}`} style={style} aria-hidden="true">
        {blocks.map((b, i) => (
          <div
            key={`${b.heading ?? ''}${i}`}
            class={`end-roll-block${b.style === undefined ? '' : ` ${b.style}`}`}
            data-testid={b.style === 'you' ? 'credits-you' : undefined}
          >
            {b.heading !== null && <p class="end-roll-head">{b.heading}</p>}
            {b.lines.map((l, j) => (
              <p
                key={`${j}${l}`}
                class={
                  b.style === 'you' && j === 0 ? 'end-roll-line end-roll-name' : 'end-roll-line'
                }
              >
                {l}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The final image by ending: T843's still, full-bleed; Stay's status line over it. */
function FinalImage({ ending, ms, still }: { ending: 'stay' | 'go'; ms: number; still: boolean }) {
  const id = ENDING_STILL[ending];
  const anim = finaleSceneDef(id).anims?.['blink'];
  const blink = anim !== undefined && 'frames' in anim ? anim : undefined;
  const art = finaleSceneSprite(id, stillFrameAt(blink, ms, still));
  return (
    <div
      class={`end-final ${ending}`}
      role="img"
      aria-label={FINAL_IMAGES[ending].label}
      data-testid="epilogue-final"
      data-voice="final-image"
      data-ending={ending}
    >
      {art !== null && (
        <img
          class="end-final-still"
          src={art.url}
          width={art.w * STILL_SCALE}
          height={art.h * STILL_SCALE}
          alt=""
          aria-hidden="true"
        />
      )}
      {ending === 'stay' && (
        <p class="end-status" aria-hidden="true">
          {silkText(PERIMETER_OPEN)}
        </p>
      )}
    </div>
  );
}
