// Top-left: the name plate ("JPT-1 · SPROUT", core-loop §5), the meter (core integrity, or the
// map's own meter), a Protect map's asset meter under it (T305a), credits, and the records row: the
// medal tracker (T202d) and the map's optional objectives (T312c) side by side, their names behind
// the row's "+" (T803b). On the finale (T832) the meter is Voices (EscortMeter.tsx) and the core's
// row stays under it as the colony **Gate** (its integrity: the flyers' and Everglow's leaks spend
// it); at Dawn the panel steps back to the name plate alone (ui/hud/index.tsx `data-dawn`, hud.css).
import { nextTimeMark } from '../../app/hudText.ts';
import { Disclosure } from '../components/Disclosure.tsx';
import { hud, type MedalView, type ObjectiveView } from '../state.ts';
import { AssetMeter } from './AssetMeter.tsx';
import { alarmMark, EscortMeter } from './EscortMeter.tsx';
import { Icon } from './Icon.tsx';
import { useTicker } from './parts.tsx';

/** Integrity at or below this shows the low-integrity alarm (art-direction §9: red at 5). */
const LOW_INTEGRITY = 5;

/** The core's row on the finale's choir map, under Voices: the colony gate (T832). */
export const GATE_LABEL = 'Gate';

/** Top-left: the meter (core integrity) and credits. */
export function StatusPanel() {
  const credits = useTicker(hud.credits.value);
  const integrity = hud.integrity.value;
  const escort = hud.escort.value;
  // The choir's Voices stands in the core's place; the gate's integrity keeps its row (T832).
  const gate = escort?.choir === true;
  const label = gate ? GATE_LABEL : hud.meterLabel.value;
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
        hidden={escort !== null && !gate}
        class={gate ? 'hud-meter hud-gate' : 'hud-meter'}
        role="status"
        data-testid={gate ? 'gate-meter' : undefined}
        data-critical="integrity"
        aria-label={`${label} ${integrity}${low ? ', integrity low' : ''}`}
      >
        <Icon id="icon.core" />
        <span class="hud-label">
          {label}
          {/* Low integrity: a blinking alarm shape, not only a red number. */}
          {low && (
            <span class="hud-alarm" aria-hidden="true">
              {alarmMark(hud.act.value)}
            </span>
          )}
        </span>
        {/* The gate's row is secondary to Voices: its number in the small size. */}
        <span class={`${gate ? 'num' : 'big num'}${low ? ' danger' : ''}`}>{integrity}</span>
      </div>
      <AssetMeter />
      <div class="hud-credits" data-critical="credits" aria-label={`Credits ${hud.credits.value}`}>
        <Icon id="icon.credits" />
        <span class="hud-label">Credits</span>
        <span class="big num gold">{credits}</span>
      </div>
      <Records />
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
      data-voice="callsign"
    >
      {text}
    </p>
  );
}

/** How many of the group an objective follows are on the road, for its row's label. */
function walkingWords(o: ObjectiveView): string {
  return o.walking !== undefined && o.walking !== null && o.status === 'open'
    ? `, ${o.walking} on the road`
    : '';
}

/** How far along a counting objective is, for its row's label: ", 2 of 4". */
function progressWords(o: ObjectiveView): string {
  return o.progress === undefined ? '' : `, ${o.progress.n} of ${o.progress.of}`;
}

/** An objective's standing in words (its row's label and tooltip). */
function objectiveWord(o: ObjectiveView): string {
  return o.status === 'done' ? 'done' : o.status === 'failed' ? 'next time' : 'in reach';
}

/**
 * The objective tracker (T312c), beside the medals on their row (T803b): one box per optional
 * objective (Objective Intel; "Clean Audit") that fills gold once done and dims quietly when this
 * run can't do it any more ("Next time!", like the medals; "Next time." from Act III:
 * `nextTimeMark`), its name beside it with its progress where it counts while it's in play
 * ("Waymarks 2/4"; D156);
 * what completes it is its tooltip, its screen-reader label, and the row's "more" (RecordsMore).
 */
