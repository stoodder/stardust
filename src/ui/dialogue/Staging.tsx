// The full-screen scenes' staging (D097 R3; the table and timelines are staging.ts): the stinger's
// Rig 9 camera feed above its lines, and the party's bright stage (confetti falling behind the
// lines, the cannon firing at the bottom left with its burst over the muzzle, and the record
// counter ticking up at the top). Sprites are the canvas art's own, baked into data URLs once per
// frame (hud/Icon.tsx), drawn 2× with `image-rendering: pixelated`. Silent: nothing here plays a
// sound, so muted play loses nothing. Reduced motion holds still frames and the counter lands.
import { useEffect, useState } from 'preact/hooks';
import { SPRITES } from '../../content/sprites/index.ts';
import type { SpriteDef } from '../../content/sprites/types.ts';
import { baked } from '../hud/Icon.tsx';
import { prefersReducedMotion } from '../motion.ts';
import { campaign, runResult } from '../screens/state.ts';
import { countUpValue } from '../screens/countUp.ts';
import { formatCount } from '../screens/format.ts';
import {
  BURST_BEATS,
  BURST_BEATS_STILL,
  CANNON_BEATS,
  CANNON_BEATS_STILL,
  CANNON_SPRITE,
  CONFETTI_SPRITE,
  COUNTER_TICK_MS,
  FALL_BEATS,
  FALL_BEATS_STILL,
  FEED_BEATS,
  FEED_BEATS_STILL,
  FEED_SPRITE,
  frameAt,
  stillMoving,
  type Beat,
  type StagingKind,
} from './staging.ts';
import type { StagingView } from './state.ts';

/** How often a moving stage redraws (ms): faster than the quickest anim (12 fps). */
const STAGE_TICK_MS = 40;
/** The staged sprites' CSS scale (game px per sprite px): the feed and the falling confetti. */
const SCALE = 2;
/** The party cannon and its burst, larger: the celebration's centrepiece. */
const CANNON_SCALE = 3;
/** The cannon's muzzle in its baked frame (authored (14, 11), plus the outline pass's 1 px). */
const MUZZLE = { x: 15, y: 12 };
/** The burst's anchor in its frame: the muzzle goes here. */
const BURST_ANCHOR = { x: 48, y: 71 };

function spriteDef(id: string): SpriteDef | undefined {
  return (SPRITES as readonly SpriteDef[]).find((s) => s.id === id);
}

function animsOf(id: string): Readonly<Record<string, object>> {
  return spriteDef(id)?.anims ?? {};
}

/**
 * Milliseconds since the staging's clock started (`from`, performance.now()), redrawn every
 * STAGE_TICK_MS while `moving(ms)` holds (a still stage stops redrawing once it has settled).
 */
export function useStageClock(from: number, moving: (ms: number) => boolean): number {
  const [, redraw] = useState(0);
  const ms = performance.now() - from;
  const live = moving(ms);
  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => redraw((n) => n + 1), STAGE_TICK_MS);
    return () => clearInterval(id);
  }, [live, from]);
  return ms;
}

/** One baked frame of a sprite at the stage's scale, or nothing if it doesn't exist. */
function Frame({
  id,
  frame,
  class: cls,
  scale = SCALE,
}: {
  id: string;
  frame: string | null;
  class: string;
  scale?: number;
}) {
  const b = frame === null ? null : baked(id, frame);
  if (b === null) return null;
  return (
    <img
      class={cls}
      src={b.url}
      width={b.w * scale}
      height={b.h * scale}
      alt=""
      aria-hidden="true"
      data-frame={frame}
    />
  );
}

/** The stinger's Rig 9 feed: an Everglow CRT above the lines (its beats lead the scene in). */
function FeedStage({ ms, still }: { ms: number; still: boolean }) {
  const frame = frameAt(still ? FEED_BEATS_STILL : FEED_BEATS, animsOf(FEED_SPRITE), ms);
  return (
    <div
      class="dlg-feed"
      role="img"
      aria-label="Rig 9, camera 2, live: static, a shape for half a second, then no signal"
      data-testid="stage-feed"
    >
      <Frame id={FEED_SPRITE} frame={frame} class="dlg-feed-crt" />
    </div>
  );
}

