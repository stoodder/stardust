// The HUD's transient messages: the notice, the screen-reader announcers (the tile cursor, the
// last action), the bottom-center hint (Hold Fire, salvage, upgrade), the WAVE banner, and the
// paused overlay. The comms panel (radio and barks) is ui/dialogue/CommsPanel.tsx.
import type { ComponentChildren } from 'preact';
import { assertNever } from '../../shared/types.ts';
import { dialogue, type SceneMode } from '../dialogue/state.ts';
import { hud, speed } from '../state.ts';
import { Key } from './parts.tsx';

/** A short message (a rejected command), top center; a banner (HudNotice.banner) below the top row. */
export function Notice() {
  const n = hud.notice.value;
  return (
    <div class="hud-notice-slot" role="status" aria-live="polite">
      {n !== null && (
        <div
          key={n.id}
          class={n.banner === true ? 'hud-notice banner chamfer' : 'hud-notice chamfer'}
          data-testid="hud-notice"
        >
          {n.text}
        </div>
      )}
    </div>
  );
}

/** What the keyboard tile cursor is on (T126), for screen readers; empty while it's hidden. */
export function CursorAnnouncer() {
  return (
    <div class="hud-sr-only" role="status" aria-live="polite" data-testid="cursor-announce">
      {hud.cursor.value ?? ''}
    </div>
  );
}

/** What the player's last action did (D059: Hold fire, targeting, a cast), for screen readers. */
export function ActionAnnouncer() {
  return (
    <div class="hud-sr-only" role="status" aria-live="polite" data-testid="action-announce">
      {hud.announce.value}
    </div>
  );
}

/** The Hold Fire teach's hint (A1M3; core-loop §2.7): QUILL's request in the HUD's words. */
export const HOLD_FIRE_HINT = 'Gerald is the mail. Hold fire';

/** Its second lesson from Gerald's second pass (R4): one turret (H) or all of them (Shift+H). */
export const HOLD_FIRE_ONE_HINT = 'Gerald is the mail. Hold fire: H one, Shift+H all';

/** The salvage teach (A1M3, R4): a wreck clears with a plain click. */
export const SALVAGE_HINT = 'Click wreckage to send the salvage drone';

/** The Time Dilation teach (A1M3's flock, D098): it casts on the key, and slows every pest. */
export const TIME_DILATION_HINT = 'Time Dilation slows the flock';

/**
 * The Spare runners teach (T431, A2M1): QUILL's "New filter" in the HUD's words, beside the Spare
 * button it names. Plain help: it never says what to do with the runners.
 */
export const SPARE_RUNNERS_HINT = 'New filter: Spare runners';

/** Which hint the bottom-center slot shows, most urgent first. */
export type HintKind = 'holdOne' | 'holdAll' | 'timeDilation' | 'spare' | 'salvage' | 'upgrade';

/**
 * The bottom-center hint (one at a time): Gerald's second-pass lesson, then the Hold Fire teach
 * (both only while he's on the field, and neither while Hold (all) is on), then the Time Dilation
 * teach, then the Spare runners teach, then the salvage teach, then the upgrade teach (only with
 * no tower selected, since the tower panel answers it).
 */
export function pickHint(h: {
  readonly holdFireOne: boolean;
  readonly holdFireTeach: boolean;
  readonly holdFireAll: boolean;
  readonly timeDilation: boolean;
  readonly spare?: boolean;
  readonly salvage: boolean;
  readonly upgrade: boolean;
  readonly selected: boolean;
}): HintKind | null {
  if (h.holdFireOne && !h.holdFireAll) return 'holdOne';
  if (h.holdFireTeach && !h.holdFireAll) return 'holdAll';
  if (h.timeDilation) return 'timeDilation';
  if (h.spare === true) return 'spare';
  if (h.salvage) return 'salvage';
  if (h.upgrade && !h.selected) return 'upgrade';
  return null;
}

/** The hint's box: its words, any key badges after them, and the whole for screen readers. */
function HintBox({
  label,
  testId,
  children,
}: {
  label: string;
  testId?: string;
  children: ComponentChildren;
}) {
  return (
    <div class="hud-hint-slot">
      <div class="hud-hint chamfer" role="status" data-testid={testId} aria-label={label}>
        {children}
      </div>
    </div>
  );
}

