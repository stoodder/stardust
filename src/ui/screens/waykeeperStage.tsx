// The Waykeeper beat on the stage (act3.md § A3M6, *Debrief*; T714; the rules are waykeeper.ts):
// Dome 1 at night with its doors open, warm light spilling onto frost, the choir's lights gathering
// inside one by one; above, the callsign plate ("JPT-1 · THORN") that turns as Pebble's line
// finishes: the old name dimmed and struck through, WAYKEEPER written under it in gold. DOM and
// pixel SVG at whole pixels; silent; aria-hidden with one label. Reduced motion: the choir
// gathered, the plate turning at once.
import { prefersReducedMotion } from '../motion.ts';
import { dialogue } from '../dialogue/state.ts';
import { useStageClock } from '../dialogue/Staging.tsx';
import {
  CHOIR_LIGHTS,
  choirGathered,
  NEW_CALLSIGN,
  OLD_CALLSIGN,
  plateTurned,
  waykeeperLabel,
  waykeeperLeadInMs,
  CHOIR_EVERY_MS,
} from './waykeeper.ts';
import './waykeeper.css';

/** Where each of the choir's lights settles inside the dome (game px in the dome's box). */
const CHOIR_AT: readonly [number, number][] = [
  [62, 70],
  [78, 62],
  [94, 72],
  [70, 82],
  [110, 64],
  [86, 86],
  [104, 82],
  [120, 76],
  [54, 84],
];

/** The stage, `from` its staging's start (performance.now()). */
export function WaykeeperStage({ from }: { from: number }) {
  const still = prefersReducedMotion();
  const lead = waykeeperLeadInMs(still);
  const view = dialogue.scene.value;
  const current = view !== null && performance.now() - from >= lead ? view.line : null;
  const said = view?.transcript ?? [];
  const typing = view?.typing ?? { from: 0, done: false };
  const turnedNow = (): boolean => plateTurned(said, current, typing, performance.now(), still);
  // Redraw until the choir has gathered and the plate has turned.
  const ms = useStageClock(
    from,
    (t) => !still && (t < CHOIR_LIGHTS * CHOIR_EVERY_MS + 50 || !turnedNow()),
  );
  const turned = turnedNow();
  const lights = choirGathered(ms, still);
  return (
    <div
      class={`wk${still ? ' still' : ''}`}
      role="img"
      aria-label={waykeeperLabel(turned)}
      data-testid="stage-waykeeper"
      data-turned={turned ? 'true' : 'false'}
    >
      <div class="wk-plate" aria-hidden="true">
        <span class="wk-plate-id">JPT-1 ·</span>
        <span class="wk-plate-names">
          <span class={turned ? 'wk-old struck' : 'wk-old'}>{OLD_CALLSIGN}</span>
          {turned && <span class="wk-new">{NEW_CALLSIGN}</span>}
        </span>
      </div>
      <div class="wk-dome" aria-hidden="true">
        <span class="wk-shell" />
        <span class="wk-door" />
        <span class="wk-spill" />
        {CHOIR_AT.slice(0, lights).map(([x, y], i) => (
          <span
            key={i}
            class={`wk-light${i % 3 === 0 ? ' gold' : ''}`}
            style={{ left: `${x}px`, top: `${y}px` }}
          />
        ))}
      </div>
    </div>
  );
}