/** The party's record counter: this quarter's pests processed, ticking up to the new total. */
function RecordCounter({ ms, still }: { ms: number; still: boolean }) {
  const run = runResult.value;
  const total = run?.rewards?.lifetimePests ?? campaign.value?.pestsProcessed ?? 0;
  const from = Math.max(0, total - (run?.pestsProcessed ?? 0));
  const shown = still ? total : from + countUpValue(total - from, ms, COUNTER_TICK_MS);
  return (
    <div class="dlg-record" data-testid="stage-record">
      <span class="dlg-record-kicker">Quarterly results</span>
      <span class="dlg-record-line" aria-label={`Pests processed: ${formatCount(total)}`}>
        <span class="dlg-record-label" aria-hidden="true">
          Pests processed
        </span>{' '}
        <span class="dlg-record-n num" aria-hidden="true">
          {formatCount(shown)}
        </span>
      </span>
      <span class={shown >= total ? 'dlg-record-tag on' : 'dlg-record-tag'}>New record!</span>
    </div>
  );
}

/** The party: confetti behind the lines, the cannon and its burst, and the record counter. */
function PartyStage({ ms, still }: { ms: number; still: boolean }) {
  const confetti = animsOf(CONFETTI_SPRITE);
  const fall = baked(
    CONFETTI_SPRITE,
    frameAt(still ? FALL_BEATS_STILL : FALL_BEATS, confetti, ms) ?? '',
  );
  const cannon = frameAt(still ? CANNON_BEATS_STILL : CANNON_BEATS, animsOf(CANNON_SPRITE), ms);
  const burst = frameAt(still ? BURST_BEATS_STILL : BURST_BEATS, confetti, ms);
  // The burst's anchor sits on the cannon's muzzle (both at the stage's scale).
  const burstLeft = (MUZZLE.x - BURST_ANCHOR.x) * CANNON_SCALE;
  const burstTop = (MUZZLE.y - BURST_ANCHOR.y) * CANNON_SCALE;
  return (
    <>
      {fall !== null && (
        <div
          class="dlg-confetti"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${fall.url})`,
            backgroundSize: `${fall.w * SCALE}px ${fall.h * SCALE}px`,
          }}
        />
      )}
      <RecordCounter ms={ms} still={still} />
      <div class="dlg-cannon" aria-hidden="true" data-testid="stage-cannon">
        <Frame id={CANNON_SPRITE} frame={cannon} class="dlg-cannon-body" scale={CANNON_SCALE} />
        <div class="dlg-burst" style={{ left: `${burstLeft}px`, top: `${burstTop}px` }}>
          <Frame id={CONFETTI_SPRITE} frame={burst} class="dlg-burst-frame" scale={CANNON_SCALE} />
        </div>
      </div>
    </>
  );
}

/** Every timeline a staging runs, to know when it has settled. */
function beatsOf(kind: StagingKind, still: boolean): [string, readonly Beat[]][] {
  if (kind === 'rig9_feed') return [[FEED_SPRITE, still ? FEED_BEATS_STILL : FEED_BEATS]];
  return still
    ? [[CONFETTI_SPRITE, FALL_BEATS_STILL]]
    : [
        [CONFETTI_SPRITE, FALL_BEATS],
        [CANNON_SPRITE, CANNON_BEATS],
        [CONFETTI_SPRITE, BURST_BEATS],
      ];
}

/** A full-screen scene's staging, drawn with its lines (app/dialogue.ts runs its clock). */
export function Staging({ staging }: { staging: StagingView }) {
  const { kind } = staging;
  const still = prefersReducedMotion();
  const ms = useStageClock(
    staging.from,
    (t) =>
      (kind === 'party' && !still && t < COUNTER_TICK_MS) ||
      beatsOf(kind, still).some(([id, beats]) => stillMoving(beats, animsOf(id), t)),
  );
  return kind === 'rig9_feed' ? (
    <FeedStage ms={ms} still={still} />
  ) : (
    <PartyStage ms={ms} still={still} />
  );
}