/**
 * The bottom-center hint slot: the Hold Fire teach while Gerald is on the field (its second lesson
 * names both keys from his second pass), the Time Dilation teach as a flock comes in reach, the
 * salvage teach from W2's countdown for two wave starts or until the drone is first sent, or the
 * upgrade teach (D028).
 */
export function BottomHint() {
  const tdSlot = hud.timeDilationTeach.value;
  const kind = pickHint({
    holdFireOne: hud.holdFireOneHint.value,
    holdFireTeach: hud.holdFireTeach.value,
    holdFireAll: hud.holdFireAll.value,
    timeDilation: tdSlot !== 0,
    spare: hud.spareRunnersTeach.value,
    salvage: hud.salvageHint.value,
    upgrade: hud.upgradeHint.value,
    selected: hud.selected.value !== null,
  });
  switch (kind) {
    case null:
      return null;
    case 'holdOne':
      return (
        <HintBox label={HOLD_FIRE_ONE_HINT} testId="hold-fire-hint">
          Gerald is the mail. Hold fire:
          <Key k="H" />
          one
          <Key k="Shift+H" />
          all
        </HintBox>
      );
    case 'holdAll':
      return (
        <HintBox label={`${HOLD_FIRE_HINT} (Shift+H)`} testId="hold-fire-hint">
          {HOLD_FIRE_HINT}
          <Key k="Shift+H" />
        </HintBox>
      );
    case 'timeDilation': {
      const key = hud.abilities.value.find((a) => a.slot === tdSlot)?.key ?? 'Q';
      return (
        <HintBox label={`${TIME_DILATION_HINT} (${key})`} testId="time-dilation-hint">
          {TIME_DILATION_HINT}
          <Key k={key} />
        </HintBox>
      );
    }
    case 'spare':
      return (
        <HintBox label={`${SPARE_RUNNERS_HINT} (Alt+H)`} testId="spare-runners-hint">
          {SPARE_RUNNERS_HINT}
          <Key k="Alt+H" />
        </HintBox>
      );
    case 'salvage':
      return (
        <HintBox label={SALVAGE_HINT} testId="salvage-hint">
          {SALVAGE_HINT}
        </HintBox>
      );
    case 'upgrade':
      return (
        <HintBox label="Click a turret to upgrade it (U)">
          Click a turret to upgrade it
          <Key k="U" />
        </HintBox>
      );
    default:
      return assertNever(kind);
  }
}

/** The "WAVE n" banner as a wave starts (D026). */
export function WaveBannerView() {
  const b = hud.waveBanner.value;
  if (b === null) return null;
  return (
    <div key={b.id} class="hud-wave-banner" aria-hidden="true">
      Wave {b.wave}
    </div>
  );
}

/**
 * The "Checkpoint" cue (T431; core-loop §2.12) under the wave panel for a few seconds as a
 * checkpoint is taken (the countdown to every 5th wave, Act II on): a flag and the wave a lost run
 * could retry from. Screen readers hear it once.
 */
export function CheckpointCueView() {
  const c = hud.checkpoint.value;
  if (c === null) return null;
  return (
    <div key={c.id} class="hud-checkpoint chamfer" role="status" data-testid="checkpoint-cue">
      <span class="hud-checkpoint-flag" aria-hidden="true" />
      Checkpoint
      <span class="hud-checkpoint-wave">Wave {c.wave}</span>
    </div>
  );
}

/**
 * Whether the PAUSED notice shows (D026): paused while the map plays, unless a scene holds the
 * battle (a pausing panel or a full-screen scene; D135): its own opaque panel says so already.
 */
export function showsPaused(
  gameSpeed: number,
  outcome: string,
  scene: SceneMode | null,
): boolean {
  if (gameSpeed !== 0 || outcome !== 'playing') return false;
  return scene === null || scene === 'briefing';
}

/** While paused: a light scrim over the playfield and a pinned PAUSED notice (D026). */
export function PausedOverlay() {
  const scene = dialogue.scene.value?.mode ?? null;
  if (!showsPaused(speed.value, hud.outcome.value, scene)) return null;
  return (
    <>
      <div class="hud-paused-scrim" aria-hidden="true" />
      <div class="hud-paused chamfer" role="status">
        Paused
      </div>
    </>
  );
}