function ObjectiveTracker() {
  const objectives = hud.objectives.value;
  if (objectives.length === 0) return null;
  const nextTime = nextTimeMark(hud.act.value);
  return (
    <ul class="hud-objectives" aria-label="Objectives" data-testid="objective-tracker">
      {objectives.map((o) => (
        <li
          key={o.id}
          class={`hud-objective ${o.status}`}
          data-objective={o.id}
          data-status={o.status}
          aria-label={`${o.name}, ${objectiveWord(o)}${progressWords(o)}${walkingWords(o)}: ${o.description} +${o.intel} Intel`}
          title={`${o.name}: ${o.status === 'failed' ? nextTime : o.description} (+${o.intel} Intel)`}
        >
          <span class="hud-objective-box" aria-hidden="true" />
          {/* Its name beside its box, and how far along it is, while it's still in play (D156:
              "Waymarks 2/4"); settled, the box says it alone, as a medal's diamond does. */}
          {o.status === 'open' && (
            <span class="hud-objective-name" data-testid="objective-name" aria-hidden="true">
              {o.name}
              {o.progress !== undefined && (
                <span class="num">
                  {' '}
                  {o.progress.n}/{o.progress.of}
                </span>
              )}
            </span>
          )}
          {/* The group it follows on the road (A3M1: Bramble's column), while it walks. */}
          {o.walking !== undefined && o.walking !== null && o.status === 'open' && (
            <span
              class="hud-objective-walking num"
              data-testid="objective-walking"
              aria-hidden="true"
            >
              +{o.walking}
            </span>
          )}
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
 * scolding: the tooltip says "Next time!", or "Next time." from Act III: `nextTimeMark`). A medal
 * already on file shows a small tick.
 */
function MedalTracker() {
  const medals = hud.medals.value;
  if (medals.length === 0) return null;
  const nextTime = nextTimeMark(hud.act.value);
  return (
    <ul
      class="hud-medals"
      aria-label={`Medals: ${medals.map((m) => `${m.name} ${medalWord(m)}`).join(', ')}`}
    >
      {medals.map((m) => (
        <li
          key={m.id}
          class={`hud-medal ${m.status}${m.held ? ' held' : ''}`}
          title={`${m.name}: ${m.status === 'forfeited' ? nextTime : m.description}`}
          data-medal={m.kind}
          data-status={m.status}
        />
      ))}
    </ul>
  );
}

/**
 * The records row (T803b; D153's declutter): the medal diamonds and the objective boxes on one
 * line at the panel's foot, the names and what earns each behind the row's "+" (a Disclosure that
 * opens under the row, inside the panel; Enter or a click opens it, Esc closes it). Neither is a critical
 * readout (smoke/declutter.ts): the state is the shapes; the words are a hover or a press away.
 */
function Records() {
  const medals = hud.medals.value;
  const objectives = hud.objectives.value;
  if (medals.length === 0 && objectives.length === 0) return null;
  return (
    <div class="hud-records" data-testid="records">
      <MedalTracker />
      <ObjectiveTracker />
      <Disclosure
        label="More"
        lessLabel="Less"
        about={objectives.length > 0 ? 'the medals and objectives' : 'the medals'}
        class="hud-records-more"
      >
        <RecordsMore medals={medals} objectives={objectives} />
      </Disclosure>
    </div>
  );
}

/** The records row's "more": each medal and objective by name, with what earns it. */
function RecordsMore({
  medals,
  objectives,
}: {
  medals: readonly MedalView[];
  objectives: readonly ObjectiveView[];
}) {
  const nextTime = nextTimeMark(hud.act.value);
  return (
    <ul class="hud-records-list" data-testid="records-more">
      {medals.map((m) => (
        <li key={m.id} class={`hud-records-item ${m.status}`}>
          <span class={`hud-medal ${m.status}${m.held ? ' held' : ''}`} aria-hidden="true" />
          <span>
            <span class="hud-records-name">{m.name}</span>{' '}
            {m.status === 'forfeited' ? nextTime : m.description}
          </span>
        </li>
      ))}
      {objectives.map((o) => (
        <li key={o.id} class={`hud-records-item hud-objective ${o.status}`}>
          <span class="hud-objective-box" aria-hidden="true" />
          <span>
            <span class="hud-records-name">{o.name}</span>{' '}
            {o.status === 'failed' ? nextTime : o.description} (+{o.intel} Intel)
          </span>
        </li>
      ))}
    </ul>
  );
}
