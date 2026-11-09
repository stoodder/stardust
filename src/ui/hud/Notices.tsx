// The HUD's transient messages: the notice, the screen-reader announcers (the tile cursor, the
// last action), the upgrade hint, the radio ticker, the WAVE banner, and the paused overlay.
import { hud, speed } from '../state.ts';
import { colorVar } from '../color.ts';
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

/** The upgrade hint (D028), bottom center, while the teach is on and no tower is selected. */
export function UpgradeHint() {
  if (!hud.upgradeHint.value || hud.selected.value !== null) return null;
  return (
    <div class="hud-hint-slot">
      <div class="hud-hint chamfer" role="status" aria-label="Click a turret to upgrade it (U)">
        Click a turret to upgrade it
        <Key k="U" />
      </div>
    </div>
  );
}

/**
 * The radio ticker (D026): one line at a time (a reply under its cue), top-left under the status
 * panel; never blocks.
 */
export function Radio() {
  const r = hud.radio.value;
  return (
    <div class="hud-radio-slot" role="log" aria-live="polite" aria-label="Radio">
      {r !== null && (
        <div key={r.id} class="hud-radio chamfer">
          {/* A reply keeps its cue up above it, dimmed (D028). */}
          {r.cue !== null && (
            <div class="hud-radio-cue">
              <span class="hud-radio-name" style={{ color: colorVar(r.cue.color) }}>
                {r.cue.name}
              </span>
              <span class="hud-radio-text">{r.cue.text}</span>
            </div>
          )}
          <span class="hud-radio-name" style={{ color: colorVar(r.color) }}>
            {r.name}
          </span>
          <span class="hud-radio-text">{r.text}</span>
        </div>
      )}
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
