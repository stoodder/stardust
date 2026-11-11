// Night Shift on the stage (act3.md § A3M4, *Base vignette*; T714; the rules are nightShift.ts):
// the shelters at night behind the lines. Concrete bays in deep violet-black, the Fun Friday banner
// sagging across them, the colony asleep in rows of blankets, and one hanging lamp whose pool
// blooms warm as Ves'thara laughs and stays a step warmer after. DOM and pixel SVG at whole pixels;
// silent; aria-hidden with one label. Reduced motion: no bloom animation, each state held still.
import { prefersReducedMotion } from '../motion.ts';
import { dialogue } from '../dialogue/state.ts';
import { useStageClock } from '../dialogue/Staging.tsx';
import { Pixels } from './mailStage.tsx';
import {
  BANNER_TEXT,
  nightShiftLabel,
  nightShiftLeadInMs,
  roomLight,
} from './nightShift.ts';
import './nightShift.css';

/** The hanging lamp: cord, shade, bulb (c: cord, s: shade, l: lit bulb, h: hot core). */
const LAMP_ROWS = [
  '....c....',
  '....c....',
  '....c....',
  '...sss...',
  '.sssssss.',
  'sssssssss',
  '..lhhhl..',
  '...lll...',
];
const LAMP = { c: 'var(--sd-ink-4)', s: 'var(--sd-steel-1)', l: 'var(--sd-gold-3)', h: 'var(--sd-gold-4)' };

/** One sleeper under a blanket (b: blanket, d: its fold, k: a kid's head). */
const SLEEPER_ROWS = ['..kk.......', '.kkkbbbbb..', 'bbbbbbbbbbb', 'dbbbdbbbbbd'];
const BLANKETS = [
  { b: 'var(--sd-violet-1)', d: 'var(--sd-ink-3)', k: 'var(--sd-steel-1)' },
  { b: 'var(--sd-blue-1)', d: 'var(--sd-ink-3)', k: 'var(--sd-steel-1)' },
  { b: 'var(--sd-teal-1)', d: 'var(--sd-ink-3)', k: 'var(--sd-steel-1)' },
];

/** Where the sleepers lie (game px from the room's left, row 0 or 1). */
const SLEEPERS: readonly [number, number][] = [
  [40, 0],
  [86, 1],
  [140, 0],
  [196, 1],
  [330, 0],
  [384, 1],
  [436, 0],
  [490, 1],
];

/** The room, `from` its staging's start (performance.now()). */
export function NightShiftStage({ from }: { from: number }) {
  const still = prefersReducedMotion();
  const lead = nightShiftLeadInMs(still);
  // The clock only matters for the lead-in (the room is the same whatever the time).
  const ms = useStageClock(from, (t) => t < lead + 50);
  const view = dialogue.scene.value;
  const leading = ms < lead;
  const light =
    view === null ? 'cold' : roomLight(view.transcript, leading ? null : view.line);
  return (
    <div
      class={`ns ns-${light}${still ? ' still' : ''}`}
      role="img"
      aria-label={nightShiftLabel(light)}
      data-testid="stage-night-shift"
      data-light={light}
    >
      <div class="ns-room" aria-hidden="true">
        <div class="ns-bays">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} class="ns-bay" />
          ))}
        </div>
        <div class="ns-banner">
          <span class="ns-banner-half">{BANNER_TEXT.slice(0, 10)}</span>
          <span class="ns-banner-half sag">{BANNER_TEXT.slice(10)}</span>
        </div>
        <div class="ns-pool" />
        <Pixels rows={LAMP_ROWS} colors={LAMP} scale={2} class="ns-lamp" />
        <div class="ns-floor">
          {SLEEPERS.map(([x, row], i) => (
            <span key={x} class="ns-sleeper" style={{ left: `${x}px`, top: `${row * 10}px` }}>
              <Pixels rows={SLEEPER_ROWS} colors={BLANKETS[i % BLANKETS.length]!} scale={2} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
