// The HUD's transient messages: the notice, the screen-reader announcers (the tile cursor, the
// last action), the upgrade hint, the WAVE banner, and the paused overlay. The comms panel (radio
// and barks) is ui/dialogue/CommsPanel.tsx.
import { hud, speed } from '../state.ts';
import { Key } from './parts.tsx';

/** A short message (a rejected command), top center. */
export function Notice() {
  const n = hud.notice.value;
  return (
    <div class="hud-notice-slot" role="status" aria-live="polite">
      {n !== null && (
        <div key={n.id} class="hud-notice chamfer">
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

/**
 * The Hold Fire teach's hint, bottom center, while Gerald is on the field and Hold (all) hasn't
 * been used this run (it pulses meanwhile). It takes the upgrade hint's place while it shows.
 */
export function HoldFireHint() {
  if (!hud.holdFireTeach.value || hud.holdFireAll.value) return null;
  return (
    <div class="hud-hint-slot">
      <div
        class="hud-hint chamfer"
        role="status"
        data-testid="hold-fire-hint"
        aria-label={`${HOLD_FIRE_HINT} (Shift+H)`}
      >
        {HOLD_FIRE_HINT}
        <Key k="Shift+H" />
      </div>
    </div>
  );
}

/** The upgrade hint (D028), bottom center, while the teach is on and no tower is selected. */
export function UpgradeHint() {
  if (!hud.upgradeHint.value || hud.selected.value !== null) return null;
  // The Hold Fire hint is the more urgent one while both would show.
  if (hud.holdFireTeach.value && !hud.holdFireAll.value) return null;
  return (
    <div class="hud-hint-slot">
      <div class="hud-hint chamfer" role="status" aria-label="Click a turret to upgrade it (U)">
        Click a turret to upgrade it
        <Key k="U" />
      </div>
    </div>
  );
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

/** While paused: a light scrim over the playfield and a pinned PAUSED notice (D026). */
export function PausedOverlay() {
  if (speed.value !== 0 || hud.outcome.value !== 'playing') return null;
  return (
    <>
      <div class="hud-paused-scrim" aria-hidden="true" />
      <div class="hud-paused chamfer" role="status">
        Paused
      </div>
    </>
  );
}
