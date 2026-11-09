// Top-left: the meter (core integrity, or the map's own meter), credits, and the medal tracker
// (T202d).
import { hud, type MedalView } from '../state.ts';
import { Icon } from './Icon.tsx';
import { useTicker } from './parts.tsx';

/** Integrity at or below this shows the low-integrity alarm (art-direction §9: red at 5). */
const LOW_INTEGRITY = 5;

/** Top-left: the meter (core integrity) and credits. */
export function StatusPanel() {
  const credits = useTicker(hud.credits.value);
  const integrity = hud.integrity.value;
  const label = hud.meterLabel.value;
  const leak = hud.leak.value;
  const low = integrity <= LOW_INTEGRITY;
  return (
    <section class="hud-status chamfer" aria-label="Status">
      {/* A leak flashes the panel's edge red (D026); the key restarts it on every leak. */}
      {leak !== null && <span key={leak.id} class="hud-leak-flash chamfer" aria-hidden="true" />}
      <div
        class="hud-meter"
        role="status"
        aria-label={`${label} ${integrity}${low ? ', integrity low' : ''}`}
      >
        <Icon id="icon.core" />
        <span class="hud-label">
          {label}
          {/* Low integrity: a blinking alarm shape, not only a red number. */}
          {low && (
            <span class="hud-alarm" aria-hidden="true">
              !
            </span>
          )}
        </span>
        <span class={low ? 'big num danger' : 'big num'}>{integrity}</span>
      </div>
      <div class="hud-credits" aria-label={`Credits ${hud.credits.value}`}>
        <Icon id="icon.credits" />
        <span class="hud-label">Credits</span>
        <span class="big num gold">{credits}</span>
      </div>
      <MedalTracker />
    </section>
  );
}

/** A medal's standing in words, for the tracker's screen-reader label. */
function medalWord(m: MedalView): string {
  return m.status === 'earned' ? 'earned' : m.status === 'forfeited' ? 'next time' : 'in reach';
}

/**
 * The medal tracker (T202d), in the status panel: one diamond per medal, lit while still in
 * reach, gold once earned, and quietly dimmed when this run can't earn it any more (never a
 * scolding: the tooltip says "Next time!"). A medal already on file shows a small tick.
 */
function MedalTracker() {
  const medals = hud.medals.value;
  if (medals.length === 0) return null;
  return (
    <ul
      class="hud-medals"
      aria-label={`Medals: ${medals.map((m) => `${m.name} ${medalWord(m)}`).join(', ')}`}
    >
      {medals.map((m) => (
        <li
          key={m.id}
          class={`hud-medal ${m.status}${m.held ? ' held' : ''}`}
          title={`${m.name}: ${m.status === 'forfeited' ? 'Next time!' : m.description}`}
          data-medal={m.kind}
          data-status={m.status}
        />
      ))}
    </ul>
  );
}
