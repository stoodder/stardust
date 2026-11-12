// The finale's top-centre clock (T832; app/hudFinale.ts, art-direction §9 *Finale HUD*): one slot
// under the boss bar, the boss bar's width, that carries whatever is running against the player in
// this phase. Phase 1: the **Deep Bore** filling in the unsung violet ("62%"; "Full" and burning
// once it breaks through). Phase 2: the **countdown**, "Pests processed" falling from the lifetime
// count in the 16 px figures, its gold bar the song's rest filling under the Unsung's bar (the
// bar the fight ends by: the Unsung's HP floors at 1%). Dawn: the same counter at 0, the bar full,
// the one line the HUD keeps beside the name plate. Read by screen readers as one status line,
// never live (it moves every second; the comms and the meters say what changed).
import { finaleClock, FINALE_CLOCK_W } from './finaleState.ts';

export function FinaleClock() {
  const c = finaleClock.value;
  if (c === null) return null;
  const counter = c.kind === 'counter';
  return (
    <div
      class={`hud-finale-clock chamfer ${c.kind}${c.full ? ' full' : ''}`}
      role="status"
      aria-live="off"
      data-testid="finale-clock"
      data-kind={c.kind}
      data-fill={c.fill}
      aria-label={`${c.label} ${c.value}`}
      style={{ '--clock-w': `${FINALE_CLOCK_W}px` }}
    >
      <span class="hud-finale-row">
        <span class="hud-label">{c.label}</span>
        <span class={counter ? 'big num' : 'num'} data-testid="finale-clock-value">
          {c.value}
        </span>
      </span>
      <span class="hud-finale-bar" aria-hidden="true">
        <span class="hud-finale-fill" style={{ width: `${c.fill}px` }} />
      </span>
    </div>
  );
}
