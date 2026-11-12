// The finale's HUD (T832; design/maps.md § 5.5, core-loop.md § 2.10, art-direction §9 *Finale
// HUD*): what the phased map adds to the battle HUD, phase by phase, in slots the HUD already has
// (D153's declutter: only what the player needs at that moment).
// - **Phase 1, the Descent:** the Deep Bore in the top-centre clock (under where the boss bar
//   stands), filling violet, "Full" once it breaks through. The Voices meter is the Escort meter's
//   (app/hudEscort.ts); the halted choir shows on it (`choirHalted`).
// - **Phase 2, the Unsung:** the same clock turns into the countdown: "Pests processed" falling
//   from the lifetime count N as N × (1 − p) (app/countdown.ts, T809), its gold bar the song's rest
//   under the Unsung's bar (which floors at 1%: the gold is what ends the fight). The Bore is gone.
//   A wave held for its phase (`inPhase`: W19 waits for the Halls) shows "Held" in the preview, not
//   a countdown; the add waves walk in without a "Wave n" banner (the song is doing the talking).
// - **Phase 3, Dawn:** nothing but the light: the HUD steps back to the name plate and the same
//   counter at 0 (ui/hud/index.tsx `data-dawn`).
// Phase banners (in the wave banner's place): W1's "The Descent", and Phase 2's "The Halls" over
// "The Unsung" (the Halls banner and Phase 2's are one: Phase 2 begins as the choir reaches the
// Halls). A resumed run's replay shows none (app/checkpoints.ts). No "!" anywhere (finale tone).
// Every signal here is quiet (ui/hud/finaleState.ts) on a map without the finale's song or timers.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { formatCount } from '../story/counter.ts';
import {
  choirHalted,
  FINALE_CLOCK_W,
  finaleClock,
  finalePhase,
  nextHeld,
  phaseBanner,
  type FinaleClockView,
} from '../ui/hud/finaleState.ts';
import { COUNTDOWN_PHASE, trackCountdown } from './countdown.ts';
import type { Host } from './host.ts';
import { displayName } from './hudText.ts';

/** The countdown's label: the counter's own name, the one the epilogue's last card lands on 0. */
export const COUNTER_LABEL = 'Pests processed';
/** The Bore's value once it has broken through. */
export const BORE_FULL = 'Full';
/** Dawn's script phase: the HUD steps back. */
export const DAWN_PHASE = 3;
/** How long a phase banner shows, in ms of real time (twice the wave banner's). */
export const PHASE_BANNER_MS = 2400;

/** The phase banners: W1's kicker over its wave, and Phase 2's place over its name. */
export const PHASE_ONE_KICKER = 'The Descent';
export const PHASE_TWO_BANNER = { kicker: 'The Halls', title: 'The Unsung' } as const;

/** Whether `map` is phased like the finale (a song or a secondary timer): the HUD scopes by phase. */
export function phasedMap(map: Pick<CompiledMapDef<IdSpace>, 'song' | 'timers'>): boolean {
  return map.song !== null || map.timers.length > 0;
}

/** The Bore's clock: its fill of `fillTicks`, "62%" (whole percent, floored) or "Full". */
export function boreClock(
  label: string,
  t: { readonly filled: number; readonly full: boolean },
  fillTicks: number,
): FinaleClockView {
  const share = t.full || fillTicks <= 0 ? 1 : Math.min(1, Math.max(0, t.filled / fillTicks));
  return {
    kind: 'bore',
    label,
    value: t.full ? BORE_FULL : `${Math.floor(share * 100)}%`,
    fill: Math.round(share * FINALE_CLOCK_W),
    full: t.full,
  };
}

/** The countdown's clock: the number shown, its bar the rest progress `p` (0–1). */
export function counterClock(shown: number, progress: number): FinaleClockView {
  const p = Math.min(1, Math.max(0, progress));
  return {
    kind: 'counter',
    label: COUNTER_LABEL,
    value: formatCount(shown),
    fill: Math.floor(p * FINALE_CLOCK_W),
    full: shown === 0 && p >= 1,
  };
}

const sameClock = (a: FinaleClockView | null, b: FinaleClockView | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.kind === b.kind &&
    a.value === b.value &&
    a.fill === b.fill &&
    a.full === b.full &&
    a.label === b.label);

/**
 * Wires the finale's HUD signals to a battle (bind it before a resumed run's replay, as bindHud
 * is, so the countdown's N comes back the same). `lifetime`: the save's Pests Processed as the
 * battle began. Returns the unwiring (which also quiets them).
 */
export function bindFinaleHud(host: Host<IdSpace>, lifetime: number): () => void {
  const { sim } = host;
  const map = sim.map;
  const reset = (): void => {
    finaleClock.value = null;
    finalePhase.value = 0;
    choirHalted.value = false;
    nextHeld.value = false;
    phaseBanner.value = null;
  };
  reset();
  if (!phasedMap(map)) return reset;
  const countdown = map.song === null ? null : trackCountdown(host);
  const bore = map.timers[0] ?? null;
  const boreLabel = bore === null ? '' : displayName(bore.id);
  let bannerId = 0;
  let bannerTimer: ReturnType<typeof setTimeout> | null = null;
  const banner = (kicker: string, title: string): void => {
    if (host.replaying) return;
    phaseBanner.value = { id: ++bannerId, kicker, title };
    if (bannerTimer !== null) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      bannerTimer = null;
      phaseBanner.value = null;
    }, PHASE_BANNER_MS);
  };
  const clockNow = (): FinaleClockView | null => {
    const s = sim.state;
    if (countdown !== null && s.phase >= DAWN_PHASE) return counterClock(0, 1);
    if (countdown !== null && s.phase === COUNTDOWN_PHASE) {
      const m = countdown.model(lifetime);
      return m === null ? null : counterClock(m.shown, m.progress);
    }
    // The Bore belongs to Phase 1: shown once it starts, gone as Phase 2 stops it.
    if (bore === null || s.phase >= COUNTDOWN_PHASE) return null;
    const t = s.timers[0];
    if (t === undefined || (!t.running && !t.full)) return null;
    return boreClock(boreLabel, t, bore.fillTicks);
  };
  const sync = (): void => {
    const s = sim.state;
    if (finalePhase.value !== s.phase) finalePhase.value = s.phase;
    const clock = clockNow();
    if (!sameClock(finaleClock.value, clock)) finaleClock.value = clock;
    const halted = map.choir !== null && s.choir.halted && s.outcome === 'playing';
    if (choirHalted.value !== halted) choirHalted.value = halted;
    const next = map.waves[s.wave];
    const held = s.schedule.phase === 'held' && next !== undefined && next.inPhase > 0;
    if (nextHeld.value !== held) nextHeld.value = held;
  };
  sync();
  const offs = [
    host.onAfterFrame(sync),
    host.bus.on('WaveStarted', (e) => {
      if (e.wave === 1 && map.choir !== null) banner(PHASE_ONE_KICKER, `Wave ${e.wave}`);
    }),
    host.bus.on('PhaseChanged', (e) => {
      sync();
      if (e.phase === COUNTDOWN_PHASE) banner(PHASE_TWO_BANNER.kicker, PHASE_TWO_BANNER.title);
    }),
  ];
  return () => {
    for (const off of offs) off();
    countdown?.off();
    if (bannerTimer !== null) clearTimeout(bannerTimer);
    reset();
  };
}
