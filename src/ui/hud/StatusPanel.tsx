// Top-left: the name plate ("JPT-1 · SPROUT", core-loop §5), the meter (core integrity, or the
// map's own meter), a Protect map's asset meter under it (T305a), credits, the medal tracker (T202d), and the map's optional objectives under it
// (T312c).
import { hud, type MedalView, type ObjectiveView } from '../state.ts';
import { AssetMeter } from './AssetMeter.tsx';
import { EscortMeter } from './EscortMeter.tsx';
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
      <NamePlate />
      {/* An Escort shows its own meter instead of the core's (T305c). */}
      <EscortMeter />
      <div
        hidden={hud.escort.value !== null}
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
      <AssetMeter />
      <div class="hud-credits" aria-label={`Credits ${hud.credits.value}`}>
        <Icon id="icon.credits" />
        <span class="hud-label">Credits</span>
        <span class="big num gold">{credits}</span>
      </div>
      <MedalTracker />
      <ObjectiveTracker />
    </section>
  );
}

/** The plate's unit designation (Everglow's; the Shift board shows it too). */
export const UNIT_DESIGNATION = 'JPT-1';

/** Callsign plates longer than this many characters set tighter, so WAYKEEPER fits the panel. */
const PLATE_TIGHT_CHARS = 14;

/**
 * The name plate (core-loop §5; art-direction § Dialogue presentation): "JPT-1 · {callsign}"
 * above the meter, so the callsign's changes (Sprout → Thorn → Waykeeper) show during play.
 */
function NamePlate() {
  const text = `${UNIT_DESIGNATION} · ${hud.callsign.value}`;
  return (
    <p
      class={`hud-plate${text.length > PLATE_TIGHT_CHARS ? ' tight' : ''}`}
      data-testid="callsign-plate"
    >
      {text}
    </p>
  );
}

/** An objective's standing in words (its row's label and tooltip). */
function objectiveWord(o: ObjectiveView): string {
  return o.status === 'done' ? 'done' : o.status === 'failed' ? 'next time' : 'in reach';
}

/**
 * The objective tracker (T312c), under the medals: one row per optional objective (Objective
 * Intel; "Clean Audit"), a box that fills gold once done and dims quietly when this run can't do it
 * any more ("Next time!", like the medals), and the name; the tooltip says what completes it.
 */
function ObjectiveTracker() {
  const objectives = hud.objectives.value;
  if (objectives.length === 0) return null;
  return (
    <ul class="hud-objectives" aria-label="Objectives" data-testid="objective-tracker">
      {objectives.map((o) => (
        <li
          key={o.id}
          class={`hud-objective ${o.status}`}
          data-objective={o.id}
          data-status={o.status}
          aria-label={`${o.name}, ${objectiveWord(o)}: ${o.description} +${o.intel} Intel`}
          title={`${o.name}: ${o.status === 'failed' ? 'Next time!' : o.description} (+${o.intel} Intel)`}
        >
          <span class="hud-objective-box" aria-hidden="true" />
          <span class="hud-objective-name">{o.name}</span>
        </li>
      ))}
    </ul>
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
